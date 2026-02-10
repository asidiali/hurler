import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Save, Loader2 } from "lucide-react";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap, lineNumbers, drawSelection, highlightActiveLine } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { oneDark } from "@codemirror/theme-one-dark";
import { syntaxHighlighting, defaultHighlightStyle, bracketMatching } from "@codemirror/language";

interface RequestEditorProps {
  fileName: string | null;
  content: string;
  onChange: (content: string) => void;
  onRun: () => void;
  onSave: () => void;
  isRunning: boolean;
  isDirty: boolean;
  environment: string | null;
}

export function RequestEditor({
  fileName,
  content,
  onChange,
  onRun,
  onSave,
  isRunning,
  isDirty,
  environment,
}: RequestEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const onRunRef = useRef(onRun);
  const onSaveRef = useRef(onSave);
  const contentRef = useRef(content);

  onChangeRef.current = onChange;
  onRunRef.current = onRun;
  onSaveRef.current = onSave;
  contentRef.current = content;

  // Create/destroy editor when fileName changes (null <-> value)
  useEffect(() => {
    if (!fileName || !editorRef.current) {
      if (viewRef.current) {
        viewRef.current.destroy();
        viewRef.current = null;
      }
      return;
    }

    if (viewRef.current) {
      viewRef.current.destroy();
      viewRef.current = null;
    }

    const state = EditorState.create({
      doc: contentRef.current,
      extensions: [
        lineNumbers(),
        history(),
        drawSelection(),
        highlightActiveLine(),
        bracketMatching(),
        syntaxHighlighting(defaultHighlightStyle),
        oneDark,
        keymap.of([
          ...defaultKeymap,
          ...historyKeymap,
          {
            key: "Mod-Enter",
            run: () => { onRunRef.current(); return true; },
          },
          {
            key: "Mod-s",
            run: () => { onSaveRef.current(); return true; },
          },
        ]),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChangeRef.current(update.state.doc.toString());
          }
        }),
        EditorView.theme({
          "&": { height: "100%", fontSize: "13px" },
          ".cm-scroller": { overflow: "auto" },
          ".cm-content": { fontFamily: "'JetBrains Mono', 'Fira Code', monospace" },
          ".cm-gutters": { fontFamily: "'JetBrains Mono', 'Fira Code', monospace" },
        }),
      ],
    });

    viewRef.current = new EditorView({
      state,
      parent: editorRef.current,
    });

    return () => {
      viewRef.current?.destroy();
      viewRef.current = null;
    };
  }, [fileName]);

  // Sync content into existing editor when it changes externally
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current !== content) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: content },
      });
    }
  }, [content]);

  return (
    <div className="flex h-full flex-col">
      {fileName ? (
        <>
          <div className="flex items-center gap-2 border-b px-3 py-2">
            <span className="text-sm font-medium truncate flex-1">{fileName}.hurl</span>
            {isDirty && (
              <Badge variant="outline" className="text-xs">
                modified
              </Badge>
            )}
            {environment && (
              <Badge variant="secondary" className="text-xs">
                {environment}
              </Badge>
            )}
            <Button variant="outline" size="sm" onClick={onSave} disabled={!isDirty}>
              <Save className="mr-1 h-3.5 w-3.5" />
              Save
            </Button>
            <Button size="sm" onClick={onRun} disabled={isRunning}>
              {isRunning ? (
                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Play className="mr-1 h-3.5 w-3.5" />
              )}
              Run
            </Button>
          </div>
          <div className="relative flex-1">
            <div ref={editorRef} className="absolute inset-0" />
          </div>
        </>
      ) : (
        <div className="flex flex-1 items-center justify-center text-muted-foreground">
          <p className="text-sm">Select or create a request to get started</p>
        </div>
      )}
    </div>
  );
}
