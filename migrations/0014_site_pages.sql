CREATE TABLE IF NOT EXISTS site_pages (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  page_type TEXT NOT NULL CHECK (page_type IN ('home', 'custom')),
  draft_slug TEXT NOT NULL,
  draft_title TEXT NOT NULL,
  draft_title_ar TEXT,
  draft_components TEXT NOT NULL,
  published_slug TEXT,
  published_title TEXT,
  published_title_ar TEXT,
  published_components TEXT,
  published INTEGER NOT NULL DEFAULT 0 CHECK (published IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (business_id, draft_slug),
  CHECK (
    (page_type = 'home' AND draft_slug = '')
    OR (page_type = 'custom' AND length(draft_slug) > 0)
  )
);

CREATE INDEX IF NOT EXISTS idx_site_pages_published
  ON site_pages(business_id, published, published_slug);
