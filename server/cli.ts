#!/usr/bin/env node
import { createApp } from "./index.js";
import path from "node:path";
import { parseArgs } from "node:util";
import { mkdirSync } from "node:fs";

const { values } = parseArgs({
  options: {
    port: { type: "string", short: "p" },
    open: { type: "boolean" },
  },
});

const dataDir = path.join(process.cwd(), ".hurl");
const port = parseInt(values.port ?? process.env.PORT ?? "4000", 10);

mkdirSync(path.join(dataDir, "collections"), { recursive: true });
mkdirSync(path.join(dataDir, "environments"), { recursive: true });

const app = createApp(dataDir);

app.listen(port, async () => {
  const url = `http://localhost:${port}`;
  console.log(`Hurler running at ${url}`);
  console.log(`Data: ${dataDir}`);
  if (values.open) {
    const { default: open } = await import("open");
    open(url);
  }
});
