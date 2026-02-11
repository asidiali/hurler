import express, { type Request, type Response } from "express";
import { promises as fs } from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

interface MetadataSection {
  id: string;
  name: string;
}

interface Metadata {
  sections: MetadataSection[];
  fileGroups: Record<string, string>;
}

const DEFAULT_METADATA: Metadata = { sections: [], fileGroups: {} };

export function createApp(dataDir: string) {
  const app = express();
  app.use(express.json());

  const COLLECTIONS_DIR = path.join(dataDir, "collections");
  const ENVIRONMENTS_DIR = path.join(dataDir, "environments");
  const METADATA_PATH = path.join(dataDir, "metadata.json");

  async function ensureDirs() {
    await fs.mkdir(COLLECTIONS_DIR, { recursive: true });
    await fs.mkdir(ENVIRONMENTS_DIR, { recursive: true });
  }

  async function readMetadata(): Promise<Metadata> {
    try {
      const raw = await fs.readFile(METADATA_PATH, "utf-8");
      return JSON.parse(raw) as Metadata;
    } catch {
      return { ...DEFAULT_METADATA, sections: [], fileGroups: {} };
    }
  }

  async function writeMetadata(metadata: Metadata): Promise<void> {
    await fs.writeFile(METADATA_PATH, JSON.stringify(metadata, null, 2), "utf-8");
  }

  // --- File endpoints ---

  app.get("/api/files", async (_req: Request, res: Response) => {
    await ensureDirs();
    const files = await fs.readdir(COLLECTIONS_DIR);
    const hurlFiles = files.filter((f) => f.endsWith(".hurl"));
    res.json(hurlFiles.map((f) => f.replace(/\.hurl$/, "")));
  });

  app.post("/api/files", async (req: Request, res: Response) => {
    await ensureDirs();
    const { name, content } = req.body as { name: string; content?: string };
    if (!name || typeof name !== "string") {
      res.status(400).json({ error: "name is required" });
      return;
    }
    const safeName = name.replace(/[^a-zA-Z0-9_-]/g, "_");
    const filePath = path.join(COLLECTIONS_DIR, `${safeName}.hurl`);
    try {
      await fs.access(filePath);
      res.status(409).json({ error: "File already exists" });
      return;
    } catch {
      // File doesn't exist, good
    }
    await fs.writeFile(filePath, content ?? "", "utf-8");
    res.status(201).json({ name: safeName });
  });

  app.get("/api/files/:name", async (req: Request, res: Response) => {
    await ensureDirs();
    const filePath = path.join(COLLECTIONS_DIR, `${req.params.name}.hurl`);
    try {
      const content = await fs.readFile(filePath, "utf-8");
      res.json({ name: req.params.name, content });
    } catch {
      res.status(404).json({ error: "File not found" });
    }
  });

  app.put("/api/files/:name", async (req: Request, res: Response) => {
    await ensureDirs();
    const filePath = path.join(COLLECTIONS_DIR, `${req.params.name}.hurl`);
    const { content } = req.body as { content: string };
    await fs.writeFile(filePath, content, "utf-8");
    res.json({ name: req.params.name });
  });

  app.delete("/api/files/:name", async (req: Request, res: Response) => {
    await ensureDirs();
    const filePath = path.join(COLLECTIONS_DIR, `${req.params.name}.hurl`);
    try {
      await fs.unlink(filePath);
      res.json({ ok: true });
    } catch {
      res.status(404).json({ error: "File not found" });
    }
  });

  app.patch("/api/files/:name", async (req: Request, res: Response) => {
    await ensureDirs();
    const oldName = req.params.name as string;
    const { newName } = req.body as { newName: string };
    if (!newName || typeof newName !== "string") {
      res.status(400).json({ error: "newName is required" });
      return;
    }
    const safeNewName = newName.replace(/[^a-zA-Z0-9_-]/g, "_");
    const oldPath = path.join(COLLECTIONS_DIR, `${oldName}.hurl`);
    const newPath = path.join(COLLECTIONS_DIR, `${safeNewName}.hurl`);

    // Check old file exists
    try {
      await fs.access(oldPath);
    } catch {
      res.status(404).json({ error: "File not found" });
      return;
    }

    // Check new name doesn't already exist (unless same name)
    if (oldName !== safeNewName) {
      try {
        await fs.access(newPath);
        res.status(409).json({ error: "A file with that name already exists" });
        return;
      } catch {
        // Good, doesn't exist
      }
    }

    // Rename the file
    await fs.rename(oldPath, newPath);

    // Update metadata if file was in a section
    const metadata = await readMetadata();
    if (metadata.fileGroups[oldName]) {
      metadata.fileGroups[safeNewName] = metadata.fileGroups[oldName];
      delete metadata.fileGroups[oldName];
      await writeMetadata(metadata);
    }

    res.json({ oldName, newName: safeNewName });
  });

  // --- Metadata endpoints ---

  app.get("/api/metadata", async (_req: Request, res: Response) => {
    const metadata = await readMetadata();
    res.json(metadata);
  });

  app.put("/api/metadata", async (req: Request, res: Response) => {
    const metadata = req.body as Metadata;
    await writeMetadata(metadata);
    res.json(metadata);
  });

  // --- Environment endpoints ---

  app.get("/api/environments", async (_req: Request, res: Response) => {
    await ensureDirs();
    const files = await fs.readdir(ENVIRONMENTS_DIR);
    const envFiles = files.filter((f) => f.endsWith(".env"));
    res.json(envFiles.map((f) => f.replace(/\.env$/, "")));
  });

  app.post("/api/environments", async (req: Request, res: Response) => {
    await ensureDirs();
    const { name, variables } = req.body as {
      name: string;
      variables?: Record<string, string>;
    };
    if (!name || typeof name !== "string") {
      res.status(400).json({ error: "name is required" });
      return;
    }
    const safeName = name.replace(/[^a-zA-Z0-9_-]/g, "_");
    const filePath = path.join(ENVIRONMENTS_DIR, `${safeName}.env`);
    try {
      await fs.access(filePath);
      res.status(409).json({ error: "Environment already exists" });
      return;
    } catch {
      // Doesn't exist, good
    }
    const content = variables
      ? Object.entries(variables)
          .map(([k, v]) => `${k}=${v}`)
          .join("\n")
      : "";
    await fs.writeFile(filePath, content, "utf-8");
    res.status(201).json({ name: safeName });
  });

  app.get("/api/environments/:name", async (req: Request, res: Response) => {
    await ensureDirs();
    const filePath = path.join(ENVIRONMENTS_DIR, `${req.params.name}.env`);
    try {
      const content = await fs.readFile(filePath, "utf-8");
      const variables: Record<string, string> = {};
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx > 0) {
          variables[trimmed.slice(0, eqIdx)] = trimmed.slice(eqIdx + 1);
        }
      }
      res.json({ name: req.params.name, variables });
    } catch {
      res.status(404).json({ error: "Environment not found" });
    }
  });

  app.put("/api/environments/:name", async (req: Request, res: Response) => {
    await ensureDirs();
    const filePath = path.join(ENVIRONMENTS_DIR, `${req.params.name}.env`);
    const { variables } = req.body as { variables: Record<string, string> };
    const content = Object.entries(variables)
      .map(([k, v]) => `${k}=${v}`)
      .join("\n");
    await fs.writeFile(filePath, content, "utf-8");
    res.json({ name: req.params.name });
  });

  app.delete("/api/environments/:name", async (req: Request, res: Response) => {
    await ensureDirs();
    const filePath = path.join(ENVIRONMENTS_DIR, `${req.params.name}.env`);
    try {
      await fs.unlink(filePath);
      res.json({ ok: true });
    } catch {
      res.status(404).json({ error: "Environment not found" });
    }
  });

  // --- Run endpoint ---

  app.post("/api/run", async (req: Request, res: Response) => {
    await ensureDirs();
    const { file, environment } = req.body as {
      file: string;
      environment?: string;
    };
    if (!file) {
      res.status(400).json({ error: "file is required" });
      return;
    }

    const hurlPath = path.join(COLLECTIONS_DIR, `${file}.hurl`);
    try {
      await fs.access(hurlPath);
    } catch {
      res.status(404).json({ error: "Hurl file not found" });
      return;
    }

    const args = ["--json", "--very-verbose", hurlPath];

    if (environment) {
      const envPath = path.join(ENVIRONMENTS_DIR, `${environment}.env`);
      try {
        await fs.access(envPath);
        args.push("--variables-file", envPath);
      } catch {
        res.status(404).json({ error: "Environment file not found" });
        return;
      }
    }

    try {
      const startTime = Date.now();
      const { stdout, stderr } = await execFileAsync("hurl", args, {
        timeout: 30000,
        maxBuffer: 10 * 1024 * 1024,
      });
      const duration = Date.now() - startTime;

      let jsonOutput = null;
      try {
        jsonOutput = JSON.parse(stdout);
      } catch {
        // stdout may not be valid JSON
      }

      res.json({
        success: true,
        duration,
        json: jsonOutput,
        stdout,
        stderr,
      });
    } catch (err: unknown) {
      const duration = 0;
      const error = err as {
        stdout?: string;
        stderr?: string;
        code?: number;
        message?: string;
      };

      let jsonOutput = null;
      if (error.stdout) {
        try {
          jsonOutput = JSON.parse(error.stdout);
        } catch {
          // not valid JSON
        }
      }

      res.json({
        success: false,
        duration,
        json: jsonOutput,
        stdout: error.stdout ?? "",
        stderr: error.stderr ?? error.message ?? "Unknown error",
      });
    }
  });

  // --- Serve frontend ---

  const clientDir = path.join(import.meta.dirname, "../client");
  app.use(express.static(clientDir));
  app.get("/{*path}", (_req, res) => {
    res.sendFile(path.join(clientDir, "index.html"));
  });

  return app;
}
