import React, { useState, useRef, useEffect, useMemo, type KeyboardEvent } from "react";
import { useEnvVariables } from "@/lib/env-context";
import { cn } from "@/lib/utils";

interface VariableInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

interface VariableMatch {
  start: number;
  end: number;
  name: string;
  isDefined: boolean;
}

function parseVariables(text: string, definedVars: string[]): VariableMatch[] {
  const matches: VariableMatch[] = [];
  const regex = /\{\{(\w+)\}\}/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    matches.push({
      start: match.index,
      end: match.index + match[0].length,
      name: match[1],
      isDefined: definedVars.includes(match[1]),
    });
  }
  return matches;
}

function renderHighlightedText(text: string, matches: VariableMatch[]) {
  if (matches.length === 0) {
    return <span>{text}</span>;
  }

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  matches.forEach((match, i) => {
    // Add text before this match
    if (match.start > lastIndex) {
      parts.push(
        <span key={`text-${i}`}>{text.slice(lastIndex, match.start)}</span>
      );
    }
    // Add the highlighted variable
    parts.push(
      <span
        key={`var-${i}`}
        className={cn(
          "rounded px-0.5 font-medium",
          match.isDefined
            ? "bg-green-500/30 text-green-800 dark:bg-green-500/40 dark:text-green-300"
            : "bg-red-500/30 text-red-800 underline decoration-wavy decoration-red-500/60 dark:bg-red-500/40 dark:text-red-300"
        )}
      >
        {text.slice(match.start, match.end)}
      </span>
    );
    lastIndex = match.end;
  });

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(<span key="text-end">{text.slice(lastIndex)}</span>);
  }

  return <>{parts}</>;
}

export function VariableInput({
  value,
  onChange,
  placeholder,
  className,
}: VariableInputProps) {
  const { variables, secrets, environment } = useEnvVariables();
  const [isFocused, setIsFocused] = useState(false);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompleteIndex, setAutocompleteIndex] = useState(0);
  const [cursorPosition, setCursorPosition] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const matches = useMemo(
    () => parseVariables(value, variables),
    [value, variables]
  );

  // Find autocomplete trigger position and filter variables
  const autocompleteState = useMemo(() => {
    // Find if cursor is after {{ but before }}
    const beforeCursor = value.slice(0, cursorPosition);
    const lastOpenBrace = beforeCursor.lastIndexOf("{{");
    
    if (lastOpenBrace === -1) return null;
    
    // Check if there's a closing }} between the {{ and cursor
    const afterOpen = beforeCursor.slice(lastOpenBrace + 2);
    if (afterOpen.includes("}}")) return null;
    
    // Get the partial variable name typed so far
    const partial = afterOpen.toLowerCase();
    
    // Filter matching variables
    const filtered = variables.filter((v) =>
      v.toLowerCase().startsWith(partial)
    );
    
    if (filtered.length === 0) return null;
    
    return {
      insertAt: lastOpenBrace + 2,
      partial,
      suggestions: filtered,
    };
  }, [value, cursorPosition, variables]);

  useEffect(() => {
    if (autocompleteState && isFocused && environment) {
      setShowAutocomplete(true);
      setAutocompleteIndex(0);
    } else {
      setShowAutocomplete(false);
    }
  }, [autocompleteState, isFocused, environment]);

  const handleSelect = (varName: string) => {
    if (!autocompleteState) return;
    
    // Replace from insertAt to cursor with the full variable name + }}
    const before = value.slice(0, autocompleteState.insertAt);
    const after = value.slice(cursorPosition);
    const newValue = before + varName + "}}" + after;
    onChange(newValue);
    
    // Move cursor after the inserted variable
    const newCursorPos = autocompleteState.insertAt + varName.length + 2;
    setTimeout(() => {
      inputRef.current?.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
    
    setShowAutocomplete(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!showAutocomplete || !autocompleteState) return;
    
    const { suggestions } = autocompleteState;
    
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setAutocompleteIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setAutocompleteIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      handleSelect(suggestions[autocompleteIndex]);
    } else if (e.key === "Escape") {
      setShowAutocomplete(false);
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    setCursorPosition(e.target.selectionStart ?? 0);
  };

  const handleClick = () => {
    setCursorPosition(inputRef.current?.selectionStart ?? 0);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Highlighted overlay */}
      <div
        className={cn(
          "pointer-events-none absolute inset-0 flex items-center overflow-hidden whitespace-pre px-3 py-2 font-mono text-sm",
          className
        )}
        aria-hidden
      >
        {value ? renderHighlightedText(value, matches) : (
          <span className="text-muted-foreground">{placeholder}</span>
        )}
      </div>
      
      {/* Actual input (transparent text) */}
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInput}
        onClick={handleClick}
        onKeyUp={handleClick}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={() => {
          // Delay to allow click on autocomplete
          setTimeout(() => setIsFocused(false), 150);
        }}
        placeholder=""
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-transparent caret-foreground ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono",
          className
        )}
      />
      
      {/* Autocomplete dropdown */}
      {showAutocomplete && autocompleteState && (
        <div className="absolute left-0 top-full z-50 mt-1 max-h-48 min-w-[200px] overflow-auto rounded-md border bg-popover p-1 shadow-md">
          {autocompleteState.suggestions.map((v, i) => (
            <div
              key={v}
              className={cn(
                "cursor-pointer rounded-sm px-2 py-1.5 text-sm font-mono flex items-center justify-between gap-3",
                i === autocompleteIndex
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-accent/50"
              )}
              onClick={() => handleSelect(v)}
            >
              <span>
                <span className="text-muted-foreground">{"{{"}</span>
                {v}
                <span className="text-muted-foreground">{"}}"}</span>
              </span>
              <span className="text-xs text-muted-foreground">
                {secrets.includes(v) ? "secret" : "variable"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
