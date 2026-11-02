const fs = require('fs');
const p = 'e:/autonegyptportal/autoportal/src/components/MinisiteView.tsx';
let s = fs.readFileSync(p, 'utf8');

if (!s.includes('FinanceCalculator')) {
  s = s.replace(
    "import GalleryCarousel from '@/components/GalleryCarousel';",
    "import GalleryCarousel from '@/components/GalleryCarousel';\nimport FinanceCalculator from '@/components/FinanceCalculator';"
  );

  const target = '      {groups.map((g) => (';
  const injection = `      {/* Interactive Finance Calculator if pricing section */}
      {section.id === 'sec_listing_price' && (() => {
        const priceField = groups.flatMap((g) => g.fields).find((f) => f.name === 'price_egp');
        const rawNum = priceField ? parseFloat(String(priceField.value).replace(/[^0-9.]/g, '')) : 0;
        return rawNum > 0 ? <FinanceCalculator price={rawNum} locale={locale} /> : null;
      })()}

`;

  s = s.replace(target, injection + target);
  fs.writeFileSync(p, s, 'utf8');
  console.log('Successfully injected FinanceCalculator into MinisiteView!');
} else {
  console.log('FinanceCalculator already present.');
}
