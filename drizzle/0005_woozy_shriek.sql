ALTER TYPE "public"."monitor_type" ADD VALUE 'tcp';--> statement-breakpoint
ALTER TYPE "public"."monitor_type" ADD VALUE 'dns';--> statement-breakpoint
ALTER TYPE "public"."monitor_type" ADD VALUE 'ssl';--> statement-breakpoint
ALTER TYPE "public"."monitor_type" ADD VALUE 'keyword';--> statement-breakpoint
ALTER TYPE "public"."monitor_type" ADD VALUE 'websocket';--> statement-breakpoint
ALTER TYPE "public"."monitor_type" ADD VALUE 'domain';--> statement-breakpoint
ALTER TABLE "monitors" ADD COLUMN "query_parameters" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "monitors" ADD COLUMN "tags" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "monitors" ADD COLUMN "port" integer;--> statement-breakpoint
ALTER TABLE "monitors" ADD COLUMN "dns_query_type" varchar(20);--> statement-breakpoint
ALTER TABLE "monitors" ADD COLUMN "ssl_days_before_expiry_alert" integer DEFAULT 14 NOT NULL;