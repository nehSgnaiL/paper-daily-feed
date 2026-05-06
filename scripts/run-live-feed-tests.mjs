import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const vitestBin = path.join(root, "node_modules", "vitest", "vitest.mjs");

const child = spawn(process.execPath, [vitestBin, "run", "tests/feed-live.test.ts"], {
  cwd: root,
  env: {
    ...process.env,
    PAPER_FEED_LIVE: "1"
  },
  stdio: "inherit"
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});
