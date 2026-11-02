-- ============================================================
-- autoportal D1 seed — Phase B2 (reference data, SQLite)
-- Automotive market + kind hierarchy + section shelves + authored
-- field structure. INSERT OR REPLACE = idempotent.
-- This is TAXONOMY/STRUCTURE only — no brand/model/trim instances
-- (those live in 0003_demo_seed.sql).
-- ============================================================

INSERT OR REPLACE INTO markets (id, slug, name_en, name_ar, default_locale, currency, active) VALUES
  ('automotive', 'automotive', 'Automotive', 'السيارات', 'ar', 'EGP', 1);

-- ── Parent kinds ──────────────────────────────────────────────────────────
INSERT OR REPLACE INTO business_types (id, name, name_ar, is_parent, parent_id, market_id, vendor_claimable, sort_order, sections) VALUES
  ('auto_vehicles',    'Vehicles',             'المركبات',          1, NULL, 'automotive', 1, 10, '["sec_1_identity","sec_10_testimonials"]'),
  ('auto_sales',       'Sales & Distribution',  'المبيعات والتوزيع', 1, NULL, 'automotive', 1, 20, '["sec_1_identity","sec_10_testimonials"]'),
  ('auto_finance',     'Finance & Insurance',   'التمويل والتأمين',  1, NULL, 'automotive', 1, 30, '["sec_1_identity","sec_10_testimonials"]'),
  ('auto_aftermarket', 'Aftermarket & Service', 'الخدمات والقطع',    1, NULL, 'automotive', 1, 40, '["sec_1_identity","sec_10_testimonials"]');

-- ── Child kinds (with their own shelves) ──────────────────────────────────
INSERT OR REPLACE INTO business_types (id, name, name_ar, is_parent, parent_id, market_id, vendor_claimable, sort_order, own_sections) VALUES
  ('vehicle_brand', 'Car Brand', 'ماركة', 0, 'auto_vehicles', 'automotive', 0, 11, '["sec_auto_specs","sec_auto_models","sec_auto_origin","sec_auto_network"]'),
  ('vehicle_model', 'Car Model', 'طراز', 0, 'auto_vehicles', 'automotive', 0, 12, '["sec_auto_specs","sec_auto_exterior","sec_auto_interior","sec_auto_engine","sec_auto_comfort","sec_auto_safety","sec_auto_technology","sec_auto_variants","sec_auto_inventory","sec_auto_protection","sec_auto_parts","sec_auto_origin","sec_auto_network"]'),
  ('vehicle_trim',  'Trim / Variant', 'فئة', 0, 'auto_vehicles', 'automotive', 0, 13, '["sec_auto_specs","sec_auto_exterior","sec_auto_interior","sec_auto_engine","sec_auto_comfort","sec_auto_safety","sec_auto_technology","sec_auto_inventory","sec_auto_protection"]'),
  ('factory',       'Factory / Plant', 'مصنع', 0, 'auto_vehicles', 'automotive', 0, 14, '["sec_auto_models","sec_auto_network"]'),
  ('main_agency',   'Main Agency', 'وكيل رئيسي', 0, 'auto_sales', 'automotive', 1, 21, '["sec_auto_portfolio","sec_auto_inventory","sec_auto_network","sec_auto_showroom","sec_auto_team"]'),
  ('showroom',      'Showroom', 'معرض', 0, 'auto_sales', 'automotive', 1, 22, '["sec_auto_inventory","sec_auto_portfolio","sec_auto_showroom","sec_auto_team"]'),
  ('distributor',   'Distributor', 'موزع', 0, 'auto_sales', 'automotive', 1, 23, '["sec_auto_inventory","sec_auto_portfolio","sec_auto_network","sec_auto_showroom"]'),
  ('agent_broker',  'Agent / Broker', 'وسيط', 0, 'auto_sales', 'automotive', 1, 24, '["sec_auto_portfolio","sec_auto_inventory","sec_auto_network","sec_auto_team"]'),
  ('used_car_dealer','Used-Car Dealer', 'سيارات مستعملة', 0, 'auto_sales', 'automotive', 1, 25, '["sec_auto_inventory","sec_auto_showroom"]'),
  ('finance_bank',  'Bank / Auto Finance', 'بنك', 0, 'auto_finance', 'automotive', 1, 31, '["sec_auto_products","sec_auto_eligibility","sec_auto_network"]'),
  ('leasing_company','Leasing Company', 'تأجير تمويلي', 0, 'auto_finance', 'automotive', 1, 32, '["sec_auto_products","sec_auto_eligibility"]'),
  ('insurance_company','Insurance Company', 'شركة تأمين', 0, 'auto_finance', 'automotive', 1, 33, '["sec_auto_products","sec_auto_eligibility","sec_auto_network"]'),
  ('spare_parts',   'Spare Parts', 'قطع غيار', 0, 'auto_aftermarket', 'automotive', 1, 41, '["sec_auto_fitment","sec_auto_parts"]'),
  ('service_center','Service Center', 'مركز صيانة', 0, 'auto_aftermarket', 'automotive', 1, 42, '["sec_auto_fitment","sec_auto_showroom","sec_auto_team"]'),
  ('accessories_detailing','Accessories & Detailing','إكسسوارات وتلميع', 0, 'auto_aftermarket', 'automotive', 1, 43, '["sec_auto_fitment","sec_auto_showroom"]');

