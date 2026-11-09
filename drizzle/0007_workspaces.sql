-- 1. Create Workspace Roles enum if not exists
DO $$ BEGIN
 CREATE TYPE "public"."role_enum" AS ENUM('owner', 'admin', 'member', 'viewer');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

-- 2. Create the Workspaces and WorkspaceUsers tables
CREATE TABLE IF NOT EXISTS "workspaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"stripe_customer_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "workspace_users" (
	"workspace_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "public"."role_enum" DEFAULT 'member' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_users_workspace_id_user_id_pk" PRIMARY KEY("workspace_id","user_id")
);
--> statement-breakpoint

-- Add Foreign keys for workspace_users
ALTER TABLE "workspace_users" ADD CONSTRAINT "workspace_users_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "workspace_users" ADD CONSTRAINT "workspace_users_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint


-- 3. Add default_workspace_id to users
ALTER TABLE "users" ADD COLUMN "default_workspace_id" uuid;
--> statement-breakpoint

-- 4. Add nullable workspace_id to all resource tables
ALTER TABLE "monitors" ADD COLUMN "workspace_id" uuid;
ALTER TABLE "api_keys" ADD COLUMN "workspace_id" uuid;
ALTER TABLE "subscriptions" ADD COLUMN "workspace_id" uuid;
ALTER TABLE "usage" ADD COLUMN "workspace_id" uuid;
ALTER TABLE "payments" ADD COLUMN "workspace_id" uuid;
--> statement-breakpoint

-- 5. Data Migration: For every existing user, create a workspace and map it
DO $$
DECLARE
    u RECORD;
    new_workspace_id UUID;
BEGIN
    FOR u IN SELECT id, name FROM users LOOP
        new_workspace_id := gen_random_uuid();
        
        -- Insert Personal Workspace
        INSERT INTO workspaces (id, name, created_at, updated_at)
        VALUES (new_workspace_id, u.name || '''s Workspace', now(), now());
        
        -- Assign User to Workspace as Owner
        INSERT INTO workspace_users (workspace_id, user_id, role, created_at)
        VALUES (new_workspace_id, u.id, 'owner', now());
        
        -- Update User's default workspace
        UPDATE users SET default_workspace_id = new_workspace_id WHERE id = u.id;
        
        -- Map existing resources
        UPDATE monitors SET workspace_id = new_workspace_id WHERE user_id = u.id;
        UPDATE api_keys SET workspace_id = new_workspace_id WHERE user_id = u.id;
        UPDATE subscriptions SET workspace_id = new_workspace_id WHERE user_id = u.id;
        UPDATE usage SET workspace_id = new_workspace_id WHERE user_id = u.id;
        UPDATE payments SET workspace_id = new_workspace_id WHERE user_id = u.id;
    END LOOP;
END $$;
--> statement-breakpoint

-- 6. Make workspace_id NOT NULL on resource tables now that migration is complete
ALTER TABLE "monitors" ALTER COLUMN "workspace_id" SET NOT NULL;
ALTER TABLE "api_keys" ALTER COLUMN "workspace_id" SET NOT NULL;
ALTER TABLE "subscriptions" ALTER COLUMN "workspace_id" SET NOT NULL;
ALTER TABLE "usage" ALTER COLUMN "workspace_id" SET NOT NULL;
ALTER TABLE "payments" ALTER COLUMN "workspace_id" SET NOT NULL;
--> statement-breakpoint

-- Add workspace_id foreign keys
ALTER TABLE "users" ADD CONSTRAINT "users_default_workspace_id_workspaces_id_fk" FOREIGN KEY ("default_workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "monitors" ADD CONSTRAINT "monitors_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "usage" ADD CONSTRAINT "usage_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
--> statement-breakpoint

-- 7. Drop legacy user_id columns safely
DROP POLICY IF EXISTS "monitors_all_own" ON "monitors";
DROP POLICY IF EXISTS "ping_logs_select_own" ON "ping_logs";
DROP POLICY IF EXISTS "monitor_stats_select_own" ON "monitor_stats";
ALTER TABLE "monitors" DROP COLUMN "user_id";
DROP POLICY IF EXISTS "api_keys_all_own" ON "api_keys";
ALTER TABLE "api_keys" DROP COLUMN "user_id";
DROP POLICY IF EXISTS "subscriptions_all_own" ON "subscriptions";
ALTER TABLE "subscriptions" DROP COLUMN "user_id";
DROP POLICY IF EXISTS "usage_select_own" ON "usage";
ALTER TABLE "usage" DROP COLUMN "user_id";
DROP POLICY IF EXISTS "payments_select_own" ON "payments";
DROP POLICY IF EXISTS "payments_admin_all" ON "payments";
ALTER TABLE "payments" DROP COLUMN "user_id";
