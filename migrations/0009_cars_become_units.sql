-- ============================================================
-- autoportal D1 migration 0009 — cars become units
-- ============================================================
--
-- Every `car_listing` businesses node becomes a row in `units` and stops being a
-- minisite. The node is retired rather than deleted: published = 0 and
-- status = 'retired' keep every foreign key, every authored value and the
-- rollback trivial (two columns back), while the page that used to render from
-- it now renders from a unit.
--
-- The slug is reused unchanged, so an inbound link or a bookmarked URL never
-- breaks; the route layer redirects the old bare path to the unit's home under
-- its seller (see src/lib/units.ts + the [slug] route).
--
-- Model linkage is resolved, never invented: a unit is attached to a
-- vehicle_model node only when one genuinely exists for that brand and model.
-- The demo iX has none, so it renders through its seller with
-- model_business_id = NULL, exactly as 0008 documents.

-- ── 1. the vendor behind each demo storefront ────────────────────────────────
-- Seeded as approved because these are our own demo accounts, not self-signed
-- applications: 'pending' would misrepresent a demonstration as a request.
INSERT OR REPLACE INTO vendors (id, slug, name, name_ar, kind, phone, status) VALUES
  ('ven_auto_one_egypt', 'auto-one-egypt', 'Auto One Egypt', 'أوتو ون مصر', 'showroom', '+20 100 000 1234', 'approved'),
  ('ven_cairo_motors',   'cairo-motors',   'Cairo Motors',   'كايرو موتورز', 'showroom', '+20 2 1234 5678',  'approved');

UPDATE businesses SET owner_id = 'ven_auto_one_egypt' WHERE id = 'biz_auto_one_egypt';
UPDATE businesses SET owner_id = 'ven_cairo_motors'   WHERE id = 'biz_cairo_motors';

-- ── 2. the unit rows ─────────────────────────────────────────────────────────
INSERT OR REPLACE INTO units (
  id, market_id, seller_business_id, owner_business_id, model_business_id,
  slug, title, title_ar, unit_kind, status,
  year, mileage_km, vin, color, color_ar,
  price_egp, price_currency, negotiable, media, overrides, published, created_at, updated_at
)
SELECT
  'unit_' || b.slug,
  COALESCE(b.market_id, 'automotive'),
  b.parent_business_id,
  b.parent_business_id,
  -- brand + model as the car named them, matched against real model nodes only.
  (SELECT m.id
     FROM businesses m
     JOIN businesses br ON br.id = m.parent_business_id
    WHERE m.type_id = 'vehicle_model'
      AND b.name LIKE '%' || br.name || ' ' || m.name || '%'
    ORDER BY br.name, m.name
    LIMIT 1),
  b.slug,
  b.name,
  b.name_ar,
  -- Condition was a free select on the listing kind; unit_kind is the closed set.
  -- "Certified Pre-Owned" is a guarantee about a used car, not a third kind.
  CASE lower(COALESCE(json_extract(b.custom_data, '$.sec_listing_price.condition'), 'New'))
    WHEN 'used' THEN 'used'
    WHEN 'certified pre-owned' THEN 'used'
    WHEN 'demo' THEN 'demo'
    WHEN 'lease return' THEN 'lease_return'
    ELSE 'new'
  END,
  'available',
  CAST(json_extract(b.custom_data, '$.sec_listing_price.year') AS INTEGER),
  CAST(json_extract(b.custom_data, '$.sec_listing_price.mileage_km') AS INTEGER),
  json_extract(b.custom_data, '$.sec_listing_price.vin'),
  json_extract(b.custom_data, '$.sec_listing_price.color'),
  json_extract(b.custom_data, '$.sec_listing_price.color_ar'),
  CAST(json_extract(b.custom_data, '$.sec_listing_price.price_egp') AS INTEGER),
  COALESCE(json_extract(b.custom_data, '$.sec_listing_price.price_currency'), 'EGP'),
  CAST(COALESCE(json_extract(b.custom_data, '$.sec_listing_price.negotiable'), 0) AS INTEGER),
  '{}',
  '{}',
  b.published,
  b.created_at,
  CURRENT_TIMESTAMP
