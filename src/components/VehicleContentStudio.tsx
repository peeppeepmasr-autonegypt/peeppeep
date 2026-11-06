'use client';

import { useState } from 'react';
import type {
  ContentPermissions, StudioField, StudioGalleryItem, StudioSection,
} from '@/lib/content-admin';
import GalleryManager from '@/components/GalleryManager';

export default function VehicleContentStudio({
  sellerId,
  unitId,
  sections,
  fields,
  initialGallery,
  permissions,
}: {
  sellerId: string;
  unitId: string;
  sections: StudioSection[];
  fields: Record<string, StudioField[]>;
  initialGallery: Record<string, StudioGalleryItem[]>;
  permissions: ContentPermissions;
}) {
  const [gallery, setGallery] = useState(initialGallery);
  const [activeSection, setActiveSection] = useState(sections[0]?.id ?? '');
  const section = sections.find((item) => item.id === activeSection);

  if (!sections.length) {
    return <p className="rounded-xl border border-black/10 p-4 text-sm opacity-70">No vehicle gallery sections are configured for this model.</p>;
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-bold">Vehicle gallery and carousel</h2>
        <p className="text-sm opacity-60">Upload photos for this exact vehicle, choose carousel placement, and bind a photo to a model field when needed.</p>
      </div>
      <nav className="flex gap-2 overflow-x-auto border-b border-black/10 pb-2" aria-label="Vehicle gallery sections">
        {sections.map((item) => (
          <button
            type="button"
            key={item.id}
            onClick={() => setActiveSection(item.id)}
            aria-current={activeSection === item.id ? 'page' : undefined}
            className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm ${activeSection === item.id ? 'bg-neutral-900 text-white' : 'border border-black/10 hover:bg-black/5'}`}
          >
            {item.name}
          </button>
        ))}
      </nav>
      {section ? (
        <GalleryManager
          businessId={sellerId}
          unitId={unitId}
          sectionId={section.id}
          items={gallery[section.id] ?? []}
          fields={fields[section.id] ?? []}
          permissions={permissions}
          onUpdate={(items) => setGallery((current) => ({ ...current, [section.id]: items }))}
        />
      ) : null}
    </section>
  );
}
