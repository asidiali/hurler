const BASE = "/api";

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// Files
export interface FileInfo {
  name: string;
  method: string | null;
}

export const listFiles = () => fetchJSON<FileInfo[]>(`${BASE}/files`);

export const createFile = (name: string, content?: string) =>
  fetchJSON<{ name: string }>(`${BASE}/files`, {
    method: "POST",
    body: JSON.stringify({ name, content }),
  });

export const readFile = (name: string) =>
  fetchJSON<{ name: string; content: string }>(`${BASE}/files/${name}`);

export const updateFile = (name: string, content: string) =>
  fetchJSON<{ name: string }>(`${BASE}/files/${name}`, {
    method: "PUT",
    body: JSON.stringify({ content }),
  });

export const deleteFile = (name: string) =>
  fetchJSON<{ ok: boolean }>(`${BASE}/files/${name}`, { method: "DELETE" });

export const renameFile = (name: string, newName: string) =>
  fetchJSON<{ oldName: string; newName: string }>(`${BASE}/files/${name}`, {
    method: "PATCH",
    body: JSON.stringify({ newName }),
  });

// Environments
export const listEnvironments = () =>
  fetchJSON<string[]>(`${BASE}/environments`);

export const createEnvironment = (
  name: string,
  variables?: Record<string, string>,
  secrets?: Record<string, string>
) =>
  fetchJSON<{ name: string }>(`${BASE}/environments`, {
    method: "POST",
    body: JSON.stringify({ name, variables, secrets }),
  });

export const readEnvironment = (name: string) =>
  fetchJSON<{ name: string; variables: Record<string, string>; secrets: Record<string, string> }>(
    `${BASE}/environments/${name}`
  );

export const updateEnvironment = (
  name: string,
  variables: Record<string, string>,
  secrets: Record<string, string>
) =>
  fetchJSON<{ name: string }>(`${BASE}/environments/${name}`, {
    method: "PUT",
    body: JSON.stringify({ variables, secrets }),
  });

export const deleteEnvironment = (name: string) =>
  fetchJSON<{ ok: boolean }>(`${BASE}/environments/${name}`, {
    method: "DELETE",
  });

// Metadata
export interface Section {
  id: string;
  name: string;
}

export interface Metadata {
  sections: Section[];
  fileGroups: Record<string, string>;
}

export const getMetadata = () => fetchJSON<Metadata>(`${BASE}/metadata`);

export const updateMetadata = (metadata: Metadata) =>
  fetchJSON<Metadata>(`${BASE}/metadata`, {
    method: "PUT",
    body: JSON.stringify(metadata),
  });

// Run
export interface RunResult {
  success: boolean;
  duration: number;
  json: unknown;
  stdout: string;
  stderr: string;
}

export const runHurl = (file: string, environment?: string) =>
  fetchJSON<RunResult>(`${BASE}/run`, {
    method: "POST",
    body: JSON.stringify({ file, environment }),
  });
