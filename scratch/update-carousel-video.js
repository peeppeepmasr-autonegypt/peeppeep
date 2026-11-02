const fs = require('fs');
const p = 'e:/autonegyptportal/autoportal/src/components/GalleryCarousel.tsx';
let s = fs.readFileSync(p, 'utf8');

const target = `        {slide.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={slide.id}
            src={slide.url}
            alt={slide.title || slide.eyebrow}
            className="absolute inset-0 w-full h-full object-cover"
            // The active slide must not lazy-load; the neighbours are fetched on demand.
            loading="eager"
          />
        ) : (`;

const replacement = `        {slide.mediaType === 'youtube' && slide.videoId ? (
          <iframe
            key={slide.id}
            src={\`https://www.youtube-nocookie.com/embed/\${slide.videoId}?rel=0&modestbranding=1\`}
            title={slide.title || slide.eyebrow}
            className="absolute inset-0 w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : slide.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={slide.id}
            src={slide.url}
            alt={slide.title || slide.eyebrow}
            className="absolute inset-0 w-full h-full object-cover"
            // The active slide must not lazy-load; the neighbours are fetched on demand.
            loading="eager"
          />
        ) : (` ;

s = s.replace(target, replacement);
fs.writeFileSync(p, s, 'utf8');
console.log('Successfully updated GalleryCarousel.tsx to render YouTube video iframes!');
