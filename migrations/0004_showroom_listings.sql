-- ============================================================
-- autoportal D1 migration 0004 - Showroom listings & Custom Domain
-- ============================================================

-- Add custom_domain to businesses table
ALTER TABLE businesses ADD COLUMN custom_domain TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_businesses_custom_domain ON businesses(custom_domain);

-- New section: Pricing & Availability
INSERT OR REPLACE INTO sections (id, name, name_ar, icon, sort_order, enable_gallery, enable_blog, options) VALUES
  ('sec_listing_price', 'Pricing & Availability', 'السعر والإتاحة',
   'fa-tag', 50, 0, 0,
   '{"markets":["automotive"],"component":"fields"}');

-- New business type: car_listing
INSERT OR REPLACE INTO business_types
  (id, name, name_ar, is_parent, parent_id, market_id, vendor_claimable, sort_order, sections, own_sections)
VALUES
  ('car_listing', 'Car Listing', 'إعلان سيارة',
   0, 'auto_sales', 'automotive', 1, 29,
   '["sec_1_identity"]',
   '["sec_auto_specs","sec_auto_exterior","sec_listing_price"]');

-- field_groups for car_listing
INSERT OR REPLACE INTO field_groups
  (id, business_type_id, section_id, name, label, label_ar, sort_order, active)
VALUES
  ('fg_listing_price',    'car_listing', 'sec_listing_price', 'pricing',   'Pricing',         'التسعير',          1, 1),
  ('fg_listing_details',  'car_listing', 'sec_listing_price', 'unit',      'Unit Details',    'تفاصيل الوحدة',    2, 1);

-- form_fields: sec_listing_price
INSERT OR REPLACE INTO form_fields
  (business_type_id, section_id, name, label, label_ar, field_type, group_key, sort_order, options, show_as_slide)
VALUES
  ('car_listing','sec_listing_price','price_egp',
   'Price (EGP)', 'السعر (جنيه)', 'number', 'pricing', 1, NULL, 0),

  ('car_listing','sec_listing_price','condition',
   'Condition', 'الحالة', 'select', 'pricing', 2,
   '{"enum":["New","Used","Certified Pre-Owned"]}', 0),

  ('car_listing','sec_listing_price','negotiable',
   'Price Negotiable', 'قابل للتفاوض', 'boolean', 'pricing', 3, NULL, 0),

  ('car_listing','sec_listing_price','year',
   'Year', 'سنة الصنع', 'number', 'unit', 4, NULL, 0),

  ('car_listing','sec_listing_price','mileage_km',
   'Mileage (km)', 'المسافة (كم)', 'number', 'unit', 5, NULL, 0),

  ('car_listing','sec_listing_price','color',
   'Color', 'اللون', 'text', 'unit', 6, NULL, 1),

  ('car_listing','sec_listing_price','color_ar',
   'Color (Arabic)', 'اللون بالعربية', 'text', 'unit', 7, NULL, 0),

  ('car_listing','sec_listing_price','vin',
   'VIN / Chassis No.', 'رقم الهيكل', 'text', 'unit', 8, NULL, 0);

-- Demo showroom: Cairo Motors
INSERT OR REPLACE INTO businesses
  (id, name, name_ar, slug, custom_domain, type_id, market_id, parent_business_id,
   path, minisite_mode, custom_data, published, status)
VALUES
  ('biz_cairo_motors',
   'Cairo Motors', 'كايرو موتورز',
   'cairo-motors', 'cairomotors.local', 'showroom', 'automotive', NULL,
   '/cairo-motors', 'standalone',
   '{"sec_1_identity":{"business_name":"Cairo Motors","business_name_ar":"كايرو موتورز","tagline":"Premium cars, unbeatable prices","tagline_ar":"سيارات مميزة بأسعار لا تقبل المنافسة","description":"Cairo Motors is a leading multi-brand showroom in Egypt specializing in new and pre-owned luxury vehicles.","description_ar":"كايرو موتورز من أبرز معارض السيارات متعددة الماركات في مصر، متخصصون في السيارات الفاخرة الجديدة والمستعملة المعتمدة."},"sec_auto_showroom":{"address":"Ring Road, Cairo, Egypt","address_ar":"الطريق الدائري، القاهرة، مصر","phone":"+20 2 1234 5678","opening_hours":"Sat-Thu 9 AM - 9 PM","opening_hours_ar":"السبت - الخميس 9 ص - 9 م"}}',
   1, 'active');

