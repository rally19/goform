import postgres from 'postgres';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function checkTables() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is not defined');
    return;
  }

  try {
    const sql = postgres(connectionString, {
      max: 1,
      prepare: false,
      onnotice: console.log,
      onparameter: console.log
    });
    console.log('Attempting to connect...');
    const result = await sql`SELECT 1 as connected`;
    console.log('Connection test:', result);

    const schemas = await sql`
      SELECT schema_name 
      FROM information_schema.schemata
    `;
    console.log('Schemas:', schemas.map(s => s.schema_name));

    const tables = await sql`
      SELECT table_schema, table_name 
      FROM information_schema.tables 
      WHERE table_name = 'users'
    `;
    console.log('Found "users" table in these schemas:', tables);
    
    if (tables.length === 0) {
      console.log('users table NOT FOUND in any schema.');
    }
    await sql.end();
  } catch (error: any) {
    console.error('Full Error Object:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    console.error('Error message:', error.message);
    console.error('Error detail:', error.detail);
    console.error('Error code:', error.code);
  }
}

checkTables();
