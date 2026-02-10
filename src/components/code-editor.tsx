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
import { useTheme } from "@/lib/theme-context";

// Light theme for CodeMirror
const lightTheme = EditorView.theme({
  "&": {
    backgroundColor: "#ffffff",
    color: "#1f2937",
  },
  ".cm-content": {
    caretColor: "#1f2937",
  },
  ".cm-cursor, .cm-dropCursor": {
    borderLeftColor: "#1f2937",
  },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": {
    backgroundColor: "#d1d5db",
  },
  ".cm-panels": {
    backgroundColor: "#f3f4f6",
    color: "#1f2937",
  },
  ".cm-panels.cm-panels-top": {
    borderBottom: "1px solid #e5e7eb",
  },
  ".cm-panels.cm-panels-bottom": {
    borderTop: "1px solid #e5e7eb",
  },
  ".cm-activeLine": {
    backgroundColor: "#f9fafb",
  },
  ".cm-gutters": {
    backgroundColor: "#f9fafb",
    color: "#9ca3af",
    border: "none",
    borderRight: "1px solid #e5e7eb",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "#f3f4f6",
  },
  ".cm-lineNumbers .cm-gutterElement": {
    color: "#9ca3af",
  },
}, { dark: false });

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
  const theme = useTheme();

  onChangeRef.current = onChange;
  valueRef.current = value;

  // Create editor on mount or when theme changes
  useEffect(() => {
    if (!editorRef.current) return;

    // Destroy existing editor
    if (viewRef.current) {
      viewRef.current.destroy();
      viewRef.current = null;
    }

    const extensions = [
      lineNumbers(),
      history(),
      drawSelection(),
      highlightActiveLine(),
      bracketMatching(),
      syntaxHighlighting(defaultHighlightStyle),
      // Apply theme based on system preference
      theme === "dark" ? oneDark : lightTheme,
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
  }, [language, minHeight, theme]);

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
