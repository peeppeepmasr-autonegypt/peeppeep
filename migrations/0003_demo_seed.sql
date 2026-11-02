-- ============================================================
-- autoportal D1 demo seed — Phase B3 (instances, SQLite)
-- A deterministic bilingual demo tree:
--   BMW (brand)  ->  X5 (model)  ->  xDrive40i (trim)
--   X5 manufactured_at Spartanburg plant, insured_by National Auto Ins.
-- Plus Exterior gallery rows (caption #1 EN/AR, one media_data
-- overlay for caption #2) and authored spec/aspect values.
-- INSERT OR REPLACE = idempotent. custom_data holds JSON per section.
-- ============================================================

-- ── Brand: BMW ───────────────────────────────────────────────────────────────
INSERT OR REPLACE INTO businesses
  (id, name, name_ar, slug, type_id, market_id, parent_business_id, path, minisite_mode, custom_data, published, status)
VALUES
  ('biz_bmw', 'BMW', 'بي إم دابليو', 'demo-bmw', 'vehicle_brand', 'automotive', NULL,
   '/demo-bmw', 'standalone',
   '{
      "sec_1_identity": {
        "business_name": "BMW",
        "business_name_ar": "بي إم دابليو",
        "tagline": "The Ultimate Driving Machine",
        "tagline_ar": "آلة القيادة المثالية",
        "description": "A German luxury vehicle manufacturer headquartered in Munich.",
        "description_ar": "شركة ألمانية لصناعة السيارات الفاخرة يقع مقرها في ميونخ."
      }
    }',
   1, 'active');

-- ── Model: X5 (child of BMW) ──────────────────────────────────────────────────
INSERT OR REPLACE INTO businesses
  (id, name, name_ar, slug, type_id, market_id, parent_business_id, path, minisite_mode, custom_data, published, status)
VALUES
  ('biz_x5', 'X5', 'إكس 5', 'demo-x5', 'vehicle_model', 'automotive', 'biz_bmw',
   '/demo-bmw/demo-x5', 'child',
   '{
      "sec_1_identity": {
        "business_name": "BMW X5",
        "business_name_ar": "بي إم دابليو إكس 5",
        "tagline": "Sports Activity Vehicle",
        "tagline_ar": "سيارة الأنشطة الرياضية",
        "description": "A luxury mid-size SUV, the flagship of the X line.",
        "description_ar": "سيارة دفع رباعي فاخرة متوسطة الحجم وقطر أسطول فئة X."
      },
      "sec_auto_specs": {
        "engine_type": "Petrol",
        "displacement_cc": 2998,
        "cylinders": 6,
        "transmission_type": "Automatic",
        "drivetrain": "AWD",
        "length_mm": 4935,
        "width_mm": 2004,
        "height_mm": 1770,
        "wheelbase_mm": 2975,
        "kerb_weight_kg": 2100,
        "seats": 5,
        "power_hp": 381,
        "torque_nm": 520,
        "zero_to_100_s": 5.5,
        "top_speed_kmh": 250,
        "consumption_l_100km": 11.1,
        "co2_g_km": 252,
        "airbags": 8,
        "ncap_rating": "5"
      },
      "sec_auto_exterior": {
        "paint_finish": "Mineral White Metallic",
        "paint_finish_ar": "أبيض معدني",
        "wheels": "22-inch M Light Alloy",
        "wheels_ar": "جنوط M خفيفة 22 بوصة",
        "headlights": "Matrix LED",
        "headlights_ar": "مصابيح ماكس LED",
        "roof_type": "Panoramic",
        "roof_type_ar": "بانورامي"
      },
      "sec_auto_interior": {
        "seating_material": "Leather",
        "seating_material_ar": "جلد",
        "ambient_lighting": 1,
        "sunroof": "Panoramic",
        "sunroof_ar": "بانورامي"
      },
      "sec_auto_engine": {
        "max_power_hp": 381,
        "max_torque_nm": 520,
        "acceleration_0_100": 5.5
      },
      "sec_auto_comfort": {
        "climate_zones": 4,
        "seat_adjust": "18-way electric",
        "seat_adjust_ar": "تعديل كهربائي 18 اتجاه",
        "keyless_entry": 1
      },
      "sec_auto_safety": {
        "adas_suite": "Driving Assistant Professional with Lane Keeping and Active Cruise",
        "adas_suite_ar": "مساعد القيادة الاحترافي مع الحفاظ على المسار والتثبيت النشط للسرعة",
        "braking_system": "M Sport Brakes",
        "braking_system_ar": "فرامل M الرياضية"
      },
      "sec_auto_technology": {
        "infotainment_size_in": 14.9,
        "connectivity": "Both",
        "connectivity_ar": "الاثنان معاً",
        "audio_system": "Harman Kardon",
        "audio_system_ar": "هارمان كاردون",
        "digital_cluster": 1
      }
    }',
   1, 'active');