-- ── Section shelves ─────────────────────────────────────────────────────────
INSERT OR REPLACE INTO sections (id, name, name_ar, icon, sort_order, enable_gallery, enable_blog, options) VALUES
  ('sec_1_identity', 'Overview', 'نظرة عامة', 'fa-circle-info', 1, 1, 0, '{"markets":["automotive"]}'),
  ('sec_10_testimonials', 'Reviews & FAQs', 'التقييمات والأسئلة', 'fa-star', 10, 0, 0, '{"markets":["automotive"]}'),
  ('sec_auto_specs', 'Specifications', 'المواصفات', 'fa-list-check', 20, 0, 0, '{"markets":["automotive"],"component":"specs"}'),
  ('sec_auto_exterior', 'Exterior', 'المظهر الخارجي', 'fa-car', 21, 1, 1, '{"markets":["automotive"],"component":"vehicle_aspect","aspect":"exterior"}'),
  ('sec_auto_interior', 'Interior', 'المقصورة', 'fa-couch', 22, 1, 1, '{"markets":["automotive"],"component":"vehicle_aspect","aspect":"interior"}'),
  ('sec_auto_engine', 'Engine', 'المحرك', 'fa-engine', 23, 1, 1, '{"markets":["automotive"],"component":"vehicle_aspect","aspect":"engine"}'),
  ('sec_auto_comfort', 'Comfort', 'الراحة', 'fa-spa', 24, 1, 1, '{"markets":["automotive"],"component":"vehicle_aspect","aspect":"comfort"}'),
  ('sec_auto_safety', 'Safety', 'الأمان', 'fa-shield-halved', 25, 1, 1, '{"markets":["automotive"],"component":"vehicle_aspect","aspect":"safety"}'),
  ('sec_auto_technology', 'Technology', 'التقنية', 'fa-microchip', 26, 1, 1, '{"markets":["automotive"],"component":"vehicle_aspect","aspect":"technology"}'),
  ('sec_auto_models', 'Models', 'الطرازات', 'fa-layer-group', 30, 0, 0, '{"markets":["automotive"],"component":"related_minisites","relationship":[{"relation":"children","direction":"out","scope":"vehicle_model","as":"cards"}]}'),
  ('sec_auto_variants', 'Variants / Trims', 'الفئات', 'fa-sitemap', 31, 0, 0, '{"markets":["automotive"],"component":"related_minisites","relationship":[{"relation":"children","direction":"out","scope":"vehicle_trim","as":"table"}]}'),
  ('sec_auto_inventory', 'Inventory', 'المخزون', 'fa-boxes-stacked', 32, 0, 0, '{"markets":["automotive"],"component":"related_minisites","relationship":[{"relation":"children","direction":"out","as":"cards"}]}'),
  ('sec_auto_origin', 'Manufactured At', 'بلد المنشأ', 'fa-industry', 33, 0, 0, '{"markets":["automotive"],"component":"origin_chain","relationship":[{"relation":"manufactured_at","direction":"out","as":"cards"}]}'),
  ('sec_auto_network', 'Network', 'الشبكة', 'fa-network-wired', 34, 0, 0, '{"markets":["automotive"],"component":"network_tree","relationship":[{"relation":"children","direction":"out","as":"tree"},{"relation":"agent_of","direction":"out","as":"chips"}]}'),
  ('sec_auto_protection', 'Protection & Warranty', 'الحماية والضمان', 'fa-shield', 35, 0, 0, '{"markets":["automotive"],"component":"related_minisites","relationship":[{"relation":"insured_by","direction":"out","as":"cards"},{"relation":"financed_by","direction":"out","as":"cards"}]}'),
  ('sec_auto_parts', 'Parts & Accessories', 'القطع والإكسسوارات', 'fa-gears', 36, 0, 0, '{"markets":["automotive"],"component":"related_minisites","relationship":[{"relation":"parts_for","direction":"in","as":"cards"},{"relation":"compatible_with","direction":"both","as":"chips"}]}'),
  ('sec_auto_products', 'Products', 'المنتجات', 'fa-box', 40, 0, 0, '{"markets":["automotive"],"component":"fields"}'),
  ('sec_auto_eligibility', 'Eligibility', 'الشروط', 'fa-clipboard-check', 41, 0, 0, '{"markets":["automotive"],"component":"fields"}'),
  ('sec_auto_portfolio', 'Portfolio', 'المحفظة', 'fa-folder-open', 42, 0, 0, '{"markets":["automotive"],"component":"related_minisites","relationship":[{"relation":"sold_by","direction":"in","as":"list"},{"relation":"represented_by","direction":"in","as":"chips"}]}'),
  ('sec_auto_fitment', 'Fitment', 'التوافق', 'fa-puzzle-piece', 43, 0, 0, '{"markets":["automotive"],"component":"related_minisites","relationship":[{"relation":"parts_for","direction":"out","as":"chips"},{"relation":"compatible_with","direction":"both","as":"chips"}]}'),
  ('sec_auto_showroom', 'Showroom', 'المعرض', 'fa-store', 44, 1, 0, '{"markets":["automotive"],"component":"showroom"}'),
  ('sec_auto_team', 'Team & Consultants', 'الفريق والمستشارون', 'fa-users', 45, 1, 0, '{"markets":["automotive"],"component":"team","relationship":[{"relation":"agent_of","direction":"in","as":"cards"}]}');

