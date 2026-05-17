import { cpSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(repoRoot, "src", "db", "migrations");
const dest = join(repoRoot, "dist", "db", "migrations");

mkdirSync(dirname(dest), { recursive: true });
cpSync(src, dest, { recursive: true });
console.log(`copied migrations: ${src} -> ${dest}`);