-- ── Trim: xDrive40i (child of X5) ─────────────────────────────────────────────
INSERT OR REPLACE INTO businesses
  (id, name, name_ar, slug, type_id, market_id, parent_business_id, path, minisite_mode, custom_data, published, status)
VALUES
  ('biz_x5_xdrive40i', 'xDrive40i', 'إكس درايڤ 40آي', 'demo-x5-xdrive40i', 'vehicle_trim', 'automotive', 'biz_x5',
   '/demo-bmw/demo-x5/demo-x5-xdrive40i', 'child',
   '{
      "sec_1_identity": {
        "business_name": "BMW X5 xDrive40i",
        "business_name_ar": "بي إم دابليو إكس 5 إكس درايڤ 40آي",
        "tagline": "The balanced six-cylinder",
        "tagline_ar": "التوازن بست أسطوانات",
        "description": "The petrol inline-six variant of the X5 with xDrive all-wheel drive.",
        "description_ar": "فئة محرك البنزين بست أسطوانات خطية من إكس 5 مع نظام الدفع الكلي."
      },
      "sec_auto_specs": {
        "engine_type": "Petrol",
        "displacement_cc": 2998,
        "cylinders": 6,
        "transmission_type": "Automatic",
        "drivetrain": "AWD",
        "power_hp": 381,
        "torque_nm": 520,
        "zero_to_100_s": 5.5,
        "seats": 5
      },
      "sec_auto_exterior": {
        "paint_finish": "Alpine White",
        "paint_finish_ar": "أبيض ألبيني",
        "wheels": "20-inch V-Spoke",
        "wheels_ar": "جنوط 20 بوصة",
        "headlights": "LED",
        "roof_type": "Panoramic"
      },
      "sec_auto_engine": {
        "max_power_hp": 381,
        "max_torque_nm": 520,
        "acceleration_0_100": 5.5
      }
    }',
   1, 'active');

-- ── Factory node (graph endpoint) ─────────────────────────────────────────────
INSERT OR REPLACE INTO businesses
  (id, name, name_ar, slug, type_id, market_id, parent_business_id, path, minisite_mode, custom_data, published, status)
VALUES
  ('biz_bmw_spartanburg', 'Spartanburg Plant', 'مصنع سبارتانبورغ', 'demo-spartanburg-plant', 'factory', 'automotive', NULL,
   '/demo-spartanburg-plant', 'standalone',
   '{
      "sec_1_identity": {
        "business_name": "BMW Spartanburg",
        "business_name_ar": "مصنع بي إم دابليو سبارتانبورغ",
        "description": "Assembly plant in South Carolina producing the X line.",
        "description_ar": "مصنع تجميع في كارولاينا الجنوبية ينتج سلسلة X."
      }
    }',
   1, 'active');

-- ── Insurance company node (graph endpoint) ───────────────────────────────────
INSERT OR REPLACE INTO businesses
  (id, name, name_ar, slug, type_id, market_id, parent_business_id, path, minisite_mode, custom_data, published, status)
