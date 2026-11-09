-- Drop all existing tables and types to ensure a clean slate
DROP TABLE IF EXISTS 
    otp_tokens,
    status_page_updates,
    status_page_components,
    custom_domains,
    status_pages,
    maintenance_windows,
    api_keys,
    notifications,
    incidents,
    payments,
    subscriptions,
    plans,
    monitor_stats,
    ping_logs,
    supabase,
    domain,
    websocket,
    keyword,
    heartbeat,
    cron,
    ssl,
    dns,
    tcp,
    api,
    website,
    monitors,
    sessions,
    "usage",
    restrictions,
    workspace_members,
    workspaces,
    accounts,
    accounts
CASCADE;

DROP TYPE IF EXISTS 
    user_role,
    monitor_type,
    monitor_method,
    monitor_status,
    incident_status,
    notification_channel_type
CASCADE;

CREATE TABLE otp_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    purpose VARCHAR(50) DEFAULT 'login' NOT NULL,
    code_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    attempts INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_otp_email ON otp_tokens(email);

CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
    'cleanin24hours',
    '0 * * * *',
    $$ DELETE FROM otp_tokens WHERE created_at < NOW() - INTERVAL '24 hours' $$
);

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('user', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE workspace_role AS ENUM ('owner', 'admin', 'member', 'viewer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role user_role DEFAULT 'user' NOT NULL,
    email_verified BOOLEAN DEFAULT false NOT NULL,
    provider VARCHAR(50) DEFAULT 'email' NOT NULL,
    provider_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);


CREATE TABLE IF NOT EXISTS workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS workspace_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    role workspace_role DEFAULT 'member' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(workspace_id, user_id)
);

CREATE TABLE IF NOT EXISTS restrictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    is_permanent BOOLEAN DEFAULT false NOT NULL,
    start_date TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    end_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_restrictions_user ON restrictions(user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_email ON accounts(email);

CREATE TABLE IF NOT EXISTS "usage" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL UNIQUE REFERENCES workspaces(id) ON DELETE CASCADE,
    monthly_calls INTEGER DEFAULT 0 NOT NULL,
    total_calls INTEGER DEFAULT 0 NOT NULL,
    last_reset_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_usage_account ON "usage"(account_id);

CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    last_used_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    revoked_at TIMESTAMPTZ,
    ip_address VARCHAR(45),
    user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash);