FROM businesses b
WHERE b.type_id = 'car_listing'
  AND b.parent_business_id IS NOT NULL;

-- ── 3. overrides: only what the model's kind actually defines ────────────────
-- Built by intersection, not by copying: a key earns its place here by existing
-- in vehicle_model's definitions AND having an authored value on the car. That
-- is why the 34-definition mirror in 0006 can go in section 6 — the values it
-- existed to author now arrive through the model they were copied from.
-- json() marks the inner object as JSON so it nests instead of being escaped.
UPDATE units
   SET overrides = COALESCE((
     SELECT json_group_object(sec.section_id, json(sec.obj)) FROM (
       SELECT ff.section_id AS section_id,
              json_group_object(ff.name, json_extract(u2.custom_data, '$.' || ff.section_id || '.' || ff.name)) AS obj
         FROM form_fields ff
         JOIN businesses u2 ON u2.slug = units.slug AND u2.type_id = 'car_listing'
        WHERE ff.business_type_id = 'vehicle_model'
          AND json_extract(u2.custom_data, '$.' || ff.section_id || '.' || ff.name) IS NOT NULL
        GROUP BY ff.section_id
     ) sec
   ), '{}')
 WHERE slug IN (SELECT slug FROM businesses WHERE type_id = 'car_listing');

-- ── 4. photographs follow the car, and stay billed to the seller ─────────────
-- business_id moves to the showroom (the account that owns the media); unit_id
-- says which car it is. A page for the showroom must therefore read
-- `unit_id IS NULL`, or a dealer's wall would be assembled from five hundred
-- cars' photos.
UPDATE vendor_gallery
   SET unit_id    = 'unit_' || (SELECT b.slug FROM businesses b WHERE b.id = vendor_gallery.business_id),
       business_id = (SELECT b.parent_business_id FROM businesses b WHERE b.id = vendor_gallery.business_id)
 WHERE business_id IN (SELECT id FROM businesses WHERE type_id = 'car_listing');

-- ── 5. history starts here ───────────────────────────────────────────────────
-- The migrated price is the first provable point on each unit's curve, captured
-- by the migration itself so nothing before it is claimed as fact.
INSERT OR REPLACE INTO price_snapshots (id, subject_type, subject_id, price_egp, currency, source_type, source_url, captured_by)
SELECT
  'ps_mig_' || u.id,
  'unit',
  u.id,
  u.price_egp,
  u.price_currency,
  'dealer_listing',
  '/u/' || u.slug,
  'migration-0009'
FROM units u
WHERE u.price_egp IS NOT NULL
  AND u.slug IN (SELECT slug FROM businesses WHERE type_id = 'car_listing');

-- ── 6. retire the nodes and the kind that made them ──────────────────────────
UPDATE businesses
   SET published = 0, status = 'retired', minisite_mode = 'unit_source'
 WHERE type_id = 'car_listing';

-- The mirror exists no more: a unit inherits its numbers from the model, so the
-- copied definitions have no author left to serve. sec_listing_price stays — the
-- retired nodes' custom_data still names those keys, and reading history out of
-- a row requires the row's shape to remain legible.
DELETE FROM form_fields  WHERE business_type_id = 'car_listing' AND section_id <> 'sec_listing_price';
DELETE FROM field_groups WHERE business_type_id = 'car_listing' AND section_id <> 'sec_listing_price';

-- A car is not a thing a vendor claims a page for any more. The kind survives so
-- the retired rows keep a truthful type_id; it just cannot be instantiated.
UPDATE business_types
   SET vendor_claimable = 0,
       own_sections = '["sec_listing_price"]',
       description = 'Retired in 0009: a car is a units row, not a businesses node. Kept only so the retired listing rows keep a truthful type_id.'
 WHERE id = 'car_listing';