VALUES
  ('biz_national_auto_ins', 'National Auto Ins.', 'الشركة الوطنية للتأمين', 'demo-national-auto-ins', 'insurance_company', 'automotive', NULL,
   '/demo-national-auto-ins', 'standalone',
   '{
      "sec_1_identity": {
        "business_name": "National Auto Insurance",
        "business_name_ar": "الشركة الوطنية لتأمين السيارات",
        "description": "Comprehensive vehicle insurance provider.",
        "description_ar": "مزود تأمين شامل على المركبات."
      }
    }',
   1, 'active');

-- ── Graph edges (business_relationships) ──────────────────────────────────────
INSERT OR REPLACE INTO business_relationships (id, from_business_id, to_business_id, relation_type, is_primary, role_data) VALUES
  ('rel_x5_made_at',   'biz_x5', 'biz_bmw_spartanburg', 'manufactured_at', 1, '{"line":"Assembly A","line_ar":"خط التجميع أ"}'),
  ('rel_x5_insured_by','biz_x5', 'biz_national_auto_ins','insured_by',      0, '{"plan":"Gold","plan_ar":"الفئة الذهبية"}');

-- ── Exterior: unbound view angles (grid) for the X5 model ─────────────────────
-- caption = caption #1 (EN), caption_ar = caption #1 (AR).
-- These four are UNBOUND (no field_key), so `placement` alone decides where they
-- print: body = grid only, carousel = hero only, both = both.
-- Row 4 carries media_data -> an explicit caption #2 overlay; the others bind
-- caption #2 dynamically from group_key = exterior (paint/wheels/headlights/roof).
INSERT OR REPLACE INTO vendor_gallery (id, business_id, section_id, url, caption, caption_ar, media_data, group_key, display_order, placement, is_hero, show_on_minisite, approval_status) VALUES
  ('gal_x5_ext_1', 'biz_x5', 'sec_auto_exterior',
   'https://picsum.photos/seed/bmwx5front/1200/800',
   'Front three-quarter', 'منظر أمامي ثلاثي الأرباع',
   NULL, 'exterior', 1, 'body', 1, 1, 'approved'),
  ('gal_x5_ext_2', 'biz_x5', 'sec_auto_exterior',
   'https://picsum.photos/seed/bmwx5side/1200/800',
   'Profile', 'منظر جانبي',
   NULL, 'exterior', 2, 'body', 0, 1, 'approved'),
  ('gal_x5_ext_3', 'biz_x5', 'sec_auto_exterior',
   'https://picsum.photos/seed/bmwx5rear/1200/800',
   'Rear', 'منظر خلفي',
   NULL, 'exterior', 3, 'body', 0, 1, 'approved'),
  ('gal_x5_ext_4', 'biz_x5', 'sec_auto_exterior',
   'https://picsum.photos/seed/bmwx5grille/1200/800',
   'Kidney Grille', 'الشبك الكلوي',
   '{
      "title": "Iconic twin kidney grille",
      "title_ar": "الشبك الكلوي المزدوج الأيقوني",
      "subtitle": "Illuminated, frameless",
      "subtitle_ar": "مضيء وبدون إطار"
    }',
   'exterior', 4, 'both', 0, 1, 'approved');

