import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/db/schema";
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function verify() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is not defined');
    return;
  }

  console.log('Testing connection with pooled settings (max: 1)...');
  const queryClient = postgres(connectionString, { 
    max: 1,
    prepare: false
  });
  const db = drizzle(queryClient, { schema });

  try {
    const allUsers = await db.select().from(schema.users).limit(1);
    console.log('Successfully queried users table. Connection is stable.');
    console.log('Result:', allUsers);
  } catch (error: any) {
    console.error('Verification failed:', error.message);
    console.error('Error code:', error.code);
  } finally {
    await queryClient.end();
    process.exit(0);
  }
}

verify();
