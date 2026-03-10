import {
  EditorView,
  Decoration,
  ViewPlugin,
  type DecorationSet,
  type ViewUpdate,
} from "@codemirror/view";
import {
  Facet,
} from "@codemirror/state";
import {
  autocompletion,
  type CompletionContext,
  type CompletionResult,
} from "@codemirror/autocomplete";

// Facet to provide environment variables to the editor
export const envVariablesFacet = Facet.define<string[], string[]>({
  combine: (values) => values.flat(),
});

// Facet to provide secrets list (for distinguishing in autocomplete)
export const envSecretsFacet = Facet.define<string[], string[]>({
  combine: (values) => values.flat(),
});

// Theme for variable highlighting
const variableTheme = EditorView.baseTheme({
  ".cm-variable-defined": {
    backgroundColor: "rgba(34, 197, 94, 0.3)",
    color: "rgb(21, 128, 61)",
    borderRadius: "3px",
    padding: "1px 3px",
    fontWeight: "500",
  },
  ".cm-variable-undefined": {
    backgroundColor: "rgba(239, 68, 68, 0.3)",
    color: "rgb(185, 28, 28)",
    borderRadius: "3px",
    padding: "1px 3px",
    fontWeight: "500",
    textDecoration: "wavy underline rgba(239, 68, 68, 0.6)",
  },
  ".dark .cm-variable-defined": {
    backgroundColor: "rgba(34, 197, 94, 0.35)",
    color: "rgb(134, 239, 172)",
  },
  ".dark .cm-variable-undefined": {
    backgroundColor: "rgba(239, 68, 68, 0.35)",
    color: "rgb(252, 165, 165)",
    textDecoration: "wavy underline rgba(252, 165, 165, 0.6)",
  },
});

// Create decorations for variables
function getVariableDecorations(view: EditorView): DecorationSet {
  const decorations: { from: number; to: number; decoration: Decoration }[] = [];
  const envVars = view.state.facet(envVariablesFacet);
  const doc = view.state.doc.toString();
  const regex = /\{\{(\w+)\}\}/g;
  let match;

  while ((match = regex.exec(doc)) !== null) {
    const varName = match[1];
    const isDefined = envVars.includes(varName);
    const from = match.index;
    const to = match.index + match[0].length;

    decorations.push({
      from,
      to,
      decoration: Decoration.mark({
        class: isDefined ? "cm-variable-defined" : "cm-variable-undefined",
      }),
    });
  }

  return Decoration.set(
    decorations.sort((a, b) => a.from - b.from).map((d) => d.decoration.range(d.from, d.to))
  );
}

// ViewPlugin to update decorations
const variableHighlighter = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = getVariableDecorations(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = getVariableDecorations(update.view);
      }
    }
  },
  {
    decorations: (v) => v.decorations,
  }
);

// Autocomplete for variables
function variableCompletions(context: CompletionContext): CompletionResult | null {
  // Match {{ followed by optional partial variable name
  const match = context.matchBefore(/\{\{(\w*)$/);
  if (!match) return null;

  const envVars = context.state.facet(envVariablesFacet);
  const secrets = context.state.facet(envSecretsFacet);
  if (envVars.length === 0) return null;

  const partial = match.text.slice(2).toLowerCase();

  const options = envVars
    .filter((v) => v.toLowerCase().startsWith(partial))
    .map((v) => ({
      label: v,
      type: "variable",
      apply: v + "}}",
      detail: secrets.includes(v) ? "environment secret" : "environment variable",
    }));

  if (options.length === 0) return null;

  return {
    from: match.from + 2, // After the {{
    options,
    validFor: /^\w*$/,
  };
}

// Combined extension for variable support
export function variableSupport(envVars: string[] = [], secrets: string[] = []) {
  return [
    envVariablesFacet.of(envVars),
    envSecretsFacet.of(secrets),
    variableTheme,
    variableHighlighter,
    autocompletion({
      override: [variableCompletions],
      activateOnTyping: true,
    }),
  ];
}

// Note: variableSupport is the main export used by editors
