import type Database from "better-sqlite3";
import { ValidationError } from "./errors.js";

export { ValidationError };

export interface Location {
  id: number;
  name: string;
  parent_id: number | null;
  created_at: string;
}

export interface CreateLocationInput {
  name: string;
  parent_id?: number | null;
}

export interface UpdateLocationInput {
  name: string;
}

function normaliseName(name: string): string {
  if (typeof name !== "string") {
    throw new ValidationError("name must be a string");
  }
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    throw new ValidationError("name must not be empty");
  }
  return trimmed;
}

export function create(db: Database.Database, input: CreateLocationInput): Location {
  const name = normaliseName(input.name);
  const parentId = input.parent_id ?? null;
  const info = db
    .prepare("INSERT INTO locations (name, parent_id) VALUES (?, ?)")
    .run(name, parentId);
  const row = get(db, Number(info.lastInsertRowid));
  if (!row) {
    throw new Error("failed to load location after insert");
  }
  return row;
}

export function list(db: Database.Database): Location[] {
  return db
    .prepare(
      "SELECT id, name, parent_id, created_at FROM locations ORDER BY name COLLATE NOCASE ASC",
    )
    .all() as Location[];
}

export function get(db: Database.Database, id: number): Location | undefined {
  return db
    .prepare("SELECT id, name, parent_id, created_at FROM locations WHERE id = ?")
    .get(id) as Location | undefined;
}

export function update(db: Database.Database, id: number, input: UpdateLocationInput): Location {
  const name = normaliseName(input.name);
  const info = db.prepare("UPDATE locations SET name = ? WHERE id = ?").run(name, id);
  if (info.changes === 0) {
    throw new ValidationError(`location ${id} not found`);
  }
  const row = get(db, id);
  if (!row) {
    throw new Error(`location ${id} disappeared after update`);
  }
  return row;
}

export function deleteLocation(db: Database.Database, id: number): void {
  db.prepare("DELETE FROM locations WHERE id = ?").run(id);
}
