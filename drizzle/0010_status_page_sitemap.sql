ALTER TABLE "status_pages" ADD COLUMN IF NOT EXISTS "include_in_sitemap" boolean DEFAULT true NOT NULL;
