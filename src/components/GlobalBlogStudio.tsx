'use client';

import { useCallback, useEffect, useState } from 'react';

interface Post {
  id: string;
  slug: string;
  title: string;
  title_ar: string | null;
  excerpt: string | null;
  excerpt_ar: string | null;
  content: string;
  content_ar: string;
  featured_image_url: string | null;
  author_name: string;
  category: string | null;
  category_ar: string | null;
  status: 'draft' | 'published' | 'scheduled';
  published_at: string | null;
  seo_title: string | null;
  seo_title_ar: string | null;
  seo_description: string | null;
  seo_description_ar: string | null;
  meta_keywords: string | null;
  tags: string[];
}

type PostForm = Omit<Post, 'id' | 'tags' | 'status' | 'published_at'> & {
  tags: string;
  status: Post['status'];
  published_at: string;
};

const EMPTY: PostForm = {
  slug: '', title: '', title_ar: '', excerpt: '', excerpt_ar: '',
  content: '', content_ar: '', featured_image_url: '', author_name: '',
  category: '', category_ar: '', status: 'draft', published_at: '',
  seo_title: '', seo_title_ar: '', seo_description: '', seo_description_ar: '',
  meta_keywords: '', tags: '',
};

const WIDGETS = [
  ['carousel', 'Featured post carousel'],
  ['search', 'Search'],
  ['recent', 'Recent posts'],
  ['categories', 'Categories'],
  ['tags', 'Tag cloud'],
] as const;

