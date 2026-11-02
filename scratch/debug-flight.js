// debug: what does the flight payload look like for one page?
const path = process.argv[2] || '/demo-x5/sec_auto_comfort';
fetch(`http://localhost:3000${path}`, { cache: 'no-store' })
  .then((r) => r.text())
  .then((h) => {
    const marker = String.raw`\"slides\":[`;
    const i = h.indexOf(marker);
    console.log('marker at', i, ' | "slides" occurs:', h.split('slides').length - 1);
    if (i >= 0) console.log(JSON.stringify(h.slice(i, i + 600)));
    else {
      const j = h.indexOf('slides');
      console.log(JSON.stringify(h.slice(Math.max(0, j - 80), j + 600)));
    }
  });
