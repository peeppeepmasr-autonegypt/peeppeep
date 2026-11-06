-- ============================================================
-- autoportal D1 migration 0007 - remove the invented demo film
-- ============================================================
--
-- Migration 0005 seeded a YouTube walkaround for the demo BMW iX using a video ID
-- that was typed rather than taken from a real upload. Every poster resolution of
-- it answers 404 and the embed never builds, so the showroom hero advertised a
-- film that does not exist -- and the carousel, whose whole contract is real
-- authoring, was the surface that carried the lie.
--
-- Demo media must be demonstrably real or plainly absent. The row goes; the
-- shelf falls back to the network showreel, and a car with no uploaded media
-- shows its authored facts behind the honest "photograph to come" pane until the
-- owner supplies their own photography.
--
-- 0005 is not edited: it has already been recorded as applied, and rewriting an
-- applied migration is how local and production databases drift apart.

DELETE FROM vendor_gallery WHERE id = 'gal_ix_yt_review';
