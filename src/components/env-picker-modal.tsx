import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";

interface EnvPickerModalProps {
  open: boolean;
  environments: string[];
  onSelect: (name: string) => void;
  onSkip: () => void;
}

export function EnvPickerModal({
  open,
  environments,
  onSelect,
  onSkip,
}: EnvPickerModalProps) {
  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Select an Environment</DialogTitle>
          <DialogDescription>
            Choose an environment to use for variable substitution in your requests.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          {environments.map((env) => (
            <Button
              key={env}
              variant="outline"
              className="w-full justify-start gap-2 h-10"
              onClick={() => onSelect(env)}
            >
              <Globe className="h-4 w-4 text-muted-foreground" />
              {env}
            </Button>
          ))}
          {environments.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No environments found. You can create one later from the sidebar.
            </p>
          )}
        </div>
        <Button variant="ghost" className="w-full text-muted-foreground" onClick={onSkip}>
          Skip for now
        </Button>
      </DialogContent>
    </Dialog>
  );
}
