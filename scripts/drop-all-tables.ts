import 'dotenv/config';
import postgres from 'postgres';

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set in your .env file');
  }

  const sql = postgres(connectionString, { ssl: 'require' });

  try {
    console.log('Connecting to database and fetching tables...');
    
    // Get all tables in the public schema
    const tables = await sql`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
    `;

    if (tables.length === 0) {
      console.log('No tables found in the public schema.');
    } else {
      console.log(`Found ${tables.length} tables. Dropping...`);
      for (const { tablename } of tables) {
        console.log(`Dropping table: ${tablename}`);
        // CASCADE automatically drops foreign keys and dependencies
        await sql.unsafe(`DROP TABLE IF EXISTS "public"."${tablename}" CASCADE`);
      }
      console.log('All tables dropped successfully.');
    }

    // Get all custom enums in the public schema
    const types = await sql`
      SELECT typname 
      FROM pg_type 
      JOIN pg_namespace ON pg_type.typnamespace = pg_namespace.oid 
      WHERE pg_namespace.nspname = 'public' 
        AND typtype = 'e'
    `;

    if (types.length > 0) {
      console.log(`Found ${types.length} enums. Dropping...`);
      for (const { typname } of types) {
        console.log(`Dropping enum: ${typname}`);
        await sql.unsafe(`DROP TYPE IF EXISTS "public"."${typname}" CASCADE`);
      }
      console.log('All enums dropped successfully.');
    }
    
    // Get all custom functions (like triggers) in the public schema
    const functions = await sql`
      SELECT proname, oidvectortypes(proargtypes) as argtypes
      FROM pg_proc 
      JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid 
      WHERE pg_namespace.nspname = 'public'
    `;

    if (functions.length > 0) {
       console.log(`Found ${functions.length} functions. Dropping...`);
       for (const { proname, argtypes } of functions) {
         console.log(`Dropping function: ${proname}`);
         await sql.unsafe(`DROP FUNCTION IF EXISTS "public"."${proname}"(${argtypes}) CASCADE`);
       }
       console.log('All functions dropped successfully.');
    }

    console.log('\n✅ Database wiped successfully! You can now rerun your schema.sql cleanly.');
  } catch (error) {
    console.error('Error dropping tables:', error);
  } finally {
    await sql.end();
  }
}

main();