-- ── field_groups (vehicle_model) ────────────────────────────────────────────
INSERT OR REPLACE INTO field_groups (id, business_type_id, section_id, name, label, label_ar, sort_order, active) VALUES
  ('fg_vm_specs_engine', 'vehicle_model', 'sec_auto_specs', 'engine',       'Engine',                 'المحرك',            1, 1),
  ('fg_vm_specs_trans',  'vehicle_model', 'sec_auto_specs', 'transmission', 'Transmission & Drivetrain','ناقل الحركة والدفع',2, 1),
  ('fg_vm_specs_dims',   'vehicle_model', 'sec_auto_specs', 'dimensions',   'Dimensions & Weight',    'الأبعاد والوزن',     3, 1),
  ('fg_vm_specs_perf',   'vehicle_model', 'sec_auto_specs', 'performance',  'Performance',            'الأداء',            4, 1),
  ('fg_vm_specs_econ',   'vehicle_model', 'sec_auto_specs', 'economy',      'Economy & Emissions',    'الاستهلاك والانبعاثات',5, 1),
  ('fg_vm_specs_safety', 'vehicle_model', 'sec_auto_specs', 'safety',       'Safety',                 'الأمان',            6, 1),
  ('fg_vm_exterior',     'vehicle_model', 'sec_auto_exterior','exterior',   'Exterior',               'المظهر الخارجي',    1, 1),
  ('fg_vm_interior',     'vehicle_model', 'sec_auto_interior','interior',   'Interior',               'المقصورة',          1, 1),
  ('fg_vm_engine',       'vehicle_model', 'sec_auto_engine','engine_hp',    'Power Highlights',       'أبرز قدرات المحرك',  1, 1),
  ('fg_vm_comfort',      'vehicle_model', 'sec_auto_comfort','comfort',     'Comfort',                'الراحة',            1, 1),
  ('fg_vm_safety',       'vehicle_model', 'sec_auto_safety','safety_ad',    'Active Safety',          'الأمان النشط',      1, 1),
  ('fg_vm_technology',   'vehicle_model', 'sec_auto_technology','tech',     'Technology',             'التقنية',           1, 1);

