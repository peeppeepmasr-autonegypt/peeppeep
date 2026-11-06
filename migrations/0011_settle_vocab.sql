-- ============================================================
-- autoportal D1 migration 0011 — settle the vocabulary
-- ============================================================
--
-- 0010 made authored-vs-relational machine-readable. It also proved the second
-- half of the contract is missing: four authored shelves carry no field
-- definitions at all, so every business that lists them renders an empty
-- heading and the admin cannot answer the questions the shelf implies.
--
-- The empty shelves and the kinds that carry them:
--   sec_1_identity       - all 15 leaf kinds (inherited from parent's sections)
--   sec_auto_showroom    - 6 kinds that list it in own_sections
--   sec_auto_products    - 3 finance kinds
--   sec_10_testimonials  - 11 customer-facing kinds (skips reference data)
--
-- This migration is pure data. No table is altered, no guard changes. Every row
-- is idempotent (INSERT OR REPLACE against the UNIQUE columns the schema
-- already enforces), and it deliberately does NOT restate any column that
-- already exists on businesses or units: `business_name` stays a column, not a
-- field, so a second copy cannot drift from the first.
--
-- Field groups come with the fields: without them the admin form renders the
-- shelf flat and the authored answers lose their visual contract on the page.

-- ── 1. sec_1_identity: the entity speaks for itself ──────────────────────────
WITH
kind(id) AS (VALUES
  ('vehicle_brand'),('vehicle_model'),('vehicle_trim'),('factory'),
  ('main_agency'),('showroom'),('distributor'),('agent_broker'),('used_car_dealer'),
  ('finance_bank'),('leasing_company'),('insurance_company'),
  ('spare_parts'),('service_center'),('accessories_detailing')
),
spec(name, label, label_ar, field_type, group_key, sort_order, options) AS (VALUES
  ('tagline',           'Tagline',           'الشعار',        'text',     'story',    1, NULL),
  ('description',       'Description',       'الوصف',         'textarea', 'story',    2, NULL),
  ('established_year',  'Established Year',  'سنة التأسيس',   'number',   'heritage', 3, NULL),
  ('country_of_origin', 'Country of Origin', 'بلد المنشأ',    'text',     'heritage', 4, NULL),
  ('website_url',       'Website',           'الموقع الإلكتروني','text',   'contact',  5, NULL),
  ('contact_email',     'Contact Email',     'البريد الإلكتروني','text',   'contact',  6, NULL)
)
INSERT OR REPLACE INTO form_fields
  (business_type_id, section_id, name, label, label_ar, field_type, group_key, sort_order, options, show_as_slide)
SELECT k.id, 'sec_1_identity', s.name, s.label, s.label_ar, s.field_type, s.group_key, s.sort_order, s.options, 0
  FROM kind k, spec s;

WITH
kind(id) AS (VALUES
  ('vehicle_brand'),('vehicle_model'),('vehicle_trim'),('factory'),
  ('main_agency'),('showroom'),('distributor'),('agent_broker'),('used_car_dealer'),
  ('finance_bank'),('leasing_company'),('insurance_company'),
  ('spare_parts'),('service_center'),('accessories_detailing')
),
grp(name, label, label_ar, sort_order) AS (VALUES
  ('story',    'Story',     'الحكاية',   1),
  ('heritage', 'Heritage',  'الجذور',    2),
  ('contact',  'Contact',   'للتواصل',   3)
)
INSERT OR REPLACE INTO field_groups (id, business_type_id, section_id, name, label, label_ar, sort_order, active)
SELECT 'fg_' || k.id || '_identity_' || g.name, k.id, 'sec_1_identity', g.name, g.label, g.label_ar, g.sort_order, 1
  FROM kind k, grp g;

-- ── 2. sec_auto_showroom: where to actually find this branch ─────────────────
-- Identity carries the org's canonical email and website; the showroom shelf
-- answers about THIS location. Two names therefore differ on purpose so the
-- guard's "one question, one shelf" rule is satisfied.
WITH
kind(id) AS (VALUES
  ('main_agency'),('showroom'),('distributor'),('used_car_dealer'),
  ('service_center'),('accessories_detailing')
),
spec(name, label, label_ar, field_type, group_key, sort_order, options) AS (VALUES
  ('address',       'Address',           'العنوان',       'textarea', 'location', 1, NULL),
  ('phone',         'Phone',             'الهاتف',        'text',     'location', 2, NULL),
  ('whatsapp',      'WhatsApp',          'واتساب',        'text',     'location', 3, NULL),
  ('map_url',       'Map Link',          'رابط الخريطة',  'text',     'location', 4, NULL),
  ('branch_email',  'Branch Email',      'بريد الفرع',    'text',     'location', 5, NULL),
  ('opening_hours', 'Opening Hours',     'مواعيد العمل',  'text',     'hours',    1, NULL)
)
INSERT OR REPLACE INTO form_fields
  (business_type_id, section_id, name, label, label_ar, field_type, group_key, sort_order, options, show_as_slide)
SELECT k.id, 'sec_auto_showroom', s.name, s.label, s.label_ar, s.field_type, s.group_key, s.sort_order, s.options, 0
  FROM kind k, spec s;

WITH
kind(id) AS (VALUES
  ('main_agency'),('showroom'),('distributor'),('used_car_dealer'),
  ('service_center'),('accessories_detailing')
),
grp(name, label, label_ar, sort_order) AS (VALUES
  ('location', 'Location',   'الموقع',    1),
  ('hours',    'Hours',      'المواعيد',  2)
)
INSERT OR REPLACE INTO field_groups (id, business_type_id, section_id, name, label, label_ar, sort_order, active)
SELECT 'fg_' || k.id || '_showroom_' || g.name, k.id, 'sec_auto_showroom', g.name, g.label, g.label_ar, g.sort_order, 1
  FROM kind k, grp g;

-- ── 3. sec_auto_products: the money, as data, not constants ──────────────────
-- The FinanceCalculator was going to hardcode 18.5 / 21 / 16 as rate defaults.
-- Those numbers belong to a specific product a specific bank is offering on a
-- specific date. They live here so the calculator reads them off the seller's
-- own shelf and the ledger agrees with the visitor's estimate.
WITH
kind(id) AS (VALUES ('finance_bank'),('leasing_company'),('insurance_company')),
spec(name, label, label_ar, field_type, group_key, sort_order, options) AS (VALUES
  ('product_name',       'Product Name',           'اسم المنتج',              'text',     'pitch',    1, NULL),
  ('product_description','Product Description',    'وصف المنتج',              'textarea', 'pitch',    2, NULL),
  ('apr_type',           'Rate Type',              'نوع الفائدة',             'select',   'rates',    1, '{"enum":["Fixed","Reducing","Variable"]}'),
  ('apr_pct',            'Annual Rate (%)',        'النسبة السنوية (%)',      'number',   'rates',    2, NULL),
  ('term_min_months',    'Term Min (months)',      'الحد الأدنى للمدة (شهر)', 'number',   'rates',    3, NULL),
  ('term_max_months',    'Term Max (months)',      'الحد الأقصى للمدة (شهر)', 'number',   'rates',    4, NULL),
  ('amount_min_egp',     'Amount Min (EGP)',       'الحد الأدنى للتمويل',     'number',   'rates',    5, NULL),
  ('amount_max_egp',     'Amount Max (EGP)',       'الحد الأقصى للتمويل',     'number',   'rates',    6, NULL),
  ('down_payment_pct',   'Down Payment (%)',       'الدفعة المقدمة (%)',      'number',   'rates',    7, NULL),
  ('admin_fee_egp',      'Admin Fee (EGP)',        'المصروفات الإدارية',      'number',   'rates',    8, NULL)
)
INSERT OR REPLACE INTO form_fields
  (business_type_id, section_id, name, label, label_ar, field_type, group_key, sort_order, options, show_as_slide)
SELECT k.id, 'sec_auto_products', s.name, s.label, s.label_ar, s.field_type, s.group_key, s.sort_order, s.options, 0
  FROM kind k, spec s;

WITH
kind(id) AS (VALUES ('finance_bank'),('leasing_company'),('insurance_company')),
grp(name, label, label_ar, sort_order) AS (VALUES
  ('pitch', 'Product',   'المنتج',      1),
  ('rates', 'Rates & Terms', 'الأسعار والشروط', 2)
)
INSERT OR REPLACE INTO field_groups (id, business_type_id, section_id, name, label, label_ar, sort_order, active)
SELECT 'fg_' || k.id || '_products_' || g.name, k.id, 'sec_auto_products', g.name, g.label, g.label_ar, g.sort_order, 1
  FROM kind k, grp g;

-- ── 4. sec_10_testimonials: what buyers actually said ────────────────────────
-- Reference kinds (brand, model, trim, factory) are skipped: they are platform
-- data every dealer links to, so a testimonial authored against them would mix
-- one seller's customer voice into another's page. The shelf is authored, so
-- this is the summary the vendor shows; the full review corpus lives in
-- section_blogs and, later, in a reviews table.
WITH
kind(id) AS (VALUES
  ('main_agency'),('showroom'),('distributor'),('agent_broker'),('used_car_dealer'),
  ('finance_bank'),('leasing_company'),('insurance_company'),
  ('spare_parts'),('service_center'),('accessories_detailing')
),
spec(name, label, label_ar, field_type, group_key, sort_order, options) AS (VALUES
  ('testimonials_enabled', 'Show Testimonials',   'تفعيل التقييمات',   'boolean',  'reviews', 1, NULL),
  ('average_rating',       'Average Rating',      'متوسط التقييم',     'number',   'reviews', 2, NULL),
  ('review_count',         'Review Count',        'عدد التقييمات',     'number',   'reviews', 3, NULL),
  ('featured_review',      'Featured Review',     'تقييم مميز',        'textarea', 'reviews', 4, NULL),
  ('featured_reviewer',    'Featured Reviewer',   'صاحب التقييم المميز','text',    'reviews', 5, NULL)
)
INSERT OR REPLACE INTO form_fields
  (business_type_id, section_id, name, label, label_ar, field_type, group_key, sort_order, options, show_as_slide)
SELECT k.id, 'sec_10_testimonials', s.name, s.label, s.label_ar, s.field_type, s.group_key, s.sort_order, s.options, 0
  FROM kind k, spec s;

WITH
kind(id) AS (VALUES
  ('main_agency'),('showroom'),('distributor'),('agent_broker'),('used_car_dealer'),
  ('finance_bank'),('leasing_company'),('insurance_company'),
  ('spare_parts'),('service_center'),('accessories_detailing')
),
grp(name, label, label_ar, sort_order) AS (VALUES
  ('reviews', 'Reviews', 'التقييمات', 1)
)
INSERT OR REPLACE INTO field_groups (id, business_type_id, section_id, name, label, label_ar, sort_order, active)
SELECT 'fg_' || k.id || '_testimonials_' || g.name, k.id, 'sec_10_testimonials', g.name, g.label, g.label_ar, g.sort_order, 1
  FROM kind k, grp g;
