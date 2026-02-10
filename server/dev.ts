import { createApp } from "./index.js";
import path from "node:path";
import os from "node:os";

const dataDir = path.join(os.homedir(), ".hurler");
const app = createApp(dataDir);

app.listen(3001, () => {
  console.log("Hurler API server running on http://localhost:3001");
});
