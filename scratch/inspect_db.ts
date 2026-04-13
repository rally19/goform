import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("DATABASE_URL is not defined");
  process.exit(1);
}

const sql = postgres(connectionString, { max: 1 });
const db = drizzle(sql);

async function inspect() {
  try {
    console.log("Checking RLS status for main tables...");
    const rlsStatus = await sql`
      SELECT 
        relname as table_name,
        relrowsecurity as rls_enabled
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
      AND relname IN ('users', 'organizations', 'organization_members', 'forms', 'form_fields', 'form_responses', 'active_form_sessions', 'api_keys', 'organization_invites')
    `;
    console.table(rlsStatus);

    console.log("\nChecking existing policies...");
    const policies = await sql`
      SELECT 
        schemaname,
        tablename,
        policyname,
        permissive,
        roles,
        cmd,
        qual,
        with_check
      FROM pg_policies
      WHERE schemaname = 'public'
    `;
    console.table(policies);

  } catch (err) {
    console.error("Inspection failed:", err);
  } finally {
    await sql.end();
  }
}

inspect();
