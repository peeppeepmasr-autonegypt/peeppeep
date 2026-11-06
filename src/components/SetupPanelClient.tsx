'use client';

import { useState, useEffect, useCallback } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Market {
  id: string; slug: string; name_en: string; name_ar: string | null;
  default_locale: string; currency: string; active: number;
}

interface BusinessType {
  id: string; name: string; name_ar: string | null; icon: string | null;
  is_parent: number; parent_id: string | null; market_id: string;
  vendor_claimable: number; sort_order: number;
  sections: string | null; own_sections: string | null;
}

interface Section {
  id: string; name: string; name_ar: string | null; icon: string | null;
  sort_order: number; enable_gallery: number; enable_blog: number; options: string | null;
}

interface FieldGroup {
  id: string; business_type_id: string; section_id: string;
  name: string; label: string | null; label_ar: string | null;
  sort_order: number; active: number;
}

interface FormField {
  id: number; business_type_id: string; section_id: string;
  name: string; label: string | null; label_ar: string | null;
  field_type: string; group_key: string | null; sort_order: number;
  options: string | null; show_as_slide: number; destination: string | null;
}

interface Props {
  initialMarkets: Market[];
  initialTypes: BusinessType[];
  initialSections: Section[];
}

// ── Tiny helpers ──────────────────────────────────────────────────────────────

