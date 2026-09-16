import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const sourceDir = path.join(rootDir, "artifacts/reality/dist/public");
const publicDir = path.join(rootDir, "public");

await rm(publicDir, { recursive: true, force: true });
await mkdir(publicDir, { recursive: true });
await cp(sourceDir, publicDir, { recursive: true });

console.log(`Prepared Vercel static assets in ${publicDir}`);