DO $$ BEGIN
  CREATE TYPE monitor_type AS ENUM (
    'website', 'api', 'supabase', 'cron', 'heartbeat',
    'tcp', 'dns', 'ssl', 'keyword', 'websocket', 'domain'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE monitor_method AS ENUM ('GET', 'POST', 'HEAD', 'PUT', 'PATCH', 'DELETE', 'OPTIONS');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE monitor_status AS ENUM ('pending', 'healthy', 'degraded', 'failing', 'paused', 'disabled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS monitors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type monitor_type DEFAULT 'website' NOT NULL,
    status monitor_status DEFAULT 'pending' NOT NULL,
    enabled BOOLEAN DEFAULT true NOT NULL,
    tags JSONB DEFAULT '[]'::jsonb NOT NULL,
    failure_threshold INTEGER DEFAULT 1 NOT NULL,
    consecutive_failures INTEGER DEFAULT 0 NOT NULL,
    last_ping_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_monitors_workspace ON monitors(workspace_id);

CREATE TABLE IF NOT EXISTS website (
    monitor_id UUID PRIMARY KEY REFERENCES monitors(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    expected_status INTEGER DEFAULT 200,
    last_status_code INTEGER,
    interval_seconds INTEGER NOT NULL,
    timeout_seconds INTEGER DEFAULT 10 NOT NULL,
    retry_interval_seconds INTEGER DEFAULT 60 NOT NULL,
    next_ping_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    locked_at TIMESTAMPTZ,
    last_response_time INTEGER
);
CREATE INDEX IF NOT EXISTS idx_website_scheduler ON website(next_ping_at);

CREATE TABLE IF NOT EXISTS api (
    monitor_id UUID PRIMARY KEY REFERENCES monitors(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    method monitor_method DEFAULT 'GET' NOT NULL,
    headers JSONB DEFAULT '{}'::jsonb NOT NULL,
    query_parameters JSONB DEFAULT '{}'::jsonb NOT NULL,
    body TEXT,
    assertions JSONB DEFAULT '[]'::jsonb,
    expected_status INTEGER DEFAULT 200,
    last_status_code INTEGER,
    interval_seconds INTEGER NOT NULL,
    timeout_seconds INTEGER DEFAULT 10 NOT NULL,
    retry_interval_seconds INTEGER DEFAULT 60 NOT NULL,
    next_ping_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    locked_at TIMESTAMPTZ,
    last_response_time INTEGER
);
CREATE INDEX IF NOT EXISTS idx_api_scheduler ON api(next_ping_at);

CREATE TABLE IF NOT EXISTS tcp (
    monitor_id UUID PRIMARY KEY REFERENCES monitors(id) ON DELETE CASCADE,
    host TEXT NOT NULL,
    port INTEGER NOT NULL,
    interval_seconds INTEGER NOT NULL,
    timeout_seconds INTEGER DEFAULT 10 NOT NULL,
    retry_interval_seconds INTEGER DEFAULT 60 NOT NULL,
    next_ping_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    locked_at TIMESTAMPTZ,
    last_response_time INTEGER
);
CREATE INDEX IF NOT EXISTS idx_tcp_scheduler ON tcp(next_ping_at);

CREATE TABLE IF NOT EXISTS dns (
    monitor_id UUID PRIMARY KEY REFERENCES monitors(id) ON DELETE CASCADE,
    domain TEXT NOT NULL,
    dns_query_type VARCHAR(20),
    interval_seconds INTEGER NOT NULL,
    timeout_seconds INTEGER DEFAULT 10 NOT NULL,
    retry_interval_seconds INTEGER DEFAULT 60 NOT NULL,
    next_ping_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    locked_at TIMESTAMPTZ,
    last_response_time INTEGER
);
CREATE INDEX IF NOT EXISTS idx_dns_scheduler ON dns(next_ping_at);

CREATE TABLE IF NOT EXISTS ssl (
    monitor_id UUID PRIMARY KEY REFERENCES monitors(id) ON DELETE CASCADE,
    host TEXT NOT NULL,
    port INTEGER DEFAULT 443 NOT NULL,
    ssl_days_before_expiry_alert INTEGER DEFAULT 14 NOT NULL,
    interval_seconds INTEGER NOT NULL,
    timeout_seconds INTEGER DEFAULT 10 NOT NULL,
    retry_interval_seconds INTEGER DEFAULT 60 NOT NULL,
    next_ping_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    locked_at TIMESTAMPTZ,
    last_response_time INTEGER
);
CREATE INDEX IF NOT EXISTS idx_ssl_scheduler ON ssl(next_ping_at);

CREATE TABLE IF NOT EXISTS cron (
    monitor_id UUID PRIMARY KEY REFERENCES monitors(id) ON DELETE CASCADE,
    cron_expression VARCHAR(100) NOT NULL,
    timezone VARCHAR(100),
    grace_period_seconds INTEGER
);

CREATE TABLE IF NOT EXISTS heartbeat (
    monitor_id UUID PRIMARY KEY REFERENCES monitors(id) ON DELETE CASCADE,
    heartbeat_secret VARCHAR(255) NOT NULL UNIQUE
);
CREATE INDEX IF NOT EXISTS heartbeat_secret_idx ON heartbeat(heartbeat_secret);

CREATE TABLE IF NOT EXISTS keyword (
    monitor_id UUID PRIMARY KEY REFERENCES monitors(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    keyword TEXT NOT NULL,
    interval_seconds INTEGER NOT NULL,
    timeout_seconds INTEGER DEFAULT 10 NOT NULL,
    retry_interval_seconds INTEGER DEFAULT 60 NOT NULL,
    next_ping_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    locked_at TIMESTAMPTZ,
    last_response_time INTEGER
);
CREATE INDEX IF NOT EXISTS idx_keyword_scheduler ON keyword(next_ping_at);

CREATE TABLE IF NOT EXISTS websocket (
    monitor_id UUID PRIMARY KEY REFERENCES monitors(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    interval_seconds INTEGER NOT NULL,
    timeout_seconds INTEGER DEFAULT 10 NOT NULL,
    retry_interval_seconds INTEGER DEFAULT 60 NOT NULL,
    next_ping_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    locked_at TIMESTAMPTZ,
    last_response_time INTEGER
);
CREATE INDEX IF NOT EXISTS idx_websocket_scheduler ON websocket(next_ping_at);

CREATE TABLE IF NOT EXISTS domain (
    monitor_id UUID PRIMARY KEY REFERENCES monitors(id) ON DELETE CASCADE,
    domain TEXT NOT NULL,
    days_before_expiry_alert INTEGER DEFAULT 14 NOT NULL,
    interval_seconds INTEGER NOT NULL,
    timeout_seconds INTEGER DEFAULT 10 NOT NULL,
    retry_interval_seconds INTEGER DEFAULT 60 NOT NULL,
    next_ping_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    locked_at TIMESTAMPTZ,
    last_response_time INTEGER
);
CREATE INDEX IF NOT EXISTS idx_domain_scheduler ON domain(next_ping_at);

CREATE TABLE IF NOT EXISTS supabase (
    monitor_id UUID PRIMARY KEY REFERENCES monitors(id) ON DELETE CASCADE,
    project_url TEXT NOT NULL,
    api_key TEXT,
    interval_seconds INTEGER NOT NULL,
    timeout_seconds INTEGER DEFAULT 10 NOT NULL,
    retry_interval_seconds INTEGER DEFAULT 60 NOT NULL,
    next_ping_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    locked_at TIMESTAMPTZ,
    last_response_time INTEGER
);
CREATE INDEX IF NOT EXISTS idx_supabase_scheduler ON supabase(next_ping_at);

CREATE TABLE IF NOT EXISTS ping_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    monitor_id UUID NOT NULL REFERENCES monitors(id) ON DELETE CASCADE,
    checked_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    success BOOLEAN NOT NULL,
    status_code INTEGER,
    response_time INTEGER,
    error_type VARCHAR(100),
    error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_ping_logs_monitor_time ON ping_logs(monitor_id, checked_at DESC);

CREATE TABLE IF NOT EXISTS monitor_stats (
    monitor_id UUID PRIMARY KEY REFERENCES monitors(id) ON DELETE CASCADE,
    total_checks BIGINT DEFAULT 0 NOT NULL,
    successful_checks BIGINT DEFAULT 0 NOT NULL,
    failed_checks BIGINT DEFAULT 0 NOT NULL,
    fastest_response INTEGER,
    slowest_response INTEGER,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

DO $$ BEGIN
  CREATE TYPE incident_status AS ENUM ('ongoing', 'resolved');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE notification_channel_type AS ENUM ('email', 'slack', 'discord', 'webhook');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_plan_id VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(50) NOT NULL,
    max_monitors INTEGER NOT NULL,
    min_interval_seconds INTEGER NOT NULL,
    max_interval_seconds INTEGER NOT NULL,
    log_retention_count INTEGER NOT NULL,
    api_access BOOLEAN DEFAULT false NOT NULL,
    max_status_pages INTEGER DEFAULT 1 NOT NULL,
    max_custom_domains INTEGER DEFAULT 0 NOT NULL,
    advanced_monitors BOOLEAN DEFAULT false NOT NULL,
    advanced_notifications BOOLEAN DEFAULT false NOT NULL,
    white_label BOOLEAN DEFAULT false NOT NULL,
    private_status_pages BOOLEAN DEFAULT false NOT NULL,
    max_team_members INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_plans_provider ON plans(provider_plan_id);

CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL UNIQUE REFERENCES workspaces(id) ON DELETE CASCADE,
    provider_subscription_id VARCHAR(255) UNIQUE,
    plan_id UUID REFERENCES plans(id),
    status VARCHAR(50) NOT NULL,
    start_date TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    end_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_subscriptions_workspace ON subscriptions(workspace_id);

CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES plans(id),
    amount NUMERIC(10, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD' NOT NULL,
    provider VARCHAR(50) DEFAULT 'manual' NOT NULL,
    provider_payment_id VARCHAR(255) UNIQUE,
    status VARCHAR(50) DEFAULT 'succeeded' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_payments_workspace ON payments(workspace_id);

CREATE TABLE IF NOT EXISTS incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    monitor_id UUID NOT NULL REFERENCES monitors(id) ON DELETE CASCADE,
    status incident_status DEFAULT 'ongoing' NOT NULL,
    error_type VARCHAR(100),
    error_message TEXT,
    started_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    resolved_at TIMESTAMPTZ,
    duration_seconds INTEGER
);
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_incident ON incidents(monitor_id) WHERE status = 'ongoing';
CREATE INDEX IF NOT EXISTS idx_incidents_monitor ON incidents(monitor_id, started_at DESC);

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    monitor_id UUID REFERENCES monitors(id) ON DELETE CASCADE,
    type notification_channel_type NOT NULL,
    config JSONB NOT NULL,
    events JSONB DEFAULT '["down", "up"]'::jsonb NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_notifications_workspace ON notifications(workspace_id);
CREATE INDEX IF NOT EXISTS idx_notifications_monitor ON notifications(monitor_id);

CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    key_hash VARCHAR(255) UNIQUE NOT NULL,
    scopes JSONB DEFAULT '["monitors:read"]'::jsonb NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    last_used_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_api_keys_workspace ON api_keys(workspace_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);

CREATE TABLE IF NOT EXISTS maintenance_windows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    monitor_id UUID NOT NULL REFERENCES monitors(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_maintenance_windows_monitor ON maintenance_windows(monitor_id, start_time, end_time);

CREATE TABLE IF NOT EXISTS status_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    logo_url TEXT,
    is_public BOOLEAN DEFAULT true NOT NULL,
    include_in_sitemap BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_status_pages_slug ON status_pages(slug);
CREATE INDEX IF NOT EXISTS idx_status_pages_workspace ON status_pages(workspace_id);

CREATE TABLE IF NOT EXISTS custom_domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status_page_id UUID NOT NULL REFERENCES status_pages(id) ON DELETE CASCADE,
    domain TEXT UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'none' NOT NULL,
    verification_token TEXT,
    verification_txt TEXT,
    verified_at TIMESTAMPTZ,
    error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_custom_domains_page ON custom_domains(status_page_id);
CREATE INDEX IF NOT EXISTS idx_custom_domains_domain ON custom_domains(domain);

CREATE TABLE IF NOT EXISTS status_page_components (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status_page_id UUID NOT NULL REFERENCES status_pages(id) ON DELETE CASCADE,
    monitor_id UUID NOT NULL REFERENCES monitors(id) ON DELETE CASCADE,
    group_name TEXT,
    position INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_status_page_components_page ON status_page_components(status_page_id, position);

CREATE TABLE IF NOT EXISTS status_page_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status_page_id UUID NOT NULL REFERENCES status_pages(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_status_page_updates_page ON status_page_updates(status_page_id, created_at DESC);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER update_accounts_modtime BEFORE UPDATE ON accounts FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER update_usage_modtime BEFORE UPDATE ON "usage" FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER update_subscriptions_modtime BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER update_monitors_modtime BEFORE UPDATE ON monitors FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER update_monitor_stats_modtime BEFORE UPDATE ON monitor_stats FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER update_status_pages_modtime BEFORE UPDATE ON status_pages FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER update_custom_domains_modtime BEFORE UPDATE ON custom_domains FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION protect_account_privileged_fields()
RETURNS TRIGGER AS $$
DECLARE
    current_role_setting TEXT;
BEGIN
    current_role_setting := current_setting('app.current_user_role', true);
    
    IF current_role_setting = '' OR current_role_setting IS NULL OR current_role_setting = 'admin' THEN
        RETURN NEW;
    END IF;

    IF NEW.id IS DISTINCT FROM OLD.id THEN RAISE EXCEPTION 'Unauthorized: Cannot modify id'; END IF;
    IF NEW.role IS DISTINCT FROM OLD.role THEN RAISE EXCEPTION 'Unauthorized: Cannot modify role'; END IF;
    IF NEW.provider IS DISTINCT FROM OLD.provider THEN RAISE EXCEPTION 'Unauthorized: Cannot modify provider'; END IF;
    IF NEW.provider_id IS DISTINCT FROM OLD.provider_id THEN RAISE EXCEPTION 'Unauthorized: Cannot modify provider id'; END IF;
    IF NEW.password_hash IS DISTINCT FROM OLD.password_hash THEN RAISE EXCEPTION 'Unauthorized: Cannot modify password hash'; END IF;
    IF NEW.email_verified IS DISTINCT FROM OLD.email_verified THEN RAISE EXCEPTION 'Unauthorized: Cannot modify email verification status'; END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS protect_accounts_privileges ON accounts;
CREATE TRIGGER protect_accounts_privileges
    BEFORE UPDATE ON accounts
    FOR EACH ROW
    EXECUTE PROCEDURE protect_account_privileged_fields();

INSERT INTO plans (
    provider_plan_id, name, max_monitors, min_interval_seconds, max_interval_seconds, 
    log_retention_count, api_access, max_status_pages, max_custom_domains, 
    advanced_monitors, advanced_notifications, white_label, private_status_pages, max_team_members
) VALUES 
    ('plan_free', 'Free', 5, 180, 86400, 100, true, 1, 1, false, false, false, false, 1),
    ('plan_pro', 'Pro', 50, 60, 86400, 500, true, 5, 5, true, true, false, true, 5),
    ('plan_business', 'Business', 250, 60, 86400, 5000, true, 25, 25, true, true, true, true, 25),
    ('plan_enterprise', 'Enterprise', 1000, 30, 86400, 20000, true, 100, 100, true, true, true, true, 100)
ON CONFLICT (provider_plan_id) DO UPDATE SET
    name = EXCLUDED.name,
    max_monitors = EXCLUDED.max_monitors,
    min_interval_seconds = EXCLUDED.min_interval_seconds,
    max_interval_seconds = EXCLUDED.max_interval_seconds,
    log_retention_count = EXCLUDED.log_retention_count,
    api_access = EXCLUDED.api_access,
    max_status_pages = EXCLUDED.max_status_pages,
    max_custom_domains = EXCLUDED.max_custom_domains,
    advanced_monitors = EXCLUDED.advanced_monitors,
    advanced_notifications = EXCLUDED.advanced_notifications,
    white_label = EXCLUDED.white_label,
    private_status_pages = EXCLUDED.private_status_pages,
    max_team_members = EXCLUDED.max_team_members;

ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE restrictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE "usage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE ping_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitor_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_windows ENABLE ROW LEVEL SECURITY;
ALTER TABLE status_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE status_page_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE status_page_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE website ENABLE ROW LEVEL SECURITY;
ALTER TABLE api ENABLE ROW LEVEL SECURITY;
ALTER TABLE tcp ENABLE ROW LEVEL SECURITY;
ALTER TABLE dns ENABLE ROW LEVEL SECURITY;
ALTER TABLE ssl ENABLE ROW LEVEL SECURITY;
ALTER TABLE cron ENABLE ROW LEVEL SECURITY;
ALTER TABLE heartbeat ENABLE ROW LEVEL SECURITY;
ALTER TABLE keyword ENABLE ROW LEVEL SECURITY;
ALTER TABLE websocket ENABLE ROW LEVEL SECURITY;
ALTER TABLE domain ENABLE ROW LEVEL SECURITY;
ALTER TABLE supabase ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION current_app_user_id() RETURNS UUID AS $$
BEGIN
    RETURN NULLIF(current_setting('app.current_user_id', true), '')::UUID;
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN AS $$
BEGIN
    RETURN current_setting('app.current_user_role', true) = 'admin';
EXCEPTION WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE;

DO $$ BEGIN
  CREATE POLICY accounts_select_own ON accounts FOR SELECT USING (id = current_app_user_id() OR is_admin());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY accounts_update_own ON accounts FOR UPDATE USING (id = current_app_user_id() OR is_admin());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


DO $$ BEGIN
  CREATE POLICY workspaces_own ON workspaces FOR ALL USING (id IN (SELECT workspace_id FROM workspace_members WHERE user_id = current_app_user_id()) OR is_admin());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY workspace_members_own ON workspace_members FOR ALL USING (user_id = current_app_user_id() OR is_admin());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY usage_own ON "usage" FOR ALL USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = current_app_user_id()) OR is_admin());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY sessions_own ON sessions FOR ALL USING (user_id = current_app_user_id() OR is_admin());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY subscriptions_own ON subscriptions FOR ALL USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = current_app_user_id()) OR is_admin());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY restrictions_all ON restrictions FOR ALL USING (user_id = current_app_user_id() OR is_admin());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY monitors_own ON monitors FOR ALL USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = current_app_user_id()) OR is_admin());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY ping_logs_own ON ping_logs FOR SELECT
  USING (monitor_id IN (SELECT id FROM monitors WHERE workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = current_app_user_id()) OR is_admin()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY monitor_stats_own ON monitor_stats FOR SELECT
  USING (monitor_id IN (SELECT id FROM monitors WHERE workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = current_app_user_id()) OR is_admin()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY incidents_own ON incidents FOR ALL
  USING (monitor_id IN (SELECT id FROM monitors WHERE workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = current_app_user_id()) OR is_admin()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY notifications_own ON notifications FOR ALL
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = current_app_user_id()) OR is_admin());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY api_keys_own ON api_keys FOR ALL
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = current_app_user_id()) OR is_admin());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY status_pages_select ON status_pages FOR SELECT
  USING (is_public = true OR workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = current_app_user_id()) OR is_admin());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY status_pages_manage ON status_pages FOR ALL
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = current_app_user_id()) OR is_admin());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY custom_domains_select ON custom_domains FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM status_pages sp
      WHERE sp.id = custom_domains.status_page_id
        AND (sp.is_public = true OR sp.workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = current_app_user_id()) OR is_admin())
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY custom_domains_manage ON custom_domains FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM status_pages sp
      WHERE sp.id = custom_domains.status_page_id
        AND (sp.workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = current_app_user_id()) OR is_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM status_pages sp
      WHERE sp.id = custom_domains.status_page_id
        AND (sp.workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = current_app_user_id()) OR is_admin())
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY status_page_components_select ON status_page_components FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM status_pages sp
      WHERE sp.id = status_page_components.status_page_id
        AND (sp.is_public = true OR sp.workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = current_app_user_id()) OR is_admin())
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY status_page_components_manage ON status_page_components FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM status_pages sp
      WHERE sp.id = status_page_components.status_page_id
        AND (sp.workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = current_app_user_id()) OR is_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM status_pages sp
      WHERE sp.id = status_page_components.status_page_id
        AND (sp.workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = current_app_user_id()) OR is_admin())
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY status_page_updates_select ON status_page_updates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM status_pages sp
      WHERE sp.id = status_page_updates.status_page_id
        AND (sp.is_public = true OR sp.workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = current_app_user_id()) OR is_admin())
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY status_page_updates_manage ON status_page_updates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM status_pages sp
      WHERE sp.id = status_page_updates.status_page_id
        AND (sp.workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = current_app_user_id()) OR is_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM status_pages sp
      WHERE sp.id = status_page_updates.status_page_id
        AND (sp.workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = current_app_user_id()) OR is_admin())
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY maintenance_windows_own ON maintenance_windows FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM monitors m
      WHERE m.id = maintenance_windows.monitor_id
        AND (m.workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = current_app_user_id()) OR is_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM monitors m
      WHERE m.id = maintenance_windows.monitor_id
        AND (m.workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = current_app_user_id()) OR is_admin())
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY payments_own ON payments FOR ALL
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = current_app_user_id()) OR is_admin())
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = current_app_user_id()) OR is_admin());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY child_monitors_all ON website FOR ALL
  USING (EXISTS (SELECT 1 FROM monitors m WHERE m.id = website.monitor_id AND (m.workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = current_app_user_id()) OR is_admin())));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY child_monitors_all ON api FOR ALL
  USING (EXISTS (SELECT 1 FROM monitors m WHERE m.id = api.monitor_id AND (m.workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = current_app_user_id()) OR is_admin())));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY child_monitors_all ON tcp FOR ALL
  USING (EXISTS (SELECT 1 FROM monitors m WHERE m.id = tcp.monitor_id AND (m.workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = current_app_user_id()) OR is_admin())));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY child_monitors_all ON dns FOR ALL
  USING (EXISTS (SELECT 1 FROM monitors m WHERE m.id = dns.monitor_id AND (m.workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = current_app_user_id()) OR is_admin())));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY child_monitors_all ON ssl FOR ALL
  USING (EXISTS (SELECT 1 FROM monitors m WHERE m.id = ssl.monitor_id AND (m.workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = current_app_user_id()) OR is_admin())));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY child_monitors_all ON cron FOR ALL
  USING (EXISTS (SELECT 1 FROM monitors m WHERE m.id = cron.monitor_id AND (m.workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = current_app_user_id()) OR is_admin())));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY child_monitors_all ON heartbeat FOR ALL
  USING (EXISTS (SELECT 1 FROM monitors m WHERE m.id = heartbeat.monitor_id AND (m.workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = current_app_user_id()) OR is_admin())));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY child_monitors_all ON keyword FOR ALL
  USING (EXISTS (SELECT 1 FROM monitors m WHERE m.id = keyword.monitor_id AND (m.workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = current_app_user_id()) OR is_admin())));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY child_monitors_all ON websocket FOR ALL
  USING (EXISTS (SELECT 1 FROM monitors m WHERE m.id = websocket.monitor_id AND (m.workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = current_app_user_id()) OR is_admin())));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY child_monitors_all ON domain FOR ALL
  USING (EXISTS (SELECT 1 FROM monitors m WHERE m.id = domain.monitor_id AND (m.workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = current_app_user_id()) OR is_admin())));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY child_monitors_all ON supabase FOR ALL
  USING (EXISTS (SELECT 1 FROM monitors m WHERE m.id = supabase.monitor_id AND (m.workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = current_app_user_id()) OR is_admin())));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
