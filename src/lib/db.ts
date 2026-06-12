import postgres from "postgres";

const connection = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!connection) {
  console.warn("No database connection string found. Set NETLIFY_DATABASE_URL, DATABASE_URL, or POSTGRES_URL.");
}

export const sql = postgres(connection || "postgres://missing", {
  ssl: connection?.includes("localhost") ? false : "require",
  max: 5,
  idle_timeout: 20,
  connect_timeout: 10
});
