// Local verification for the value-driven section carousel.
// Dev server must be running: node scratch/verify-carousel.js
//
// Arabic assertions are matched against a \uXXXX-decoded copy of the document:
// the RSC payload embedded in the HTML escapes non-ASCII, so a naive
// html.includes('...') would miss every value that only exists in slide props.
const BASE = process.env.BASE || 'http://localhost:3000';

let failures = 0;
function check(name, cond, detail) {
  const ok = !!cond;
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  [${detail}]` : ''}`);
}

async function page(path) {
  const res = await fetch(BASE + path, { cache: 'no-store' });
  const html = await res.text();
  return {
    status: res.status,
    dom: html,                                     // real server-rendered markup
    all: html.replace(/\\u([0-9a-fA-F]{4})/g,      // DOM + serialized slide props
      (_m, h) => String.fromCharCode(parseInt(h, 16))),
  };
}

const hasPlaceholderSlide = (p) => /"placeholder\\":true/.test(p.dom);
const carousels = (p) => (p.dom.match(/aria-roledescription="carousel"/g) || []).length;
const slideDots = (p) => (p.dom.match(/aria-current="(true|false)"/g) || []).length;
const counter = (p) => {
  // React splits `{i+1} / {n}` into text nodes with comment separators.
  const s = p.dom.replace(/<!--[\s\S]*?-->/g, '');
  const m = s.match(/>(\d+)\s*\/\s*(\d+)</);
  return m ? `${m[1]}/${m[2]}` : '';
};

// ── 1. AR Exterior: 4 slides (3 photos + 1 placeholder), value headlines ──────
{
  const p = await page('/demo-x5/sec_auto_exterior');
  check('exterior(ar) 200', p.status === 200, `status ${p.status}`);
  check('exterior(ar) document is ar/rtl', /<html[^>]*lang="ar"[^>]*dir="rtl"/.test(p.dom));
  check('exterior(ar) one carousel', carousels(p) === 1, `found ${carousels(p)}`);
  check('exterior(ar) 4 slides', slideDots(p) === 4, `dots ${slideDots(p)}`);
  check('exterior(ar) opens on first slide', counter(p) === '1/4', counter(p));
  check('exterior(ar) headline is the paint VALUE', p.all.includes('أبيض معدني'));
  check('exterior(ar) wheels value present', p.all.includes('جنوط M خفيفة 22 بوصة'));
  check('exterior(ar) field label is the eyebrow', p.all.includes('الجنوط'));
  check('exterior(ar) lamps overlay note present', p.all.includes('أضواء عالية بدون وهج'));
  check('exterior(ar) roof_type slide is a labelled placeholder',
    hasPlaceholderSlide(p) && p.all.includes('بانورامي'));
  check('exterior(ar) body grid keeps its unbound tiles', p.dom.includes('picsum.photos/seed/bmwx5grille'));
  // The opening slide is served by the R2 route handler (see scratch/media/r2-into-carousel.sql).
  check('exterior(ar) opening slide is an R2 image',
    p.dom.includes('src="/api/media/gallery/x5-front-4099d11a.png"'));
}

// ── 1b. The media route behind that slide actually serves bytes ──────────────
{
  const res = await fetch(`${BASE}/api/media/gallery/x5-front-4099d11a.png`, { cache: 'no-store' });
  const buf = await res.arrayBuffer();
  check('media route 200 for slide image', res.status === 200, `status ${res.status}`);
  check('media route serves png', res.headers.get('content-type') === 'image/png',
    res.headers.get('content-type'));
  check('media route bytes non-empty', buf.byteLength > 1000, `${buf.byteLength} bytes`);
}

// ── 2. EN Exterior: same section, English labels ──────────────────────────────
{
  const p = await page('/en/demo-x5/sec_auto_exterior');
  check('exterior(en) 200', p.status === 200, `status ${p.status}`);
  // The English tree must describe itself as English: lang/dir on <html> drive
  // crawlers, screen readers and every `rtl:` style variant.
  check('exterior(en) document is en/ltr', /<html[^>]*lang="en"[^>]*dir="ltr"/.test(p.dom));
  check('exterior(en) 4 slides', slideDots(p) === 4, `dots ${slideDots(p)}`);
  check('exterior(en) headline is the paint VALUE', p.all.includes('Mineral White Metallic'));
  check('exterior(en) wheels value present', p.all.includes('22-inch M Light Alloy'));
  check('exterior(en) placeholder slide present', hasPlaceholderSlide(p));
}

// ── 3. Engine: 4 slides incl. one CROSS-SECTION value from Specifications ─────
{
  const p = await page('/demo-x5/sec_auto_engine');
  check('engine(ar) 200', p.status === 200, `status ${p.status}`);
  check('engine(ar) one carousel', carousels(p) === 1, `found ${carousels(p)}`);
  check('engine(ar) 4 slides (3 own + 1 cross-section)', slideDots(p) === 4, `dots ${slideDots(p)}`);
  check('engine(ar) power value', p.all.includes('381'));
  check('engine(ar) torque value', p.all.includes('520'));
  check('engine(ar) cross-section top speed printed', p.all.includes('250'));
  check('engine(ar) cross-section field label as eyebrow', p.all.includes('أقصى سرعة'));
}

// ── 4. Interior: seats photo + two placeholders ───────────────────────────────
{
  const p = await page('/demo-x5/sec_auto_interior');
  check('interior(ar) 200', p.status === 200, `status ${p.status}`);
  check('interior(ar) 3 slides', slideDots(p) === 3, `dots ${slideDots(p)}`);
  check('interior(ar) seating value', p.all.includes('جلد'));
  check('interior(ar) placeholder slides present', hasPlaceholderSlide(p));
}

// ── 5. Trim page: definitions inherited down the BUSINESS TREE ────────────────
{
  const p = await page('/demo-x5-xdrive40i/sec_auto_exterior');
  check('trim exterior 200', p.status === 200, `status ${p.status}`);
  check('trim exterior resolves field labels', p.all.includes('الطلاء / التشطيب'), 'tree inheritance');
  check('trim exterior renders a carousel', carousels(p) === 1, `found ${carousels(p)}`);
}

// ── 6. Specs stays a dense table: enable_gallery = 0, no slides ───────────────
{
  const p = await page('/demo-x5/sec_auto_specs');
  check('specs(ar) 200', p.status === 200, `status ${p.status}`);
  check('specs(ar) has no carousel', carousels(p) === 0, `found ${carousels(p)}`);
  check('specs(ar) still prints its rows', p.all.includes('الاستهلاك (لتر/100كم)'));
}

console.log(failures ? `\n${failures} CHECK(S) FAILED` : '\nALL CHECKS PASSED');
process.exit(failures ? 1 : 0);