-- Exterior SLIDES: a field_key binds the photo to ONE field, so the slide
-- headline is that field's VALUE ("Mineral White Metallic"), the field label is
-- the eyebrow, and media_data is an optional third line. placement='carousel'
-- keeps them out of the body grid. `roof_type` is deliberately left WITHOUT a
-- photo: it still gets a slide, rendered as a labelled placeholder, which is how
-- an unfinished minisite advertises itself instead of looking sparse by accident.
INSERT OR REPLACE INTO vendor_gallery (id, business_id, section_id, url, caption, caption_ar, media_data, group_key, field_key, field_section_id, display_order, placement, is_hero, show_on_minisite, approval_status) VALUES
  ('gal_x5_slide_paint', 'biz_x5', 'sec_auto_exterior',
   'https://picsum.photos/seed/bmwx5paint/1200/800',
   'Hand-applied metallic', 'طلاء معدني يدوي',
   NULL, 'exterior', 'paint_finish', NULL, 1, 'carousel', 0, 1, 'approved'),
  ('gal_x5_slide_wheels', 'biz_x5', 'sec_auto_exterior',
   'https://picsum.photos/seed/bmwx5wheels/1200/800',
   'Star-spoke, machined face', 'جنوط متعددة الأضلاع بتشطيب مصقول',
   NULL, 'exterior', 'wheels', NULL, 2, 'carousel', 0, 1, 'approved'),
  ('gal_x5_slide_lamps', 'biz_x5', 'sec_auto_exterior',
   'https://picsum.photos/seed/bmwx5lamps/1200/800',
   'Signature light graphic', 'التوقيع الضوئي المميز',
   '{ "title": "Glare-free high beam", "title_ar": "أضواء عالية بدون وهج" }',
   'exterior', 'headlights', NULL, 3, 'carousel', 0, 1, 'approved');

-- ── Interior: view angle + one bound slide (ambient_lighting and sunroof are
-- left photoless on purpose -> placeholder slides) ─────────────────────────────
INSERT OR REPLACE INTO vendor_gallery (id, business_id, section_id, url, caption, caption_ar, media_data, group_key, field_key, field_section_id, display_order, placement, is_hero, show_on_minisite, approval_status) VALUES
  ('gal_x5_int_1', 'biz_x5', 'sec_auto_interior',
   'https://picsum.photos/seed/bmwx5cabin/1200/800',
   'Cockpit', 'المقصورة القيادة',
   NULL, 'interior', NULL, NULL, 1, 'body', 1, 1, 'approved'),
  ('gal_x5_slide_seats', 'biz_x5', 'sec_auto_interior',
   'https://picsum.photos/seed/bmwx5seats/1200/800',
   'Comfort seats, ventilated', 'مقاعد مريحة بتهوية',
   NULL, 'interior', 'seating_material', NULL, 2, 'carousel', 0, 1, 'approved');

-- ── Engine slides, including one CROSS-SECTION binding ────────────────────────
-- gal_x5_slide_power / _torque bind fields that live in sec_auto_engine itself.
-- gal_x5_slide_speed binds top_speed_kmh, which is authored in sec_auto_specs --
-- the photo and the number live in different sections, and field_section_id is
-- what makes that legal instead of ambiguous. acceleration_0_100 stays photoless.
INSERT OR REPLACE INTO vendor_gallery (id, business_id, section_id, url, caption, caption_ar, media_data, group_key, field_key, field_section_id, display_order, placement, is_hero, show_on_minisite, approval_status) VALUES
  ('gal_x5_slide_power', 'biz_x5', 'sec_auto_engine',
   'https://picsum.photos/seed/bmwx5bay/1200/800',
   'B58 3.0t inline-six', 'محرك B58 سداسي الأسطوانات',
   NULL, 'engine_hp', 'max_power_hp', NULL, 1, 'carousel', 0, 1, 'approved'),
  ('gal_x5_slide_torque', 'biz_x5', 'sec_auto_engine',
   'https://picsum.photos/seed/bmwx5torque/1200/800',
   'Peak torque from 1,750 rpm', 'أقصى عزم من 1750 دورة',
   NULL, 'engine_hp', 'max_torque_nm', NULL, 2, 'carousel', 0, 1, 'approved'),
  ('gal_x5_slide_speed', 'biz_x5', 'sec_auto_engine',
   'https://picsum.photos/seed/bmwx5autobahn/1200/800',
   'Electronically limited', 'محدّد إلكترونياً',
   NULL, NULL, 'top_speed_kmh', 'sec_auto_specs', 3, 'carousel', 0, 1, 'approved');
