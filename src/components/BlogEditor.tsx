'use client';

import { useState, useCallback } from 'react';
import type { StudioBlog, ContentPermissions } from '@/lib/content-admin';

interface Props {
  businessId: string;
  sectionId: string;
  blogs: StudioBlog[];
  permissions: ContentPermissions;
  onUpdate: (blogs: StudioBlog[]) => void;
}

export default function BlogEditor({
  businessId, sectionId, blogs, permissions, onUpdate,
}: Props) {
  const [editing, setEditing] = useState<StudioBlog | null>(null);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [titleAr, setTitleAr] = useState('');
  const [content, setContent] = useState('');
  const [contentAr, setContentAr] = useState('');
  const [status, setStatus] = useState('draft');
  const [showOnMinisite, setShowOnMinisite] = useState(1);
  const [saving, setSaving] = useState(false);

  const reset = useCallback(() => {
    setEditing(null);
    setCreating(false);
    setTitle(''); setTitleAr('');
    setContent(''); setContentAr('');
    setStatus('draft'); setShowOnMinisite(1);
  }, []);

  const startEdit = (blog: StudioBlog) => {
    setEditing(blog);
    setTitle(blog.title ?? '');
    setTitleAr(blog.title_ar ?? '');
    setContent(blog.content ?? '');
    setContentAr(blog.content_ar ?? '');
    setStatus(blog.status);
    setShowOnMinisite(blog.show_on_minisite);
  };

  const startCreate = () => {
    reset();
    setCreating(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editing) {
        // PATCH existing
        const res = await fetch('/api/admin/blogs', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editing.id,
            title, title_ar: titleAr,
            content, content_ar: contentAr,
            status, show_on_minisite: showOnMinisite,
          }),
        });
        if (res.ok) {
          onUpdate(blogs.map((b) =>
            b.id === editing.id
              ? { ...b, title, title_ar: titleAr, content, content_ar: contentAr, status, show_on_minisite: showOnMinisite }
              : b,
          ));
        }
      } else if (creating) {
        // POST new
        const res = await fetch('/api/admin/blogs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            business_id: businessId, section_id: sectionId,
            title, title_ar: titleAr,
            content, content_ar: contentAr,
            status, show_on_minisite: showOnMinisite,
          }),
        });
        if (res.ok) {
          const data = await res.json() as { id: string; status: string };
          onUpdate([
            { id: data.id, section_id: sectionId, title, title_ar: titleAr, content, content_ar: contentAr, status: data.status, show_on_minisite: showOnMinisite },
            ...blogs,
          ]);
        }
      }
      reset();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this blog entry?')) return;
    const res = await fetch('/api/admin/blogs', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    if (res.ok) onUpdate(blogs.filter((b) => b.id !== id));
  };

  const statusColors: Record<string, string> = {
    published: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  };

  return (
    <div className="space-y-4">
      {/* New entry button */}
      {permissions.canWriteBlog && !creating && !editing && (
        <button
          onClick={startCreate}
          className="px-4 py-2 text-sm font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          + New Blog Entry
        </button>
      )}

      {/* Editor form */}
      {(creating || editing) && (
        <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-900/10 space-y-3">
          <h3 className="text-sm font-bold">
            {editing ? 'Edit Blog Entry' : 'New Blog Entry'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold opacity-60 block mb-1">Title (EN)</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-lg border border-black/15 dark:border-white/20 bg-transparent"
                placeholder="English title..."
              />
            </div>
            <div>
              <label className="text-[11px] font-bold opacity-60 block mb-1">Title (AR)</label>
              <input
                dir="rtl"
                value={titleAr}
                onChange={(e) => setTitleAr(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-lg border border-black/15 dark:border-white/20 bg-transparent"
                placeholder="العنوان بالعربية..."
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold opacity-60 block mb-1">Content (EN)</label>
              <textarea
                rows={6}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-lg border border-black/15 dark:border-white/20 bg-transparent resize-y"
                placeholder="English story..."
              />
            </div>
            <div>
              <label className="text-[11px] font-bold opacity-60 block mb-1">Content (AR)</label>
              <textarea
                dir="rtl"
                rows={6}
                value={contentAr}
                onChange={(e) => setContentAr(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-lg border border-black/15 dark:border-white/20 bg-transparent resize-y"
                placeholder="القصة بالعربية..."
              />
            </div>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <div>
              <label className="text-[11px] font-bold opacity-60 me-2">Status:</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="text-xs px-2 py-1 rounded border border-black/15 dark:border-white/20 bg-transparent"
              >
                <option value="draft">Draft</option>
                <option value="pending">Pending review</option>
                {permissions.canApprove && <option value="published">Published</option>}
              </select>
            </div>
            <label className="inline-flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={showOnMinisite === 1}
                onChange={(e) => setShowOnMinisite(e.target.checked ? 1 : 0)}
                className="w-3.5 h-3.5"
              />
              Show on minisite
            </label>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button onClick={reset} className="text-xs px-3 py-1.5 opacity-60 hover:opacity-100">Cancel</button>
            <button
              onClick={handleSave}
              disabled={saving || (!title && !titleAr)}
              className="text-xs px-4 py-1.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-40"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {/* Blog list */}
      {blogs.length === 0 && !creating ? (
        <p className="text-sm opacity-50 text-center py-6">No blog entries for this section yet.</p>
      ) : (
        <div className="space-y-2">
          {blogs.map((blog) => (
            <div
              key={blog.id}
              className={`p-3 rounded-lg border transition cursor-pointer hover:bg-black/[.02] dark:hover:bg-white/[.03] ${
                editing?.id === blog.id
                  ? 'border-blue-400 bg-blue-50/50 dark:bg-blue-900/10'
                  : 'border-black/10 dark:border-white/10'
              }`}
              onClick={() => startEdit(blog)}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${statusColors[blog.status] ?? statusColors.draft}`}>
                  {blog.status}
                </span>
                {blog.show_on_minisite === 1 && (
                  <span className="text-[10px] opacity-50">visible on minisite</span>
                )}
              </div>
              <div className="text-sm font-medium truncate">{blog.title || blog.title_ar || '(untitled)'}</div>
              {blog.title_ar && blog.title && (
                <div className="text-xs opacity-50 truncate" dir="rtl">{blog.title_ar}</div>
              )}
              {permissions.canApprove && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(blog.id); }}
                  className="absolute top-2 end-2 text-xs text-red-500 opacity-0 group-hover:opacity-100"
                >
                  Delete
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
