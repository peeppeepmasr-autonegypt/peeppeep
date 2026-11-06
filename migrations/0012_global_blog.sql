CREATE TABLE IF NOT EXISTS global_blog_categories (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  name_ar TEXT,
  description TEXT,
  description_ar TEXT,
  color TEXT NOT NULL DEFAULT '#9e7a32',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS global_blog_posts (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  title_ar TEXT,
  excerpt TEXT,
  excerpt_ar TEXT,
  content TEXT NOT NULL DEFAULT '',
  content_ar TEXT NOT NULL DEFAULT '',
  featured_image_url TEXT,
  author_name TEXT NOT NULL DEFAULT '',
  category_id TEXT REFERENCES global_blog_categories(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'scheduled')),
  published_at TEXT,
  seo_title TEXT,
  seo_title_ar TEXT,
  seo_description TEXT,
  seo_description_ar TEXT,
  meta_keywords TEXT,
  reading_time INTEGER NOT NULL DEFAULT 1,
  view_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_global_blog_posts_public
  ON global_blog_posts(status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_global_blog_posts_category
  ON global_blog_posts(category_id, published_at DESC);

CREATE TABLE IF NOT EXISTS global_blog_tags (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  name_ar TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS global_blog_post_tags (
  post_id TEXT NOT NULL REFERENCES global_blog_posts(id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES global_blog_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);

CREATE TABLE IF NOT EXISTS global_blog_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  widgets TEXT NOT NULL DEFAULT '["carousel","search","recent","categories","tags"]',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT OR IGNORE INTO global_blog_settings (id) VALUES (1);

CREATE TABLE IF NOT EXISTS global_blog_comments (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES global_blog_posts(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  author_email TEXT,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'spam')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_global_blog_comments_review
  ON global_blog_comments(status, created_at);
