// Page map + slide inventory for one minisite, read through the REAL render path.
// It walks the shelf tabs a visitor sees, then decodes the slides each page hands
// to the carousel. Usage: node scratch/page-map.js [slug] [--en]
const BASE = process.env.BASE || 'http://localhost:3000';
const slug = process.argv[2] || 'demo-x5';
const en = process.argv.includes('--en');
const root = en ? `/en/${slug}` : `/${slug}`;

/** Pull the `slides` array out of the RSC payload embedded in the document. */
function extractSlides(html) {
  const marker = '\\"slides\\":[';
  const at = html.indexOf(marker);
  if (at < 0) return [];
  // Balance-scan the array, unescaping the payload's \" quoting as we go.
  let i = at + marker.length - 1;
  let depth = 0;
  let out = '';
  for (; i < html.length; i++) {
    // A backslash before a quote is payload escaping, not part of the value:
    // consume both chars, otherwise `\"` becomes `""` and JSON.parse rejects it.
    let c = html[i];
    if (c === '\\' && html[i + 1] === '"') { c = '"'; i++; }
    if (c === '[' || c === '{') depth++;
    if (c === ']' || c === '}') depth--;
    out += c;
    if (depth === 0) break;
  }
  try {
    return JSON.parse(out);
  } catch {
    return [];
  }
}

const dec = (s) => (typeof s === 'string'
  ? s.replace(/\\u([0-9a-fA-F]{4})/g, (_m, h) => String.fromCharCode(parseInt(h, 16)))
  : s);

async function main() {
  const res = await fetch(BASE + root, { cache: 'no-store' });
  const html = await res.text();
  // Shelf tabs are the only links of the form /{slug}/{section}.
  const prefix = en ? `/en/${slug}/` : `/${slug}/`;
  const ids = [...new Set(
    [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]).filter((h) => h.startsWith(prefix)),
  )];
  const labels = new Map(
    [...html.matchAll(/href="([^"]+)"[^>]*>([^<]+)</g)].map((m) => [m[1], m[2]]),
  );

  console.log(`${en ? 'EN' : 'AR'} · ${root} · ${ids.length} shelf pages\n`);
  for (const href of ids) {
    const p = await fetch(BASE + href, { cache: 'no-store' });
    const pageHtml = await p.text();
    const slides = extractSlides(pageHtml);
    const name = dec(labels.get(href) || href.slice(prefix.length));
    const dom = (pageHtml.match(/aria-roledescription="carousel"/g) || []).length;
    const groups = /<dt/.test(pageHtml) ? '· fields grid' : '';
    console.log(`── ${name}  (${href})  HTTP ${p.status} · carousel:${dom ? 'YES' : 'no'} · ${slides.length} slides ${groups}`);
    if (!slides.length) { console.log('   (no slides — data/graph shelf page)\n'); continue; }
    for (const s of slides) {
      const head = s.placeholder ? '[needs photo]' : '[photo]';
      const note = s.note ? ` — ${dec(s.note)}` : '';
      console.log(`   ${head} ${dec(s.eyebrow)}: ${dec(s.title) || '(no value yet)'}${note}`);
      if (s.fieldSectionId && !href.endsWith(s.fieldSectionId)) {
        console.log(`            ↑ value comes from ${s.fieldSectionId} (cross-section)`);
      }
    }
    console.log('');
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
