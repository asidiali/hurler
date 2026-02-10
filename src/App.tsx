import { useState, useEffect, useCallback } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/app-layout";
import { Sidebar } from "@/components/sidebar";
import { RequestEditor } from "@/components/request-editor";
import { ResponsePanel } from "@/components/response-panel";
import { EnvEditor } from "@/components/env-editor";
import { EnvPickerModal } from "@/components/env-picker-modal";
import * as api from "@/lib/api";
import type { RunResult, Metadata } from "@/lib/api";

export default function App() {
  const [files, setFiles] = useState<string[]>([]);
  const [environments, setEnvironments] = useState<string[]>([]);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [activeEnvironment, setActiveEnvironment] = useState<string | null>(null);
  const [editorContent, setEditorContent] = useState("");
  const [savedContent, setSavedContent] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [metadata, setMetadata] = useState<Metadata>({ sections: [], fileGroups: {} });
  const [showEnvEditor, setShowEnvEditor] = useState(false);
  const [showEnvPicker, setShowEnvPicker] = useState(true);

  const loadFiles = useCallback(async () => {
    const result = await api.listFiles();
    setFiles(result);
  }, []);

  const loadEnvironments = useCallback(async () => {
    const result = await api.listEnvironments();
    setEnvironments(result);
  }, []);

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

  const handleSave = useCallback(async () => {
    if (!activeFile) return;
    await api.updateFile(activeFile, editorContent);
    setSavedContent(editorContent);
  }, [activeFile, editorContent]);

  const handleRun = useCallback(async () => {
    if (!activeFile) return;
    // Auto-save before running
    if (editorContent !== savedContent) {
      await api.updateFile(activeFile, editorContent);
      setSavedContent(editorContent);
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
  }, [activeFile, activeEnvironment, editorContent, savedContent]);

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
