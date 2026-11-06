'use client';

import { useState, useRef, useCallback } from 'react';
import type { StudioGalleryItem, StudioField, ContentPermissions } from '@/lib/content-admin';

interface Props {
  businessId: string;
  unitId?: string;
  sectionId: string;
  items: StudioGalleryItem[];
  fields: StudioField[];
  permissions: ContentPermissions;
  onUpdate: (items: StudioGalleryItem[]) => void;
}

export default function GalleryManager({
  businessId, unitId, sectionId, items, fields, permissions, onUpdate,
}: Props) {
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Upload handler ──
  const handleFiles = useCallback(async (files: FileList | File[]) => {
    setUploading(true);
    setError(null);
    const newItems: StudioGalleryItem[] = [];

    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) {
        setError(`${file.name}: only image uploads are supported here.`);
        continue;
      }
      try {
        const form = new FormData();
        form.append('file', file);
        form.append('business_id', businessId);
        const upRes = await fetch('/api/upload', {
          method: 'POST',
          headers: { Authorization: 'Bearer local_dev_secret' },
          body: form,
        });
        if (!upRes.ok) throw new Error(`Upload failed for ${file.name} (HTTP ${upRes.status}).`);
        const { url } = await upRes.json() as { url: string };

        // Insert into vendor_gallery
        const addRes = await fetch('/api/admin/media', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ business_id: businessId, unit_id: unitId, section_id: sectionId, url }),
        });
        if (!addRes.ok) throw new Error(`Could not add ${file.name} to this gallery (HTTP ${addRes.status}).`);
        const added = await addRes.json() as { id: string; approval_status: string };
        newItems.push({
          id: added.id, url, caption: null, caption_ar: null,
          media_data: null, group_key: null, field_key: null, field_section_id: null,
          display_order: items.length + newItems.length + 1,
          placement: 'body', is_hero: 0, show_on_minisite: 1,
          approval_status: added.approval_status, media_type: 'image', video_id: null,
        });
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : `Could not upload ${file.name}.`);
      }
    }

    if (newItems.length) onUpdate([...items, ...newItems]);
    setUploading(false);
  }, [businessId, unitId, sectionId, items, onUpdate]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  };

  // ── Hero ──
  const setHero = async (id: string) => {
    setError(null);
    try {
      const prev = items.find((i) => i.is_hero === 1);
      if (prev && prev.id !== id) {
        const response = await fetch('/api/admin/media', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: prev.id, is_hero: 0 }),
        });
        if (!response.ok) throw new Error(`Could not update the current hero (HTTP ${response.status}).`);
      }
      const response = await fetch('/api/admin/media', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_hero: 1 }),
      });
      if (!response.ok) throw new Error(`Could not set the hero image (HTTP ${response.status}).`);
      onUpdate(items.map((i) => ({ ...i, is_hero: i.id === id ? 1 : 0 })));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not update the hero image.');
    }
  };

  // ── Placement toggle ──
  const setPlacement = async (id: string, placement: string) => {
    try {
      const response = await fetch('/api/admin/media', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, placement }),
      });
      if (!response.ok) throw new Error(`Could not update placement (HTTP ${response.status}).`);
      onUpdate(items.map((i) => (i.id === id ? { ...i, placement } : i)));
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not update placement.');
    }
  };

  // ── Field binding ──
  const setFieldKey = async (id: string, fieldKey: string) => {
    try {
      const response = await fetch('/api/admin/media', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, field_key: fieldKey || null }),
      });
      if (!response.ok) throw new Error(`Could not bind the photo to a field (HTTP ${response.status}).`);
      onUpdate(items.map((i) => (i.id === id ? { ...i, field_key: fieldKey || null } : i)));
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not update the field binding.');
    }
  };

  // ── Caption ──
  const setCaption = async (id: string, caption: string, caption_ar: string) => {
    try {
      const response = await fetch('/api/admin/media', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, caption, caption_ar }),
      });
      if (!response.ok) throw new Error(`Could not save the caption (HTTP ${response.status}).`);
      onUpdate(items.map((i) => (i.id === id ? { ...i, caption, caption_ar } : i)));
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not save the caption.');
    }
  };

  // ── Delete ──
  const deleteItem = async (id: string) => {
    if (!confirm('Delete this image?')) return;
    try {
      const response = await fetch('/api/admin/media', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!response.ok) throw new Error(`Could not delete the image (HTTP ${response.status}).`);
      onUpdate(items.filter((i) => i.id !== id));
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not delete the image.');
    }
  };

  // ── Reorder (move up) ──
  const moveUp = async (index: number) => {
    if (index === 0) return;
    const arr = [...items];
    [arr[index - 1], arr[index]] = [arr[index], arr[index - 1]];
    try {
      const response = await fetch('/api/admin/media', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ business_id: businessId, section_id: sectionId, order: arr.map((i) => i.id) }),
      });
      if (!response.ok) throw new Error(`Could not reorder images (HTTP ${response.status}).`);
      onUpdate(arr);
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not reorder images.');
    }
  };

  return (
    <div className="space-y-4">
      {error ? <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      {/* Upload area */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`p-6 rounded-xl border-2 border-dashed text-center transition ${
          dragOver
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
            : 'border-black/15 dark:border-white/20 hover:border-blue-400'
        }`}
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
        <div className="text-2xl mb-2">📸</div>
        <p className="text-sm font-medium mb-2">
          Drag & drop images here, or
        </p>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-50"
        >
          {uploading ? 'Uploading...' : 'Browse Files'}
        </button>
        <p className="text-[11px] opacity-50 mt-2">
          Max 10MB per image. Auto-compressed for fast mobile loading.
        </p>
      </div>

      {/* Gallery grid */}
      {items.length === 0 ? (
        <p className="text-sm opacity-50 text-center py-8">No images yet. Upload above.</p>
      ) : (
        <div className="space-y-2">
          {items.map((item, idx) => (
            <div
              key={item.id}
              className={`flex items-start gap-3 p-3 rounded-lg border transition ${
                item.is_hero === 1
                  ? 'border-blue-400 bg-blue-50/50 dark:bg-blue-900/10'
                  : 'border-black/10 dark:border-white/10'
              }`}
            >
              {/* Thumbnail */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.url}
                alt={item.caption || ''}
                className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
              />

              {/* Info + controls */}
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  {item.is_hero === 1 && (
                    <span className="text-[10px] font-bold bg-blue-600 text-white px-1.5 py-0.5 rounded">HERO</span>
                  )}
                  <span className="text-[10px] font-bold uppercase opacity-50">{item.placement}</span>
                  {item.approval_status !== 'approved' && (
                    <span className="text-[10px] font-bold text-amber-600">⏳ {item.approval_status}</span>
                  )}
                  {item.field_key && (
                    <span className="text-[10px] bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded">
                      🔗 {item.field_key}
                    </span>
                  )}
                </div>

                {/* Inline edit toggle */}
                {editingId === item.id ? (
                  <InlineEditor
                    item={item}
                    fields={fields}
                    permissions={permissions}
                    onSave={(caption, captionAr) => setCaption(item.id, caption, captionAr)}
                    onPlacement={(p) => setPlacement(item.id, p)}
                    onFieldKey={(fk) => setFieldKey(item.id, fk)}
                    onClose={() => setEditingId(null)}
                  />
                ) : (
                  <div className="text-xs opacity-60 truncate">
                    {item.caption || item.caption_ar || 'No caption'}
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex flex-col gap-1 items-end">
                <div className="flex gap-1">
                  <button
                    title="Move up"
                    onClick={() => moveUp(idx)}
                    disabled={idx === 0}
                    className="text-xs px-1.5 py-0.5 rounded border border-black/10 dark:border-white/15 hover:bg-black/5 disabled:opacity-30"
                  >↑</button>
                  <button
                    title="Toggle hero"
                    onClick={() => setHero(item.id)}
                    className={`text-xs px-1.5 py-0.5 rounded border ${
                      item.is_hero === 1
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-black/10 dark:border-white/15 hover:bg-black/5'
                    }`}
                  >★</button>
                  <button
                    title="Edit"
                    onClick={() => setEditingId(editingId === item.id ? null : item.id)}
                    className="text-xs px-1.5 py-0.5 rounded border border-black/10 dark:border-white/15 hover:bg-black/5"
                  >✎</button>
                  {permissions.canDeleteMedia && (
                    <button
                      title="Delete"
                      onClick={() => deleteItem(item.id)}
                      className="text-xs px-1.5 py-0.5 rounded border border-red-300 text-red-600 hover:bg-red-50"
                    >✕</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Inline editor for a gallery item ──────────────────────────────────────────
function InlineEditor({
  item, fields, permissions, onSave, onPlacement, onFieldKey, onClose,
}: {
  item: StudioGalleryItem;
  fields: StudioField[];
  permissions: ContentPermissions;
  onSave: (caption: string, captionAr: string) => void;
  onPlacement: (p: string) => void;
  onFieldKey: (fk: string) => void;
  onClose: () => void;
}) {
  const [caption, setCap] = useState(item.caption ?? '');
  const [captionAr, setCapAr] = useState(item.caption_ar ?? '');

  return (
    <div className="space-y-2 mt-2 p-3 rounded-lg bg-black/[.03] dark:bg-white/5 border border-black/10 dark:border-white/10">
      <div className="grid grid-cols-2 gap-2">
        <input
          value={caption}
          onChange={(e) => setCap(e.target.value)}
          placeholder="Caption (EN)"
          className="text-xs px-2 py-1 rounded border border-black/15 dark:border-white/20 bg-transparent"
        />
        <input
          value={captionAr}
          onChange={(e) => setCapAr(e.target.value)}
          placeholder="Caption (AR)"
          dir="rtl"
          className="text-xs px-2 py-1 rounded border border-black/15 dark:border-white/20 bg-transparent"
        />
      </div>
      <div className="flex gap-2 items-center flex-wrap">
        <label className="text-[11px] font-bold opacity-60">Placement:</label>
        {['body', 'carousel', 'both'].map((p) => (
          <button
            key={p}
            onClick={() => onPlacement(p)}
            className={`text-[11px] px-2 py-0.5 rounded ${
              item.placement === p
                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                : 'border border-black/15 dark:border-white/20'
            }`}
          >{p}</button>
        ))}
      </div>
      {permissions.canEditFields && (
        <div className="flex gap-2 items-center">
          <label className="text-[11px] font-bold opacity-60">Bind to field:</label>
          <select
            value={item.field_key ?? ''}
            onChange={(e) => onFieldKey(e.target.value)}
            className="text-xs px-2 py-1 rounded border border-black/15 dark:border-white/20 bg-transparent"
          >
            <option value="">— none —</option>
            {fields.filter((f) => f.show_as_slide === 1 || f.destination === 'carousel').map((f) => (
              <option key={f.name} value={f.name}>{f.label || f.name}</option>
            ))}
          </select>
        </div>
      )}
      <div className="flex gap-2 justify-end">
        <button onClick={onClose} className="text-xs px-2 py-1 opacity-60">Cancel</button>
        <button
          onClick={() => { onSave(caption, captionAr); onClose(); }}
          className="text-xs px-3 py-1 bg-blue-600 text-white rounded font-bold"
        >Save</button>
      </div>
    </div>
  );
}
