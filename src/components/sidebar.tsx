import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FileText,
  Plus,
  MoreVertical,
  Trash2,
  Settings,
  Globe,
  ChevronRight,
  ChevronDown,
  FolderPlus,
  Pencil,
} from "lucide-react";
import type { Metadata } from "@/lib/api";

interface SidebarProps {
  files: string[];
  activeFile: string | null;
  onSelectFile: (name: string) => void;
  onCreateFile: (name: string) => void;
  onDeleteFile: (name: string) => void;
  metadata: Metadata;
  onUpdateMetadata: (metadata: Metadata) => void;
  environments: string[];
  activeEnvironment: string | null;
  onSelectEnvironment: (name: string | null) => void;
  onOpenEnvEditor: () => void;
}

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

export function Sidebar({
  files,
  activeFile,
  onSelectFile,
  onCreateFile,
  onDeleteFile,
  metadata,
  onUpdateMetadata,
  environments,
  activeEnvironment,
  onSelectEnvironment,
  onOpenEnvEditor,
}: SidebarProps) {
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingSectionName, setEditingSectionName] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingSectionId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingSectionId]);

  const handleCreate = () => {
    if (newFileName.trim()) {
      onCreateFile(newFileName.trim());
      setNewFileName("");
      setShowNewDialog(false);
    }
  };

  const toggleSection = (sectionId: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const handleCreateSection = () => {
    const id = generateId();
    const updated: Metadata = {
      ...metadata,
      sections: [...metadata.sections, { id, name: "New Section" }],
    };
    onUpdateMetadata(updated);
    setEditingSectionId(id);
    setEditingSectionName("New Section");
  };

  const handleRenameSection = (sectionId: string) => {
    const section = metadata.sections.find((s) => s.id === sectionId);
    if (!section) return;
    setEditingSectionId(sectionId);
    setEditingSectionName(section.name);
  };

  const commitRename = () => {
    if (!editingSectionId) return;
    const name = editingSectionName.trim();
    if (!name) {
      setEditingSectionId(null);
      return;
    }
    const updated: Metadata = {
      ...metadata,
      sections: metadata.sections.map((s) =>
        s.id === editingSectionId ? { ...s, name } : s
      ),
    };
    onUpdateMetadata(updated);
    setEditingSectionId(null);
  };

  const handleDeleteSection = (sectionId: string) => {
    const fileGroups = { ...metadata.fileGroups };
    for (const [file, group] of Object.entries(fileGroups)) {
      if (group === sectionId) {
        delete fileGroups[file];
      }
    }
    const updated: Metadata = {
      ...metadata,
      sections: metadata.sections.filter((s) => s.id !== sectionId),
      fileGroups,
    };
    onUpdateMetadata(updated);
  };

  const handleMoveFile = (fileName: string, sectionId: string | null) => {
    const fileGroups = { ...metadata.fileGroups };
    if (sectionId) {
      fileGroups[fileName] = sectionId;
    } else {
      delete fileGroups[fileName];
    }
    onUpdateMetadata({ ...metadata, fileGroups });
  };

  // Group files by section
  const sectionFiles = new Map<string, string[]>();
  for (const section of metadata.sections) {
    sectionFiles.set(section.id, []);
  }
  const ungroupedFiles: string[] = [];

  for (const file of files) {
    const sectionId = metadata.fileGroups[file];
    if (sectionId && sectionFiles.has(sectionId)) {
      sectionFiles.get(sectionId)!.push(file);
    } else {
      ungroupedFiles.push(file);
    }
  }

  const renderFileItem = (file: string) => (
    <div
      key={file}
      className={`group flex items-center rounded-md px-2 py-1.5 text-sm cursor-pointer ${
        activeFile === file
          ? "bg-accent text-accent-foreground"
          : "hover:bg-accent/50"
      }`}
      onClick={() => onSelectFile(file)}
    >
      <FileText className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="truncate flex-1">{file}</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {metadata.sections.length > 0 && (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Move to</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {metadata.sections.map((section) => (
                  <DropdownMenuItem
                    key={section.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMoveFile(file, section.id);
                    }}
                    disabled={metadata.fileGroups[file] === section.id}
                  >
                    {section.name}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMoveFile(file, null);
                  }}
                  disabled={!metadata.fileGroups[file]}
                >
                  Ungrouped
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          )}
          <DropdownMenuItem
            className="text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteFile(file);
            }}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  const renderSectionHeader = (
    sectionId: string,
    name: string,
    isUngrouped = false
  ) => {
    const isCollapsed = collapsedSections.has(sectionId);
    const isEditing = editingSectionId === sectionId;

    return (
      <div className="group flex items-center gap-1 px-1 py-1 text-xs font-medium text-muted-foreground">
        <button
          className="flex items-center gap-1 flex-1 min-w-0 hover:text-foreground"
          onClick={() => toggleSection(sectionId)}
        >
          {isCollapsed ? (
            <ChevronRight className="h-3.5 w-3.5 shrink-0" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 shrink-0" />
          )}
          {isEditing ? (
            <Input
              ref={editInputRef}
              className="h-5 text-xs px-1 py-0"
              value={editingSectionName}
              onChange={(e) => setEditingSectionName(e.target.value)}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Enter") commitRename();
                if (e.key === "Escape") setEditingSectionId(null);
              }}
              onBlur={commitRename}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span
              className="truncate"
              onDoubleClick={(e) => {
                if (!isUngrouped) {
                  e.stopPropagation();
                  handleRenameSection(sectionId);
                }
              }}
            >
              {name}
            </span>
          )}
        </button>
        {!isUngrouped && !isEditing && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 opacity-0 group-hover:opacity-100"
              >
                <MoreVertical className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleRenameSection(sectionId)}>
                <Pencil className="mr-2 h-4 w-4" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => handleDeleteSection(sectionId)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete section
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-full w-full flex-col bg-muted/30">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <span className="text-sm font-semibold">Requests</span>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleCreateSection}
            title="New section"
          >
            <FolderPlus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setShowNewDialog(true)}
            title="New request"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-1">
          {metadata.sections.map((section) => {
            const sectionFileList = sectionFiles.get(section.id) ?? [];
            const isCollapsed = collapsedSections.has(section.id);
            return (
              <div key={section.id}>
                {renderSectionHeader(section.id, section.name)}
                {!isCollapsed &&
                  sectionFileList.map((file) => (
                    <div key={file} className="pl-3">
                      {renderFileItem(file)}
                    </div>
                  ))}
              </div>
            );
          })}

          {/* Ungrouped section */}
          {(ungroupedFiles.length > 0 || metadata.sections.length > 0) && (
            <div>
              {metadata.sections.length > 0 &&
                renderSectionHeader("__ungrouped__", "Ungrouped", true)}
              {!collapsedSections.has("__ungrouped__") &&
                ungroupedFiles.map((file) => (
                  <div
                    key={file}
                    className={metadata.sections.length > 0 ? "pl-3" : ""}
                  >
                    {renderFileItem(file)}
                  </div>
                ))}
            </div>
          )}

          {files.length === 0 && (
            <p className="px-3 py-4 text-xs text-muted-foreground text-center">
              No requests yet. Click + to create one.
            </p>
          )}
        </div>
      </ScrollArea>

      <Separator />

      <div className="p-3 space-y-2">
        <div className="flex items-center gap-1">
          <Globe className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">
            Environment
          </span>
        </div>
        <div className="flex gap-1">
          <Select
            value={activeEnvironment ?? "__none__"}
            onValueChange={(v) =>
              onSelectEnvironment(v === "__none__" ? null : v)
            }
          >
            <SelectTrigger className="h-8 text-xs flex-1">
              <SelectValue placeholder="No environment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">No environment</SelectItem>
              {environments.map((env) => (
                <SelectItem key={env} value={env}>
                  {env}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={onOpenEnvEditor}
          >
            <Settings className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Request</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Request name"
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!newFileName.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
