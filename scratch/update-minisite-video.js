const fs = require('fs');
const p = 'e:/autonegyptportal/autoportal/src/lib/minisite.ts';
let s = fs.readFileSync(p, 'utf8');

// Update Slide interface
s = s.replace(
  '  placeholder: boolean;\n}',
  '  placeholder: boolean;\n  mediaType?: "image" | "youtube" | "video";\n  videoId?: string | null;\n}'
);

// Update GalleryRow interface
s = s.replace(
  '  field_key: string | null; field_section_id: string | null;\n}',
  '  field_key: string | null; field_section_id: string | null;\n  media_type?: string | null; video_id?: string | null;\n}'
);

// Update loadGalleryRows SELECT query
s = s.replace(
  'field_key, field_section_id\n       FROM vendor_gallery',
  'field_key, field_section_id, media_type, video_id\n       FROM vendor_gallery'
);

// Update makeSlide to attach mediaType and videoId
s = s.replace(
  '    placeholder: false,\n  };',
  '    placeholder: false,\n    mediaType: (r.media_type as any) || "image",\n    videoId: r.video_id || null,\n  };'
);

fs.writeFileSync(p, s, 'utf8');
console.log('Successfully updated minisite.ts with video/youtube support!');
