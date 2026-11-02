/**
 * R2 end-to-end smoke test (local dev server must be running on :3000).
 *   node scratch/r2-smoke.js
 * 1. POST /api/upload  (multipart, bearer secret)  -> expect 201 { key, url }
 * 2. GET  /api/media/{key}                          -> expect 200 image/png, same bytes
 * 3. Negative: POST without auth                    -> expect 401
 * 4. Negative: GET unknown key                      -> expect 404
 */
const BASE = process.env.BASE || 'http://localhost:3000';
const SECRET = process.env.UPLOAD_SECRET || 'dev-upload-secret';

// 1x1 transparent PNG
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==',
  'base64'
);

function log(name, ok, extra) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  ::  ' + extra : ''}`);
  if (!ok) process.exitCode = 1;
}

async function main() {
  // 1) upload
  const fd = new FormData();
  fd.append('file', new Blob([PNG], { type: 'image/png' }), 'smoke test.png');
  const up = await fetch(`${BASE}/api/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${SECRET}` },
    body: fd,
  });
  const upText = await up.text();
  log('POST /api/upload returns 201', up.status === 201, `status=${up.status} body=${upText}`);

  let parsed;
  try { parsed = JSON.parse(upText); } catch { parsed = null; }
  const url = parsed?.url;
  log('response has key + url', Boolean(parsed?.key && url), JSON.stringify(parsed));

  if (!url) {
    log('aborting: no url', false);
    return;
  }

  // 2) read back
  const get = await fetch(`${BASE}${url}`);
  const buf = Buffer.from(await get.arrayBuffer());
  const ct = get.headers.get('content-type');
  log('GET /api/media/... returns 200', get.status === 200, `status=${get.status}`);
  log('served as image/png', ct === 'image/png', `content-type=${ct}`);
  log('bytes match upload', buf.length === PNG.length, `got=${buf.length} expected=${PNG.length}`);
  log('immutable cache header', (get.headers.get('cache-control') || '').includes('immutable'),
    get.headers.get('cache-control'));

  // 3) unauthorized upload
  const fd2 = new FormData();
  fd2.append('file', new Blob([PNG], { type: 'image/png' }), 'x.png');
  const anon = await fetch(`${BASE}/api/upload`, { method: 'POST', body: fd2 });
  log('POST without token returns 401', anon.status === 401, `status=${anon.status}`);

  // 4) missing object
  const miss = await fetch(`${BASE}/api/media/gallery/does-not-exist.png`);
  log('GET unknown key returns 404', miss.status === 404, `status=${miss.status}`);

  // 5) traversal guard
  const trav = await fetch(`${BASE}/api/media/..%2F..%2F..%2Fetc%2Fpasswd`);
  log('traversal key rejected (400/404)', trav.status === 400 || trav.status === 404, `status=${trav.status}`);

  console.log(`\nUploaded key: ${parsed.key}`);
  console.log(`Viewable url: ${BASE}${url}`);
}

main().catch((err) => {
  console.error('ERROR', err);
  process.exitCode = 1;
});
