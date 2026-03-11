import { useState, useEffect, useCallback, useRef } from "react";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/app-layout";
import { Sidebar } from "@/components/sidebar";
import { RequestEditor } from "@/components/request-editor";
import { ResponsePanel } from "@/components/response-panel";
import { EnvEditor } from "@/components/env-editor";
import { EnvPickerModal } from "@/components/env-picker-modal";
import { EnvProvider } from "@/lib/env-context";
import * as api from "@/lib/api";
import type { RunResult, Metadata, FileInfo } from "@/lib/api";

// Pending changes storage helpers
const PENDING_KEY_PREFIX = "hurler:pending:";

function getPendingContent(fileName: string): string | null {
  return sessionStorage.getItem(PENDING_KEY_PREFIX + fileName);
}

function setPendingContent(fileName: string, content: string): void {
  sessionStorage.setItem(PENDING_KEY_PREFIX + fileName, content);
}

function clearPendingContent(fileName: string): void {
  sessionStorage.removeItem(PENDING_KEY_PREFIX + fileName);
}

function hasAnyPendingChanges(): boolean {
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key?.startsWith(PENDING_KEY_PREFIX)) {
      return true;
    }
  }
  return false;
}

function clearAllPendingChanges(): void {
  const keysToRemove: string[] = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key?.startsWith(PENDING_KEY_PREFIX)) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => sessionStorage.removeItem(key));
}

// Clear all pending changes on page load (refresh should discard changes)
clearAllPendingChanges();

