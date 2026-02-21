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
import type { Metadata, FileInfo } from "@/lib/api";
import { Badge } from "@/components/ui/badge";

interface SidebarProps {
  files: FileInfo[];
  activeFile: string | null;
  onSelectFile: (name: string) => void;
  onCreateFile: (name: string) => void;
  onDeleteFile: (name: string) => void;
  onRenameFile: (oldName: string, newName: string) => void;
  metadata: Metadata;
  onUpdateMetadata: (metadata: Metadata) => void;
  environments: string[];
  activeEnvironment: string | null;
  onSelectEnvironment: (name: string | null) => void;
  onOpenEnvEditor: () => void;
}

const METHOD_COLORS: Record<string, string> = {
  GET: "bg-green-500/15 text-green-600 dark:text-green-400",
  POST: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  PUT: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  PATCH: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
  DELETE: "bg-red-500/15 text-red-600 dark:text-red-400",
  HEAD: "bg-purple-500/15 text-purple-600 dark:text-purple-400",
  OPTIONS: "bg-gray-500/15 text-gray-600 dark:text-gray-400",
};

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

export function Sidebar({
  files,
  activeFile,
  onSelectFile,
  onCreateFile,
  onDeleteFile,
  onRenameFile,
  metadata,
  onUpdateMetadata,
  environments,
  activeEnvironment,
  onSelectEnvironment,
  onOpenEnvEditor,
}: SidebarProps) {
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [renamingFile, setRenamingFile] = useState<string | null>(null);
  const [renameNewName, setRenameNewName] = useState("");
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
  const sectionFiles = new Map<string, FileInfo[]>();
  for (const section of metadata.sections) {
    sectionFiles.set(section.id, []);
  }
  const ungroupedFiles: FileInfo[] = [];

  for (const fileInfo of files) {
    const sectionId = metadata.fileGroups[fileInfo.name];
    if (sectionId && sectionFiles.has(sectionId)) {
      sectionFiles.get(sectionId)!.push(fileInfo);
    } else {
      ungroupedFiles.push(fileInfo);
    }
  }

  const renderFileItem = (fileInfo: FileInfo) => (
    <div
      key={fileInfo.name}
      className={`group flex items-center rounded-md px-2 py-1.5 text-sm cursor-pointer ${
        activeFile === fileInfo.name
          ? "bg-accent text-accent-foreground"
          : "hover:bg-accent/50"
      }`}
      onClick={() => onSelectFile(fileInfo.name)}
    >
      {fileInfo.method ? (
        <Badge 
          variant="secondary" 
          className={`mr-2 h-5 px-1.5 text-[10px] font-semibold shrink-0 ${METHOD_COLORS[fileInfo.method] ?? ""}`}
        >
          {fileInfo.method}
        </Badge>
      ) : (
        <FileText className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
      )}
      <span className="truncate flex-1">{fileInfo.name}</span>
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
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              setRenamingFile(fileInfo.name);
              setRenameNewName(fileInfo.name);
              setShowRenameDialog(true);
            }}
          >
            <Pencil className="mr-2 h-4 w-4" />
            Rename
          </DropdownMenuItem>
          {metadata.sections.length > 0 && (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Move to</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {metadata.sections.map((section) => (
                  <DropdownMenuItem
                    key={section.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMoveFile(fileInfo.name, section.id);
                    }}
                    disabled={metadata.fileGroups[fileInfo.name] === section.id}
                  >
                    {section.name}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMoveFile(fileInfo.name, null);
                  }}
                  disabled={!metadata.fileGroups[fileInfo.name]}
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
              onDeleteFile(fileInfo.name);
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
                  sectionFileList.map((fileInfo) => (
                    <div key={fileInfo.name} className="pl-3">
                      {renderFileItem(fileInfo)}
                    </div>
                  ))}
              </div>
            );
          })}

          {/* Ungrouped section - only show if there are ungrouped files */}
          {ungroupedFiles.length > 0 && (
            <div>
              {metadata.sections.length > 0 &&
                renderSectionHeader("__ungrouped__", "Ungrouped", true)}
              {!collapsedSections.has("__ungrouped__") &&
                ungroupedFiles.map((fileInfo) => (
                  <div
                    key={fileInfo.name}
                    className={metadata.sections.length > 0 ? "pl-3" : ""}
                  >
                    {renderFileItem(fileInfo)}
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

      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Request</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="New name"
            value={renameNewName}
            onChange={(e) => setRenameNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && renameNewName.trim() && renamingFile) {
                onRenameFile(renamingFile, renameNewName.trim());
                setShowRenameDialog(false);
                setRenamingFile(null);
              }
            }}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRenameDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (renamingFile && renameNewName.trim()) {
                  onRenameFile(renamingFile, renameNewName.trim());
                  setShowRenameDialog(false);
                  setRenamingFile(null);
                }
              }}
              disabled={!renameNewName.trim()}
            >
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
