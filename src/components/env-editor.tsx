import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Trash2, Save, Eye, EyeOff, Lock, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import * as api from "@/lib/api";

interface EnvEditorProps {
  open: boolean;
  onClose: () => void;
  environments: string[];
  onRefresh: () => void;
}

interface EnvVar {
  key: string;
  value: string;
}

export function EnvEditor({
  open,
  onClose,
  environments,
  onRefresh,
}: EnvEditorProps) {
  const [selectedEnv, setSelectedEnv] = useState<string | null>(null);
  const [variables, setVariables] = useState<EnvVar[]>([]);
  const [secrets, setSecrets] = useState<EnvVar[]>([]);
  const [showNewEnvDialog, setShowNewEnvDialog] = useState(false);
  const [newEnvName, setNewEnvName] = useState("");
  const [isDirty, setIsDirty] = useState(false);
  const [showSecretValues, setShowSecretValues] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (selectedEnv) {
      api.readEnvironment(selectedEnv).then((env) => {
        setVariables(
          Object.entries(env.variables).map(([key, value]) => ({ key, value }))
        );
        setSecrets(
          Object.entries(env.secrets || {}).map(([key, value]) => ({ key, value }))
        );
        setIsDirty(false);
        setShowSecretValues({});
      });
    } else {
      setVariables([]);
      setSecrets([]);
      setIsDirty(false);
      setShowSecretValues({});
    }
  }, [selectedEnv]);

  useEffect(() => {
    if (open && environments.length > 0 && !selectedEnv) {
      setSelectedEnv(environments[0]);
    }
  }, [open, environments, selectedEnv]);

  const addVariable = () => {
    setVariables([...variables, { key: "", value: "" }]);
    setIsDirty(true);
  };

  const removeVariable = (index: number) => {
    setVariables(variables.filter((_, i) => i !== index));
    setIsDirty(true);
  };

  const updateVariable = (
    index: number,
    field: "key" | "value",
    val: string
  ) => {
    const newVars = [...variables];
    newVars[index] = { ...newVars[index], [field]: val };
    setVariables(newVars);
    setIsDirty(true);
  };

  const addSecret = () => {
    setSecrets([...secrets, { key: "", value: "" }]);
    setIsDirty(true);
  };

  const removeSecret = (index: number) => {
    setSecrets(secrets.filter((_, i) => i !== index));
    const newShowSecrets = { ...showSecretValues };
    delete newShowSecrets[index];
    setShowSecretValues(newShowSecrets);
    setIsDirty(true);
  };

  const updateSecret = (
    index: number,
    field: "key" | "value",
    val: string
  ) => {
    const newSecrets = [...secrets];
    newSecrets[index] = { ...newSecrets[index], [field]: val };
    setSecrets(newSecrets);
    setIsDirty(true);
  };

  const toggleSecretVisibility = (index: number) => {
    setShowSecretValues(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const handleSave = async () => {
    if (!selectedEnv) return;
    const vars: Record<string, string> = {};
    for (const v of variables) {
      if (v.key.trim()) {
        vars[v.key.trim()] = v.value;
      }
    }
    const secs: Record<string, string> = {};
    for (const s of secrets) {
      if (s.key.trim()) {
        secs[s.key.trim()] = s.value;
      }
    }
    await api.updateEnvironment(selectedEnv, vars, secs);
    setIsDirty(false);
  };

  const handleCreateEnv = async () => {
    if (!newEnvName.trim()) return;
    await api.createEnvironment(newEnvName.trim());
    setNewEnvName("");
    setShowNewEnvDialog(false);
    onRefresh();
    setSelectedEnv(newEnvName.trim().replace(/[^a-zA-Z0-9_-]/g, "_"));
  };

  const handleDeleteEnv = async () => {
    if (!selectedEnv) return;
    await api.deleteEnvironment(selectedEnv);
    setSelectedEnv(null);
    onRefresh();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Manage Environments</DialogTitle>
          </DialogHeader>

          <div className="flex items-center gap-2">
            <Select
              value={selectedEnv ?? "__none__"}
              onValueChange={(v) =>
                setSelectedEnv(v === "__none__" ? null : v)
              }
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select environment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Select environment...</SelectItem>
                {environments.map((env) => (
                  <SelectItem key={env} value={env}>
                    {env}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowNewEnvDialog(true)}
            >
              <Plus className="h-4 w-4" />
            </Button>
            {selectedEnv && (
              <Button variant="destructive" size="icon" onClick={handleDeleteEnv}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>

          {selectedEnv && (
            <ScrollArea className="flex-1 max-h-[400px]">
              <div className="space-y-4 pr-4">
                {/* Variables Section */}
                <div className="space-y-2">
                  <div className="text-sm font-medium text-foreground flex items-center gap-1.5">
                    Variables
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">Environment variables are stored in plain text and safe to commit to version control. Use for non-sensitive configuration like API URLs or feature flags.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className="grid grid-cols-[1fr_1fr_40px] gap-2 text-xs font-medium text-muted-foreground px-1">
                    <span>Key</span>
                    <span>Value</span>
                    <span />
                  </div>
                  {variables.map((v, i) => (
                    <div key={i} className="grid grid-cols-[1fr_1fr_40px] gap-2">
                      <Input
                        placeholder="key"
                        value={v.key}
                        onChange={(e) => updateVariable(i, "key", e.target.value)}
                        className="h-8 text-sm font-mono"
                      />
                      <Input
                        placeholder="value"
                        value={v.value}
                        onChange={(e) =>
                          updateVariable(i, "value", e.target.value)
                        }
                        className="h-8 text-sm font-mono"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => removeVariable(i)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addVariable}
                    className="w-full"
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Add Variable
                  </Button>
                </div>

                {/* Secrets Section */}
                <div className="space-y-2 pt-2 border-t">
                  <div className="text-sm font-medium text-foreground flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5 text-amber-500" />
                    Secrets
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">Secrets are stored separately and gitignored by default. Use for API keys, tokens, passwords, and other sensitive values.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className="grid grid-cols-[1fr_1fr_72px] gap-2 text-xs font-medium text-muted-foreground px-1">
                    <span>Key</span>
                    <span>Value</span>
                    <span />
                  </div>
                  {secrets.map((s, i) => (
                    <div key={i} className="grid grid-cols-[1fr_1fr_72px] gap-2">
                      <Input
                        placeholder="key"
                        value={s.key}
                        onChange={(e) => updateSecret(i, "key", e.target.value)}
                        className="h-8 text-sm font-mono"
                      />
                      <Input
                        placeholder="value"
                        type={showSecretValues[i] ? "text" : "password"}
                        value={s.value}
                        onChange={(e) =>
                          updateSecret(i, "value", e.target.value)
                        }
                        className="h-8 text-sm font-mono"
                      />
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => toggleSecretVisibility(i)}
                        >
                          {showSecretValues[i] ? (
                            <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                          ) : (
                            <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => removeSecret(i)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addSecret}
                    className="w-full"
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Add Secret
                  </Button>
                </div>
              </div>
            </ScrollArea>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            {selectedEnv && (
              <Button onClick={handleSave} disabled={!isDirty}>
                <Save className="mr-1 h-3.5 w-3.5" />
                Save
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showNewEnvDialog} onOpenChange={setShowNewEnvDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Environment</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Environment name"
            value={newEnvName}
            onChange={(e) => setNewEnvName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreateEnv()}
            autoFocus
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowNewEnvDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateEnv} disabled={!newEnvName.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
