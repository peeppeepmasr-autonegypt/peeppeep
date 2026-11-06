CREATE TABLE IF NOT EXISTS business_memberships (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  admin_user_id TEXT NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'sales', 'accountant')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'revoked')),
  invited_by TEXT REFERENCES admin_users(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (business_id, admin_user_id)
);

CREATE INDEX IF NOT EXISTS idx_business_memberships_user
  ON business_memberships(admin_user_id, status);

CREATE TABLE IF NOT EXISTS business_app_licenses (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  application_id TEXT NOT NULL CHECK (application_id IN ('crm', 'marketplace', 'accounting')),
  status TEXT NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested', 'active', 'suspended', 'expired', 'revoked')),
  license_key TEXT,
  starts_at TEXT,
  expires_at TEXT,
  updated_by TEXT REFERENCES admin_users(id),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (business_id, application_id)
);

CREATE INDEX IF NOT EXISTS idx_business_app_licenses_status
  ON business_app_licenses(status, application_id);
