import { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Trash2 } from "lucide-react";
import { parseHurl, serializeHurl, type HurlRequest } from "@/lib/hurl-parser";
import { CodeEditor } from "@/components/code-editor";

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];
const BODY_METHODS = ["POST", "PUT", "PATCH"];

interface VisualEditorProps {
  content: string;
  onChange: (content: string) => void;
}

export function VisualEditor({ content, onChange }: VisualEditorProps) {
  const request = useMemo(() => parseHurl(content), [content]);

  function update(patch: Partial<HurlRequest>) {
    onChange(serializeHurl({ ...request, ...patch }));
  }

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-4 p-4">
        {/* Method + URL */}
        <div className="flex gap-2">
          <Select
            value={request.method}
            onValueChange={(method) => update({ method })}
          >
            <SelectTrigger className="w-[130px] font-mono text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {METHODS.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            className="flex-1 font-mono text-sm"
            placeholder="https://example.com/api"
            value={request.url}
            onChange={(e) => update({ url: e.target.value })}
          />
        </div>

        {/* Headers */}
        <Section title="Headers">
          {request.headers.map((header, i) => (
            <div key={i} className="flex gap-2">
              <Input
                className="flex-1 font-mono text-sm"
                placeholder="Header name"
                value={header.key}
                onChange={(e) => {
                  const headers = [...request.headers];
                  headers[i] = { ...headers[i], key: e.target.value };
                  update({ headers });
                }}
              />
              <Input
                className="flex-[2] font-mono text-sm"
                placeholder="Value"
                value={header.value}
                onChange={(e) => {
                  const headers = [...request.headers];
                  headers[i] = { ...headers[i], value: e.target.value };
                  update({ headers });
                }}
              />
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => {
                  const headers = request.headers.filter((_, j) => j !== i);
                  update({ headers });
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              update({
                headers: [...request.headers, { key: "", value: "" }],
              })
            }
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            Add Header
          </Button>
        </Section>

        {/* Body */}
        <Section title="Body">
          {request.body || BODY_METHODS.includes(request.method) ? (
            <div className="flex flex-col gap-2">
              <CodeEditor
                value={request.body}
                onChange={(body) => update({ body })}
                language="json"
                minHeight="120px"
              />
              {request.body && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-fit"
                  onClick={() => update({ body: "" })}
                >
                  <Trash2 className="mr-1 h-3.5 w-3.5" />
                  Remove Body
                </Button>
              )}
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => update({ body: "{\n  \n}" })}
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              Add Body
            </Button>
          )}
        </Section>

        {/* Response Status */}
        <Section title="Response">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground font-mono">
              HTTP
            </span>
            <Input
              className="w-[100px] font-mono text-sm"
              placeholder="200"
              value={request.responseStatus}
              onChange={(e) => update({ responseStatus: e.target.value })}
            />
          </div>
        </Section>

        {/* Asserts */}
        <Section title="Asserts">
          {request.asserts.map((assert, i) => (
            <div key={i} className="flex gap-2">
              <Input
                className="flex-1 font-mono text-sm"
                placeholder='jsonpath "$.id" exists'
                value={assert}
                onChange={(e) => {
                  const asserts = [...request.asserts];
                  asserts[i] = e.target.value;
                  update({ asserts });
                }}
              />
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => {
                  const asserts = request.asserts.filter((_, j) => j !== i);
                  update({ asserts });
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => update({ asserts: [...request.asserts, ""] })}
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            Add Assert
          </Button>
        </Section>
      </div>
    </ScrollArea>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      {children}
    </div>
  );
}
