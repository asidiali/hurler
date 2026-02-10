#!/usr/bin/env node
import { createApp } from "./index.js";
import path from "node:path";
import { parseArgs } from "node:util";
import { mkdirSync } from "node:fs";
import { execSync } from "node:child_process";

// Check if hurl is installed
function checkHurlInstalled(): void {
  try {
    execSync("hurl --version", { stdio: "ignore" });
  } catch {
    console.error("\x1b[31mError: hurl is not installed or not in PATH.\x1b[0m");
    console.error("");
    console.error("Hurler requires hurl to run HTTP requests.");
    console.error("Install it from: https://hurl.dev/docs/installation.html");
    console.error("");
    process.exit(1);
  }
}

checkHurlInstalled();

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
