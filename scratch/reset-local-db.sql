-- Local-only reset: the D1 schema in 0001 changed (new columns), and
-- CREATE TABLE IF NOT EXISTS will not alter an existing table. Drop everything,
-- including wrangler's migration ledger, so `d1 migrations apply --local`
-- replays the whole set against the new schema.
PRAGMA foreign_keys = OFF;
DROP TABLE IF EXISTS section_blogs;
DROP TABLE IF EXISTS vendor_gallery;
DROP TABLE IF EXISTS business_relationships;
DROP TABLE IF EXISTS form_fields;
DROP TABLE IF EXISTS field_groups;
DROP TABLE IF EXISTS businesses;
DROP TABLE IF EXISTS sections;
DROP TABLE IF EXISTS business_types;
DROP TABLE IF EXISTS markets;
DROP TABLE IF EXISTS d1_migrations;