-- ── form_fields: sec_auto_specs (grouped) ───────────────────────────────────
INSERT OR REPLACE INTO form_fields (business_type_id, section_id, name, label, label_ar, field_type, group_key, sort_order, options) VALUES
  ('vehicle_model','sec_auto_specs','engine_type','Engine Type','نوع المحرك','select','engine',1,'{"enum":["Petrol","Diesel","Hybrid","PHEV","Electric"]}'),
  ('vehicle_model','sec_auto_specs','displacement_cc','Displacement (cc)','السعة اللترية (سي سي)','number','engine',2,NULL),
  ('vehicle_model','sec_auto_specs','cylinders','Cylinders','عدد الأسطوانات','number','engine',3,NULL),
  ('vehicle_model','sec_auto_specs','transmission_type','Transmission','ناقل الحركة','select','transmission',4,'{"enum":["Manual","Automatic","CVT","DCT"]}'),
  ('vehicle_model','sec_auto_specs','drivetrain','Drivetrain','نظام الدفع','select','transmission',5,'{"enum":["FWD","RWD","AWD","4WD"]}'),
  ('vehicle_model','sec_auto_specs','length_mm','Length (mm)','الطول (مم)','number','dimensions',6,NULL),
  ('vehicle_model','sec_auto_specs','width_mm','Width (mm)','العرض (مم)','number','dimensions',7,NULL),
  ('vehicle_model','sec_auto_specs','height_mm','Height (mm)','الارتفاع (مم)','number','dimensions',8,NULL),
  ('vehicle_model','sec_auto_specs','wheelbase_mm','Wheelbase (mm)','قاعدة العجلات (مم)','number','dimensions',9,NULL),
  ('vehicle_model','sec_auto_specs','kerb_weight_kg','Kerb Weight (kg)','الوزن فارغ (كجم)','number','dimensions',10,NULL),
  ('vehicle_model','sec_auto_specs','seats','Seats','عدد المقاعد','number','dimensions',11,NULL),
  ('vehicle_model','sec_auto_specs','power_hp','Power (hp)','القوة (حصان)','number','performance',12,NULL),
  ('vehicle_model','sec_auto_specs','torque_nm','Torque (Nm)','عزم الدوران (نيوتن متر)','number','performance',13,NULL),
  ('vehicle_model','sec_auto_specs','zero_to_100_s','0-100 km/h (s)','التسارع 0-100 (ثانية)','number','performance',14,NULL),
  ('vehicle_model','sec_auto_specs','top_speed_kmh','Top Speed (km/h)','أقصى سرعة (كم/س)','number','performance',15,NULL),
  ('vehicle_model','sec_auto_specs','consumption_l_100km','Consumption (L/100km)','الاستهلاك (لتر/100كم)','number','economy',16,NULL),
  ('vehicle_model','sec_auto_specs','co2_g_km','CO2 (g/km)','انبعاثات ثاني أكسيد الكربون (غ/كم)','number','economy',17,NULL),
  ('vehicle_model','sec_auto_specs','airbags','Airbags','الوسائد الهوائية','number','safety',18,NULL),
  ('vehicle_model','sec_auto_specs','ncap_rating','Safety Rating (stars)','تقييم الأمان (نجوم)','select','safety',19,'{"enum":["3","4","5"]}');

