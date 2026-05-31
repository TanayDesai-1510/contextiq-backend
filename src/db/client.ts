import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
}).on("error", (err) => {
  console.error("PostgreSQL error", err.message);
});

export const db = drizzle(pool, { schema });