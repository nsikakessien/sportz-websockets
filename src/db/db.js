import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

export const pool = connectionString
  ? new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
    })
  : null;

export const db = pool ? drizzle(pool) : null;

if (!connectionString) {
  console.warn("DATABASE_URL is not defined; database access is disabled.");
}
