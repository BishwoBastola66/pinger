const fs = require('fs');
let schema = fs.readFileSync('lib/db/schema.ts', 'utf8');

// Add new tables
const newTables = `
export const roleEnum = pgEnum('role_enum', ['owner', 'admin', 'member', 'viewer']);

export const workspaces = pgTable('workspaces', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  stripeCustomerId: text('stripe_customer_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const workspaceUsers = pgTable('workspace_users', {
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: roleEnum('role').notNull().default('member'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.workspaceId, t.userId] }),
}));
`;
schema = schema.replace("import { sql } from 'drizzle-orm';", "import { sql } from 'drizzle-orm';\nimport { primaryKey } from 'drizzle-orm/pg-core';");
schema = schema.replace("export const users = pgTable", newTables + "\n\nexport const users = pgTable");

// Change userId to workspaceId in monitors, statusPages, apiKeys, subscriptions, usage, payments
schema = schema.replace(
  /userId: uuid\('user_id'\)\.notNull\(\)\.references\(\(\) => users\.id, \{ onDelete: 'cascade' \}\),/g,
  "workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),"
);
schema = schema.replace(
  /userId: uuid\('user_id'\)\.notNull\(\)\.unique\(\)\.references\(\(\) => users\.id, \{ onDelete: 'cascade' \}\),/g,
  "workspaceId: uuid('workspace_id').notNull().unique().references(() => workspaces.id, { onDelete: 'cascade' }),"
);

fs.writeFileSync('lib/db/schema.ts', schema);
console.log("Schema updated");
