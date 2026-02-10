import { type ReactNode, useState, useCallback, useRef } from "react";

interface AppLayoutProps {
  sidebar: ReactNode;
  editor: ReactNode;
  response: ReactNode;
}

function DragHandle({
  direction,
  onDrag,
}: {
  direction: "horizontal" | "vertical";
  onDrag: (delta: number) => void;
}) {
  const dragging = useRef(false);
  const lastPos = useRef(0);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      dragging.current = true;
      lastPos.current = direction === "horizontal" ? e.clientX : e.clientY;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [direction]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current) return;
      const pos = direction === "horizontal" ? e.clientX : e.clientY;
      onDrag(pos - lastPos.current);
      lastPos.current = pos;
    },
    [direction, onDrag]
  );

  const onPointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  const isHoriz = direction === "horizontal";

  return (
    <div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      className={`${
        isHoriz ? "w-1.5 cursor-col-resize" : "h-1.5 cursor-row-resize"
      } bg-border hover:bg-primary/20 transition-colors shrink-0 select-none`}
    />
  );
}

export function AppLayout({ sidebar, editor, response }: AppLayoutProps) {
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const [editorRatio, setEditorRatio] = useState(0.55);
  const mainRef = useRef<HTMLDivElement>(null);

  const onSidebarDrag = useCallback((delta: number) => {
    setSidebarWidth((w) => Math.max(180, Math.min(600, w + delta)));
  }, []);

  const onEditorDrag = useCallback((delta: number) => {
    if (!mainRef.current) return;
    const totalHeight = mainRef.current.clientHeight;
    setEditorRatio((r) =>
      Math.max(0.15, Math.min(0.85, r + delta / totalHeight))
    );
  }, []);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden">
      <div className="h-9 shrink-0 flex items-center px-3 border-b bg-muted/40">
        <span className="text-sm font-semibold tracking-tight">Hurler</span>
      </div>
      <div className="flex flex-1 min-h-0 overflow-hidden">
      <div style={{ width: sidebarWidth }} className="shrink-0 overflow-hidden">
        {sidebar}
      </div>
      <DragHandle direction="horizontal" onDrag={onSidebarDrag} />
      <div ref={mainRef} className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div style={{ flex: editorRatio }} className="min-h-0 overflow-hidden">
          {editor}
        </div>
        <DragHandle direction="vertical" onDrag={onEditorDrag} />
        <div style={{ flex: 1 - editorRatio }} className="min-h-0 overflow-hidden">
          {response}
        </div>
      </div>
      </div>
    </div>
  );
}
