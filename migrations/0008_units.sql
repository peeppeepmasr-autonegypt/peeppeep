-- ============================================================
-- autoportal D1 migration 0008 — the car is a UNIT, not a business
-- ============================================================
--
-- The shape is ported from the real-estate engine that already runs in
-- siwa-oasis (20261025_markets_and_geo.sql, 20261107_developers.sql,
-- 20261112_comparable_offers.sql), where the rule is stated outright:
--
--   "A chalet is not a business. Five hundred chalets in one compound are five
--    hundred units under one page, otherwise the site grows five hundred thin
--    minisites and a sitemap nobody should crawl."
--
-- Translated: the showroom is the developer, the car MODEL is the project
-- (a businesses node, admin reference data, one page shared by every dealer
-- that sells it), and an individual car is a UNIT — a row with a slug, a price,
-- a status and its own photographs, but no custom_data, no sections and no
-- typology of its own. That last clause is what kills the 0006 mirror, which
-- copied 34 vehicle_model field definitions onto the car_listing kind just so a
-- car could be authored at all.
--
-- Money is INTEGER EGP. D1 has no DECIMAL, and rounding is a display concern —
-- inventing a fixed-point type here would only drift from every other table.
--
-- Everything in this file is additive except section 9, which removes three
-- duplicate field definitions and says why in place.

