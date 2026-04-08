require('dotenv').config({ path: '.env.local' });
const postgres = require('postgres');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  // Use session mode URL (port 5432 direct) for migrations
  const connectionString = process.env.DATABASE_URL;
  
  console.log('Connecting to database...');
  
  // Use max:1 and single connection for migration
  const sql = postgres(connectionString, {
    max: 1,
    prepare: false,
    idle_timeout: 20,
    connect_timeout: 10,
  });

  try {
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, '../drizzle/0000_smiling_living_mummy.sql'),
      'utf8'
    );

    // Split by statement-breakpoint comment and execute each
    const statements = migrationSQL
      .split('-->  statement-breakpoint')
      .map(s => s.replace('-->', '').trim())
      .filter(Boolean);

    // Actually parse on --> statement-breakpoint
    const allStatements = migrationSQL
      .split(/--> statement-breakpoint\n?/)
      .map(s => s.trim())
      .filter(Boolean);

    console.log(`Running ${allStatements.length} SQL statements...`);
    
    for (let i = 0; i < allStatements.length; i++) {
      const stmt = allStatements[i];
      if (stmt) {
        console.log(`[${i + 1}/${allStatements.length}] Executing...`);
        try {
          await sql.unsafe(stmt);
        } catch (err) {
          if (err.message && (err.message.includes('already exists') || err.message.includes('duplicate'))) {
            console.log(`  ⚠ Skipped (already exists): ${stmt.substring(0, 60)}...`);
          } else {
            throw err;
          }
        }
      }
    }

    console.log('✅ Migration completed successfully!');
    
    // Check tables exist
    const tables = await sql`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('forms', 'form_fields', 'form_responses', 'users')
      ORDER BY table_name
    `;
    console.log('Tables created:', tables.map(t => t.table_name).join(', '));
    
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

runMigration();
