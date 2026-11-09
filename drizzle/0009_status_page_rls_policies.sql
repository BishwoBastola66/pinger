-- Status Page Components RLS
DO $$ BEGIN
  CREATE POLICY status_page_components_select ON status_page_components FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM status_pages sp
      WHERE sp.id = status_page_components.status_page_id
        AND (sp.is_public = true OR sp.user_id = current_app_user_id() OR is_admin())
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY status_page_components_manage ON status_page_components FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM status_pages sp
      WHERE sp.id = status_page_components.status_page_id
        AND (sp.user_id = current_app_user_id() OR is_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM status_pages sp
      WHERE sp.id = status_page_components.status_page_id
        AND (sp.user_id = current_app_user_id() OR is_admin())
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Status Page Updates RLS
DO $$ BEGIN
  CREATE POLICY status_page_updates_select ON status_page_updates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM status_pages sp
      WHERE sp.id = status_page_updates.status_page_id
        AND (sp.is_public = true OR sp.user_id = current_app_user_id() OR is_admin())
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY status_page_updates_manage ON status_page_updates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM status_pages sp
      WHERE sp.id = status_page_updates.status_page_id
        AND (sp.user_id = current_app_user_id() OR is_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM status_pages sp
      WHERE sp.id = status_page_updates.status_page_id
        AND (sp.user_id = current_app_user_id() OR is_admin())
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Maintenance Windows RLS
DO $$ BEGIN
  CREATE POLICY maintenance_windows_own ON maintenance_windows FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM monitors m
      WHERE m.id = maintenance_windows.monitor_id
        AND (m.user_id = current_app_user_id() OR is_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM monitors m
      WHERE m.id = maintenance_windows.monitor_id
        AND (m.user_id = current_app_user_id() OR is_admin())
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Payments RLS
DO $$ BEGIN
  CREATE POLICY payments_own ON payments FOR ALL
  USING (user_id = current_app_user_id() OR is_admin())
  WITH CHECK (user_id = current_app_user_id() OR is_admin());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
