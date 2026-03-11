import React, { useState, useRef, useEffect, useMemo, type KeyboardEvent } from "react";
import { useEnvVariables } from "@/lib/env-context";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface VariableInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  readOnly?: boolean;
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

interface RenderOptions {
  variableValues: Record<string, string>;
  secretValues: Record<string, string>;
  secrets: string[];
}

function renderHighlightedText(text: string, matches: VariableMatch[], options?: RenderOptions) {
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
    
    // Get the value for tooltip
    const isSecret = options?.secrets?.includes(match.name);
    let tooltipValue: string | null = null;
    if (options && match.isDefined) {
      if (isSecret) {
        tooltipValue = options.secretValues[match.name] ? "••••••••" : null;
      } else {
        tooltipValue = options.variableValues[match.name] ?? null;
      }
    }
    
    // Add the highlighted variable
    const varSpan = (
      <span
        className={cn(
          "rounded px-0.5 font-semibold",
          match.isDefined
            ? "bg-emerald-500/40 text-emerald-700 dark:bg-emerald-400/50 dark:text-emerald-200"
            : "bg-rose-500/40 text-rose-700 underline decoration-wavy decoration-rose-500 dark:bg-rose-400/50 dark:text-rose-200"
        )}
      >
        {text.slice(match.start, match.end)}
      </span>
    );
    
    if (tooltipValue !== null) {
      parts.push(
        <Tooltip key={`var-${i}`}>
          <TooltipTrigger asChild>
            {varSpan}
          </TooltipTrigger>
          <TooltipContent>
            <p className="font-mono text-xs">{tooltipValue}</p>
          </TooltipContent>
        </Tooltip>
      );
    } else {
      parts.push(
        <span key={`var-${i}`}>{varSpan}</span>
      );
    }
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
  readOnly,
}: VariableInputProps) {
  const { variables, secrets, variableValues, secretValues, environment } = useEnvVariables();
  const [isFocused, setIsFocused] = useState(false);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompleteIndex, setAutocompleteIndex] = useState(0);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [dropdownLeft, setDropdownLeft] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const matches = useMemo(
    () => parseVariables(value, variables),
    [value, variables]
  );

  // Find autocomplete trigger position and filter variables
  const autocompleteState = useMemo(() => {
    // Find if cursor is after {{ but before }}
    const beforeCursor = value.slice(0, cursorPosition);
    const afterCursor = value.slice(cursorPosition);
    const lastOpenBrace = beforeCursor.lastIndexOf("{{");
    
    if (lastOpenBrace === -1) return null;
    
    // Check if there's a closing }} between the {{ and cursor
    const afterOpen = beforeCursor.slice(lastOpenBrace + 2);
    if (afterOpen.includes("}}")) return null;
    
    // Get the partial variable name typed so far
    const partial = afterOpen;
    const partialLower = partial.toLowerCase();
    
    // Check if this is already a complete variable (cursor inside {{VAR}})
    // Look for }} after cursor that would close this variable
    const closingBracePos = afterCursor.indexOf("}}");
    const nextOpenBrace = afterCursor.indexOf("{{");
    
    // If there's a }} before any {{ after cursor, we're inside a complete variable
    if (closingBracePos !== -1 && (nextOpenBrace === -1 || closingBracePos < nextOpenBrace)) {
      // Check if the text between cursor and }} is just more variable name chars
      const textBeforeClose = afterCursor.slice(0, closingBracePos);
      if (/^\w*$/.test(textBeforeClose)) {
        // Full variable name from {{ to }}
        const fullVarName = partial + textBeforeClose;
        // If this exactly matches a variable, don't show autocomplete
        if (variables.includes(fullVarName)) {
          return null;
        }
      }
    }
    
    // Filter matching variables
    const filtered = variables.filter((v) =>
      v.toLowerCase().startsWith(partialLower)
    );
    
    if (filtered.length === 0) return null;
    
    // Determine what text after cursor belongs to current partial and should be replaced
    // Match any remaining word characters that are part of the variable name
    const remainingPartial = afterCursor.match(/^(\w*)/)?.[1] ?? "";
    const afterRemaining = afterCursor.slice(remainingPartial.length);
    
    // Determine how many closing braces we need to add
    let bracesToAdd = "}}";
    if (afterRemaining.startsWith("}}")) {
      bracesToAdd = "";
    } else if (afterRemaining.startsWith("}")) {
      bracesToAdd = "}";
    }
    
    return {
      insertAt: lastOpenBrace + 2,
      replaceEnd: cursorPosition + remainingPartial.length, // Where the replacement should end
      partial,
      suggestions: filtered,
      bracesToAdd,
      charOffset: lastOpenBrace, // For positioning dropdown
    };
  }, [value, cursorPosition, variables]);

  useEffect(() => {
    if (autocompleteState && isFocused && environment) {
      setShowAutocomplete(true);
      setAutocompleteIndex(0);
      
      // Measure the text width to position dropdown under the {{
      if (measureRef.current && containerRef.current) {
        const textBeforeBrace = value.slice(0, autocompleteState.charOffset);
        measureRef.current.textContent = textBeforeBrace;
        const textWidth = measureRef.current.offsetWidth;
        const containerWidth = containerRef.current.offsetWidth;
        // Position dropdown, but keep it within container bounds
        const maxLeft = Math.max(0, containerWidth - 220);
        setDropdownLeft(Math.min(textWidth + 12, maxLeft)); // 12px for padding
      }
    } else {
      setShowAutocomplete(false);
    }
  }, [autocompleteState, isFocused, environment, value]);

  const handleSelect = (varName: string) => {
    if (!autocompleteState) return;
    
    // Replace from insertAt to replaceEnd with the full variable name + appropriate braces
    const before = value.slice(0, autocompleteState.insertAt);
    const after = value.slice(autocompleteState.replaceEnd);
    const bracesToAdd = autocompleteState.bracesToAdd;
    const newValue = before + varName + bracesToAdd + after;
    onChange(newValue);
    
    // Move cursor after the inserted variable (after the closing braces)
    const newCursorPos = autocompleteState.insertAt + varName.length + bracesToAdd.length;
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

  const handleScroll = () => {
    if (inputRef.current) {
      setScrollLeft(inputRef.current.scrollLeft);
    }
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Hidden span for measuring text width */}
      <span
        ref={measureRef}
        className="pointer-events-none invisible absolute whitespace-pre px-3 font-mono text-sm"
        aria-hidden
      />
      
      {/* Highlighted overlay */}
      <div
        ref={overlayRef}
        className="pointer-events-none absolute inset-0 flex items-center overflow-hidden px-3 py-2 font-mono text-sm"
        aria-hidden
      >
        <span 
          className="whitespace-pre"
          style={{ transform: `translateX(-${scrollLeft}px)` }}
        >
          {value ? renderHighlightedText(value, matches, { variableValues, secretValues, secrets }) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </span>
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
        onScroll={handleScroll}
        onFocus={() => setIsFocused(true)}
        onBlur={() => {
          // Delay to allow click on autocomplete
          setTimeout(() => setIsFocused(false), 150);
        }}
        placeholder=""
        readOnly={readOnly}
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-transparent caret-foreground ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono"
      />
      
      {/* Autocomplete dropdown - positioned under the {{ */}
      {showAutocomplete && autocompleteState && (
        <div 
          className="absolute top-full z-50 mt-1 max-h-48 min-w-[200px] overflow-auto rounded-md border bg-popover p-1 shadow-md"
          style={{ left: `${dropdownLeft}px` }}
        >
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
                {secrets.includes(v) ? "environment secret" : "environment variable"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