export default function GlobalBlogStudio() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [widgets, setWidgets] = useState<string[]>(['search', 'recent', 'categories', 'tags']);
  const [form, setForm] = useState<PostForm>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/blog/global', { cache: 'no-store' });
      const data = await res.json() as { posts?: Post[]; widgets?: string[]; error?: string };
      if (!res.ok) throw new Error(data.error || 'Could not load blog data.');
      setPosts(data.posts ?? []);
      setWidgets(data.widgets ?? []);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load blog data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const loadInitial = async () => {
      try {
        const res = await fetch('/api/admin/blog/global', { cache: 'no-store' });
        const data = await res.json() as { posts?: Post[]; widgets?: string[]; error?: string };
        if (!res.ok) throw new Error(data.error || 'Could not load blog data.');
        if (active) {
          setPosts(data.posts ?? []);
          setWidgets(data.widgets ?? []);
        }
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : 'Could not load blog data.');
      } finally {
        if (active) setLoading(false);
      }
    };
    void loadInitial();
    return () => { active = false; };
  }, []);

  const startEdit = (post: Post) => {
    setEditingId(post.id);
    setError('');
    setForm({
      slug: post.slug,
      title: post.title,
      title_ar: post.title_ar ?? '',
      excerpt: post.excerpt ?? '',
      excerpt_ar: post.excerpt_ar ?? '',
      content: post.content,
      content_ar: post.content_ar,
      featured_image_url: post.featured_image_url ?? '',
      author_name: post.author_name,
      category: post.category ?? '',
      category_ar: post.category_ar ?? '',
      status: post.status,
      published_at: post.published_at ? new Date(post.published_at).toISOString().slice(0, 16) : '',
      seo_title: post.seo_title ?? '',
      seo_title_ar: post.seo_title_ar ?? '',
      seo_description: post.seo_description ?? '',
      seo_description_ar: post.seo_description_ar ?? '',
      meta_keywords: post.meta_keywords ?? '',
      tags: post.tags.join(', '),
    });
  };

  const update = (key: keyof PostForm, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const save = async () => {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const payload = {
        ...form,
        published_at: form.published_at ? new Date(form.published_at).toISOString() : null,
        ...(editingId ? { id: editingId } : {}),
      };
      const res = await fetch('/api/admin/blog/global', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error || 'Could not save this post.');
      setForm(EMPTY);
      setEditingId(null);
      setMessage('Post saved.');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save this post.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm('Delete this post permanently?')) return;
    setError('');
    try {
      const res = await fetch('/api/admin/blog/global', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error || 'Could not delete this post.');
      setPosts((current) => current.filter((post) => post.id !== id));
      if (editingId === id) { setEditingId(null); setForm(EMPTY); }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete this post.');
    }
  };

  const saveWidgets = async (next: string[]) => {
    setWidgets(next);
    setError('');
    try {
      const res = await fetch('/api/admin/blog/global/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ widgets: next }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error || 'Could not save sidebar settings.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save sidebar settings.');
      await load();
    }
  };

  const moveWidget = (id: string, delta: number) => {
    const from = widgets.indexOf(id);
    const to = from + delta;
    if (from < 0 || to < 0 || to >= widgets.length) return;
    const next = [...widgets];
    [next[from], next[to]] = [next[to], next[from]];
    void saveWidgets(next);
  };

  const insertMarkdown = (key: 'content' | 'content_ar', before: string, after = '') => {
    const textarea = document.querySelector<HTMLTextAreaElement>(`[data-blog-field="${key}"]`);
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = form[key].slice(start, end) || 'text';
    const next = `${form[key].slice(0, start)}${before}${selected}${after}${form[key].slice(end)}`;
    update(key, next);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selected.length);
    });
  };

  return (
    <div className="space-y-6" dir="ltr">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Platform blog</h1>
          <p className="text-sm opacity-65">Global editorial posts, separate from each business’s section blogs.</p>
        </div>
        <a className="rounded border px-3 py-2 text-sm" href="/blog" target="_blank" rel="noreferrer">View public blog ↗</a>
      </header>

      {error ? <p role="alert" className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800">{error}</p> : null}
      {message ? <p role="status" className="rounded border border-green-300 bg-green-50 p-3 text-sm text-green-800">{message}</p> : null}

      <section className="rounded-xl border p-4">
        <h2 className="mb-3 font-bold">Sidebar widgets</h2>
        <div className="flex flex-wrap gap-4">
          {WIDGETS.map(([id, label]) => (
            <div key={id} className="flex items-center gap-2 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={widgets.includes(id)}
                  onChange={(e) => void saveWidgets(e.target.checked
                    ? [...widgets, id]
                    : widgets.filter((widget) => widget !== id))}
                />
                {label}
              </label>
              {widgets.includes(id) && id !== 'carousel' ? (
                <span className="flex gap-1">
                  <button type="button" aria-label={`Move ${label} up`} className="rounded border px-1" onClick={() => moveWidget(id, -1)}>↑</button>
                  <button type="button" aria-label={`Move ${label} down`} className="rounded border px-1" onClick={() => moveWidget(id, 1)}>↓</button>
                </span>
              ) : null}
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs opacity-60">Use the arrows to change sidebar widget order. The featured carousel appears above the posts.</p>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.8fr)]">
        <section className="space-y-3 rounded-xl border p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">Posts ({posts.length})</h2>
            <button type="button" className="rounded bg-black px-3 py-2 text-sm font-bold text-white" onClick={() => { setEditingId(null); setForm(EMPTY); setError(''); }}>
              New post
            </button>
          </div>
          {loading ? <p className="text-sm opacity-60">Loading…</p> : null}
          {!loading && posts.length === 0 ? <p className="text-sm opacity-60">No global posts yet.</p> : null}
          {posts.map((post) => (
            <article key={post.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
              <div className="min-w-0">
                <p className="truncate font-semibold">{post.title || post.title_ar}</p>
                <p className="text-xs opacity-60">{post.status} · {post.category || 'Uncategorized'} · /blog/{post.slug}</p>
              </div>
              <div className="flex gap-2">
                <button type="button" className="rounded border px-2 py-1 text-xs" onClick={() => startEdit(post)}>Edit</button>
                <button type="button" className="rounded border border-red-300 px-2 py-1 text-xs text-red-700" onClick={() => void remove(post.id)}>Delete</button>
              </div>
            </article>
          ))}
        </section>

        <section className="space-y-4 rounded-xl border p-4">
          <h2 className="font-bold">{editingId ? 'Edit post' : 'Create post'}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Title (English)" value={form.title} onChange={(v) => update('title', v)} />
            <Field label="Title (Arabic)" dir="rtl" value={form.title_ar ?? ''} onChange={(v) => update('title_ar', v)} />
            <Field label="URL slug" value={form.slug} onChange={(v) => update('slug', v)} />
            <Field label="Author name" value={form.author_name} onChange={(v) => update('author_name', v)} />
            <Field label="Category (English)" value={form.category ?? ''} onChange={(v) => update('category', v)} />
            <Field label="Category (Arabic)" dir="rtl" value={form.category_ar ?? ''} onChange={(v) => update('category_ar', v)} />
            <Field label="Tags (comma-separated)" value={form.tags} onChange={(v) => update('tags', v)} />
            <Field label="Featured image URL (HTTPS)" value={form.featured_image_url ?? ''} onChange={(v) => update('featured_image_url', v)} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Excerpt (English)" value={form.excerpt ?? ''} onChange={(v) => update('excerpt', v)} />
            <Field label="Excerpt (Arabic)" dir="rtl" value={form.excerpt_ar ?? ''} onChange={(v) => update('excerpt_ar', v)} />
          </div>
          <MarkdownField label="Content (English)" value={form.content} field="content" onChange={(v) => update('content', v)} onFormat={(before, after) => insertMarkdown('content', before, after)} />
          <MarkdownField label="Content (Arabic)" value={form.content_ar} field="content_ar" dir="rtl" onChange={(v) => update('content_ar', v)} onFormat={(before, after) => insertMarkdown('content_ar', before, after)} />
          <details className="rounded border p-3">
            <summary className="cursor-pointer text-sm font-semibold">SEO metadata</summary>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field label="SEO title (English)" value={form.seo_title ?? ''} onChange={(v) => update('seo_title', v)} />
              <Field label="SEO title (Arabic)" dir="rtl" value={form.seo_title_ar ?? ''} onChange={(v) => update('seo_title_ar', v)} />
              <Field label="SEO description (English)" value={form.seo_description ?? ''} onChange={(v) => update('seo_description', v)} />
              <Field label="SEO description (Arabic)" dir="rtl" value={form.seo_description_ar ?? ''} onChange={(v) => update('seo_description_ar', v)} />
              <Field label="Keywords" value={form.meta_keywords ?? ''} onChange={(v) => update('meta_keywords', v)} />
            </div>
          </details>
          <div className="flex flex-wrap items-end gap-3">
            <label className="grid gap-1 text-xs font-semibold">
              Status
              <select className="rounded border px-2 py-2" value={form.status} onChange={(e) => update('status', e.target.value)}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="scheduled">Scheduled</option>
              </select>
            </label>
            <label className="grid gap-1 text-xs font-semibold">
              Publish time
              <input type="datetime-local" className="rounded border px-2 py-2" value={form.published_at} onChange={(e) => update('published_at', e.target.value)} />
            </label>
            <button type="button" disabled={saving} className="ms-auto rounded bg-black px-4 py-2 text-sm font-bold text-white disabled:opacity-50" onClick={() => void save()}>
              {saving ? 'Saving…' : 'Save post'}
            </button>
          </div>
          <p className="text-xs opacity-60">Content uses safe Markdown. Raw HTML is not accepted. Scheduled posts become public at their publish time.</p>
        </section>
      </div>
    </div>
  );
}

function Field({
  label, value, onChange, dir,
}: { label: string; value: string; onChange: (value: string) => void; dir?: 'rtl' }) {
  return (
    <label className="grid min-w-0 gap-1 text-xs font-semibold">
      {label}
      <input dir={dir} className="min-w-0 rounded border px-3 py-2 text-sm font-normal" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function MarkdownField({
  label, value, field, onChange, onFormat, dir,
}: {
  label: string; value: string; field: 'content' | 'content_ar';
  onChange: (value: string) => void; onFormat: (before: string, after: string) => void; dir?: 'rtl';
}) {
  return (
    <label className="grid gap-1 text-xs font-semibold">
      {label}
      <div className="flex gap-1">
        {[
          ['**', '**', 'Bold'],
          ['*', '*', 'Italic'],
          ['## ', '', 'Heading'],
          ['> ', '', 'Quote'],
          ['- ', '', 'List item'],
        ].map(([before, after, title]) => (
          <button key={title} type="button" title={title} className="rounded border px-2 py-1 text-xs" onClick={() => onFormat(before, after)}>{title}</button>
        ))}
      </div>
      <textarea
        data-blog-field={field}
        dir={dir}
        rows={8}
        className="rounded border px-3 py-2 font-normal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