-- ── form_fields: aspect shelves ───────────────────────────────────────────────
-- show_as_slide = 1 marks a field as *representable*: its value becomes the
-- headline of one carousel slide in this section (media bound via
-- vendor_gallery.field_key; a field with no photo yet still gets a slide, so an
-- unfinished minisite reads as unfinished). Rule of thumb: a slide headline is a
-- NOUN PHRASE ("Matrix LED", "22-inch M Light Alloy"), never prose -- textarea
-- fields stay 0 for that reason, and Specifications is entirely 0 because a
-- 19-row numeric table is a table, not a slideshow.
-- Definitions are authored on vehicle_model ONLY; vehicle_trim inherits them by
-- walking its parent business (see resolveFieldTypes in src/lib/minisite.ts).
INSERT OR REPLACE INTO form_fields (business_type_id, section_id, name, label, label_ar, field_type, group_key, sort_order, options, show_as_slide) VALUES
  ('vehicle_model','sec_auto_exterior','paint_finish','Paint / Finish','الطلاء / التشطيب','text','exterior',1,NULL,1),
  ('vehicle_model','sec_auto_exterior','wheels','Wheels','الجنوط','text','exterior',2,NULL,1),
  ('vehicle_model','sec_auto_exterior','headlights','Headlights','المصابيح الأمامية','select','exterior',3,'{"enum":["Halogen","LED","Matrix LED","Laser"]}',1),
  ('vehicle_model','sec_auto_exterior','roof_type','Roof','السقف','select','exterior',4,'{"enum":["Solid","Panoramic","Convertible"]}',1),
  ('vehicle_model','sec_auto_interior','seating_material','Seating Material','مادة المقاعد','select','interior',1,'{"enum":["Cloth","Leather","Vegan Leather","Alcantara"]}',1),
  ('vehicle_model','sec_auto_interior','ambient_lighting','Ambient Lighting','الإضاءة المحيطة','boolean','interior',2,NULL,1),
  ('vehicle_model','sec_auto_interior','sunroof','Sunroof','السقف الشمسي','select','interior',3,'{"enum":["None","Electric","Panoramic"]}',1),
  ('vehicle_model','sec_auto_engine','max_power_hp','Max Power (hp)','أقصى قوة (حصان)','number','engine_hp',1,NULL,1),
  ('vehicle_model','sec_auto_engine','max_torque_nm','Max Torque (Nm)','أقصى عزم (نيوتن متر)','number','engine_hp',2,NULL,1),
  ('vehicle_model','sec_auto_engine','acceleration_0_100','0-100 (s)','التسارع 0-100 (ثانية)','number','engine_hp',3,NULL,1),
  ('vehicle_model','sec_auto_comfort','climate_zones','Climate Zones','مناطق التكييف','number','comfort',1,NULL,0),
  ('vehicle_model','sec_auto_comfort','seat_adjust','Seat Adjustment','تعديل المقاعد','text','comfort',2,NULL,1),
  ('vehicle_model','sec_auto_comfort','keyless_entry','Keyless Entry','الدخول الذكي','boolean','comfort',3,NULL,0),
  ('vehicle_model','sec_auto_safety','adas_suite','ADAS Suite','أنظمة المساعدة المتقدمة','textarea','safety_ad',1,NULL,0),
  ('vehicle_model','sec_auto_safety','braking_system','Braking System','نظام الفرامل','text','safety_ad',2,NULL,1),
  ('vehicle_model','sec_auto_technology','infotainment_size_in','Infotainment Size (in)','حجم الشاشة (بوصة)','number','tech',1,NULL,1),
  ('vehicle_model','sec_auto_technology','connectivity','Connectivity','الاتصال','select','tech',2,'{"enum":["Apple CarPlay","Android Auto","Both","None"]}',1),
  ('vehicle_model','sec_auto_technology','audio_system','Audio System','نظام الصوت','text','tech',3,NULL,1),
  ('vehicle_model','sec_auto_technology','digital_cluster','Digital Instrument Cluster','العدادات الرقمية','boolean','tech',4,NULL,1);
