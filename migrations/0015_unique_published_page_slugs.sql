CREATE UNIQUE INDEX IF NOT EXISTS uq_site_pages_published_slug
  ON site_pages(business_id, published_slug);
