'use client';

import { useMemo, useState, type FormEvent } from 'react';
import type { SitePage, SitePageComponent, SiteComponentType } from '@/lib/site-pages';
import { SITE_COMPONENT_TYPES, defaultSiteComponents } from '@/lib/site-pages';

const COMPONENT_LABELS: Record<SiteComponentType, { en: string; description: string }> = {
  hero_carousel: { en: 'Hero carousel', description: 'Required opening carousel using this page’s approved media.' },
  model_details: { en: 'Model details', description: 'Authored specifications and model information.' },
  model_lineup: { en: 'Models and variants', description: 'Related models or trims from the automotive registry.' },
  inventory: { en: 'Available vehicles', description: 'Published listings connected to this model or brand.' },
  offers: { en: 'Offers and pricing', description: 'Published seller offers and their source.' },
  gallery: { en: 'Gallery', description: 'Approved photographs attached to this make or model.' },
  blog: { en: 'Updates and blog', description: 'Published articles authored for this make or model.' },
  finance_calculator: { en: 'Finance calculator', description: 'A calculator based on an available published model price.' },
  faq: { en: 'FAQ / editorial text', description: 'A bilingual text block for updates or answers.' },
  contact: { en: 'Contact details', description: 'The current published contact information.' },
};

function initialHome(businessId: string, businessName: string): SitePage {
  return {
    id: `new-home-${businessId}`,
    businessId,
    pageType: 'home',
    draftSlug: '',
    draftTitle: businessName,
    draftTitleAr: '',
    draftComponents: defaultSiteComponents(),
    publishedSlug: null,
    publishedTitle: null,
    publishedTitleAr: null,
    publishedComponents: null,
    published: false,
  };
}