-- Demo listing 1: BMW X5 (new unit for sale)
INSERT OR REPLACE INTO businesses
  (id, name, name_ar, slug, type_id, market_id, parent_business_id,
   path, minisite_mode, custom_data, published, status)
VALUES
  ('biz_listing_x5_new',
   'BMW X5 xDrive40i - 2025', 'بي إم دابليو إكس 5 - 2025',
   'cairo-motors-bmw-x5-2025', 'car_listing', 'automotive', 'biz_cairo_motors',
   '/cairo-motors/cairo-motors-bmw-x5-2025', 'child',
   '{"sec_1_identity":{"business_name":"BMW X5 xDrive40i 2025","business_name_ar":"بي إم دابليو X5 2025","tagline":"In-stock, ready for delivery","tagline_ar":"متوفر بالمعرض، جاهز للتسليم"},"sec_listing_price":{"price_egp":3250000,"condition":"New","negotiable":false,"year":2025,"mileage_km":0,"color":"Mineral White Metallic","color_ar":"أبيض معدني"},"sec_auto_specs":{"engine_type":"Petrol","displacement_cc":2998,"cylinders":6,"transmission_type":"Automatic","drivetrain":"AWD","power_hp":381,"torque_nm":520,"zero_to_100_s":5.5,"seats":5},"sec_auto_exterior":{"paint_finish":"Mineral White Metallic","paint_finish_ar":"أبيض معدني","wheels":"22-inch M Light Alloy","wheels_ar":"جنوط M خفيفة 22 بوصة","headlights":"Matrix LED","roof_type":"Panoramic"}}',
   1, 'active');

-- Demo listing 2: Mercedes GLE (used unit)
INSERT OR REPLACE INTO businesses
  (id, name, name_ar, slug, type_id, market_id, parent_business_id,
   path, minisite_mode, custom_data, published, status)
VALUES
  ('biz_listing_gle_used',
   'Mercedes-Benz GLE 450 - 2022', 'مرسيدس جي إل إي 450 - 2022',
   'cairo-motors-gle-450-2022', 'car_listing', 'automotive', 'biz_cairo_motors',
   '/cairo-motors/cairo-motors-gle-450-2022', 'child',
   '{"sec_1_identity":{"business_name":"Mercedes-Benz GLE 450 2022","business_name_ar":"مرسيدس جي إل إي 450 2022","tagline":"Low mileage, full service history","tagline_ar":"منخفض الكيلومترات، سجل صيانة كامل"},"sec_listing_price":{"price_egp":2100000,"condition":"Used","negotiable":true,"year":2022,"mileage_km":42000,"color":"Obsidian Black Metallic","color_ar":"أسود معدني"},"sec_auto_specs":{"engine_type":"Petrol","displacement_cc":2999,"cylinders":6,"transmission_type":"Automatic","drivetrain":"AWD","power_hp":362,"torque_nm":500,"seats":5},"sec_auto_exterior":{"paint_finish":"Obsidian Black Metallic","paint_finish_ar":"أسود معدني","wheels":"20-inch AMG Multispoke","wheels_ar":"جنوط AMG 20 بوصة","headlights":"LED","roof_type":"Panoramic"}}',
   1, 'active');

-- Graph edge: BMW X5 sold by Cairo Motors
INSERT OR REPLACE INTO business_relationships
  (id, from_business_id, to_business_id, relation_type, is_primary, role_data)
VALUES
  ('rel_x5_sold_cairo',
   'biz_x5', 'biz_cairo_motors', 'sold_by', 1,
   '{"line":"Official BMW stockist","line_ar":"وكيل مخزون BMW الرسمي"}');
