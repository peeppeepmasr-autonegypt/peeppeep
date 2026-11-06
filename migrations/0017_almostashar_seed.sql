-- ============================================================
-- autoportal D1 migration 0017 — Almostashar Auto Showroom
-- Seed: المستشار أوتو (Almostashar Auto)
-- minisite: autofyon.com/almostashar
-- custom domain: almostashar.com (via businesses.custom_domain)
-- ERP push: POST /api/vendor/sync-inventory  Bearer ak_almostashar_2026_autofyon
-- ============================================================

-- 1. Add vendor_api_key column to businesses (safe — ignored if exists in SQLite,
--    but D1 wrangler migrations track state so this only runs once)
ALTER TABLE businesses ADD COLUMN vendor_api_key TEXT;

-- 2. Insert Almostashar vendor account
INSERT OR REPLACE INTO vendors (id, slug, name, name_ar, kind, phone, email, status)
VALUES (
  'ven_almostashar',
  'almostashar',
  'Almostashar Auto',
  'المستشار أوتو',
  'showroom',
  '+201222597304',
  'autofyon@gmail.com',
  'approved'
);

-- 3. Insert Almostashar showroom business
INSERT OR REPLACE INTO businesses
  (id, name, name_ar, slug, custom_domain, vendor_api_key,
   type_id, market_id, parent_business_id, owner_id,
   path, minisite_mode, custom_data, subscription_tier, published, status)
VALUES (
  'biz_almostashar',
  'Almostashar Auto',
  'المستشار أوتو',
  'almostashar',
  NULL,
  'ak_almostashar_2026_autofyon',
  'showroom',
  'automotive',
  NULL,
  'ven_almostashar',
  '/almostashar',
  'standalone',
  '{
    "sec_1_identity": {
      "business_name": "Almostashar Auto",
      "business_name_ar": "المستشار أوتو",
      "tagline": "Your Trusted Automotive Advisor",
      "tagline_ar": "مستشارك الموثوق في عالم السيارات",
      "description": "Almostashar Auto is a full-service automotive showroom offering curated new and pre-owned vehicles, flexible financing, and expert advisory.",
      "description_ar": "المستشار أوتو معرض سيارات متكامل يقدم سيارات جديدة ومستعملة مختارة بعناية مع حلول تمويل مرنة ونصائح متخصصة."
    },
    "sec_auto_showroom": {
      "phone": "+201222597304",
      "whatsapp": "+201222597304",
      "email": "autofyon@gmail.com",
      "address": "Egypt",
      "address_ar": "مصر",
      "opening_hours": "Sat-Thu 9 AM - 9 PM",
      "opening_hours_ar": "السبت - الخميس 9 ص - 9 م"
    }
  }',
  'pro',
  1,
  'active'
);

-- 4. Insert Almostashar admin user
INSERT OR REPLACE INTO admin_users
  (id, email, name, role, scope_ids, active)
VALUES (
  'usr_almostashar_admin',
  'autofyon@gmail.com',
  'المستشار - Almostashar Admin',
  'vendor',
  '["biz_almostashar"]',
  1
);

-- 5. Business membership: owner role
INSERT OR REPLACE INTO business_memberships
  (id, business_id, admin_user_id, role, status)
VALUES (
  'mem_almostashar_owner',
  'biz_almostashar',
  'usr_almostashar_admin',
  'owner',
  'active'
);

-- 6. Grant marketplace license to Almostashar
INSERT OR REPLACE INTO business_app_licenses
  (id, business_id, application_id, status, starts_at)
VALUES (
  'lic_almostashar_marketplace',
  'biz_almostashar',
  'marketplace',
  'active',
  CURRENT_TIMESTAMP
);
