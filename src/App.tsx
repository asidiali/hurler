import { useState, useEffect, useCallback } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/app-layout";
import { Sidebar } from "@/components/sidebar";
import { RequestEditor } from "@/components/request-editor";
import { ResponsePanel } from "@/components/response-panel";
import { EnvEditor } from "@/components/env-editor";
import { EnvPickerModal } from "@/components/env-picker-modal";
import * as api from "@/lib/api";
import type { RunResult, Metadata, FileInfo } from "@/lib/api";

export default function App() {
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
    loadFiles();
    loadEnvironments();
    loadMetadata();
  }, [loadFiles, loadEnvironments, loadMetadata]);

  const handleUpdateMetadata = useCallback(async (updated: Metadata) => {
    setMetadata(updated);
    await api.updateMetadata(updated);
  }, []);

  const handleSelectFile = useCallback(async (name: string) => {
    const result = await api.readFile(name);
    setActiveFile(name);
    setEditorContent(result.content);
    setSavedContent(result.content);
    setRunResult(null);
  }, []);

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
    // Refresh file list to update HTTP method badge
    await loadFiles();
  }, [activeFile, editorContent, loadFiles]);

  const handleRun = useCallback(async () => {
    if (!activeFile) return;
    // Auto-save before running
    if (editorContent !== savedContent) {
      await api.updateFile(activeFile, editorContent);
      setSavedContent(editorContent);
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

  return (
    <TooltipProvider>
      <AppLayout
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
          />
        }
        editor={
          <RequestEditor
            fileName={activeFile}
            content={editorContent}
            onChange={setEditorContent}
            onRun={handleRun}
            onSave={handleSave}
            isRunning={isRunning}
            isDirty={isDirty}
            environment={activeEnvironment}
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
    </TooltipProvider>
  );
}