export default function SitePageBuilderClient({
  businessId,
  businessName,
  businessSlug,
  initialPages,
}: {
  businessId: string;
  businessName: string;
  businessSlug: string;
  initialPages: SitePage[];
}) {
  const [pages, setPages] = useState(initialPages);
  const homePage = useMemo(
    () => pages.find((page) => page.pageType === 'home') ?? initialHome(businessId, businessName),
    [pages, businessId, businessName],
  );
  const [selectedId, setSelectedId] = useState(homePage.id);
  const selected = pages.find((page) => page.id === selectedId) ?? homePage;
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  function updateSelected(update: (page: SitePage) => SitePage) {
    if (selected.pageType === 'home' && selected.id.startsWith('new-home-')) {
      setPages((current) => [...current.filter((page) => page.pageType !== 'home'), update(selected)]);
      setSelectedId(`new-home-${businessId}`);
      return;
    }
    setPages((current) => current.map((page) => page.id === selected.id ? update(page) : page));
  }

  function updateComponent(id: string, patch: Partial<SitePageComponent['props']>) {
    updateSelected((page) => ({
      ...page,
      draftComponents: page.draftComponents.map((component) =>
        component.id === id ? { ...component, props: { ...component.props, ...patch } } : component,
      ),
    }));
  }

  function reorder(fromId: string, toId: string) {
    const components = [...selected.draftComponents];
    const from = components.findIndex((component) => component.id === fromId);
    const to = components.findIndex((component) => component.id === toId);
    if (from <= 0 || to <= 0 || from === to) return;
    const [item] = components.splice(from, 1);
    components.splice(to, 0, item);
    updateSelected((page) => ({ ...page, draftComponents: components }));
  }

  function addComponent(type: SiteComponentType, position = selected.draftComponents.length) {
    if (type === 'hero_carousel' || selected.draftComponents.some((component) => component.type === type)) return;
    const component: SitePageComponent = {
      id: `${type}-${globalThis.crypto.randomUUID()}`,
      type,
      props: ['inventory', 'model_lineup', 'offers', 'blog', 'gallery'].includes(type) ? { limit: 6 } : {},
    };
    updateSelected((page) => {
      const components = [...page.draftComponents];
      components.splice(Math.max(1, Math.min(position, components.length)), 0, component);
      return { ...page, draftComponents: components };
    });
  }

  async function createPage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setNotice('');
    setSaving(true);
    try {
      const response = await fetch('/api/admin/site-builder/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId, title: newTitle, slug: newSlug }),
      });
      const data = await response.json() as { page?: SitePage; error?: string };
      if (!response.ok || !data.page) throw new Error(data.error || 'Could not create page.');
      setPages((current) => [...current.filter((page) => page.pageType !== 'home' || !page.id.startsWith('new-home-')), data.page!]);
      setSelectedId(data.page.id);
      setCreateOpen(false);
      setNewTitle('');
      setNewSlug('');
      setNotice('Page created as a draft. Add its content and save when ready.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not create page.');
    } finally {
      setSaving(false);
    }
  }

  async function persist(action: 'save' | 'publish' | 'unpublish') {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/admin/site-builder/pages', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          pageId: selected.id.startsWith('new-home-') ? undefined : selected.id,
          pageType: selected.pageType,
          action,
          slug: selected.draftSlug,
          title: selected.draftTitle,
          title_ar: selected.draftTitleAr,
          components: selected.draftComponents,
        }),
      });
      const data = await response.json() as { id?: string; error?: string };
      if (!response.ok || !data.id) throw new Error(data.error || 'Could not save page.');
      const refreshed = await fetch(`/api/admin/site-builder/pages?businessId=${encodeURIComponent(businessId)}`);
      const pageData = await refreshed.json() as { pages?: SitePage[]; error?: string };
      if (!refreshed.ok || !pageData.pages) throw new Error(pageData.error || 'Saved, but could not reload page data.');
      setPages(pageData.pages);
      setSelectedId(data.id);
      setNotice(action === 'publish' ? 'Page published.' : action === 'unpublish' ? 'Page unpublished. Its draft is preserved.' : 'Draft saved. The public page is unchanged.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not save page.');
    } finally {
      setSaving(false);
    }
  }

  async function deletePage() {
    if (selected.pageType !== 'custom' || selected.published) return;
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/admin/site-builder/pages', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId, pageId: selected.id }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || 'Could not delete page.');
      setPages((current) => current.filter((page) => page.id !== selected.id));
      setSelectedId(homePage.id);
      setNotice('Draft page deleted.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not delete page.');
    } finally {
      setSaving(false);
    }
  }

  const previewHref = selected.pageType === 'home'
    ? `/${businessSlug}`
    : selected.publishedSlug
      ? `/${businessSlug}/pages/${encodeURIComponent(selected.publishedSlug)}`
      : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <label className="min-w-64 flex-1 text-xs font-bold">
          Page
          <select className="mt-1 w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm" value={selected.id} onChange={(event) => setSelectedId(event.target.value)}>
            <option value={homePage.id}>Main page · {homePage.published ? 'Published' : 'Not published'}</option>
            {pages.filter((page) => page.pageType === 'custom').map((page) => (
              <option key={page.id} value={page.id}>{page.draftTitle} · {page.published ? 'Published' : 'Draft'}</option>
            ))}
          </select>
        </label>
        <button type="button" onClick={() => setCreateOpen((open) => !open)} className="rounded-lg border border-black/15 px-4 py-2 text-sm font-bold">+ New page</button>
        {previewHref ? <a href={previewHref} target="_blank" rel="noreferrer" className="rounded-lg border border-black/15 px-4 py-2 text-sm font-bold">Preview ↗</a> : null}
      </div>

      {createOpen ? (
        <form onSubmit={(event) => void createPage(event)} className="grid gap-3 rounded-xl border border-black/10 bg-white p-4 sm:grid-cols-3">
          <label className="text-xs font-bold">Page title<input required maxLength={120} value={newTitle} onChange={(event) => setNewTitle(event.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm font-normal" /></label>
          <label className="text-xs font-bold">URL slug<input required maxLength={80} value={newSlug} onChange={(event) => setNewSlug(event.target.value)} placeholder="model-updates" className="mt-1 w-full rounded-lg border px-3 py-2 text-sm font-normal" /></label>
          <button disabled={saving} className="self-end rounded-lg bg-neutral-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{saving ? 'Creating…' : 'Create draft page'}</button>
        </form>
      ) : null}

      {selected.pageType === 'custom' ? (
        <section className="grid gap-3 rounded-xl border border-black/10 bg-white p-4 sm:grid-cols-3">
          <label className="text-xs font-bold">Page title<input maxLength={120} value={selected.draftTitle} onChange={(event) => updateSelected((page) => ({ ...page, draftTitle: event.target.value }))} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm font-normal" /></label>
          <label className="text-xs font-bold">Arabic title<input maxLength={120} value={selected.draftTitleAr ?? ''} onChange={(event) => updateSelected((page) => ({ ...page, draftTitleAr: event.target.value }))} dir="rtl" className="mt-1 w-full rounded-lg border px-3 py-2 text-sm font-normal" /></label>
          <label className="text-xs font-bold">URL slug<input maxLength={80} value={selected.draftSlug} onChange={(event) => updateSelected((page) => ({ ...page, draftSlug: event.target.value }))} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm font-normal" /></label>
        </section>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <aside className="space-y-2 rounded-xl border border-black/10 bg-white p-4">
          <h2 className="text-sm font-bold">Components</h2>
          <p className="text-xs opacity-60">Add reusable blocks to this page. The hero carousel is required and fixed at the top.</p>
          {SITE_COMPONENT_TYPES.filter((type) => type !== 'hero_carousel').map((type) => {
            const exists = selected.draftComponents.some((component) => component.type === type);
            return (
              <button
                key={type}
                type="button"
                draggable={!exists}
                onDragStart={(event) => {
                  if (exists) return;
                  const source = `palette:${type}`;
                  setDraggedId(source);
                  event.dataTransfer.effectAllowed = 'copy';
                  event.dataTransfer.setData('text/plain', source);
                }}
                onDragEnd={() => setDraggedId(null)}
                disabled={exists}
                onClick={() => addComponent(type)}
                className="block w-full rounded-lg border border-black/10 px-3 py-2 text-start text-sm hover:bg-black/[.03] disabled:opacity-40"
              >
                <span className="font-bold">{COMPONENT_LABELS[type].en}</span>
                <span className="mt-0.5 block text-xs opacity-60">{COMPONENT_LABELS[type].description}</span>
              </button>
            );
          })}
        </aside>

        <section
          className="space-y-3 rounded-xl border border-black/10 bg-white p-4"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            const source = draggedId || event.dataTransfer.getData('text/plain');
            if (source.startsWith('palette:')) addComponent(source.slice('palette:'.length) as SiteComponentType);
            setDraggedId(null);
          }}
        >
          <div>
            <h2 className="text-sm font-bold">Page layout</h2>
            <p className="text-xs opacity-60">Drag blocks to reorder, or use the arrow buttons. Changes stay private until published.</p>
          </div>
          {selected.draftComponents.map((component, index) => (
            <article
              key={component.id}
              draggable={index > 0}
              onDragStart={(event) => {
                if (index === 0) { event.preventDefault(); return; }
                setDraggedId(component.id);
                event.dataTransfer.effectAllowed = 'move';
                event.dataTransfer.setData('text/plain', component.id);
              }}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                const source = draggedId || event.dataTransfer.getData('text/plain');
                event.stopPropagation();
                if (source.startsWith('palette:')) {
                  addComponent(source.slice('palette:'.length) as SiteComponentType, index);
                } else if (source) {
                  reorder(source, component.id);
                }
                setDraggedId(null);
              }}
              onDragEnd={() => setDraggedId(null)}
              className={`rounded-lg border p-3 ${draggedId === component.id ? 'opacity-50' : ''}`}
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-bold">{index + 1}. {COMPONENT_LABELS[component.type].en}{index === 0 ? ' · Required' : ''}</h3>
                <div className="flex gap-1">
                  <button type="button" disabled={index <= 1} aria-label="Move component up" onClick={() => reorder(component.id, selected.draftComponents[index - 1]?.id)} className="rounded border px-2 py-1 text-xs disabled:opacity-30">↑</button>
                  <button type="button" disabled={index === 0 || index === selected.draftComponents.length - 1} aria-label="Move component down" onClick={() => reorder(component.id, selected.draftComponents[index + 1]?.id)} className="rounded border px-2 py-1 text-xs disabled:opacity-30">↓</button>
                  {index > 0 ? <button type="button" aria-label="Remove component" onClick={() => updateSelected((page) => ({ ...page, draftComponents: page.draftComponents.filter((item) => item.id !== component.id) }))} className="rounded border border-red-200 px-2 py-1 text-xs text-red-700">Remove</button> : null}
                </div>
              </div>
              <p className="mt-1 text-xs opacity-60">{COMPONENT_LABELS[component.type].description}</p>
              {component.type !== 'hero_carousel' && component.type !== 'inventory' && component.type !== 'model_lineup' && component.type !== 'offers' && component.type !== 'gallery' && component.type !== 'finance_calculator' && component.type !== 'contact' ? (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <label className="text-xs font-bold">Title<input value={component.props.title ?? ''} onChange={(event) => updateComponent(component.id, { title: event.target.value })} className="mt-1 w-full rounded border px-2 py-1.5 font-normal" /></label>
                  <label className="text-xs font-bold">Arabic title<input dir="rtl" value={component.props.title_ar ?? ''} onChange={(event) => updateComponent(component.id, { title_ar: event.target.value })} className="mt-1 w-full rounded border px-2 py-1.5 font-normal" /></label>
                  <label className="text-xs font-bold sm:col-span-2">Text<textarea value={component.props.text ?? ''} onChange={(event) => updateComponent(component.id, { text: event.target.value })} rows={3} className="mt-1 w-full rounded border px-2 py-1.5 font-normal" /></label>
                  <label className="text-xs font-bold sm:col-span-2">Arabic text<textarea dir="rtl" value={component.props.text_ar ?? ''} onChange={(event) => updateComponent(component.id, { text_ar: event.target.value })} rows={3} className="mt-1 w-full rounded border px-2 py-1.5 font-normal" /></label>
                </div>
              ) : null}
              {['inventory', 'model_lineup', 'offers', 'gallery', 'blog'].includes(component.type) ? (
                <label className="mt-3 block max-w-48 text-xs font-bold">Item limit<input type="number" min={1} max={50} value={component.props.limit ?? 6} onChange={(event) => updateComponent(component.id, { limit: Number(event.target.value) })} className="mt-1 w-full rounded border px-2 py-1.5 font-normal" /></label>
              ) : null}
            </article>
          ))}
        </section>
      </div>

      {error ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      {notice ? <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{notice}</p> : null}
      <div className="flex flex-wrap gap-3">
        <button type="button" disabled={saving} onClick={() => void persist('save')} className="rounded-lg border border-black/15 px-5 py-2.5 text-sm font-bold disabled:opacity-50">{saving ? 'Saving…' : 'Save draft'}</button>
        <button type="button" disabled={saving} onClick={() => void persist('publish')} className="rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{saving ? 'Publishing…' : selected.published ? 'Publish updates' : 'Publish page'}</button>
        {selected.pageType === 'custom' && selected.published ? <button type="button" disabled={saving} onClick={() => void persist('unpublish')} className="rounded-lg border border-amber-300 px-5 py-2.5 text-sm font-bold text-amber-800 disabled:opacity-50">Unpublish page</button> : null}
        {selected.pageType === 'custom' && !selected.published ? <button type="button" disabled={saving} onClick={() => void deletePage()} className="rounded-lg border border-red-200 px-5 py-2.5 text-sm font-bold text-red-700 disabled:opacity-50">Delete draft</button> : null}
      </div>
    </div>
  );
}
