import { spawn } from "node:child_process";
import { existsSync } from "node:fs";

if (existsSync(".env")) process.loadEnvFile(".env");

const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const processes = [
  spawn(pnpm, ["--filter", "@workspace/api-server", "run", "dev"], {
    stdio: "inherit",
    env: {
      ...process.env,
      NODE_ENV: "development",
      PORT: process.env.API_PORT ?? "8080",
    },
  }),
  spawn(pnpm, ["--filter", "@workspace/reality", "run", "dev"], {
    stdio: "inherit",
    env: {
      ...process.env,
      PORT: process.env.WEB_PORT ?? "5173",
      BASE_PATH: process.env.BASE_PATH ?? "/",
    },
  }),
];

let stopping = false;
function stop(signal = "SIGTERM") {
  if (stopping) return;
  stopping = true;
  for (const child of processes) {
    if (!child.killed) child.kill(signal);
  }
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => stop(signal));
}

for (const child of processes) {
  child.on("error", (error) => {
    console.error(error);
    stop();
    process.exitCode = 1;
  });
  child.on("exit", (code, signal) => {
    if (!stopping && code !== 0) {
      console.error(`Development process exited (${signal ?? code}).`);
      stop();
      process.exitCode = code ?? 1;
    }
  });
}
