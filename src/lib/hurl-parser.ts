export interface HurlRequest {
  method: string;
  url: string;
  headers: { key: string; value: string }[];
  body: string;
  responseStatus: string;
  captures: string[];
  asserts: string[];
}

export function parseHurl(content: string): HurlRequest {
  const result: HurlRequest = {
    method: "GET",
    url: "",
    headers: [],
    body: "",
    responseStatus: "",
    captures: [],
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

  // Parse [Captures] and [Asserts] sections
  let currentSection: "none" | "captures" | "asserts" = "none";

  while (i < lines.length) {
    const trimmed = lines[i].trim();

    if (trimmed === "[Captures]") {
      currentSection = "captures";
      i++;
      continue;
    }
    if (trimmed === "[Asserts]") {
      currentSection = "asserts";
      i++;
      continue;
    }

    if (trimmed !== "") {
      if (currentSection === "captures") {
        result.captures.push(trimmed);
      } else if (currentSection === "asserts") {
        result.asserts.push(trimmed);
      }
      // If no section header yet, ignore orphan lines (shouldn't happen in valid hurl)
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
  const hasCaptures = request.captures.some((c) => c.trim());
  const hasAsserts = request.asserts.some((a) => a.trim());

  if (request.responseStatus || hasCaptures || hasAsserts) {
    lines.push("");
    lines.push(`HTTP ${request.responseStatus || "*"}`);

    // Captures section (comes before Asserts in Hurl)
    if (hasCaptures) {
      lines.push("[Captures]");
      for (const capture of request.captures) {
        if (capture.trim()) {
          lines.push(capture);
        }
      }
    }

    // Asserts section
    if (hasAsserts) {
      lines.push("[Asserts]");
      for (const assert of request.asserts) {
        if (assert.trim()) {
          lines.push(assert);
        }
      }
    }
  }

  lines.push("");
  return lines.join("\n");
}