-- ── 1. units: the inventory inside a showroom, under a model ─────────────────
CREATE TABLE IF NOT EXISTS units (
  id                  TEXT PRIMARY KEY,
  market_id           TEXT NOT NULL DEFAULT 'automotive',
  -- "usually to both" in the reference: the account that LISTS the unit, and the
  -- account whose STOCK it is. A وسيط selling a showroom's car sets
  -- stock_source='on_behalf_of' and points owner_business_id at that showroom.
  seller_business_id  TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  owner_business_id   TEXT          REFERENCES businesses(id) ON DELETE SET NULL,
  stock_source        TEXT NOT NULL DEFAULT 'own_stock'
                      CHECK (stock_source IN ('own_stock','on_behalf_of','consignment')),
  -- The project. Nullable on purpose: a unit whose model nobody has registered
  -- yet still renders, through its seller, rather than fabricating a model node.
  model_business_id   TEXT          REFERENCES businesses(id) ON DELETE SET NULL,
  trim_business_id    TEXT          REFERENCES businesses(id) ON DELETE SET NULL,
  slug                TEXT UNIQUE NOT NULL,
  title               TEXT NOT NULL,
  title_ar            TEXT,
  unit_kind           TEXT NOT NULL DEFAULT 'new'
                      CHECK (unit_kind IN ('new','used','demo','lease_return')),
  status              TEXT NOT NULL DEFAULT 'available'
                      CHECK (status IN ('available','reserved','sold','rented','inactive')),
  year                INTEGER,
  mileage_km          INTEGER,
  vin                 TEXT,
  color               TEXT,
  color_ar            TEXT,
  price_egp           INTEGER,
  price_currency      TEXT NOT NULL DEFAULT 'EGP',
  negotiable          INTEGER NOT NULL DEFAULT 0,
  -- Staged media refs in the same JSON shape vendor_gallery uses, so the phone
  -- camera upload path is shared between a showroom's page and one of its cars.
  media               TEXT NOT NULL DEFAULT '{}',
  -- Per-unit spec overrides. Only keys the model's kind defines may live here —
  -- enforced by src/lib/typology.ts before any write, never by the UI.
  overrides           TEXT NOT NULL DEFAULT '{}',
  published           INTEGER NOT NULL DEFAULT 0,
  created_at          TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_units_seller ON units(seller_business_id, published);
CREATE INDEX IF NOT EXISTS idx_units_model  ON units(model_business_id, status);

-- ── 2. unit_offers: are we comparing like with like? ─────────────────────────
-- The reference names the failure this exists to prevent: comparing every sale
-- unit of a compound against every unit of another. Here the comparable key is
-- (model × trim × kind), and AUTHORITY rides on it — one agency offer per model
-- is the reference price every dealer ask is measured against. This is how a
-- vendor authors truth on an admin-owned project page without owning the page.
CREATE TABLE IF NOT EXISTS unit_offers (
  id                  TEXT PRIMARY KEY,
  model_business_id   TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  seller_business_id  TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  trim                TEXT NOT NULL DEFAULT '',
  unit_kind           TEXT NOT NULL DEFAULT '',
  authority           TEXT NOT NULL DEFAULT 'dealer'
                      CHECK (authority IN ('agency_official','distributor','dealer','broker')),
  price_from_egp      INTEGER,
  price_to_egp        INTEGER,
  availability_note   TEXT,
  availability_note_ar TEXT,
  published           INTEGER NOT NULL DEFAULT 0,
  created_at          TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(model_business_id, seller_business_id, trim, unit_kind)
);
-- A partial unique index is the cheapest possible guarantee of the invariant the
-- test asserts: an official list is singular. Two agencies cannot both be right.
CREATE UNIQUE INDEX IF NOT EXISTS uq_offers_official ON unit_offers(model_business_id)
  WHERE authority = 'agency_official' AND published = 1;
CREATE INDEX IF NOT EXISTS idx_offers_model ON unit_offers(model_business_id, published);

-- ── 3. price_snapshots: who said this number, and when ───────────────────────
-- The enum is ordered by authority on purpose, because the reference named the
-- exact bug it kills: "a verified developer price list and a stale portal
-- listing currently look identical."
CREATE TABLE IF NOT EXISTS price_snapshots (
  id           TEXT PRIMARY KEY,
  subject_type TEXT NOT NULL CHECK (subject_type IN ('unit','offer')),
  subject_id   TEXT NOT NULL,
  price_egp    INTEGER NOT NULL,
  currency     TEXT NOT NULL DEFAULT 'EGP',
  source_type  TEXT NOT NULL
               CHECK (source_type IN ('agency_price_list','dealer_listing','broker_listing','portal','news','bank_valuation')),
  source_url   TEXT,
  source_hash  TEXT,
  captured_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  captured_by  TEXT
);
CREATE INDEX IF NOT EXISTS idx_snapshots_subject ON price_snapshots(subject_type, subject_id, captured_at);

-- Append-only, enforced by the database rather than by discipline: an update is
-- a new row, never an edit in place, so "this car was 4,850,000 in September"
-- stays provable after the showroom has rewritten its price list three times.
CREATE TRIGGER IF NOT EXISTS trg_price_snapshots_no_update
BEFORE UPDATE ON price_snapshots
BEGIN
  SELECT RAISE(ABORT, 'price_snapshots is append-only: insert a new row instead of editing this one');
END;

CREATE TRIGGER IF NOT EXISTS trg_price_snapshots_no_delete
BEFORE DELETE ON price_snapshots
BEGIN
  SELECT RAISE(ABORT, 'price_snapshots is append-only: history is not deletable');
END;

-- ── 4. vendors: the account behind the storefront ────────────────────────────
-- A showroom is an entity that owns several businesses nodes (its branches) and
-- every unit listed by them. businesses.owner_id is the join; scope_ids on
-- admin_users stays the authorization surface, and src/lib/typology.ts widens it
-- down the tree so an agency account sees the showrooms beneath it.
CREATE TABLE IF NOT EXISTS vendors (
  id          TEXT PRIMARY KEY,
  slug        TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  name_ar     TEXT,
  kind        TEXT NOT NULL DEFAULT 'showroom'
              CHECK (kind IN ('main_agency','distributor','showroom','agent_broker','used_car_dealer')),
  email       TEXT,
  phone       TEXT,
  -- Commercial registration and tax number: the difference between a seller and
  -- a listing, and the first thing a buyer in Egypt should be able to ask.
  commercial_reg TEXT,
  tax_id         TEXT,
  status      TEXT NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending','approved','suspended','rejected')),
  created_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ── 5. correction_requests: the owner corrects, the admin approves ───────────
-- Without this, a wrong price on a vendor's unit can only be fixed by someone
-- with platform access editing rows silently, which is how provenance dies.
CREATE TABLE IF NOT EXISTS correction_requests (
  id                TEXT PRIMARY KEY,
  owner_id          TEXT REFERENCES vendors(id),
  unit_id           TEXT REFERENCES units(id) ON DELETE CASCADE,
  model_business_id TEXT REFERENCES businesses(id) ON DELETE CASCADE,
  message           TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','applied','rejected')),
  created_at        TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at       TEXT
);
CREATE INDEX IF NOT EXISTS idx_corrections_status ON correction_requests(status, created_at);

-- ── 6. contract_terms: the deciding numbers, storable at last ────────────────
-- Ported from development_contract_terms. Maintenance/deposit, transfer fee,
-- broker commission, admin fee, late-delivery and late-payment terms are what
-- decide a purchase in this market — and until now they had nowhere to live.
-- They are also the exact columns showroom_accounting_ar.xlsx computes on, so
-- one authored row serves both the visitor's estimate and the owner's ledger.
CREATE TABLE IF NOT EXISTS contract_terms (
  id                     TEXT PRIMARY KEY,
  subject_type           TEXT NOT NULL CHECK (subject_type IN ('model','unit')),
  subject_id             TEXT NOT NULL,
  maintenance_note       TEXT,
  maintenance_note_ar    TEXT,
  -- A closed three-way question with no wording a seller could plausibly invent.
  maintenance_due_timing TEXT CHECK (maintenance_due_timing IN ('at_delivery','at_contract','annual')),
  transfer_fee_egp       INTEGER,
  broker_commission_pct  REAL,
  admin_fee_egp          INTEGER,
  late_delivery_terms    TEXT,
  late_delivery_terms_ar TEXT,
  late_payment_terms     TEXT,
  late_payment_terms_ar  TEXT,
  vat_pct                REAL,
  updated_at             TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_contract_subject ON contract_terms(subject_type, subject_id);

-- ── 7. the joins onto the tables that already existed ────────────────────────
ALTER TABLE businesses ADD COLUMN owner_id TEXT REFERENCES vendors(id);
CREATE INDEX IF NOT EXISTS idx_businesses_owner ON businesses(owner_id);

-- A unit's photographs stay attached to the unit; business_id keeps pointing at
-- the seller that owns the account, so the gallery admin surface is unchanged.
ALTER TABLE vendor_gallery ADD COLUMN unit_id TEXT REFERENCES units(id);
CREATE INDEX IF NOT EXISTS idx_gallery_unit ON vendor_gallery(unit_id, section_id, display_order);

-- ── 8. typology columns the hierarchy rules always assumed ────────────────────
ALTER TABLE form_fields ADD COLUMN excluded INTEGER NOT NULL DEFAULT 0;
ALTER TABLE form_fields ADD COLUMN section_origin TEXT
  CHECK (section_origin IN ('inherited','own','template'));
ALTER TABLE business_types ADD COLUMN allowed_child_kinds TEXT NOT NULL DEFAULT '[]';

-- Nesting, as data instead of as a convention someone remembers.
UPDATE business_types SET allowed_child_kinds = '["vehicle_brand","vehicle_model","vehicle_trim","factory"]' WHERE id = 'auto_vehicles';
UPDATE business_types SET allowed_child_kinds = '["main_agency","showroom","distributor","agent_broker","used_car_dealer"]' WHERE id = 'auto_sales';
UPDATE business_types SET allowed_child_kinds = '["finance_bank","leasing_company","insurance_company"]' WHERE id = 'auto_finance';
UPDATE business_types SET allowed_child_kinds = '["spare_parts","service_center","accessories_detailing"]' WHERE id = 'auto_aftermarket';
UPDATE business_types SET allowed_child_kinds = '["vehicle_model","vehicle_trim"]' WHERE id = 'vehicle_brand';
UPDATE business_types SET allowed_child_kinds = '["vehicle_trim"]' WHERE id = 'vehicle_model';
-- The sales chain, top down. A showroom holds units, not businesses: 0009 makes
-- that true by turning its cars into unit rows.
UPDATE business_types SET allowed_child_kinds = '["showroom","distributor","agent_broker"]' WHERE id = 'main_agency';
UPDATE business_types SET allowed_child_kinds = '["showroom","agent_broker"]' WHERE id = 'distributor';
UPDATE business_types SET allowed_child_kinds = '[]' WHERE id IN
  ('showroom','agent_broker','used_car_dealer','vehicle_trim','factory','finance_bank','leasing_company','insurance_company','spare_parts','service_center','accessories_detailing');

-- A parent kind is a template, never a page: BUSINESS_HIERARCHY_RULES.md is
-- explicit that templates are read-only and instances are what a vendor owns.
UPDATE business_types SET vendor_claimable = 0 WHERE is_parent = 1;

-- ── 9. one fact, one place: Specifications owns the numbers ──────────────────
-- sec_auto_specs.power_hp / torque_nm / zero_to_100_s and
-- sec_auto_engine.max_power_hp / max_torque_nm / acceleration_0_100 are the same
-- three facts defined twice. Both shelves are wanted; defining the number twice
-- is not. Specifications keeps them (it is where a buyer expects a table), so
-- the Engine shelf loses its duplicates and gains what it was always meant to
-- hold — the powertrain detail a spec table does not carry.
DELETE FROM form_fields WHERE business_type_id = 'vehicle_model' AND section_id = 'sec_auto_engine'
  AND name IN ('max_power_hp','max_torque_nm','acceleration_0_100');
DELETE FROM field_groups WHERE business_type_id = 'vehicle_model' AND id = 'fg_vm_engine';

INSERT OR REPLACE INTO field_groups (id, business_type_id, section_id, name, label, label_ar, sort_order, active) VALUES
  ('fg_vm_engine_power',   'vehicle_model', 'sec_auto_engine', 'powertrain', 'Powertrain',        'منظومة القدرة',   1, 1),
  ('fg_vm_engine_charge',  'vehicle_model', 'sec_auto_engine', 'charging',   'Charging & Range',  'الشحن والمدى',    2, 1);

INSERT OR REPLACE INTO form_fields (business_type_id, section_id, name, label, label_ar, field_type, group_key, sort_order, options, show_as_slide) VALUES
  ('vehicle_model','sec_auto_engine','hybrid_system','Hybrid System','نظام الهايبريد','select','powertrain',1,'{"enum":["Mild","Full","Plug-in","Series"]}',1),
  ('vehicle_model','sec_auto_engine','battery_capacity_kwh','Battery Capacity (kWh)','سعة البطارية (كWh)','number','charging',2,NULL,1),
  ('vehicle_model','sec_auto_engine','electric_range_km','Electric Range (km)','المدى الكهربائي (كم)','number','charging',3,NULL,1),
  ('vehicle_model','sec_auto_engine','charging_dc_kw','DC Charging (kW)','السرعة القصوى للشحن (kW)','number','charging',4,NULL,1),
  ('vehicle_model','sec_auto_engine','charge_10_to_80_min','10-80% Charge (min)','زمن الشحن 10-80% (دقيقة)','number','charging',5,NULL,1);

-- hybrid_system is deliberately NOT engine_type again: sec_auto_specs.engine_type
-- answers "what burns", this answers "how the motors are arranged".
