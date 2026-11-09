import { db } from './index';
import { sql } from 'drizzle-orm';
import { PgTransaction } from 'drizzle-orm/pg-core';
import * as schema from './schema';
import { ExtractTablesWithRelations } from 'drizzle-orm';
import { PostgresJsQueryResultHKT } from 'drizzle-orm/postgres-js';

type Transaction = PgTransaction<
  PostgresJsQueryResultHKT,
  typeof schema,
  ExtractTablesWithRelations<typeof schema>
>;

/**
 * Wraps a Drizzle database operation in a transaction that sets the user context for RLS.
 * Because we use connection pooling, the session variable MUST be set inside a transaction.
 */
export async function withUserContext<T>(
  userId: string,
  role: string,
  callback: (tx: Transaction) => Promise<T>
): Promise<T> {
  return db.transaction(async (tx) => {
    // 1. Set the custom session variables for our RLS policies
    await tx.execute(sql`SELECT set_config('app.current_user_id', ${userId}, true)`);
    await tx.execute(sql`SELECT set_config('app.current_user_role', ${role}, true)`);
    
    // 2. Since we connect via connection string which usually defaults to `postgres` (superuser),
    // we must switch to a non-superuser role so RLS is actually enforced.
    // In Supabase, the default unprivileged role is `authenticated` or `anon`.
    // We will set local role to authenticated so RLS policies take effect.
    await tx.execute(sql`SET LOCAL ROLE authenticated`);

    // 3. Execute the actual queries
    const result = await callback(tx);

    return result;
  });
}
