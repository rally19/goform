import * as fs from 'fs';
import * as path from 'path';

const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  const match = content.match(/DATABASE_URL=.*:(\d+)\//);
  if (match) {
    console.log('Port found in DATABASE_URL:', match[1]);
  } else {
    console.log('Port not found in DATABASE_URL format.');
    // Try to see if it has pgbouncer or similar
    if (content.includes('pgbouncer=true')) {
      console.log('pgbouncer=true found');
    }
  }
} else {
  console.log('.env.local not found');
}
