import postgres from 'postgres';
import fs from 'fs';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_URL as string);

async function main() {
  const schema = fs.readFileSync('supabase/schema.sql', 'utf8');
  await sql.unsafe(schema);
  console.log('Schema applied successfully');
  process.exit(0);
}
main().catch(console.error);