export default function App() {
  const [projectName, setProjectName] = useState<string>("Hurler");
  const [readOnly, setReadOnly] = useState(false);
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [environments, setEnvironments] = useState<string[]>([]);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [activeEnvironment, setActiveEnvironmentRaw] = useState<string | null>(
    () => localStorage.getItem("hurler:activeEnvironment")
  );
  const setActiveEnvironment = useCallback((env: string | null) => {
    setActiveEnvironmentRaw(env);
    if (env) {
      localStorage.setItem("hurler:activeEnvironment", env);
    } else {
      localStorage.removeItem("hurler:activeEnvironment");
    }
  }, []);
  const [editorContent, setEditorContent] = useState("");
  const [savedContent, setSavedContent] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [metadata, setMetadata] = useState<Metadata>({ sections: [], fileGroups: {} });
  const [showEnvEditor, setShowEnvEditor] = useState(false);
  const [showEnvPicker, setShowEnvPicker] = useState(
    () => !localStorage.getItem("hurler:activeEnvironment")
  );
  
  // Track if we have unsaved changes for beforeunload
  const isDirtyRef = useRef(false);
  
  // Track which files have pending (unsaved) changes for sidebar indicator
  const [pendingFiles, setPendingFiles] = useState<Set<string>>(new Set());
  
  // Trigger re-fetch of env variables when environments are updated
  const [envRefreshKey, setEnvRefreshKey] = useState(0);

  // Fetch project info and update document title
  const loadProjectInfo = useCallback(async () => {
    const info = await api.getProjectInfo();
    setProjectName(info.name);
    setReadOnly(info.readOnly);
    document.title = `${info.name} | Hurler`;
  }, []);

  const loadFiles = useCallback(async () => {
    const result = await api.listFiles();
    setFiles(result);
  }, []);

  const loadEnvironments = useCallback(async () => {
    const result = await api.listEnvironments();
    setEnvironments(result);
    // Clear persisted environment if it no longer exists
    const saved = localStorage.getItem("hurler:activeEnvironment");
    if (saved && !result.includes(saved)) {
      setActiveEnvironment(null);
    }
  }, [setActiveEnvironment]);

  const loadMetadata = useCallback(async () => {
    const result = await api.getMetadata();
    setMetadata(result);
  }, []);

  useEffect(() => {
    loadProjectInfo();
    loadFiles();
    loadEnvironments();
    loadMetadata();
  }, [loadProjectInfo, loadFiles, loadEnvironments, loadMetadata]);

  const handleUpdateMetadata = useCallback(async (updated: Metadata) => {
    setMetadata(updated);
    await api.updateMetadata(updated);
  }, []);

  const handleSelectFile = useCallback(async (name: string) => {
    // Save current file's pending changes before switching
    if (activeFile && editorContent !== savedContent) {
      setPendingContent(activeFile, editorContent);
    }
    
    const result = await api.readFile(name);
    setActiveFile(name);
    setSavedContent(result.content);
    
    // Check for pending changes for this file
    const pending = getPendingContent(name);
    if (pending !== null) {
      setEditorContent(pending);
    } else {
      setEditorContent(result.content);
    }
    
    setRunResult(null);
  }, [activeFile, editorContent, savedContent]);

  const handleCreateFile = useCallback(
    async (name: string) => {
      const defaultContent = `GET https://httpbin.org/get\nHTTP 200\n`;
      await api.createFile(name, defaultContent);
      await loadFiles();
      handleSelectFile(name.replace(/[^a-zA-Z0-9_-]/g, "_"));
    },
    [loadFiles, handleSelectFile]
  );

  const handleDeleteFile = useCallback(
    async (name: string) => {
      await api.deleteFile(name);
      // Clear any pending changes for deleted file
      clearPendingContent(name);
      setPendingFiles(prev => {
        const next = new Set(prev);
        next.delete(name);
        return next;
      });
      if (activeFile === name) {
        setActiveFile(null);
        setEditorContent("");
        setSavedContent("");
        setRunResult(null);
      }
      // Remove from fileGroups if present
      if (metadata.fileGroups[name]) {
        const { [name]: _, ...rest } = metadata.fileGroups;
        const updated = { ...metadata, fileGroups: rest };
        setMetadata(updated);
        await api.updateMetadata(updated);
      }
      await loadFiles();
    },
    [activeFile, loadFiles, metadata]
  );

  const handleRenameFile = useCallback(
    async (oldName: string, newName: string) => {
      const result = await api.renameFile(oldName, newName);
      
      // Migrate pending changes to new filename
      const pending = getPendingContent(oldName);
      if (pending !== null) {
        clearPendingContent(oldName);
        setPendingContent(result.newName, pending);
        setPendingFiles(prev => {
          const next = new Set(prev);
          next.delete(oldName);
          next.add(result.newName);
          return next;
        });
      }
      
      // If the renamed file was active, update activeFile to new name
      if (activeFile === oldName) {
        setActiveFile(result.newName);
      }
      await loadFiles();
      await loadMetadata();
    },
    [activeFile, loadFiles, loadMetadata]
  );

  const handleSave = useCallback(async () => {
    if (!activeFile) return;
    await api.updateFile(activeFile, editorContent);
    setSavedContent(editorContent);
    // Clear pending changes since we've saved
    clearPendingContent(activeFile);
    setPendingFiles(prev => {
      const next = new Set(prev);
      next.delete(activeFile);
      return next;
    });
    // Refresh file list to update HTTP method badge
    await loadFiles();
  }, [activeFile, editorContent, loadFiles]);

  const handleRun = useCallback(async () => {
    if (!activeFile) return;
    // Auto-save before running
    if (editorContent !== savedContent) {
      await api.updateFile(activeFile, editorContent);
      setSavedContent(editorContent);
      // Clear pending changes since we've saved
      clearPendingContent(activeFile);
      setPendingFiles(prev => {
        const next = new Set(prev);
        next.delete(activeFile);
        return next;
      });
      // Refresh file list to update HTTP method badge
      await loadFiles();
    }
    setIsRunning(true);
    setRunResult(null);
    try {
      const result = await api.runHurl(
        activeFile,
        activeEnvironment ?? undefined
      );
      setRunResult(result);
    } catch (err) {
      setRunResult({
        success: false,
        duration: 0,
        json: null,
        stdout: "",
        stderr: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setIsRunning(false);
    }
  }, [activeFile, activeEnvironment, editorContent, savedContent, loadFiles]);

  const isDirty = editorContent !== savedContent;
  
  // Keep ref in sync for beforeunload handler
  isDirtyRef.current = isDirty || hasAnyPendingChanges();
  
  // Handle content changes - store pending changes
  const handleEditorChange = useCallback((content: string) => {
    setEditorContent(content);
    // Store pending changes as user types
    if (activeFile) {
      setPendingContent(activeFile, content);
      setPendingFiles(prev => new Set(prev).add(activeFile));
    }
  }, [activeFile]);
  
  // Warn user before leaving if there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirtyRef.current) {
        e.preventDefault();
        // Modern browsers ignore custom messages, but we set it for older browsers
        e.returnValue = "Any unsaved changes will be lost.";
        return e.returnValue;
      }
    };
    
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  return (
    <EnvProvider environment={activeEnvironment} refreshKey={envRefreshKey}>
    <TooltipProvider>
      <AppLayout
        projectName={projectName}
        sidebar={
          <Sidebar
            files={files}
            activeFile={activeFile}
            onSelectFile={handleSelectFile}
            onCreateFile={handleCreateFile}
            onDeleteFile={handleDeleteFile}
            onRenameFile={handleRenameFile}
            metadata={metadata}
            onUpdateMetadata={handleUpdateMetadata}
            environments={environments}
            activeEnvironment={activeEnvironment}
            onSelectEnvironment={setActiveEnvironment}
            onOpenEnvEditor={() => setShowEnvEditor(true)}
            pendingFiles={pendingFiles}
            readOnly={readOnly}
          />
        }
        editor={
          <RequestEditor
            fileName={activeFile}
            content={editorContent}
            onChange={handleEditorChange}
            onRun={handleRun}
            onSave={handleSave}
            isRunning={isRunning}
            isDirty={isDirty}
            environment={activeEnvironment}
            readOnly={readOnly}
          />
        }
        response={
          <ResponsePanel result={runResult} isRunning={isRunning} hurlSource={savedContent} />
        }
      />
      <EnvEditor
        open={showEnvEditor}
        onClose={() => setShowEnvEditor(false)}
        environments={environments}
        onRefresh={loadEnvironments}
        onEnvChange={() => setEnvRefreshKey((k) => k + 1)}
        activeEnvironment={activeEnvironment}
      />
      <EnvPickerModal
        open={showEnvPicker && environments.length > 0}
        environments={environments}
        onSelect={(env) => {
          setActiveEnvironment(env);
          setShowEnvPicker(false);
        }}
        onSkip={() => setShowEnvPicker(false)}
      />
      <Toaster position="bottom-right" richColors />
    </TooltipProvider>
    </EnvProvider>
  );
}
