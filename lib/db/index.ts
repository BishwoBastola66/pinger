import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL;

// Vercel build phase does not inject production secrets. Skip validation during build.
if (!connectionString && process.env.NEXT_PHASE !== 'phase-production-build') {
  throw new Error('DATABASE_URL environment variable is missing');
}

// Global query client for Postgres, ensures we don't create multiple connections in dev
const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined;
};

const client = globalForDb.conn ?? postgres(connectionString as string, { 
  max: 10,
  prepare: false 
});
globalForDb.conn = client;

export const db = drizzle(client, { schema });
