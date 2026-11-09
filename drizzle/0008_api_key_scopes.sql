ALTER TABLE "api_keys" ADD COLUMN IF NOT EXISTS "scopes" jsonb DEFAULT '["monitors:read"]'::jsonb NOT NULL;
