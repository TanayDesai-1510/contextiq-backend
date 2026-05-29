// import { drizzle } from "drizzle-orm/node-postgres";
// import { Pool } from "pg";
// import { env } from "../config/env";
// import * as schema from "./schema";

// const pool = new Pool({
//   connectionString: env.DATABASE_URL,
// }).on("error", (err) => {
//   console.error("PostgreSQL error", err.message);
// });

// export const db = drizzle(pool, { schema });

// import { drizzle } from "drizzle-orm/node-postgres";
// import { Pool } from "pg";
// import dotenv from "dotenv";
// import * as schema from "./schema";

// dotenv.config()

// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
// }).on("error", (err) => {
//   console.error("PostgreSQL error", err.message);
// });

// export const db = drizzle(pool, { schema });

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";


console.log('Connecting to:', 'localhost', 5499, 'contextiq', 'postgres')

const pool = new Pool({
  host: "127.0.0.1",
  port: 5499,
  database: "contextiq",
  user: "postgres",
  password: "postgres",
}).on("error", (err) => {
  console.error("PostgreSQL error", err.message);
});

export const db = drizzle(pool, { schema });