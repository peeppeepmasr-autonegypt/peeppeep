'use client';
/**
 * The placed content layer a slide prints over its media.
 *
 * A slide without blocks is a photograph with a caption. A slide *with* blocks
 * is a value the buyer can read: the four numbers that decide whether to call.
 * This is the layer that makes a value-bound carousel worth having — the photo
 * proves the claim, the block states it.
 *
 * Rules carried over from the source implementation, and why they stay:
 *   - only `approved` blocks render. A proposal is not a publication;
 *   - nine zones instead of free dragging, because a zone is the only placement
 *     unit that survives a direction flip. The grid below resolves columns
 *     *logically*, so `top-left` authored for Arabic lands top-right — which is
 *     what the editor's mirrored labels promise;
 *   - a key that resolves to nothing drops its row silently. A broken pill or a
 *     literal "undefined" on a premium listing is worse than an empty one;
 *   - a masked value prints `—` and keeps its label, with the footnote that
 *     says the admin hid it, so an omission reads as a decision rather than a bug.
 */
import { useMemo } from 'react';
import {
  BLOCK_HIDDEN_LEGEND,
  asFieldsIndex,
  groupLabelFor,
  maybeFormatPriceField,
  resolveBlockEntries,
  ZONE_GRID,
  type BlockZone,
  type ResolvedField,
  type SlideBlock,
  type SlideFieldsIndex,
  type FlatFieldsIndex,
} from '@/lib/slide-blocks';

export interface SlideInfoBlocksOverlayProps {
  /** Already validated by the read path; guarded again here. */
  blocks?: unknown;
  fieldsIndex?: SlideFieldsIndex | FlatFieldsIndex | null;
  /** The slide's own caption line, for a `caption` block with no override text. */
  slideCaption?: string | null;
  ar?: boolean;
}

const ROW: Record<BlockZone, 1 | 2 | 3> = {
  'top-left': 1, 'top-center': 1, 'top-right': 1,
  'middle-left': 2, 'middle-center': 2, 'middle-right': 2,
  'bottom-left': 3, 'bottom-center': 3, 'bottom-right': 3,
};
const COL: Record<BlockZone, 1 | 2 | 3> = {
  'top-left': 1, 'middle-left': 1, 'bottom-left': 1,
  'top-center': 2, 'middle-center': 2, 'bottom-center': 2,
  'top-right': 3, 'middle-right': 3, 'bottom-right': 3,
};
const ITEMS: Record<'flex-start' | 'center' | 'flex-end', string> = {
  'flex-start': 'items-start',
  center: 'items-center',
  'flex-end': 'items-end',
};
const PLACE: Record<'flex-start' | 'center' | 'flex-end', string> = {
  'flex-start': 'justify-start',
  center: 'justify-center',
  'flex-end': 'justify-end',
};

function groupByZone(blocks: SlideBlock[]): Map<BlockZone, SlideBlock[]> {
  const map = new Map<BlockZone, SlideBlock[]>();
  for (const b of blocks) {
    if (!b?.approved) continue;
    const arr = map.get(b.zone) ?? [];
    arr.push(b);
    map.set(b.zone, arr);
  }
  return map;
}

/** The single written form of a value on a slide. */
function displayValue(key: string, resolved: ResolvedField, ar: boolean): string {
  if (resolved.valueHidden) return '—';
  if (!resolved.value) return '';
  return maybeFormatPriceField(key, resolved.value, ar);
}

function readBlocks(input: unknown): SlideBlock[] {
  return Array.isArray(input) ? (input as SlideBlock[]).filter((b) => b && typeof b === 'object') : [];
}

