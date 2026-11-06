-- ============================================================
-- autoportal D1 migration 0010 — authored vs relational becomes DATA
-- ============================================================
--
-- `Automotive_Sections_Plan.md` §0 states the principle plainly: every block on
-- a minisite is either AUTHORED (a value somebody typed, printed from
-- `custom_data` through `form_fields`) or RELATIONAL (a query over the tree and
-- the graph, typed by nobody, re-typed by everybody who tries). Until today that
-- split lived only in a markdown table marked `[A]`, `[R]`, `[A+R]`, while the
-- renderer decided it in code. Nothing in the database could refuse a form field
-- bolted onto a shelf that is answered by a query — the exact defect that made
-- `0006_enrich_specs.sql` possible.
--
-- So this migration records the split per shelf, and the guards in
-- `src/lib/typology.ts` enforce it on every write from now on.
--
-- The values are seeded from what the shelves ALREADY declare, not from the plan
-- document (probe: scratch/probe-settling.sql). That is why six shelves came out
-- `relational` with zero definitions on them — the graph half of this system was
-- honest before it was policed. Only one authored shelf set exists so far, and it
-- belongs to one kind: `vehicle_model`, 39 fields.
--
-- Additive except section 5, which switches OFF the retired kind's mirrored
-- vocabulary. Nothing here deletes a row that history depends on.

-- ── 1. The column ────────────────────────────────────────────────────────────
-- 'authored'   printed from field definitions and the values typed against them
-- 'relational' printed from a query: `options.relationship`, no fields allowed
-- 'mixed'      a query that also carries typed answers (a sellers shelf with a
--              note about warranty terms is the ordinary case)
-- Default 'authored' because a shelf somebody creates by hand is a form until it
-- says otherwise; the guard refuses the opposite assumption loudly.
ALTER TABLE sections ADD COLUMN content_kind TEXT NOT NULL DEFAULT 'authored'
  CHECK (content_kind IN ('authored','relational','mixed'));

-- ── 2. Relational: the shelf IS a query ──────────────────────────────────────
UPDATE sections SET content_kind = 'relational' WHERE id IN
  ('sec_auto_models',      -- models under a brand
   'sec_auto_variants',    -- trims under a model
   'sec_auto_network',     -- the distribution tree
   'sec_auto_protection',  -- insurers of this car (insured_by, in)
   'sec_auto_parts',       -- what fits it (parts_for, in)
   'sec_auto_team');       -- the people at a showroom, related to the business

-- ── 3. Mixed: a query that also carries answers ──────────────────────────────
UPDATE sections SET content_kind = 'mixed' WHERE id IN
  ('sec_auto_inventory',   -- who sells it + a typed note per seller
   'sec_auto_origin',      -- manufactured_at chain + typed provenance
   'sec_auto_portfolio',   -- brands represented + typed chips
   'sec_auto_fitment',     -- what this part fits + typed notes
   'sec_auto_eligibility');-- who can get this product + typed criteria

-- ── 3b. The one mixed shelf that declared nothing yet ────────────────────────
-- Eligibility is answered by a relationship the graph already knows: a bank's
-- eligible models are the incoming end of `financed_by` (vehicle_model ->
-- finance_bank). Reading it back needs no new vocabulary, and inventing one would
-- let the same edge be spelled two ways.
UPDATE sections
   SET options = json_patch(
         COALESCE(options, '{}'),
         json_object('relationship', json_array(
           json_object('relation', 'financed_by', 'direction', 'in', 'as', 'chips'))))
 WHERE id = 'sec_auto_eligibility'
   AND COALESCE(options, '') NOT LIKE '%relationship%';

-- ── 4. Authored, stated rather than defaulted ────────────────────────────────
-- Writing the list out is the point: a shelf missing from it is an unread shelf,
-- not an implied one. `sec_1_identity`, `sec_10_testimonials`,
-- `sec_auto_products`, `sec_auto_showroom` and `sec_listing_price` are authored
-- and currently carry NO definitions at all -- which is a finding for the
-- contract report (c6), not something a CHECK constraint can see.
UPDATE sections SET content_kind = 'authored' WHERE id IN
  ('sec_1_identity', 'sec_10_testimonials', 'sec_listing_price',
   'sec_auto_specs', 'sec_auto_products', 'sec_auto_showroom',
   'sec_auto_exterior', 'sec_auto_interior', 'sec_auto_engine',
   'sec_auto_comfort', 'sec_auto_safety', 'sec_auto_technology');

-- ── 5. Retire the mirrored vocabulary, do not erase it ───────────────────────
-- 0009 turned those eight questions into columns on `units` (year, mileage_km,
-- vin, color, color_ar, price_egp, negotiable, condition -> unit_kind). The rows
-- survive as `excluded = 1`: `assertFieldDeletable` tells an author to exclude
-- rather than orphan, so the migration follows its own advice. The kind's groups
-- go inactive for the same reason.
UPDATE form_fields  SET excluded = 1 WHERE business_type_id = 'car_listing';
UPDATE field_groups SET active    = 0 WHERE business_type_id = 'car_listing';

-- And the typology rule that made this duplication possible gets stated in the
-- data too: `car_listing` may not receive a new definition. That refusal lives in
-- `assertFieldDeclarable`, which reads the kind, not this comment.