function Pill({ children, color = 'gray' }: { children: React.ReactNode; color?: string }) {
  const map: Record<string, string> = {
    gray:   'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
    green:  'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    blue:   'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    yellow: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
    red:    'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300',
  };
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${map[color] ?? map.gray}`}>
      {children}
    </span>
  );
}

function SectionCard({ title, icon, children, defaultOpen = false }: {
  title: string; icon: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  return (
    <details open={defaultOpen} className="group border border-black/10 dark:border-white/10 rounded-2xl overflow-hidden bg-white dark:bg-neutral-900 shadow-sm">
      <summary className="flex items-center gap-3 px-5 py-4 cursor-pointer list-none select-none hover:bg-black/[.02] dark:hover:bg-white/[.02]">
        <span className="text-lg">{icon}</span>
        <span className="font-bold text-sm flex-1">{title}</span>
        <span className="text-xs opacity-30 group-open:rotate-180 transition-transform">▼</span>
      </summary>
      <div className="border-t border-black/10 dark:border-white/10 p-5">
        {children}
      </div>
    </details>
  );
}

function Input({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold opacity-60">{label}</label>
      <input {...props} className="w-full text-sm border border-black/15 dark:border-white/15 rounded-lg px-3 py-2 bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-black/20" />
    </div>
  );
}

function ErrBox({ msg }: { msg: string }) {
  return <div className="text-xs font-semibold text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 px-3 py-2 rounded-lg border border-red-200 dark:border-red-800">{msg}</div>;
}

// ── 1. Markets Manager ────────────────────────────────────────────────────────

// Markets UI is currently hidden (automotive is the only active market).
// Manager preserved dormant — re-enable by uncommenting the section in the main export.
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- dormant, kept for future re-enable
function MarketsManager({ initial }: { initial: Market[] }) {
  const [markets, setMarkets] = useState(initial);
  const [form, setForm] = useState({ id: '', slug: '', name_en: '', name_ar: '', currency: 'EGP', default_locale: 'ar' });
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault(); setErr(null); setSaving(true);
    const res = await fetch('/api/admin/setup/markets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    if (!res.ok) { setErr(((await res.json()) as { error: string }).error); setSaving(false); return; }
    const all = await fetch('/api/admin/setup/markets');
    const data = await all.json() as { markets: Market[] };
    setMarkets(data.markets);
    setForm({ id: '', slug: '', name_en: '', name_ar: '', currency: 'EGP', default_locale: 'ar' });
    setSaving(false);
  }

  async function toggle(id: string, active: number) {
    await fetch('/api/admin/setup/markets', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, active: active ? 0 : 1 }) });
    setMarkets(ms => ms.map(m => m.id === id ? { ...m, active: active ? 0 : 1 } : m));
  }

  return (
    <div className="space-y-4">
      <form onSubmit={add} className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Input label="Market ID *" placeholder="automotive" value={form.id} onChange={e => setForm(f => ({ ...f, id: e.target.value, slug: e.target.value }))} required />
        <Input label="Name (EN) *" placeholder="Automotive" value={form.name_en} onChange={e => setForm(f => ({ ...f, name_en: e.target.value }))} required />
        <Input label="Name (AR)" placeholder="السيارات" value={form.name_ar} onChange={e => setForm(f => ({ ...f, name_ar: e.target.value }))} />
        <Input label="Currency" placeholder="EGP" value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))} />
        <Input label="Default Locale" placeholder="ar" value={form.default_locale} onChange={e => setForm(f => ({ ...f, default_locale: e.target.value }))} />
        <div className="flex items-end">
          <button disabled={saving} className="w-full px-4 py-2 rounded-lg bg-black text-white text-sm font-bold hover:opacity-80 disabled:opacity-40">{saving ? 'Saving…' : '+ Add Market'}</button>
        </div>
        {err && <div className="col-span-full"><ErrBox msg={err} /></div>}
      </form>

      <div className="divide-y divide-black/5 dark:divide-white/5 border border-black/10 rounded-xl overflow-hidden">
        {markets.length === 0 && <div className="text-center py-8 text-sm opacity-40">No markets yet.</div>}
        {markets.map(m => (
          <div key={m.id} className="flex items-center gap-3 px-4 py-3 hover:bg-black/[.01]">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">{m.name_en}</span>
                {m.name_ar && <span className="text-xs opacity-50">{m.name_ar}</span>}
                <Pill color={m.active ? 'green' : 'gray'}>{m.active ? 'Active' : 'Inactive'}</Pill>
              </div>
              <div className="text-xs opacity-40 font-mono mt-0.5">{m.id} · {m.currency} · locale:{m.default_locale}</div>
            </div>
            <button onClick={() => toggle(m.id, m.active)} className="text-xs px-2.5 py-1 rounded-lg border border-black/15 font-semibold hover:bg-black/5">
              {m.active ? 'Deactivate' : 'Activate'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 2. Business Types Manager ─────────────────────────────────────────────────

function BusinessTypesManager({ initial }: { initial: BusinessType[] }) {
  const [types, setTypes] = useState(initial);
  const [form, setForm] = useState({ id: '', name: '', name_ar: '', icon: '', parent_id: '', market_id: 'automotive', is_parent: '0', vendor_claimable: '0', sort_order: '99', sections: '[]', own_sections: '[]' });
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editSections, setEditSections] = useState('');
  const [editOwnSections, setEditOwnSections] = useState('');

  const parents = types.filter(t => t.is_parent);
  const children = types.filter(t => !t.is_parent);

  async function add(e: React.FormEvent) {
    e.preventDefault(); setErr(null); setSaving(true);
    const body = { ...form, is_parent: Number(form.is_parent), vendor_claimable: Number(form.vendor_claimable), sort_order: Number(form.sort_order), parent_id: form.parent_id || null };
    const res = await fetch('/api/admin/setup/business-types', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!res.ok) { setErr(((await res.json()) as { error: string }).error); setSaving(false); return; }
    const all = await fetch('/api/admin/setup/business-types');
    const data = await all.json() as { types: BusinessType[] };
    setTypes(data.types);
    setForm({ id: '', name: '', name_ar: '', icon: '', parent_id: '', market_id: 'automotive', is_parent: '0', vendor_claimable: '0', sort_order: '99', sections: '[]', own_sections: '[]' });
    setSaving(false);
  }

  async function saveEdit(id: string) {
    await fetch('/api/admin/setup/business-types', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, sections: editSections, own_sections: editOwnSections }) });
    setTypes(ts => ts.map(t => t.id === id ? { ...t, sections: editSections, own_sections: editOwnSections } : t));
    setEditId(null);
  }

  function startEdit(t: BusinessType) {
    setEditId(t.id);
    setEditSections(t.sections ?? '[]');
    setEditOwnSections(t.own_sections ?? '[]');
  }

  return (
    <div className="space-y-5">
      {/* Add form */}
      <form onSubmit={add} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Input label="Type ID *" placeholder="my_type" value={form.id} onChange={e => setForm(f => ({ ...f, id: e.target.value }))} required />
        <Input label="Name (EN) *" placeholder="My Type" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
        <Input label="Name (AR)" placeholder="نوعي" value={form.name_ar} onChange={e => setForm(f => ({ ...f, name_ar: e.target.value }))} />
        <Input label="Icon (FA class)" placeholder="fa-car" value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} />
        <div className="space-y-1">
          <label className="text-xs font-semibold opacity-60">Parent Kind</label>
          <select value={form.parent_id} onChange={e => setForm(f => ({ ...f, parent_id: e.target.value }))} className="w-full text-sm border border-black/15 rounded-lg px-3 py-2 bg-white dark:bg-neutral-800 focus:outline-none">
            <option value="">— none (is root) —</option>
            {parents.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <Input label="Market ID" placeholder="automotive" value={form.market_id} onChange={e => setForm(f => ({ ...f, market_id: e.target.value }))} />
        <div className="space-y-1">
          <label className="text-xs font-semibold opacity-60">Is Parent?</label>
          <select value={form.is_parent} onChange={e => setForm(f => ({ ...f, is_parent: e.target.value }))} className="w-full text-sm border border-black/15 rounded-lg px-3 py-2 bg-white dark:bg-neutral-800">
            <option value="0">No (leaf kind)</option><option value="1">Yes (group)</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold opacity-60">Vendor Claimable?</label>
          <select value={form.vendor_claimable} onChange={e => setForm(f => ({ ...f, vendor_claimable: e.target.value }))} className="w-full text-sm border border-black/15 rounded-lg px-3 py-2 bg-white dark:bg-neutral-800">
            <option value="0">No</option><option value="1">Yes</option>
          </select>
        </div>
        <div className="col-span-full">
          <button disabled={saving} className="px-5 py-2 rounded-lg bg-black text-white text-sm font-bold hover:opacity-80 disabled:opacity-40">{saving ? 'Saving…' : '+ Add Type'}</button>
        </div>
        {err && <div className="col-span-full"><ErrBox msg={err} /></div>}
      </form>

      {/* Parent groups */}
      <div className="space-y-3">
        {parents.map(p => (
          <div key={p.id} className="border border-black/10 rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2 bg-black/[.03] dark:bg-white/[.03]">
              <span className="font-bold text-sm">{p.name}</span>
              <span className="text-xs opacity-40">{p.name_ar}</span>
              <Pill color="blue">parent</Pill>
              <Pill>{p.id}</Pill>
            </div>
            <div className="divide-y divide-black/5 dark:divide-white/5">
              {children.filter(c => c.parent_id === p.id).map(c => (
                <div key={c.id} className="px-4 py-2.5">
                  {editId === c.id ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-xs font-semibold opacity-60">sections (JSON array)</label>
                          <textarea value={editSections} onChange={e => setEditSections(e.target.value)} rows={2} className="w-full text-xs font-mono border border-black/15 rounded px-2 py-1 bg-white dark:bg-neutral-800" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-semibold opacity-60">own_sections (JSON array)</label>
                          <textarea value={editOwnSections} onChange={e => setEditOwnSections(e.target.value)} rows={2} className="w-full text-xs font-mono border border-black/15 rounded px-2 py-1 bg-white dark:bg-neutral-800" />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => saveEdit(c.id)} className="text-xs px-3 py-1 rounded bg-black text-white font-bold hover:opacity-80">Save</button>
                        <button onClick={() => setEditId(null)} className="text-xs px-3 py-1 rounded border border-black/15 font-semibold hover:bg-black/5">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium flex-1">{c.name}</span>
                      <span className="text-xs opacity-40">{c.name_ar}</span>
                      {c.vendor_claimable ? <Pill color="green">claimable</Pill> : null}
                      <Pill>{c.id}</Pill>
                      <button onClick={() => startEdit(c)} className="text-xs px-2 py-0.5 rounded border border-black/15 font-semibold hover:bg-black/5">Edit sections</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 3. Sections Manager ───────────────────────────────────────────────────────

function SectionsManager({ initial }: { initial: Section[] }) {
  const [sections, setSections] = useState(initial);
  const [form, setForm] = useState({ id: '', name: '', name_ar: '', icon: '', sort_order: '99', enable_gallery: '0', enable_blog: '0', options: '{"markets":["automotive"]}' });
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editOptions, setEditOptions] = useState('');

  async function add(e: React.FormEvent) {
    e.preventDefault(); setErr(null); setSaving(true);
    const body = { ...form, sort_order: Number(form.sort_order), enable_gallery: Number(form.enable_gallery), enable_blog: Number(form.enable_blog) };
    const res = await fetch('/api/admin/setup/sections', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!res.ok) { setErr(((await res.json()) as { error: string }).error); setSaving(false); return; }
    const all = await fetch('/api/admin/setup/sections');
    const data = await all.json() as { sections: Section[] };
    setSections(data.sections);
    setForm({ id: '', name: '', name_ar: '', icon: '', sort_order: '99', enable_gallery: '0', enable_blog: '0', options: '{"markets":["automotive"]}' });
    setSaving(false);
  }

  async function saveOptions(id: string) {
    await fetch('/api/admin/setup/sections', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, options: editOptions }) });
    setSections(ss => ss.map(s => s.id === id ? { ...s, options: editOptions } : s));
    setEditId(null);
  }

  return (
    <div className="space-y-4">
      <form onSubmit={add} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Input label="Section ID *" placeholder="sec_my_section" value={form.id} onChange={e => setForm(f => ({ ...f, id: e.target.value }))} required />
        <Input label="Name (EN) *" placeholder="My Section" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
        <Input label="Name (AR)" placeholder="قسمي" value={form.name_ar} onChange={e => setForm(f => ({ ...f, name_ar: e.target.value }))} />
        <Input label="Icon (FA)" placeholder="fa-star" value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} />
        <Input label="Sort Order" type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: e.target.value }))} />
        <div className="space-y-1">
          <label className="text-xs font-semibold opacity-60">Gallery?</label>
          <select value={form.enable_gallery} onChange={e => setForm(f => ({ ...f, enable_gallery: e.target.value }))} className="w-full text-sm border border-black/15 rounded-lg px-3 py-2 bg-white dark:bg-neutral-800">
            <option value="0">No</option><option value="1">Yes</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold opacity-60">Blog?</label>
          <select value={form.enable_blog} onChange={e => setForm(f => ({ ...f, enable_blog: e.target.value }))} className="w-full text-sm border border-black/15 rounded-lg px-3 py-2 bg-white dark:bg-neutral-800">
            <option value="0">No</option><option value="1">Yes</option>
          </select>
        </div>
        <div className="space-y-1 col-span-full">
          <label className="text-xs font-semibold opacity-60">Options JSON</label>
          <input value={form.options} onChange={e => setForm(f => ({ ...f, options: e.target.value }))} className="w-full text-xs font-mono border border-black/15 rounded-lg px-3 py-2 bg-white dark:bg-neutral-800" />
        </div>
        <div className="col-span-full">
          <button disabled={saving} className="px-5 py-2 rounded-lg bg-black text-white text-sm font-bold hover:opacity-80 disabled:opacity-40">{saving ? 'Saving…' : '+ Add Section'}</button>
        </div>
        {err && <div className="col-span-full"><ErrBox msg={err} /></div>}
      </form>

      <div className="divide-y divide-black/5 border border-black/10 rounded-xl overflow-hidden">
        {sections.map(s => (
          <div key={s.id} className="px-4 py-2.5">
            {editId === s.id ? (
              <div className="space-y-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold opacity-60">Options JSON</label>
                  <textarea value={editOptions} onChange={e => setEditOptions(e.target.value)} rows={3} className="w-full text-xs font-mono border border-black/15 rounded px-2 py-1 bg-white dark:bg-neutral-800" />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => saveOptions(s.id)} className="text-xs px-3 py-1 rounded bg-black text-white font-bold">Save</button>
                  <button onClick={() => setEditId(null)} className="text-xs px-3 py-1 rounded border border-black/15 font-semibold hover:bg-black/5">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm">{s.name}</span>
                <span className="text-xs opacity-40">{s.name_ar}</span>
                <Pill>{`#${s.sort_order}`}</Pill>
                {s.enable_gallery ? <Pill color="blue">gallery</Pill> : null}
                {s.enable_blog ? <Pill color="green">blog</Pill> : null}
                <span className="text-xs opacity-30 font-mono flex-1 truncate">{s.id}</span>
                <button onClick={() => { setEditId(s.id); setEditOptions(s.options ?? '{}'); }} className="text-xs px-2 py-0.5 rounded border border-black/15 font-semibold hover:bg-black/5 shrink-0">Edit options</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 4. Field Groups & Form Fields ─────────────────────────────────────────────

function FieldsManager({ types, sections }: { types: BusinessType[]; sections: Section[] }) {
  const [selType, setSelType] = useState('vehicle_model');
  const [selSection, setSelSection] = useState('sec_auto_specs');
  const [groups, setGroups] = useState<FieldGroup[]>([]);
  const [fields, setFields] = useState<FormField[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const [gForm, setGForm] = useState({ name: '', label: '', label_ar: '', sort_order: '99' });
  const [fForm, setFForm] = useState({ name: '', label: '', label_ar: '', field_type: 'text', group_key: '', sort_order: '99', options: '', show_as_slide: '0', destination: '' });

  const load = useCallback(async () => {
    if (!selType || !selSection) return;
    const res = await fetch(`/api/admin/setup/fields?business_type_id=${selType}&section_id=${selSection}`);
    const data = await res.json() as { groups: FieldGroup[]; fields: FormField[] };
    setGroups(data.groups ?? []);
    setFields(data.fields ?? []);
  }, [selType, selSection]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- async data hydration on mount; every setState fires after `await fetch`, so no synchronous cascade is possible.
  useEffect(() => { void load(); }, [load]);

  async function addGroup(e: React.FormEvent) {
    e.preventDefault(); setErr(null);
    const res = await fetch('/api/admin/setup/fields', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'group', business_type_id: selType, section_id: selSection, ...gForm, sort_order: Number(gForm.sort_order) }) });
    if (!res.ok) { setErr(((await res.json()) as { error: string }).error); return; }
    setGForm({ name: '', label: '', label_ar: '', sort_order: '99' });
    await load();
  }

  async function addField(e: React.FormEvent) {
    e.preventDefault(); setErr(null);
    const body = { kind: 'field', business_type_id: selType, section_id: selSection, ...fForm, sort_order: Number(fForm.sort_order), show_as_slide: Number(fForm.show_as_slide), options: fForm.options || null, group_key: fForm.group_key || null, destination: fForm.destination || null };
    const res = await fetch('/api/admin/setup/fields', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!res.ok) { setErr(((await res.json()) as { error: string }).error); return; }
    setFForm({ name: '', label: '', label_ar: '', field_type: 'text', group_key: '', sort_order: '99', options: '', show_as_slide: '0', destination: '' });
    await load();
  }

  async function deleteItem(kind: 'group' | 'field', id: string | number) {
    await fetch(`/api/admin/setup/fields?kind=${kind}&id=${id}`, { method: 'DELETE' });
    await load();
  }

  const leafTypes = types.filter(t => !t.is_parent);

  return (
    <div className="space-y-5">
      {/* Pivot selector */}
      <div className="flex flex-wrap gap-3">
        <div className="space-y-1 flex-1 min-w-40">
          <label className="text-xs font-semibold opacity-60">Business Type</label>
          <select value={selType} onChange={e => setSelType(e.target.value)} className="w-full text-sm border border-black/15 rounded-lg px-3 py-2 bg-white dark:bg-neutral-800 focus:outline-none">
            {leafTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div className="space-y-1 flex-1 min-w-40">
          <label className="text-xs font-semibold opacity-60">Section</label>
          <select value={selSection} onChange={e => setSelSection(e.target.value)} className="w-full text-sm border border-black/15 rounded-lg px-3 py-2 bg-white dark:bg-neutral-800 focus:outline-none">
            {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>

      {err && <ErrBox msg={err} />}

      {/* Field Groups */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold opacity-60 uppercase tracking-wider">Field Groups ({groups.length})</h4>
        <form onSubmit={addGroup} className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Input label="Group name *" placeholder="engine" value={gForm.name} onChange={e => setGForm(f => ({ ...f, name: e.target.value }))} required />
          <Input label="Label (EN)" placeholder="Engine" value={gForm.label} onChange={e => setGForm(f => ({ ...f, label: e.target.value }))} />
          <Input label="Label (AR)" placeholder="المحرك" value={gForm.label_ar} onChange={e => setGForm(f => ({ ...f, label_ar: e.target.value }))} />
          <div className="flex items-end gap-2">
            <div className="flex-1"><Input label="Order" type="number" value={gForm.sort_order} onChange={e => setGForm(f => ({ ...f, sort_order: e.target.value }))} /></div>
            <button type="submit" className="px-3 py-2 rounded-lg bg-black text-white text-xs font-bold hover:opacity-80 shrink-0">+ Group</button>
          </div>
        </form>
        <div className="flex flex-wrap gap-2">
          {groups.map(g => (
            <div key={g.id} className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg px-3 py-1.5">
              <span className="text-xs font-semibold">{g.label ?? g.name}</span>
              <span className="text-[10px] opacity-40">{g.name}</span>
              <button onClick={() => deleteItem('group', g.id)} className="text-[10px] text-red-500 hover:text-red-700 ml-1">✕</button>
            </div>
          ))}
        </div>
      </div>

      {/* Form Fields */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold opacity-60 uppercase tracking-wider">Form Fields ({fields.length})</h4>
        <form onSubmit={addField} className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Input label="Field name *" placeholder="engine_type" value={fForm.name} onChange={e => setFForm(f => ({ ...f, name: e.target.value }))} required />
          <Input label="Label (EN)" placeholder="Engine Type" value={fForm.label} onChange={e => setFForm(f => ({ ...f, label: e.target.value }))} />
          <Input label="Label (AR)" placeholder="نوع المحرك" value={fForm.label_ar} onChange={e => setFForm(f => ({ ...f, label_ar: e.target.value }))} />
          <div className="space-y-1">
            <label className="text-xs font-semibold opacity-60">Field Type</label>
            <select value={fForm.field_type} onChange={e => setFForm(f => ({ ...f, field_type: e.target.value }))} className="w-full text-sm border border-black/15 rounded-lg px-3 py-2 bg-white dark:bg-neutral-800">
              {['text','number','select','boolean','textarea','date'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold opacity-60">Group Key</label>
            <select value={fForm.group_key} onChange={e => setFForm(f => ({ ...f, group_key: e.target.value }))} className="w-full text-sm border border-black/15 rounded-lg px-3 py-2 bg-white dark:bg-neutral-800">
              <option value="">— none —</option>
              {groups.map(g => <option key={g.id} value={g.name}>{g.name}</option>)}
            </select>
          </div>
          <Input label="Sort Order" type="number" value={fForm.sort_order} onChange={e => setFForm(f => ({ ...f, sort_order: e.target.value }))} />
          <div className="space-y-1">
            <label className="text-xs font-semibold opacity-60">Show as Slide?</label>
            <select value={fForm.show_as_slide} onChange={e => setFForm(f => ({ ...f, show_as_slide: e.target.value }))} className="w-full text-sm border border-black/15 rounded-lg px-3 py-2 bg-white dark:bg-neutral-800">
              <option value="0">No</option><option value="1">Yes</option>
            </select>
          </div>
          <Input label="Options JSON (for select)" placeholder='{"enum":["A","B"]}' value={fForm.options} onChange={e => setFForm(f => ({ ...f, options: e.target.value }))} />
          <div className="col-span-full">
            <button type="submit" className="px-5 py-2 rounded-lg bg-black text-white text-sm font-bold hover:opacity-80">+ Add Field</button>
          </div>
        </form>

        <div className="border border-black/10 rounded-xl overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-black/10 text-left">
                {['Name','Label','Type','Group','Slide?','Options',''].map(h => (
                  <th key={h} className="px-3 py-2 font-bold opacity-50 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {fields.length === 0 && (
                <tr><td colSpan={7} className="text-center py-6 opacity-30">No fields for this type+section.</td></tr>
              )}
              {fields.map(f => (
                <tr key={f.id} className="hover:bg-black/[.01]">
                  <td className="px-3 py-2 font-mono">{f.name}</td>
                  <td className="px-3 py-2">{f.label}<div className="opacity-40">{f.label_ar}</div></td>
                  <td className="px-3 py-2"><Pill>{f.field_type}</Pill></td>
                  <td className="px-3 py-2 opacity-50">{f.group_key ?? '—'}</td>
                  <td className="px-3 py-2 text-center">{f.show_as_slide ? '✓' : '—'}</td>
                  <td className="px-3 py-2 font-mono opacity-40 max-w-32 truncate">{f.options ?? '—'}</td>
                  <td className="px-3 py-2">
                    <button onClick={() => deleteItem('field', f.id)} className="text-red-500 hover:text-red-700 font-bold">✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── 5. Settled Checklist ──────────────────────────────────────────────────────
// The Seed buttons used to write a second copy of what migrations had already
// authored. Since 0010 the checklist is a read of the same facts migrations
// prove: for every kind, is the vocabulary in place, does a route know how to
// render it, are there shelves with no fields. The status column is the whole
// point of the panel: settled means the kind is done; pending lists exactly
// what a person has to add, and the admin goes to do it via the guarded forms
// on the other tabs (Fields, Sections, Business Types).

interface ShelfCounts {
  section_id: string; name: string;
  content_kind: 'authored' | 'relational' | 'mixed';
  fields: number;
}

interface KindReport {
  kind: string; name: string; name_ar: string | null;
  is_parent: number; vendor_claimable: number;
  page: { shape: string; route: string; readFn: string; reason?: string };
  shelves: ShelfCounts[];
  invariants: { exists: boolean; hasShelves: boolean; hasVocabulary: boolean; hasPageContract: boolean };
  missing: string[];
  status: 'settled' | 'pending' | 'retired' | 'template';
}

function statusColor(s: KindReport['status']): string {
  if (s === 'settled') return 'green';
  if (s === 'pending') return 'yellow';
  if (s === 'retired') return 'gray';
  return 'blue'; // template
}

function SettledChecklist() {
  const [reports, setReports] = useState<KindReport[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState<Set<string>>(new Set());

  async function load() {
    try {
      const res = await fetch('/api/admin/setup/contract');
      if (!res.ok) { setErr(((await res.json()) as { error: string }).error); return; }
      const data = await res.json() as { reports: KindReport[] };
      setReports(data.reports ?? []);
      setErr(null);
    } catch (e) { setErr(String(e)); }
  }
  // eslint-disable-next-line react-hooks/set-state-in-effect -- async data hydration on mount; every setState fires after `await fetch`, so no synchronous cascade is possible.
  useEffect(() => { void load(); }, []);

  const counts = reports ? {
    settled: reports.filter(r => r.status === 'settled').length,
    pending: reports.filter(r => r.status === 'pending').length,
    template: reports.filter(r => r.status === 'template').length,
    retired: reports.filter(r => r.status === 'retired').length,
  } : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs opacity-60 flex-1">
          Authoring happens in migrations. This checklist proves each kind is complete: shelves resolve, every authored/mixed shelf has fields, and a page contract exists.
        </p>
        <button onClick={load} className="text-xs px-3 py-1.5 rounded-lg border border-black/20 font-semibold hover:bg-black/5 shrink-0">Re-check</button>
      </div>
      {err && <ErrBox msg={err} />}
      {reports && counts && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatBox label="Settled"   value={counts.settled}  tone="green" />
          <StatBox label="Pending"   value={counts.pending}  tone="yellow" />
          <StatBox label="Templates" value={counts.template} tone="blue" />
          <StatBox label="Retired"   value={counts.retired}  tone="gray" />
        </div>
      )}
      {!reports && !err && <div className="text-sm opacity-40 text-center py-6">Loading…</div>}
      {reports && (
        <div className="divide-y divide-black/5 dark:divide-white/5 border border-black/10 dark:border-white/10 rounded-xl overflow-hidden">
          {reports.map(r => {
            const isOpen = open.has(r.kind);
            const toggle = () => setOpen(prev => { const n = new Set(prev); if (n.has(r.kind)) n.delete(r.kind); else n.add(r.kind); return n; });
            return (
              <div key={r.kind} className="text-sm">
                <button onClick={toggle} className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-black/[.01] text-left">
                  <Pill color={statusColor(r.status)}>{r.status}</Pill>
                  <span className="font-semibold">{r.name}</span>
                  {r.name_ar && <span className="text-xs opacity-40">{r.name_ar}</span>}
                  <span className="text-xs opacity-30 font-mono ml-auto">{r.kind}</span>
                  <span className="text-xs opacity-40">{isOpen ? '▲' : '▼'}</span>
                </button>
                {isOpen && (
                  <div className="px-4 py-3 bg-black/[.015] dark:bg-white/[.02] space-y-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold opacity-60">Page:</span>
                      <Pill color={r.page.shape === 'none' ? 'gray' : 'blue'}>{r.page.shape}</Pill>
                      <span className="font-mono opacity-50">{r.page.route || '—'}</span>
                      <span className="opacity-40">{r.page.readFn ? `→ ${r.page.readFn}` : ''}</span>
                    </div>
                    {r.page.reason && <div className="opacity-60 italic">{r.page.reason}</div>}
                    {r.missing.length > 0 && (
                      <div className="mt-2">
                        <div className="font-semibold opacity-60 mb-1">Missing:</div>
                        <ul className="list-disc list-inside space-y-0.5 text-red-600 dark:text-red-400">
                          {r.missing.map(m => <li key={m}>{m}</li>)}
                        </ul>
                      </div>
                    )}
                    {r.shelves.length > 0 && (
                      <div className="mt-2">
                        <div className="font-semibold opacity-60 mb-1">Shelves:</div>
                        <div className="flex flex-wrap gap-1">
                          {r.shelves.map(s => (
                            <span key={s.section_id} className={`text-[10px] px-2 py-0.5 rounded-full border ${
                              s.content_kind === 'relational' ? 'border-blue-300 text-blue-700 dark:text-blue-300'
                                : s.fields > 0 ? 'border-green-300 text-green-700 dark:text-green-300'
                                  : 'border-red-300 text-red-600 dark:text-red-400'
                            }`} title={`${s.name} · ${s.content_kind} · ${s.fields} fields`}>
                              {s.name} {s.content_kind !== 'relational' && `(${s.fields})`}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatBox({ label, value, tone }: { label: string; value: number; tone: 'green'|'yellow'|'blue'|'gray' }) {
  const map: Record<string, string> = {
    green:  'border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800 text-green-700 dark:text-green-300',
    yellow: 'border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300',
    blue:   'border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800 text-blue-700 dark:text-blue-300',
    gray:   'border-gray-200 bg-gray-50 dark:bg-gray-800/40 dark:border-gray-700 text-gray-600 dark:text-gray-300',
  };
  return (
    <div className={`p-3 rounded-xl border text-center ${map[tone]}`}>
      <div className="text-lg font-extrabold">{value}</div>
      <div className="text-[10px] font-semibold opacity-70 mt-0.5">{label}</div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function SetupPanelClient({ initialTypes, initialSections }: Props) {
  return (
    <div className="space-y-4">
      <SectionCard title="🏷️ Business Types" icon="🏷️">
        <BusinessTypesManager initial={initialTypes} />
      </SectionCard>
      <SectionCard title="📚 Sections" icon="📚">
        <SectionsManager initial={initialSections} />
      </SectionCard>
      <SectionCard title="🗂️ Field Groups & Form Fields" icon="🗂️" defaultOpen>
        <FieldsManager types={initialTypes} sections={initialSections} />
      </SectionCard>
      <SectionCard title="✅ Settled Checklist" icon="✅" defaultOpen>
        <SettledChecklist />
      </SectionCard>
    </div>
  );
}
