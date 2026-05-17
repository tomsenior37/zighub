import { open, rename, stat, unlink } from "node:fs/promises";
import type Database from "better-sqlite3";

export interface SnapshotResult {
  bytes: number;
  durationMs: number;
}

// Produces a consistent point-in-time copy of the live database at destPath.
// Uses better-sqlite3's online backup API so it works while WAL is active and
// writes are in flight — NOT a raw file copy. Writes to ${destPath}.tmp first,
// fsyncs the bytes to disk, then renames to destPath (atomic on POSIX).
export async function snapshot(db: Database.Database, destPath: string): Promise<SnapshotResult> {
  const tmpPath = `${destPath}.tmp`;
  const start = Date.now();

  try {
    await db.backup(tmpPath);

    const handle = await open(tmpPath, "r+");
    try {
      await handle.sync();
    } finally {
      await handle.close();
    }

    await rename(tmpPath, destPath);
  } catch (err) {
    await unlink(tmpPath).catch(() => {});
    throw new Error(`snapshot failed: could not write ${destPath}: ${formatError(err)}`, {
      cause: err,
    });
  }

  const { size } = await stat(destPath);
  return { bytes: size, durationMs: Date.now() - start };
}

function formatError(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
