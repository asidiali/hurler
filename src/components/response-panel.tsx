import type { RunResult } from "@/lib/api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle } from "lucide-react";

interface ResponsePanelProps {
  result: RunResult | null;
  isRunning: boolean;
  hurlSource: string;
}

interface AssertResult {
  line: number;
  success: boolean;
  message?: string;
}

function getStatusColor(status: number) {
  if (status >= 200 && status < 300) return "bg-green-500/15 text-green-700 border-green-500/30";
  if (status >= 300 && status < 400) return "bg-yellow-500/15 text-yellow-700 border-yellow-500/30";
  if (status >= 400 && status < 500) return "bg-orange-500/15 text-orange-700 border-orange-500/30";
  return "bg-red-500/15 text-red-700 border-red-500/30";
}

function extractBodyFromVerbose(stderr: string): string {
  const lines = stderr.split("\n");
  const bodyLines: string[] = [];
  let capturing = false;
  for (const line of lines) {
    if (line.startsWith("* Response body:")) {
      capturing = true;
      continue;
    }
    if (capturing) {
      if (line === "*" || line.startsWith("* Timings:")) break;
      bodyLines.push(line.startsWith("* ") ? line.slice(2) : line);
    }
  }
  return bodyLines.join("\n");
}

function extractResponseInfo(result: RunResult) {
  const json = result.json as {
    entries?: Array<{
      asserts?: AssertResult[];
      calls?: Array<{
        response?: {
          status?: number;
          headers?: Array<{ name: string; value: string }>;
        };
      }>;
    }>;
  };

  const body = extractBodyFromVerbose(result.stderr);

  if (!json?.entries?.length) {
    return { status: 0, headers: [] as Array<{ name: string; value: string }>, body: body || result.stderr, asserts: [] as AssertResult[] };
  }

  const lastEntry = json.entries[json.entries.length - 1];
  const calls = lastEntry.calls ?? [];
  const lastCall = calls[calls.length - 1];
  const response = lastCall?.response;
  const asserts = lastEntry.asserts ?? [];

  return {
    status: response?.status ?? 0,
    headers: response?.headers ?? [],
    body,
    asserts,
  };
}

function getAssertLabel(assert: AssertResult, sourceLines: string[]): string {
  // line is 1-indexed in hurl output
  const sourceLine = sourceLines[assert.line - 1]?.trim();
  if (sourceLine) return sourceLine;
  return `Line ${assert.line}`;
}

function getFailureDetail(message: string): { actual: string; expected: string } | null {
  const actualMatch = message.match(/actual:\s+(.+)/);
  const expectedMatch = message.match(/expected:\s+(.+)/);
  if (actualMatch && expectedMatch) {
    return { actual: actualMatch[1].trim(), expected: expectedMatch[1].trim() };
  }
  return null;
}

export function ResponsePanel({ result, isRunning, hurlSource }: ResponsePanelProps) {
  if (isRunning) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          <span className="text-sm">Running request...</span>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <p className="text-sm">Run a request to see the response</p>
      </div>
    );
  }

  const { status, headers, body, asserts } = extractResponseInfo(result);
  const sourceLines = hurlSource.split("\n");

  // Filter to only explicit asserts (skip the implicit status/HTTP version ones on the HTTP line)
  const explicitAsserts = asserts.filter((a) => {
    const line = sourceLines[a.line - 1]?.trim() ?? "";
    return !line.startsWith("HTTP");
  });

  const passCount = explicitAsserts.filter((a) => a.success).length;
  const failCount = explicitAsserts.filter((a) => !a.success).length;

  let formattedBody = typeof body === "string" ? body : JSON.stringify(body, null, 2);
  if (typeof body === "string") {
    try {
      const parsed = JSON.parse(body);
      formattedBody = JSON.stringify(parsed, null, 2);
    } catch {
      // not JSON, use as-is
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <span className="text-sm font-medium">Response</span>
        {status > 0 && (
          <Badge variant="outline" className={getStatusColor(status)}>
            {status}
          </Badge>
        )}
        {!result.success && (
          <Badge variant="outline" className="bg-red-500/15 text-red-700 border-red-500/30">
            Error
          </Badge>
        )}
        <span className="text-xs text-muted-foreground ml-auto">
          {result.duration}ms
        </span>
      </div>

      <Tabs defaultValue="body" className="flex-1 flex flex-col min-h-0">
        <TabsList className="mx-3 mt-1 w-fit shrink-0">
          <TabsTrigger value="body">Body</TabsTrigger>
          <TabsTrigger value="headers">
            Headers{headers.length > 0 && ` (${headers.length})`}
          </TabsTrigger>
          {explicitAsserts.length > 0 && (
            <TabsTrigger value="asserts">
              Asserts
              {failCount > 0 ? (
                <Badge variant="outline" className="ml-1.5 bg-red-500/15 text-red-700 border-red-500/30 text-[10px] px-1.5 py-0">
                  {failCount} failed
                </Badge>
              ) : (
                <Badge variant="outline" className="ml-1.5 bg-green-500/15 text-green-700 border-green-500/30 text-[10px] px-1.5 py-0">
                  {passCount} passed
                </Badge>
              )}
            </TabsTrigger>
          )}
          <TabsTrigger value="verbose">Verbose</TabsTrigger>
        </TabsList>

        <TabsContent value="body" className="relative flex-1 m-0">
          <div className="absolute inset-0 overflow-auto">
            <pre className="p-3 text-xs font-mono whitespace-pre-wrap break-all">
              {formattedBody || "(empty body)"}
            </pre>
          </div>
        </TabsContent>

        <TabsContent value="headers" className="relative flex-1 m-0">
          <div className="absolute inset-0 overflow-auto">
            <div className="p-3 space-y-1">
              {headers.map((h, i) => (
                <div key={i} className="flex gap-2 text-xs font-mono">
                  <span className="font-semibold text-muted-foreground min-w-[150px]">
                    {h.name}:
                  </span>
                  <span className="break-all">{h.value}</span>
                </div>
              ))}
              {headers.length === 0 && (
                <p className="text-xs text-muted-foreground">No headers</p>
              )}
            </div>
          </div>
        </TabsContent>

        {explicitAsserts.length > 0 && (
          <TabsContent value="asserts" className="relative flex-1 m-0">
            <div className="absolute inset-0 overflow-auto">
              <div className="p-3 space-y-1">
                {explicitAsserts.map((a, i) => {
                  const label = getAssertLabel(a, sourceLines);
                  const detail = a.message ? getFailureDetail(a.message) : null;
                  return (
                    <div
                      key={i}
                      className={`flex items-start gap-2 rounded-md px-2.5 py-2 text-xs font-mono ${
                        a.success
                          ? "bg-green-500/5 text-green-800"
                          : "bg-red-500/5 text-red-800"
                      }`}
                    >
                      {a.success ? (
                        <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0 text-green-600" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-red-600" />
                      )}
                      <div className="min-w-0">
                        <div className="break-all">{label}</div>
                        {detail && (
                          <div className="mt-1 text-[11px] text-muted-foreground space-y-0.5">
                            <div>actual: <span className="text-red-700">{detail.actual}</span></div>
                            <div>expected: <span className="text-green-700">{detail.expected}</span></div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </TabsContent>
        )}

        <TabsContent value="verbose" className="relative flex-1 m-0">
          <div className="absolute inset-0 overflow-auto">
            <pre className="p-3 text-xs font-mono whitespace-pre-wrap break-all">
              {result.stderr || "(no verbose output)"}
            </pre>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
