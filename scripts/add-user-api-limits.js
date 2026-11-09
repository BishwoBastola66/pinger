import postgres from 'postgres';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_URL);

async function updateSchema() {
  try {
    console.log('Adding monthly_api_call_count and api_calls_reset_at to users...');
    await sql.unsafe(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS monthly_api_call_count INTEGER DEFAULT 0 NOT NULL,
      ADD COLUMN IF NOT EXISTS api_calls_reset_at TIMESTAMPTZ DEFAULT NOW() NOT NULL;
    `);

    console.log('Updating record_api_key_call to track and enforce limits on users level...');
    await sql.unsafe(`
      DROP FUNCTION IF EXISTS record_api_key_call(VARCHAR);
      CREATE OR REPLACE FUNCTION record_api_key_call(p_key_hash VARCHAR)
      RETURNS TABLE (
          key_id UUID,
          user_id UUID,
          key_name VARCHAR,
          user_monthly_calls INTEGER,
          key_total_calls INTEGER,
          is_rate_limited BOOLEAN,
          max_allowed_calls INTEGER
      ) AS $$
      DECLARE
          v_key RECORD;
          v_user RECORD;
          v_plan_name VARCHAR := 'Free';
          v_limit INTEGER := 500;
      BEGIN
          -- Find active API key
          SELECT * INTO v_key FROM api_keys WHERE key_hash = p_key_hash AND revoked_at IS NULL;
          IF NOT FOUND THEN
              RETURN;
          END IF;

          -- Find user
          SELECT * INTO v_user FROM users WHERE id = v_key.user_id;
          IF NOT FOUND THEN
              RETURN;
          END IF;

          -- Find user plan limit
          SELECT plans.name INTO v_plan_name
          FROM subscriptions
          INNER JOIN plans ON subscriptions.plan_id = plans.id
          WHERE subscriptions.user_id = v_user.id
          LIMIT 1;

          IF v_plan_name IS NULL THEN
              v_plan_name := 'Free';
          END IF;

          IF v_plan_name = 'Free' THEN
              v_limit := 500;
          ELSIF v_plan_name = 'Pro' THEN
              v_limit := 50000;
          ELSE
              v_limit := 2147483647; -- Unlimited for Business
          END IF;

          -- Auto reset user monthly usage if entering a new month
          IF v_user.api_calls_reset_at < date_trunc('month', NOW()) THEN
              UPDATE users
              SET monthly_api_call_count = 0, api_calls_reset_at = NOW()
              WHERE id = v_user.id;
              v_user.monthly_api_call_count := 0;
          END IF;

          -- Check if account reached its shared limit
          IF v_user.monthly_api_call_count >= v_limit THEN
              key_id := v_key.id;
              user_id := v_user.id;
              key_name := v_key.name;
              user_monthly_calls := v_user.monthly_api_call_count;
              key_total_calls := v_key.call_count;
              is_rate_limited := TRUE;
              max_allowed_calls := v_limit;
              RETURN NEXT;
              RETURN;
          END IF;

          -- Increment user-level monthly counter
          UPDATE users
          SET monthly_api_call_count = users.monthly_api_call_count + 1
          WHERE id = v_user.id
          RETURNING users.monthly_api_call_count INTO user_monthly_calls;

          -- Increment key-level lifetime counter & last_used_at
          UPDATE api_keys
          SET 
              call_count = api_keys.call_count + 1,
              monthly_call_count = api_keys.monthly_call_count + 1,
              last_used_at = NOW()
          WHERE id = v_key.id
          RETURNING api_keys.call_count INTO key_total_calls;

          key_id := v_key.id;
          user_id := v_user.id;
          key_name := v_key.name;
          is_rate_limited := FALSE;
          max_allowed_calls := v_limit;
          RETURN NEXT;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `);

    console.log('Migration completed successfully!');
  } catch (err) {
    console.error('Error during migration:', err);
  } finally {
    await sql.end();
  }
}

updateSchema();
