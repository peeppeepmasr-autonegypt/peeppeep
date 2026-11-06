'use client';

import { useState, useCallback } from 'react';
import type {
  ContentStudioData,
  StudioSection,
  StudioField,
  StudioGalleryItem,
  StudioBlog,
} from '@/lib/content-admin';
import GalleryManager from './GalleryManager';
import FieldEditor from './FieldEditor';
import BlogEditor from './BlogEditor';

type SubTab = 'gallery' | 'fields' | 'blog';

interface Props {
  initialData: ContentStudioData;
  businessId: string;
}

export default function ContentStudioClient({ initialData, businessId }: Props) {
  const [data, setData] = useState(initialData);
  const [activeSectionId, setActiveSectionId] = useState<string>(
    initialData.sections[0]?.id ?? '',
  );
  const [subTab, setSubTab] = useState<SubTab>('gallery');
  const [saving, setSaving] = useState(false);

  const activeSection: StudioSection | undefined =
    data.sections.find((s) => s.id === activeSectionId);

  const activeFields: StudioField[] = data.fields[activeSectionId] ?? [];
  const activeGallery: StudioGalleryItem[] = data.gallery[activeSectionId] ?? [];
  const activeBlogs: StudioBlog[] = data.blogs[activeSectionId] ?? [];
  const activeValues: Record<string, unknown> =
    data.business.custom_data[activeSectionId] ?? {};

  // ── Save field values ──
  const saveValues = useCallback(async (values: Record<string, unknown>) => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/content', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ business_id: businessId, section_id: activeSectionId, values }),
      });
      if (res.ok) {
        setData((prev) => ({
          ...prev,
          business: {
            ...prev.business,
            custom_data: { ...prev.business.custom_data, [activeSectionId]: values },
          },
        }));
      }
    } finally {
      setSaving(false);
    }
  }, [businessId, activeSectionId]);

  // ── Gallery callbacks ──
  const onGalleryUpdate = useCallback((items: StudioGalleryItem[]) => {
    setData((prev) => ({
      ...prev,
      gallery: { ...prev.gallery, [activeSectionId]: items },
    }));
  }, [activeSectionId]);

  // ── Blog callbacks ──
  const onBlogsUpdate = useCallback((blogs: StudioBlog[]) => {
    setData((prev) => ({
      ...prev,
      blogs: { ...prev.blogs, [activeSectionId]: blogs },
    }));
  }, [activeSectionId]);

  const perms = data.permissions;

  return (
    <div className="space-y-4">
      {/* Section tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 border-b border-black/10 dark:border-white/10">
        {data.sections.map((sec) => (
          <button
            key={sec.id}
            onClick={() => setActiveSectionId(sec.id)}
            className={`px-3 py-2 text-sm font-medium whitespace-nowrap rounded-t-lg transition ${
              sec.id === activeSectionId
                ? 'bg-blue-600 text-white'
                : 'hover:bg-black/5 dark:hover:bg-white/5 opacity-70'
            }`}
          >
            {sec.icon && <span className="me-1">{sec.icon}</span>}
            {sec.name_ar || sec.name}
          </button>
        ))}
      </div>

      {/* Sub-tab switcher */}
      <div className="flex gap-2">
        <SubTabBtn active={subTab === 'gallery'} onClick={() => setSubTab('gallery')}>
          🖼️ Gallery & Carousel
        </SubTabBtn>
        <SubTabBtn active={subTab === 'fields'} onClick={() => setSubTab('fields')}>
          📝 Fields
        </SubTabBtn>
        {activeSection?.enable_blog ? (
          <SubTabBtn active={subTab === 'blog'} onClick={() => setSubTab('blog')}>
            📰 Blog
          </SubTabBtn>
        ) : null}
      </div>

      {/* Content area */}
      <div className="rounded-xl border border-black/10 dark:border-white/10 p-4 bg-white dark:bg-neutral-900 min-h-[400px]">
        {subTab === 'gallery' && (
          <GalleryManager
            businessId={businessId}
            sectionId={activeSectionId}
            items={activeGallery}
            fields={activeFields}
            permissions={perms}
            onUpdate={onGalleryUpdate}
          />
        )}
        {subTab === 'fields' && (
          <FieldEditor
            fields={activeFields}
            values={activeValues}
            saving={saving}
            canEdit={perms.canEditFields}
            onSave={saveValues}
          />
        )}
        {subTab === 'blog' && (
          <BlogEditor
            businessId={businessId}
            sectionId={activeSectionId}
            blogs={activeBlogs}
            permissions={perms}
            onUpdate={onBlogsUpdate}
          />
        )}
      </div>

      {/* Save status indicator */}
      {saving && (
        <div className="fixed bottom-4 end-4 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-lg animate-pulse">
          Saving...
        </div>
      )}
    </div>
  );
}

function SubTabBtn({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
        active
          ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
          : 'border border-black/15 dark:border-white/20 hover:bg-black/5 dark:hover:bg-white/5'
      }`}
    >
      {children}
    </button>
  );
}
