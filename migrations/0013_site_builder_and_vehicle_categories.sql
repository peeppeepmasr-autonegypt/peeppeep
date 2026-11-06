ALTER TABLE units ADD COLUMN vehicle_category TEXT NOT NULL DEFAULT 'car'
  CHECK (vehicle_category IN ('car', 'motorcycle', 'scooter', 'commercial'));
CREATE INDEX IF NOT EXISTS idx_units_category_public
  ON units(vehicle_category, published, status);

CREATE TABLE IF NOT EXISTS site_profiles (
  target_type TEXT NOT NULL CHECK (target_type IN ('business', 'unit')),
  target_id TEXT NOT NULL,
  template_id TEXT NOT NULL CHECK (template_id IN ('editorial', 'showroom', 'minimal')),
  logo_url TEXT,
  accent_color TEXT,
  background_color TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (target_type, target_id)
);
