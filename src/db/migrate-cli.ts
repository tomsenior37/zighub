import { getDb, resolveDbPath } from "./connection.js";
import { migrate } from "./migrate.js";

function main(): void {
  const path = resolveDbPath();
  const db = getDb({ path });
  try {
    const result = migrate(db);
    if (result.applied.length === 0) {
      console.log(
        `[db:migrate] up to date at ${path} (${result.skipped.length.toString()} migrations on record)`,
      );
    } else {
      console.log(
        `[db:migrate] applied ${result.applied.length.toString()} migration(s) to ${path}:`,
      );
      for (const name of result.applied) {
        console.log(`  - ${name}`);
      }
    }
  } finally {
    db.close();
  }
}

main();
