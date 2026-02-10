import { useEffect, useRef } from "react";
import { EditorState } from "@codemirror/state";
import {
  EditorView,
  keymap,
  lineNumbers,
  drawSelection,
  highlightActiveLine,
} from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { oneDark } from "@codemirror/theme-one-dark";
import {
  syntaxHighlighting,
  defaultHighlightStyle,
  bracketMatching,
} from "@codemirror/language";
import { javascript } from "@codemirror/lang-javascript";

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: "json" | "plain";
  minHeight?: string;
  className?: string;
}

export function CodeEditor({
  value,
  onChange,
  language = "json",
  minHeight = "120px",
  className = "",
}: CodeEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const valueRef = useRef(value);

  onChangeRef.current = onChange;
  valueRef.current = value;

  // Create editor on mount
  useEffect(() => {
    if (!editorRef.current) return;

    const extensions = [
      lineNumbers(),
      history(),
      drawSelection(),
      highlightActiveLine(),
      bracketMatching(),
      syntaxHighlighting(defaultHighlightStyle),
      oneDark,
      keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          onChangeRef.current(update.state.doc.toString());
        }
      }),
      EditorView.theme({
        "&": { minHeight, fontSize: "13px" },
        ".cm-scroller": { overflow: "auto" },
        ".cm-content": {
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        },
        ".cm-gutters": {
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        },
      }),
    ];

    // Add language support (use JavaScript for JSON syntax highlighting)
    if (language === "json") {
      extensions.push(javascript());
    }

    const state = EditorState.create({
      doc: valueRef.current,
      extensions,
    });

    viewRef.current = new EditorView({
      state,
      parent: editorRef.current,
    });

    return () => {
      viewRef.current?.destroy();
      viewRef.current = null;
    };
  }, [language, minHeight]);

  // Sync value changes from parent
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current !== value) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: value },
      });
    }
  }, [value]);

  return (
    <div
      ref={editorRef}
      className={`border-input overflow-hidden rounded-md border shadow-xs ${className}`}
    />
  );
}
