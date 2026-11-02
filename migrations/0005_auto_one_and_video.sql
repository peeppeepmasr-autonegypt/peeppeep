-- ============================================================
-- autoportal D1 migration 0005 - Auto One Egypt Showroom + Video Gallery
-- ============================================================

-- 1. Upgrade vendor_gallery to support YouTube and video embeds
ALTER TABLE vendor_gallery ADD COLUMN media_type TEXT NOT NULL DEFAULT 'image';
ALTER TABLE vendor_gallery ADD COLUMN video_id TEXT;

-- 2. Seed Auto One Egypt showroom with autonegypt.com domain
INSERT OR REPLACE INTO businesses
  (id, name, name_ar, slug, custom_domain, type_id, market_id, parent_business_id,
   path, minisite_mode, custom_data, published, status)
VALUES
  ('biz_auto_one_egypt',
   'Auto One Egypt', 'أوتو ون مصر',
   'auto-one-egypt', 'autonegypt.com', 'showroom', 'automotive', NULL,
   '/auto-one-egypt', 'standalone',
   '{"sec_1_identity":{"business_name":"Auto One Egypt","business_name_ar":"أوتو ون مصر","tagline":"Your Trusted Premium Automotive Destination","tagline_ar":"وجهتك الأولى للسيارات الفاخرة والمعتمدة في مصر","description":"Auto One Egypt offers new and certified pre-owned luxury vehicles with flexible in-house financing, bank loan facilities, and direct cash purchase options.","description_ar":"أوتو ون مصر يقدم أحدث السيارات الجديدة والمستعملة الفاخرة المعتمدة مع حلول تقسيط مباشر، تمويل بنكي معتمد، وتسهيلات خاصة للشراء النقدي."},"sec_auto_showroom":{"address":"Plot 12, Auto Zone, New Cairo, Egypt","address_ar":"القطعة 12، منطقة السيارات، القاهرة الجديدة، مصر","phone":"+20 100 000 1234","opening_hours":"Daily 10 AM - 10 PM","opening_hours_ar":"يومياً من 10 صباحاً حتى 10 مساءً"}}',
   1, 'active');

-- 3. Add a sample EV / Luxury car for Auto One Egypt with specs
INSERT OR REPLACE INTO businesses
  (id, name, name_ar, slug, type_id, market_id, parent_business_id,
   path, minisite_mode, custom_data, published, status)
VALUES
  ('biz_auto_one_ix_2025',
   'BMW iX xDrive50 - 2025 (Electric)', 'بي إم دابليو آي إكس 2025 (كهربائية)',
   'auto-one-bmw-ix-2025', 'car_listing', 'automotive', 'biz_auto_one_egypt',
   '/auto-one-egypt/auto-one-bmw-ix-2025', 'child',
   '{"sec_1_identity":{"business_name":"BMW iX xDrive50 2025","business_name_ar":"بي إم دابليو iX 2025","tagline":"Full Electric Flagship SUV - Zero Emissions","tagline_ar":"سيارة دفع رباعي كهربائية بالكامل فارهة"},"sec_listing_price":{"price_egp":4850000,"condition":"New","negotiable":true,"year":2025,"mileage_km":0,"color":"Aventurine Red Metallic","color_ar":"أحمر ميتاليك"},"sec_auto_specs":{"engine_type":"Electric","displacement_cc":0,"cylinders":0,"transmission_type":"Automatic","drivetrain":"AWD","power_hp":523,"torque_nm":765,"zero_to_100_s":4.6,"seats":5},"sec_auto_exterior":{"paint_finish":"Aventurine Red Metallic","paint_finish_ar":"أحمر أفينتورين ميتاليك","wheels":"22-inch Air Performance Wheels","wheels_ar":"جنوط أداء إيروديناميكي 22 بوصة","headlights":"BMW Laserlight","roof_type":"Panoramic Sky Lounge"}}',
   1, 'active');

-- 4. Sample YouTube Walkaround Video in gallery for the BMW iX
INSERT OR REPLACE INTO vendor_gallery
  (id, business_id, section_id, url, caption, caption_ar, media_type, video_id, display_order, placement, is_hero, show_on_minisite, approval_status)
VALUES
  ('gal_ix_yt_review',
   'biz_auto_one_ix_2025', 'sec_auto_exterior',
   'https://img.youtube.com/vi/lq4j6bH8e9Y/maxresdefault.jpg',
   'Full Walkaround & Review Video', 'فيديو المراجعة الشاملة والتجربة الحية',
   'youtube', 'lq4j6bH8e9Y', 1, 'carousel', 1, 1, 'approved');
