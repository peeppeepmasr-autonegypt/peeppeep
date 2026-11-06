-- ============================================================
-- Attach full vehicle_model specs & aspect definitions to car_listing
-- ============================================================

-- 1. Copy all field_groups from vehicle_model to car_listing
INSERT OR IGNORE INTO field_groups (id, business_type_id, section_id, name, label, label_ar, sort_order, active)
SELECT
  'fg_cl_' || section_id || '_' || name,
  'car_listing',
  section_id,
  name,
  label,
  label_ar,
  sort_order,
  active
FROM field_groups
WHERE business_type_id = 'vehicle_model';

-- 2. Copy all form_fields from vehicle_model to car_listing
INSERT OR IGNORE INTO form_fields (business_type_id, section_id, name, label, label_ar, field_type, group_key, sort_order, options, show_as_slide, destination)
SELECT
  'car_listing',
  section_id,
  name,
  label,
  label_ar,
  field_type,
  group_key,
  sort_order,
  options,
  show_as_slide,
  destination
FROM form_fields
WHERE business_type_id = 'vehicle_model';

-- 3. Add rich electric & performance specs for BMW iX xDrive50 demo unit
UPDATE businesses
SET custom_data = '{
  "sec_1_identity": {
    "business_name": "BMW iX xDrive50 2025",
    "business_name_ar": "بي إم دابليو iX xDrive50 2025",
    "tagline": "Full Electric Flagship SUV - 523 HP",
    "tagline_ar": "سيارة رياضية فارهة متعددة الاستخدامات كهربائية بالكامل بقوة 523 حصان",
    "description": "The BMW iX xDrive50 is the technological flagship of BMW electric mobility. Powered by dual electric motors delivering 523 hp and 765 Nm torque with an electric range up to 630 km.",
    "description_ar": "تعتبر بي إم دابليو iX xDrive50 الأيقونة التكنولوجية للسيارات الكهربائية الفاخرة، مزودة بمحركين كهربائيين بقوة 523 حصان وعزم دوران 765 نيوتن متر ومدى سير يصل إلى 630 كم بالشحنة الواحدة."
  },
  "sec_listing_price": {
    "price_egp": 4850000,
    "condition": "New",
    "negotiable": true,
    "year": 2025,
    "mileage_km": 0,
    "color": "Aventurine Red Metallic",
    "color_ar": "أحمر أفينتورين ميتاليك"
  },
  "sec_auto_specs": {
    "engine_type": "Electric",
    "displacement_cc": 0,
    "cylinders": 0,
    "transmission_type": "Automatic",
    "drivetrain": "AWD",
    "length_mm": 4953,
    "width_mm": 1967,
    "height_mm": 1695,
    "wheelbase_mm": 3000,
    "kerb_weight_kg": 2585,
    "seats": 5,
    "power_hp": 523,
    "torque_nm": 765,
    "zero_to_100_s": 4.6,
    "top_speed_kmh": 200,
    "consumption_l_100km": 0,
    "co2_g_km": 0,
    "airbags": 9,
    "ncap_rating": "5"
  },
  "sec_auto_exterior": {
    "paint_finish": "Aventurine Red Metallic",
    "paint_finish_ar": "أحمر أفينتورين ميتاليك فاخر",
    "wheels": "22-inch Air Performance Bicolor Wheels",
    "wheels_ar": "جنوط إيروديناميكية رياضية مقاس 22 بوصة بلونين",
    "headlights": "BMW Laserlight with Blue Accents",
    "headlights_ar": "مصابيح ليزر بي إم دابليو مع لمسات زرقاء ذكية",
    "roof_type": "Panoramic Sky Lounge LED Roof",
    "roof_type_ar": "سقف بانورامي سكاي لاونج مزود بإضاءة LED ذاتية التعتيم"
  }
}'
WHERE id = 'biz_auto_one_ix_2025';
