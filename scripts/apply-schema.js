import postgres from 'postgres';
import fs from 'fs';
import path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL is missing');
  process.exit(1);
}

const sql = postgres(connectionString);

async function main() {
  try {
    console.log('Migrating database from workspaces to direct user_id ownership...');

    await sql.unsafe(`
      -- 1. Monitors
      DO $$ BEGIN
        ALTER TABLE monitors ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_column THEN NULL; END $$;

      DO $$ BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'monitors' AND column_name = 'workspace_id') THEN
          UPDATE monitors SET user_id = workspace_users.user_id 
          FROM workspace_users 
          WHERE monitors.workspace_id = workspace_users.workspace_id AND monitors.user_id IS NULL;

          UPDATE monitors SET user_id = users.id 
          FROM users 
          WHERE monitors.user_id IS NULL AND users.default_workspace_id = monitors.workspace_id;
        END IF;
      END $$;

      UPDATE monitors SET user_id = (SELECT id FROM users LIMIT 1) WHERE user_id IS NULL;
      ALTER TABLE monitors ALTER COLUMN user_id SET NOT NULL;
      ALTER TABLE monitors DROP COLUMN IF EXISTS workspace_id CASCADE;

      -- 2. API Keys
      DO $$ BEGIN
        ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_column THEN NULL; END $$;

      DO $$ BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'api_keys' AND column_name = 'workspace_id') THEN
          UPDATE api_keys SET user_id = workspace_users.user_id 
          FROM workspace_users 
          WHERE api_keys.workspace_id = workspace_users.workspace_id AND api_keys.user_id IS NULL;

          UPDATE api_keys SET user_id = users.id 
          FROM users 
          WHERE api_keys.user_id IS NULL AND users.default_workspace_id = api_keys.workspace_id;
        END IF;
      END $$;

      UPDATE api_keys SET user_id = (SELECT id FROM users LIMIT 1) WHERE user_id IS NULL;
      ALTER TABLE api_keys ALTER COLUMN user_id SET NOT NULL;
      ALTER TABLE api_keys DROP COLUMN IF EXISTS workspace_id CASCADE;
      ALTER TABLE api_keys DROP COLUMN IF EXISTS call_count CASCADE;
      ALTER TABLE api_keys DROP COLUMN IF EXISTS monthly_call_count CASCADE;
      ALTER TABLE api_keys DROP COLUMN IF EXISTS last_reset_at CASCADE;

      -- 3. Usage
      DO $$ BEGIN
        ALTER TABLE "usage" ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_column THEN NULL; END $$;

      DO $$ BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'usage' AND column_name = 'workspace_id') THEN
          UPDATE "usage" SET user_id = workspace_users.user_id 
          FROM workspace_users 
          WHERE "usage".workspace_id = workspace_users.workspace_id AND "usage".user_id IS NULL;

          UPDATE "usage" SET user_id = users.id 
          FROM users 
          WHERE "usage".user_id IS NULL AND users.default_workspace_id = "usage".workspace_id;
        END IF;
      END $$;

      UPDATE "usage" SET user_id = (SELECT id FROM users LIMIT 1) WHERE user_id IS NULL;
      -- Delete duplicates if any
      DELETE FROM "usage" a USING "usage" b WHERE a.ctid < b.ctid AND a.user_id = b.user_id;
      ALTER TABLE "usage" ALTER COLUMN user_id SET NOT NULL;
      DO $$ BEGIN
        ALTER TABLE "usage" ADD CONSTRAINT usage_user_id_unique UNIQUE(user_id);
      EXCEPTION WHEN duplicate_table OR duplicate_object THEN NULL; END $$;
      ALTER TABLE "usage" DROP COLUMN IF EXISTS workspace_id CASCADE;

      -- 4. Subscriptions
      DO $$ BEGIN
        ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_column THEN NULL; END $$;

      DO $$ BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'workspace_id') THEN
          UPDATE subscriptions SET user_id = workspace_users.user_id 
          FROM workspace_users 
          WHERE subscriptions.workspace_id = workspace_users.workspace_id AND subscriptions.user_id IS NULL;

          UPDATE subscriptions SET user_id = users.id 
          FROM users 
          WHERE subscriptions.user_id IS NULL AND users.default_workspace_id = subscriptions.workspace_id;
        END IF;
      END $$;

      UPDATE subscriptions SET user_id = (SELECT id FROM users LIMIT 1) WHERE user_id IS NULL;
      DELETE FROM subscriptions a USING subscriptions b WHERE a.ctid < b.ctid AND a.user_id = b.user_id;
      ALTER TABLE subscriptions ALTER COLUMN user_id SET NOT NULL;
      DO $$ BEGIN
        ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_user_id_unique UNIQUE(user_id);
      EXCEPTION WHEN duplicate_table OR duplicate_object THEN NULL; END $$;
      ALTER TABLE subscriptions DROP COLUMN IF EXISTS workspace_id CASCADE;

      -- 5. Payments
      DO $$ BEGIN
        ALTER TABLE payments ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_column THEN NULL; END $$;

      DO $$ BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'workspace_id') THEN
          UPDATE payments SET user_id = workspace_users.user_id 
          FROM workspace_users 
          WHERE payments.workspace_id = workspace_users.workspace_id AND payments.user_id IS NULL;

          UPDATE payments SET user_id = users.id 
          FROM users 
          WHERE payments.user_id IS NULL AND users.default_workspace_id = payments.workspace_id;
        END IF;
      END $$;

      UPDATE payments SET user_id = (SELECT id FROM users LIMIT 1) WHERE user_id IS NULL;
      ALTER TABLE payments ALTER COLUMN user_id SET NOT NULL;
      ALTER TABLE payments DROP COLUMN IF EXISTS workspace_id CASCADE;

      -- 6. Status Pages
      DO $$ BEGIN
        ALTER TABLE status_pages ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_column THEN NULL; END $$;

      DO $$ BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'status_pages' AND column_name = 'workspace_id') THEN
          UPDATE status_pages SET user_id = workspace_users.user_id 
          FROM workspace_users 
          WHERE status_pages.workspace_id = workspace_users.workspace_id AND status_pages.user_id IS NULL;

          UPDATE status_pages SET user_id = users.id 
          FROM users 
          WHERE status_pages.user_id IS NULL AND users.default_workspace_id = status_pages.workspace_id;
        END IF;
      END $$;

      UPDATE status_pages SET user_id = (SELECT id FROM users LIMIT 1) WHERE user_id IS NULL;
      ALTER TABLE status_pages ALTER COLUMN user_id SET NOT NULL;
      ALTER TABLE status_pages DROP COLUMN IF EXISTS workspace_id CASCADE;

      -- 7. Unify Notifications
      DROP TABLE IF EXISTS monitor_notifications CASCADE;
      DROP TABLE IF EXISTS notification_channels CASCADE;
      CREATE TABLE IF NOT EXISTS notifications (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          monitor_id UUID REFERENCES monitors(id) ON DELETE CASCADE,
          type notification_channel_type NOT NULL,
          config JSONB NOT NULL,
          events JSONB DEFAULT '["down", "up"]'::jsonb NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_monitor ON notifications(monitor_id);

      -- 8. Clean up Workspaces
      ALTER TABLE users DROP COLUMN IF EXISTS default_workspace_id CASCADE;
      DROP TABLE IF EXISTS workspace_users CASCADE;
      DROP TABLE IF EXISTS workspaces CASCADE;
      DROP TYPE IF EXISTS role_enum CASCADE;

      -- 9. Replace User Status with Restrictions
      CREATE TABLE IF NOT EXISTS restrictions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          reason TEXT NOT NULL,
          is_permanent BOOLEAN DEFAULT false NOT NULL,
          start_date TIMESTAMPTZ DEFAULT NOW() NOT NULL,
          end_date TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_restrictions_user ON restrictions(user_id);

      DO $$ BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'status') THEN
          INSERT INTO restrictions (user_id, reason, is_permanent, start_date)
          SELECT id, 'Legacy Account Status: ' || status::text, true, NOW()
          FROM users
          WHERE status IN ('suspended', 'banned');

          ALTER TABLE users DROP COLUMN status CASCADE;
        END IF;
      END $$;
      DROP TYPE IF EXISTS account_status CASCADE;

      -- 10. Status Pages Custom Domain Lifecycle
      ALTER TABLE status_pages ADD COLUMN IF NOT EXISTS custom_domain_status VARCHAR(50) DEFAULT 'none' NOT NULL;
      ALTER TABLE status_pages ADD COLUMN IF NOT EXISTS custom_domain_verification_token TEXT;
      ALTER TABLE status_pages ADD COLUMN IF NOT EXISTS custom_domain_verification_txt TEXT;
      ALTER TABLE status_pages ADD COLUMN IF NOT EXISTS custom_domain_verified_at TIMESTAMPTZ;
      ALTER TABLE status_pages ADD COLUMN IF NOT EXISTS custom_domain_error TEXT;
      CREATE INDEX IF NOT EXISTS idx_status_pages_custom_domain ON status_pages(custom_domain);
    `);

    console.log('Workspaces dropped and data migrated to user_id successfully!');
    
    console.log('Applying canonical schema.sql...');
    const schemaSql = fs.readFileSync(path.join(process.cwd(), 'supabase', 'schema.sql'), 'utf-8');
    await sql.unsafe(schemaSql);

    console.log('Full schema and policies applied successfully to Supabase!');
  } catch (error) {
    console.error('Error applying schema:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
