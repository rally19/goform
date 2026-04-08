import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not defined in the environment variables.");
}

/**
 * Singleton pattern for the database client to prevent multiple 
 * connections during development (hot reloading).
 */
const globalForDb = globalThis as unknown as {
  conn: postgres.Sql<{}> | undefined;
};

const queryClient = globalForDb.conn ?? postgres(connectionString, { 
  max: 1, // Crucial for serverless/development to prevent too many connections
  prepare: false // Required for Supabase transaction mode poolers
});

if (process.env.NODE_ENV !== "production") {
  globalForDb.conn = queryClient;
}

export const db = drizzle(queryClient, { schema });
