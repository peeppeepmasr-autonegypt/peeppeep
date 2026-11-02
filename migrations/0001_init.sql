-- ============================================================
-- autoportal D1 schema — Phase B1 (SQLite / Cloudflare D1)
-- Fresh, isolated automotive-only schema. No MySQL, no legacy
-- real-estate/tourism tables. Applied with:
--   npx wrangler d1 migrations apply autoportal-d1 --local
--   npx wrangler d1 migrations apply autoportal-d1 --remote
-- Conventions: app-generated VARCHAR ids, JSON as TEXT, booleans
-- as INTEGER 0/1, timestamps as TEXT CURRENT_TIMESTAMP.
-- ============================================================

CREATE TABLE IF NOT EXISTS markets (
  id             TEXT PRIMARY KEY,
  slug           TEXT,
  name_en        TEXT,
  name_ar        TEXT,
  default_locale TEXT NOT NULL DEFAULT 'ar',
  currency       TEXT,
  active         INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS business_types (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  name_ar         TEXT,
  icon            TEXT,
  description     TEXT,
  is_parent       INTEGER NOT NULL DEFAULT 0,
  parent_id       TEXT REFERENCES business_types(id),
  market_id       TEXT REFERENCES markets(id),
  vendor_claimable INTEGER NOT NULL DEFAULT 0,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  sections        TEXT,   -- JSON array of section ids passed down the kind chain
  own_sections    TEXT    -- JSON array of section ids this kind adds for itself
);

CREATE TABLE IF NOT EXISTS sections (
  id             TEXT PRIMARY KEY,
  name           TEXT NOT NULL,
  name_ar        TEXT,
  icon           TEXT,
  description    TEXT,
  sort_order     INTEGER NOT NULL DEFAULT 0,
  enable_gallery INTEGER NOT NULL DEFAULT 0,
  enable_blog    INTEGER NOT NULL DEFAULT 0,
  options        TEXT    -- JSON: { markets:[], component, relationship:[], aspect }
);

CREATE TABLE IF NOT EXISTS businesses (
  id                 TEXT PRIMARY KEY,
  name               TEXT NOT NULL,
  name_ar            TEXT,
  slug               TEXT UNIQUE NOT NULL,
  type_id            TEXT REFERENCES business_types(id),
  market_id          TEXT REFERENCES markets(id),
  parent_business_id TEXT REFERENCES businesses(id),
  path               TEXT,                 -- materialized id path: /brand/model/trim
  minisite_mode      TEXT NOT NULL DEFAULT 'standalone',
  custom_data        TEXT NOT NULL DEFAULT '{}',  -- JSON authored values, per section
  url_style          TEXT NOT NULL DEFAULT 'root',
  subscription_tier  TEXT NOT NULL DEFAULT 'pro',
  status             TEXT NOT NULL DEFAULT 'active',
  published          INTEGER NOT NULL DEFAULT 1,
  created_at         TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_businesses_parent ON businesses(parent_business_id);
CREATE INDEX IF NOT EXISTS idx_businesses_type   ON businesses(type_id);
CREATE INDEX IF NOT EXISTS idx_businesses_market ON businesses(market_id);

CREATE TABLE IF NOT EXISTS business_relationships (
  id               TEXT PRIMARY KEY,
  from_business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  to_business_id   TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  relation_type    TEXT NOT NULL,
  is_primary       INTEGER NOT NULL DEFAULT 0,
  role_data        TEXT,                   -- JSON per-pairing facts
  created_at       TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(from_business_id, to_business_id, relation_type),
  CHECK (from_business_id <> to_business_id)
);
CREATE INDEX IF NOT EXISTS idx_br_from ON business_relationships(from_business_id);
CREATE INDEX IF NOT EXISTS idx_br_to   ON business_relationships(to_business_id);
CREATE INDEX IF NOT EXISTS idx_br_type ON business_relationships(relation_type);

CREATE TABLE IF NOT EXISTS field_groups (
  id               TEXT PRIMARY KEY,
  business_type_id TEXT NOT NULL REFERENCES business_types(id),
  section_id       TEXT NOT NULL REFERENCES sections(id),
  name             TEXT NOT NULL,
  label            TEXT,
  label_ar         TEXT,
  sort_order       INTEGER NOT NULL DEFAULT 0,
  active           INTEGER NOT NULL DEFAULT 1,
  UNIQUE(business_type_id, section_id, name)
);

CREATE TABLE IF NOT EXISTS form_fields (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  business_type_id TEXT NOT NULL REFERENCES business_types(id),
  section_id       TEXT NOT NULL REFERENCES sections(id),
  name             TEXT NOT NULL,
  label            TEXT,
  label_ar         TEXT,
  field_type       TEXT NOT NULL DEFAULT 'text',
  group_key        TEXT,
  sort_order       INTEGER NOT NULL DEFAULT 0,
  options          TEXT,   -- JSON: { enum:[...] } for select fields
  -- A field flagged here is a *slide*: its value is the headline of one
  -- carousel slide in this section (see vendor_gallery.field_key for its media).
  show_as_slide    INTEGER NOT NULL DEFAULT 0,
  -- Author-level override of the typology above. NULL means "no opinion", so the
  -- renderer falls back to show_as_slide and then to placement; a value here wins
  -- outright. This is the legacy field_destinations idea, kept as a typed column
  -- instead of a JSON blob: carousel = slide only, body = grid row only,
  -- both = both, hidden = authored but never printed (internal/backup data).
  destination      TEXT CHECK (destination IN ('carousel','body','both','hidden')),
  UNIQUE(business_type_id, section_id, name)
);
CREATE INDEX IF NOT EXISTS idx_fields_type_section ON form_fields(business_type_id, section_id);

CREATE TABLE IF NOT EXISTS vendor_gallery (
  id               TEXT PRIMARY KEY,
  business_id      TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  section_id       TEXT REFERENCES sections(id),
  url              TEXT NOT NULL,
  caption          TEXT,          -- caption #1 (EN)
  caption_ar       TEXT,          -- caption #1 (AR)
  media_data       TEXT,          -- JSON caption #2 overlay {title,title_ar,subtitle,subtitle_ar,fields}
  group_key        TEXT,          -- binds the image to a field_group -> dynamic caption #2
  -- Value binding (the carousel contract): this image is the media for ONE
  -- field, so the slide headline is that field's value. `field_key` is a
  -- form_fields.name and `field_section_id` says which section owns it -- NULL
  -- means "the image's own section", which is the common case; an explicit
  -- value lets a photo in one section carry a value authored in another
  -- (e.g. an engine-bay shot printing Specifications -> max_power_hp).
  field_key        TEXT,
  field_section_id TEXT,
  display_order    INTEGER NOT NULL DEFAULT 0,
  -- For an UNBOUND image: body = grid only, carousel = hero only, both = both.
  -- A BOUND image is a slide by definition, so this then says whether it also
  -- repeats in the body grid.
  placement        TEXT NOT NULL DEFAULT 'body',   -- body | carousel | both
  is_hero          INTEGER NOT NULL DEFAULT 0,
  show_on_main     INTEGER NOT NULL DEFAULT 0,
  show_on_minisite INTEGER NOT NULL DEFAULT 1,
  approval_status  TEXT NOT NULL DEFAULT 'approved'
);
CREATE INDEX IF NOT EXISTS idx_gallery_biz_section ON vendor_gallery(business_id, section_id, display_order);
CREATE INDEX IF NOT EXISTS idx_gallery_field ON vendor_gallery(business_id, field_key);

CREATE TABLE IF NOT EXISTS section_blogs (
  id               TEXT PRIMARY KEY,
  business_id      TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  section_id       TEXT REFERENCES sections(id),
  title            TEXT,
  title_ar         TEXT,
  content          TEXT,
  content_ar       TEXT,
  status           TEXT NOT NULL DEFAULT 'published',
  show_on_minisite INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_blog_biz_section ON section_blogs(business_id, section_id);

-- ============================================================
-- Admin identity (Phase E)
--
-- Cloudflare Access authenticates the human at the edge and hands us a verified
-- JWT; this table is only about AUTHORIZATION: which known email may enter, in
-- which role, over which businesses. Keeping the two apart is deliberate -- the
-- secret lives in Access, the scope lives in D1, and neither can be bypassed by
-- a change to the other.
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_users (
  id           TEXT PRIMARY KEY,
  email        TEXT UNIQUE NOT NULL,      -- must match the Access JWT subject
  name         TEXT,
  -- platform_admin curates definitions and approves vendor proposals; vendor
  -- edits only the businesses listed in `scope_ids`.
  role         TEXT NOT NULL DEFAULT 'vendor' CHECK (role IN ('platform_admin','vendor')),
  scope_ids    TEXT NOT NULL DEFAULT '[]',-- JSON array of business ids ('*': everything)
  active       INTEGER NOT NULL DEFAULT 1,
  created_at   TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TEXT
);
