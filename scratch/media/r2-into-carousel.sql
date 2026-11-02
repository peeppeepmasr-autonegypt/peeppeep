-- Local only: point real media at the R2-backed objects so the carousel and the
-- body grid are both proven against the /api/media handler, not just picsum.
-- gal_x5_ext_1/2/3 are unbound grid tiles; gal_x5_slide_paint is the bound slide
-- the carousel opens on, so its <img> lands in the server-rendered markup.
UPDATE vendor_gallery SET url='/api/media/gallery/x5-front-4099d11a.png' WHERE id='gal_x5_ext_1';
UPDATE vendor_gallery SET url='/api/media/gallery/x5-side-8b50e4e0.png'   WHERE id='gal_x5_ext_2';
UPDATE vendor_gallery SET url='/api/media/gallery/x5-rear-c5c0b8ee.png'   WHERE id='gal_x5_ext_3';
UPDATE vendor_gallery SET url='/api/media/gallery/x5-front-4099d11a.png'  WHERE id='gal_x5_slide_paint';
