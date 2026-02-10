export interface HurlRequest {
  method: string;
  url: string;
  headers: { key: string; value: string }[];
  body: string;
  responseStatus: string;
  asserts: string[];
}

export function parseHurl(content: string): HurlRequest {
  const result: HurlRequest = {
    method: "GET",
    url: "",
    headers: [],
    body: "",
    responseStatus: "",
    asserts: [],
  };

  const lines = content.split("\n");
  if (lines.length === 0) return result;

  // Line 1: METHOD URL
  const firstLine = lines[0].trim();
  if (firstLine) {
    const spaceIdx = firstLine.indexOf(" ");
    if (spaceIdx !== -1) {
      result.method = firstLine.substring(0, spaceIdx).toUpperCase();
      result.url = firstLine.substring(spaceIdx + 1).trim();
    } else {
      result.method = firstLine.toUpperCase();
    }
  }

  // Parse remaining lines
  let i = 1;

  // Headers: lines matching "Key: Value" until blank line, body start, or HTTP line
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed === "") {
      i++;
      break;
    }
    if (trimmed.startsWith("HTTP")) break;

    const colonIdx = trimmed.indexOf(":");
    if (colonIdx > 0 && !trimmed.startsWith("{") && !trimmed.startsWith("[")) {
      result.headers.push({
        key: trimmed.substring(0, colonIdx).trim(),
        value: trimmed.substring(colonIdx + 1).trim(),
      });
      i++;
    } else {
      // Not a header — start of body
      break;
    }
  }

  // Body: lines until HTTP line
  const bodyLines: string[] = [];
  while (i < lines.length) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith("HTTP")) break;
    bodyLines.push(lines[i]);
    i++;
  }

  // Trim trailing empty lines from body
  while (bodyLines.length > 0 && bodyLines[bodyLines.length - 1].trim() === "") {
    bodyLines.pop();
  }
  result.body = bodyLines.join("\n");

  // Response status: HTTP <status>
  if (i < lines.length && lines[i].trim().startsWith("HTTP")) {
    const httpLine = lines[i].trim();
    const parts = httpLine.split(/\s+/);
    if (parts.length >= 2) {
      result.responseStatus = parts[1];
    }
    i++;
  }

  // Asserts section
  while (i < lines.length) {
    const trimmed = lines[i].trim();
    if (trimmed === "[Asserts]") {
      i++;
      continue;
    }
    if (trimmed !== "") {
      result.asserts.push(trimmed);
    }
    i++;
  }

  return result;
}

export function serializeHurl(request: HurlRequest): string {
  const lines: string[] = [];

  // Method + URL
  lines.push(`${request.method} ${request.url}`);

  // Headers
  for (const header of request.headers) {
    if (header.key.trim() || header.value.trim()) {
      lines.push(`${header.key}: ${header.value}`);
    }
  }

  // Body
  if (request.body.trim()) {
    lines.push("");
    lines.push(request.body);
  }

  // Response section
  if (request.responseStatus || request.asserts.length > 0) {
    lines.push("");
    lines.push(`HTTP ${request.responseStatus || "*"}`);

    if (request.asserts.length > 0) {
      const nonEmpty = request.asserts.filter((a) => a.trim());
      if (nonEmpty.length > 0) {
        lines.push("[Asserts]");
        for (const assert of nonEmpty) {
          lines.push(assert);
        }
      }
    }
  }

  lines.push("");
  return lines.join("\n");
}
