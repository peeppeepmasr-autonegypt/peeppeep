'use client';

import { useState } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Relationship {
  id: string;
  relation_type: string;
  is_primary: number;
  from_id: string;
  from_name: string;
  from_name_ar: string | null;
  from_type: string;
  to_id: string;
  to_name: string;
  to_name_ar: string | null;
  to_type: string;
  created_at: string;
}

interface BusinessLite {
  id: string;
  name: string;
  name_ar: string | null;
  type_id: string;
}

interface Props {
  initialRelationships: Relationship[];
  allBusinesses: BusinessLite[];
  relationTypes: string[];
}

// ── Colour maps ───────────────────────────────────────────────────────────────

const TYPE_BADGE: Record<string, string> = {
  vehicle_brand:  'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  vehicle_model:  'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  vehicle_trim:   'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  showroom:       'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  main_agency:    'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  car_listing:    'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  distributor:    'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
};
const TYPE_BADGE_DEFAULT = 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300';

const REL_CHIP: Record<string, string> = {
  manufactured_at: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  sold_by:         'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  distributed_by:  'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  represented_by:  'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  serviced_by:     'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  insured_by:      'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  financed_by:     'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  parts_for:       'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  compatible_with: 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300',
  agent_of:        'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
};
const REL_CHIP_DEFAULT = 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300';

function typeBadge(typeId: string) {
  return TYPE_BADGE[typeId] ?? TYPE_BADGE_DEFAULT;
}

function relChip(relType: string) {
  return REL_CHIP[relType] ?? REL_CHIP_DEFAULT;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function BizLabel({ name, nameAr, typeId }: { name: string; nameAr: string | null; typeId: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${typeBadge(typeId)}`}>{typeId}</span>
      <span className="font-medium">{nameAr || name}</span>
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function RelationshipManager({ initialRelationships, allBusinesses, relationTypes }: Props) {
  const [relationships, setRelationships] = useState<Relationship[]>(initialRelationships);
  const [fromId, setFromId] = useState('');
  const [relType, setRelType] = useState(relationTypes[0] ?? '');
  const [toId, setToId] = useState('');
  const [isPrimary, setIsPrimary] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ── Add relationship ──────────────────────────────────────────────────────

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!fromId || !toId || !relType) {
      setError('Please select FROM, TO, and Relation Type.');
      return;
    }
    if (fromId === toId) {
      setError('FROM and TO must be different businesses.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/relationships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from_id: fromId, to_id: toId, relation_type: relType, is_primary: isPrimary }),
      });

      if (!res.ok) {
        const body = await res.json() as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }

      const newRel = await res.json() as Relationship;
      setRelationships((prev) => [newRel, ...prev]);

      // Reset form
      setFromId('');
      setToId('');
      setRelType(relationTypes[0] ?? '');
      setIsPrimary(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSubmitting(false);
    }
  }

  // ── Delete relationship ───────────────────────────────────────────────────

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/relationships?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const body = await res.json() as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      setRelationships((prev) => prev.filter((r) => r.id !== id));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ── Add Relationship Card ── */}
      <div className="border border-black/10 rounded-2xl bg-white dark:bg-neutral-900 shadow-sm p-5">
        <h3 className="text-sm font-bold mb-4">Add Relationship</h3>
        <form onSubmit={handleAdd} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* FROM */}
            <div className="space-y-1">
              <label className="text-xs font-semibold opacity-60">FROM Business</label>
              <select
                value={fromId}
                onChange={(e) => setFromId(e.target.value)}
                className="w-full text-sm border border-black/15 rounded-lg px-3 py-2 bg-white dark:bg-neutral-800 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-black/20"
                required
              >
                <option value="">— select —</option>
                {allBusinesses.map((b) => (
                  <option key={b.id} value={b.id}>
                    [{b.type_id}] {b.name_ar || b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Relation Type */}
            <div className="space-y-1">
              <label className="text-xs font-semibold opacity-60">Relation Type</label>
              <select
                value={relType}
                onChange={(e) => setRelType(e.target.value)}
                className="w-full text-sm border border-black/15 rounded-lg px-3 py-2 bg-white dark:bg-neutral-800 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-black/20"
                required
              >
                {relationTypes.map((rt) => (
                  <option key={rt} value={rt}>{rt}</option>
                ))}
              </select>
            </div>

            {/* TO */}
            <div className="space-y-1">
              <label className="text-xs font-semibold opacity-60">TO Business</label>
              <select
                value={toId}
                onChange={(e) => setToId(e.target.value)}
                className="w-full text-sm border border-black/15 rounded-lg px-3 py-2 bg-white dark:bg-neutral-800 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-black/20"
                required
              >
                <option value="">— select —</option>
                {allBusinesses.map((b) => (
                  <option key={b.id} value={b.id}>
                    [{b.type_id}] {b.name_ar || b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Primary + Submit */}
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isPrimary}
                onChange={(e) => setIsPrimary(e.target.checked)}
                className="rounded accent-black w-4 h-4"
              />
              <span className="font-medium">Primary relationship?</span>
            </label>

            <button
              type="submit"
              disabled={submitting}
              className="ml-auto px-5 py-2 rounded-lg bg-black text-white text-sm font-bold hover:opacity-80 disabled:opacity-50 transition-opacity"
            >
              {submitting ? 'Adding…' : '+ Add Relationship'}
            </button>
          </div>

          {error && (
            <div className="text-xs font-semibold text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 px-3 py-2 rounded-lg border border-red-200 dark:border-red-800">
              {error}
            </div>
          )}
        </form>
      </div>

      {/* ── Relationships Table ── */}
      <div className="border border-black/10 rounded-2xl bg-white dark:bg-neutral-900 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-black/10 dark:border-white/10">
          <h3 className="text-sm font-bold">All Relationships ({relationships.length})</h3>
        </div>

        {relationships.length === 0 ? (
          <div className="text-center py-12 text-sm opacity-40">
            No relationships yet. Add one above.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/10 dark:border-white/10 text-left">
                  <th className="px-4 py-3 text-xs font-bold opacity-60 whitespace-nowrap">From</th>
                  <th className="px-4 py-3 text-xs font-bold opacity-60 whitespace-nowrap">Relation</th>
                  <th className="px-4 py-3 text-xs font-bold opacity-60 whitespace-nowrap">To</th>
                  <th className="px-4 py-3 text-xs font-bold opacity-60 text-center whitespace-nowrap">Primary</th>
                  <th className="px-4 py-3 text-xs font-bold opacity-60 whitespace-nowrap">Created</th>
                  <th className="px-4 py-3 text-xs font-bold opacity-60 whitespace-nowrap"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/5">
                {relationships.map((rel) => (
                  <tr key={rel.id} className="hover:bg-black/[.015] dark:hover:bg-white/[.015] transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <BizLabel name={rel.from_name} nameAr={rel.from_name_ar} typeId={rel.from_type} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${relChip(rel.relation_type)}`}>
                        {rel.relation_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <BizLabel name={rel.to_name} nameAr={rel.to_name_ar} typeId={rel.to_type} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      {rel.is_primary ? (
                        <span className="text-green-600 dark:text-green-400 font-bold text-xs">✓</span>
                      ) : (
                        <span className="opacity-20 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs opacity-50 whitespace-nowrap font-mono">
                      {rel.created_at ? new Date(rel.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleDelete(rel.id)}
                        disabled={deletingId === rel.id}
                        className="text-xs px-2.5 py-1 rounded-lg border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 font-semibold disabled:opacity-40 transition-colors"
                      >
                        {deletingId === rel.id ? '…' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
