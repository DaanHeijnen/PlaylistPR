import postgres from "postgres";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const connection = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!connection) {
  console.error("Missing NETLIFY_DATABASE_URL, DATABASE_URL, or POSTGRES_URL.");
  process.exit(1);
}

const sql = postgres(connection, { ssl: "require" });
const dir = join(process.cwd(), "db", "migrations");
const files = readdirSync(dir).filter((file) => file.endsWith(".sql")).sort();

await sql`CREATE TABLE IF NOT EXISTS schema_migrations (filename text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`;
const appliedRows = await sql`SELECT filename FROM schema_migrations`;
const applied = new Set(appliedRows.map((row) => row.filename));

for (const file of files) {
  if (applied.has(file)) continue;
  console.log(`Applying ${file}`);
  const body = readFileSync(join(dir, file), "utf8");
  await sql.unsafe(body);
  await sql`INSERT INTO schema_migrations (filename) VALUES (${file})`;
}

await sql.end();
console.log("Database is up to date.");