export default function SlideInfoBlocksOverlay({
  blocks,
  fieldsIndex,
  slideCaption,
  ar = false,
}: SlideInfoBlocksOverlayProps) {
  const index = useMemo(() => asFieldsIndex(fieldsIndex ?? null), [fieldsIndex]);
  const byZone = useMemo(() => groupByZone(readBlocks(blocks)), [blocks]);

  if (!byZone.size) return null;

  let anyMasked = false;

  const body = (b: SlideBlock) => {
    const entries = resolveBlockEntries(b, index);
    const heading = groupLabelFor(b.groupKey, b.sectionId, index, ar);
    if (b.kind === 'caption') {
      const text = (b.text || slideCaption || '').trim();
      if (!text) return null;
      return b.layout === 'minimal'
        ? <p className="blk-caption blk-caption--bare">{text}</p>
        : <p className="blk-caption">{text}</p>;
    }
    if (!entries.length) return null;
    if (entries.some((e) => e.resolved.valueHidden)) anyMasked = true;

    switch (b.layout) {
      case 'minimal':
        return (
          <div className="blk blk--minimal">
            {heading ? <p className="blk-heading">{heading}</p> : null}
            <p className="blk-line">
              {entries
                .map((e) => (b.kind === 'fieldValues' ? displayValue(e.key, e.resolved, ar) : e.resolved.label))
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>
        );

      case 'chip-row':
        return (
          <div className="blk blk--chips">
            {heading ? <p className="blk-heading">{heading}</p> : null}
            <ul className="flex flex-wrap gap-1.5">
              {entries.map((e) => {
                const value = displayValue(e.key, e.resolved, ar);
                const text = b.kind === 'fieldLabels' ? e.resolved.label : value || e.resolved.label;
                if (!text) return null;
                return (
                  <li key={e.key} className={`blk-chip${value === '—' ? ' blk-chip--masked' : ''}`}>
                    {b.kind === 'fieldsValues' && e.resolved.label
                      ? <span className="blk-chip-label">{e.resolved.label}</span>
                      : null}
                    {text}
                  </li>
                );
              })}
            </ul>
          </div>
        );

      case 'card':
      case 'glass':
        return (
          <div className={`blk blk--card${b.layout === 'glass' ? ' blk--glass' : ''}`}>
            {heading || b.layout === 'glass'
              ? <p className="blk-heading">{heading || (ar ? 'المواصفات' : 'Specification')}</p>
              : null}
            <dl className="grid gap-0">
              {entries.map((e) => {
                const value = displayValue(e.key, e.resolved, ar);
                return (
                  <div key={e.key} className="blk-row">
                    {b.kind !== 'fieldValues' ? <dt className="blk-label">{e.resolved.label}</dt> : null}
                    {b.kind !== 'fieldLabels'
                      ? <dd className={`blk-value${value === '—' ? ' blk-value--masked' : ''}`}>{value || '—'}</dd>
                      : null}
                  </div>
                );
              })}
            </dl>
          </div>
        );

      case 'spec-sheet':
      default:
        return (
          <div className="blk blk--spec">
            {heading ? <p className="blk-heading">{heading}</p> : null}
            <table className="w-full border-collapse">
              <tbody>
                {entries.map((e) => {
                  const value = displayValue(e.key, e.resolved, ar);
                  return (
                    <tr key={e.key} className="spec-tr">
                      <th scope="row" className="spec-th">{e.resolved.label}</th>
                      <td className={`spec-td${value === '—' ? ' blk-value--masked' : ''}`}>
                        {b.kind === 'fieldLabels' ? '' : value || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
    }
  };

  return (
    <>
      <div className="blocks-grid">
        {(Object.keys(ZONE_GRID) as BlockZone[]).map((zone) => {
          const group = byZone.get(zone);
          if (!group?.length) return null;
          const grid = ZONE_GRID[zone];
          return (
            <div
              key={zone}
              className={`flex min-w-0 max-w-[min(92%,34rem)] flex-col gap-2 ${ITEMS[grid.justify]} ${PLACE[grid.align]}`}
              style={{ gridRowStart: ROW[zone], gridColumnStart: COL[zone] }}
            >
              {group.map((b) => {
                const node = body(b);
                if (!node) return null;
                return <div key={b.id} className="blk-in">{node}</div>;
              })}
            </div>
          );
        })}
      </div>
      {anyMasked ? (
        <p className="blocks-legend">{ar ? BLOCK_HIDDEN_LEGEND.ar : BLOCK_HIDDEN_LEGEND.en}</p>
      ) : null}
    </>
  );
}
