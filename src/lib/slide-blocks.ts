/**
 * Slide info blocks — the placed content layer the hero carousel prints on top
 * of its media.
 *
 * This is a port of the pattern proven in the sister marketplace
 * (`AdvancedHeroCarousel` + `SlideInfoBlocksOverlay`), reduced to what this
 * portal's schema can actually answer:
 *   - a field is addressed by `form_fields.name` inside its own section, so
 *     `sectionId` scopes a lookup and `price` in Identity can never print the
 *     Showroom's answer;
 *   - the routing rule is this repo's typed `form_fields.destination` column
 *     (`carousel | body | both | hidden`), not a JSON destinations blob;
 *   - there is one listing basis here (a car is bought), so the source's
 *     sale/lease/stay price variants collapse to EGP totals.
 *
 * The slide is still a media backdrop. Blocks are what makes it a *statement*
 * about a value, which is the whole point of a value-bound carousel: the photo
 * proves the number, the block prints it.
 */

export type BlockKind =
  | 'caption'       // the slide's own caption line, positioned
  | 'fieldLabels'   // labels only:  [Range] [Power] [0-100]
  | 'fieldValues'   // values only:  620 km · 523 hp · 4.6 s
  | 'fieldsValues'; // label + value pairs

/** Nine zones, not free drag: the only placement scheme that survives RTL. */
export type BlockZone =
  | 'top-left' | 'top-center' | 'top-right'
  | 'middle-left' | 'middle-center' | 'middle-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right';

export type BlockLayout =
  | 'pill'        // uppercase badge — the caption's natural form
  | 'minimal'     // bare text, no container
  | 'card'        // vertical panel, label above value, hairline between pairs
  | 'chip-row'    // horizontal wrap of chips
  | 'glass'       // heavier panel for a spec list
  | 'spec-sheet'; // measured rows, tabular values, price-formatted

export interface SlideBlock {
  /** Stable id, so the editor can reorder and React can key. */
  id: string;
  kind: BlockKind;
  zone: BlockZone;
  layout: BlockLayout;
  /** `form_fields.name` entries this block projects. Empty for `caption`. */
  fieldKeys?: string[];
  /** The section those names belong to. Optional: unscoped = resolve anywhere. */
  sectionId?: string;
  /** A `field_groups.name`: project the whole category without retyping keys. */
  groupKey?: string;
  /** 1-based slice of a long category, so 14 fields become two slides. */
  groupPage?: number;
  /** Free text for `kind: 'caption'` when the block says something else. */
  text?: string;
  /**
   * Governance flag. A vendor may propose a block; only an admin write may set
   * this true, and `sanitizeSlideBlocks` enforces it on every untrusted path.
   */
  approved: boolean;
}

/** One field, resolved to what a slide is allowed to print. */
export interface ResolvedField {
  label: string;
  /** Empty string means "authored as nothing", not "missing". */
  value: string;
  /** `destination`/visibility masked the value: print `—`, keep the label. */
  valueHidden?: boolean;
  /** Owning category, so a `groupKey` block can find its members. */
  groupKey?: string;
  /** True when no `form_fields` row defines this key and only the answer exists. */
  fromStoredValue?: boolean;
}

export type FlatFieldsIndex = Record<string, ResolvedField>;

export interface SlideFieldsIndex {
  flat: FlatFieldsIndex;
  bySection: Record<string, FlatFieldsIndex>;
  /** `sectionId:groupKey` → bilingual category heading. */
  groupLabels?: Record<string, { en: string; ar?: string | null }>;
}

// ── zones ────────────────────────────────────────────────────────────────────
export const ZONE_GRID: Record<BlockZone, { justify: 'flex-start' | 'center' | 'flex-end'; align: 'flex-start' | 'center' | 'flex-end' }> = {
  'top-left':      { justify: 'flex-start', align: 'flex-start' },
  'top-center':    { justify: 'center',     align: 'flex-start' },
  'top-right':     { justify: 'flex-end',   align: 'flex-start' },
  'middle-left':   { justify: 'flex-start', align: 'center' },
  'middle-center': { justify: 'center',     align: 'center' },
  'middle-right':  { justify: 'flex-end',   align: 'center' },
  'bottom-left':   { justify: 'flex-start', align: 'flex-end' },
  'bottom-center': { justify: 'center',     align: 'flex-end' },
  'bottom-right':  { justify: 'flex-end',   align: 'flex-end' },
};

export const VALID_KINDS: ReadonlySet<BlockKind> = new Set<BlockKind>(['caption', 'fieldLabels', 'fieldValues', 'fieldsValues']);
export const VALID_ZONES: ReadonlySet<BlockZone> = new Set<BlockZone>(Object.keys(ZONE_GRID) as BlockZone[]);
export const VALID_LAYOUTS: ReadonlySet<BlockLayout> = new Set<BlockLayout>(['pill', 'minimal', 'card', 'chip-row', 'glass', 'spec-sheet']);

export function defaultLayoutForKind(kind: BlockKind): BlockLayout {
  switch (kind) {
    case 'caption': return 'pill';
    case 'fieldLabels': return 'minimal';
    case 'fieldValues': return 'chip-row';
    case 'fieldsValues': return 'card';
  }
}

const MAX_FIELDS_PER_BLOCK = 8;
const MAX_BLOCKS_PER_SLIDE = 6;
const MAX_TEXT_LEN = 240;
const MAX_KEY_LEN = 64;

/**
 * Coerce arbitrary stored JSON into safe blocks.
 *
 * `trusted: false` is the vendor path and it forces `approved: false` on every
 * block: proposing is not publishing. Lengths and types are clamped because this
 * array comes from a JSON blob that an admin textarea can reach, and a slide must
 * not be able to inject markup or a 200-entry panel.
 */
export function sanitizeSlideBlocks(input: unknown, opts: { trusted: boolean }): SlideBlock[] {
  if (!Array.isArray(input)) return [];
  const out: SlideBlock[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== 'object') continue;
    const b = raw as Record<string, unknown>;
    const kind = VALID_KINDS.has(b.kind as BlockKind) ? (b.kind as BlockKind) : null;
    if (!kind) continue;
    const zone = VALID_ZONES.has(b.zone as BlockZone) ? (b.zone as BlockZone) : 'bottom-center';
    const layout = VALID_LAYOUTS.has(b.layout as BlockLayout) ? (b.layout as BlockLayout) : defaultLayoutForKind(kind);
    const text = typeof b.text === 'string' ? b.text.trim().slice(0, MAX_TEXT_LEN) : undefined;
    const fieldKeys = Array.isArray(b.fieldKeys)
      ? b.fieldKeys
          .filter((k): k is string => typeof k === 'string' && !!k.trim())
          .map((k) => k.trim().slice(0, MAX_KEY_LEN))
          .slice(0, MAX_FIELDS_PER_BLOCK)
      : [];
    const id = typeof b.id === 'string' && b.id ? b.id.slice(0, 64) : `blk_${Math.random().toString(36).slice(2, 10)}`;
    const sectionId = kind === 'caption' || typeof b.sectionId !== 'string' || !b.sectionId.trim()
      ? undefined : b.sectionId.trim().slice(0, MAX_KEY_LEN);
    const groupKey = kind === 'caption' || typeof b.groupKey !== 'string' || !b.groupKey.trim()
      ? undefined : b.groupKey.trim().slice(0, MAX_KEY_LEN);
    const groupPage = Number.isFinite(Number(b.groupPage)) && Number(b.groupPage) > 1
      ? Math.floor(Number(b.groupPage)) : undefined;
    out.push({
      id, kind, zone, layout,
      fieldKeys: kind === 'caption' ? [] : fieldKeys,
      ...(sectionId ? { sectionId } : {}),
      ...(groupKey ? { groupKey, ...(groupPage ? { groupPage } : {}) } : {}),
      ...(kind === 'caption' && text ? { text } : {}),
      approved: opts.trusted ? Boolean(b.approved) : false,
    });
    if (out.length >= MAX_BLOCKS_PER_SLIDE) break;
  }
  return out;
}

/** `custom_data` keys are storage, not prose: housekeeping never reaches a slide. */
export const STORED_KEY_SKIP = new Set(['field_visibility', 'field_destinations', 'media', 'gallery', 'sections', 'options']);

export function isPrintable(value: unknown): boolean {
  if (value === null || value === undefined || value === '') return false;
  if (Array.isArray(value)) return value.length > 0;
  return typeof value !== 'object';
}

export function humanizeStoredKey(name: string): string {
  return String(name || '')
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .trim();
}

export function stringifyFieldValue(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map(stringifyFieldValue).filter(Boolean).join(' · ');
  if (typeof value === 'object') {
    const o = value as Record<string, unknown>;
    const named = o.name ?? o.title ?? o.label ?? o.value;
    if (typeof named === 'string') return named.trim();
    try { return JSON.stringify(value); } catch { return ''; }
  }
  return String(value);
}

/** Accepts the section-aware shape or a legacy flat map. */
export function asFieldsIndex(index?: SlideFieldsIndex | FlatFieldsIndex | null): SlideFieldsIndex {
  if (!index) return { flat: {}, bySection: {} };
  if ('flat' in index || 'bySection' in index) return index as SlideFieldsIndex;
  return { flat: index as FlatFieldsIndex, bySection: {} };
}

export function fieldsOfGroup(
  groupKey: string,
  index: SlideFieldsIndex,
  sectionId?: string,
): Array<{ key: string; resolved: ResolvedField }> {
  const key = String(groupKey || '').trim();
  if (!key) return [];
  const source = (sectionId ? index.bySection[sectionId] : undefined) ?? index.flat;
  const out: Array<{ key: string; resolved: ResolvedField }> = [];
  for (const [name, resolved] of Object.entries(source)) {
    if (resolved?.groupKey === key) out.push({ key: name, resolved });
  }
  return out;
}

export function groupLabelFor(
  groupKey: string | undefined,
  sectionId: string | undefined,
  index: SlideFieldsIndex,
  ar: boolean,
): string | null {
  const key = String(groupKey || '').trim();
  if (!key || !index.groupLabels) return null;
  const direct = index.groupLabels[`${sectionId ?? ''}:${key}`];
  const label = direct ?? (sectionId ? null : Object.entries(index.groupLabels).find(([k]) => k.endsWith(`:${key}`))?.[1]);
  if (!label) return null;
  return String((ar ? (label.ar || label.en) : label.en) || '').trim() || null;
}

/**
 * The members a `groupKey` block actually prints: the category, paged.
 *
 * Both the renderer and the claimed-key pass call this one function, so "what the
 * hero shows" and "what the body hides" can never drift apart and leave a value
 * that appears nowhere on the page.
 */
function groupSlice(
  groupKey: string,
  index: SlideFieldsIndex,
  sectionId?: string,
  groupPage?: number,
): Array<{ key: string; resolved: ResolvedField }> {
  const members = fieldsOfGroup(groupKey, index, sectionId);
  const page = Math.max(1, Math.floor(Number(groupPage) || 1));
  return members.slice((page - 1) * MAX_FIELDS_PER_BLOCK, page * MAX_FIELDS_PER_BLOCK);
}

/**
 * The entries a block prints, in the order the admin picked them.
 *
 * A block naming a group and no keys projects the whole category (paged, so a
 * fourteen-field category becomes two slides under one heading rather than eight
 * fields and a silent truncation). A block naming keys projects exactly those.
 * Entries with neither label nor value drop out, which is why a masked field
 * disappears instead of printing an empty pill.
 */
export function resolveBlockEntries(
  block: Pick<SlideBlock, 'fieldKeys' | 'sectionId' | 'groupKey' | 'groupPage'>,
  index: SlideFieldsIndex,
): Array<{ key: string; resolved: ResolvedField }> {
  const scoped = block.sectionId ? index.bySection[block.sectionId] : undefined;
  const explicit = (block.fieldKeys || []).filter(Boolean);
  if (!explicit.length && block.groupKey) return groupSlice(block.groupKey, index, block.sectionId, block.groupPage);
  return explicit
    .map((key) => ({ key, resolved: scoped?.[key] ?? index.flat[key] }))
    .filter((e): e is { key: string; resolved: ResolvedField } =>
      Boolean(e.resolved && (e.resolved.label || e.resolved.value)));
}

/**
 * Keys an approved block already claims. The body grid beneath the carousel
 * suppresses these, so a value never appears twice on one page — which is the
 * difference between a curated minisite and a duplicate dump.
 *
 * `index` is the same map the slides resolve against. Without it a `groupKey`
 * block names a category the pass cannot open, and the fields it printed on the
 * hero would come back underneath it.
 */
export function extractClaimedFieldKeys(
  slides: Array<{ blocks?: unknown; fieldKey?: string; fieldSectionId?: string }>,
  index: SlideFieldsIndex = { flat: {}, bySection: {} },
): { anySection: Set<string>; bySection: Record<string, Set<string>> } {
  const anySection = new Set<string>();
  const bySection: Record<string, Set<string>> = {};
  const bucketFor = (sectionId?: string) =>
    sectionId ? (bySection[sectionId] ||= new Set<string>()) : anySection;
  for (const s of slides) {
    // The slide's own bound field counts as claimed even without blocks: the
    // headline IS that value, and printing it again two panels down is noise.
    if (s.fieldKey) bucketFor(s.fieldSectionId).add(s.fieldKey);
    const blocks = Array.isArray(s.blocks) ? (s.blocks as SlideBlock[]) : [];
    for (const b of blocks) {
      if (!b?.approved || b.kind === 'caption') continue;
      const target = bucketFor(b.sectionId);
      for (const key of b.fieldKeys || []) if (key) target.add(key);
      if (b.groupKey) {
        for (const e of groupSlice(b.groupKey, index, b.sectionId, b.groupPage)) target.add(e.key);
      }
    }
  }
  return { anySection, bySection };
}

// ── value presentation ───────────────────────────────────────────────────────
export const BLOCK_HIDDEN_LEGEND = {
  ar: '— = مخفية بواسطة الإدارة',
  en: '— = hidden by admin',
};

const PRICE_KEY = /(^|_)(price|msrp|cost|total)(_|$)/i;

/**
 * `4250000` is not a number a visitor reads, it is a price. Egyptian listings say
 * "4.25 مليون", so a seven-figure EGP total is compressed the way the market says
 * it, and anything below stays grouped and exact.
 */
export function formatEgp(value: string, ar: boolean): string {
  const num = Number(value.replace(/[^0-9.-]/g, ''));
  if (!Number.isFinite(num) || num <= 0) return value;
  const suffix = ar ? 'ج.م' : 'EGP';
  let body: string;
  if (num >= 1_000_000) body = `${(num / 1_000_000).toFixed(2).replace(/\.?0+$/, '')}${ar ? ' مليون' : 'M'}`;
  else if (num >= 100_000) body = Math.round(num / 1_000).toLocaleString('en-US') + (ar ? ' ألف' : 'K');
  else body = num.toLocaleString('en-US');
  return ar ? `${body} ${suffix}` : `${suffix} ${body}`;
}

/** The one written form, so a preview and the live slide cannot disagree. */
export function maybeFormatPriceField(key: string, value: string, ar: boolean): string {
  if (!value || value === '—') return value;
  if (!PRICE_KEY.test(key)) return value;
  if (!/[0-9]/.test(value)) return value;
  return formatEgp(value, ar);
}

// ── editor labels ────────────────────────────────────────────────────────────
export const BLOCK_KIND_LABEL: Record<BlockKind, { en: string; ar: string }> = {
  caption:      { en: 'Caption',          ar: 'الكابشن' },
  fieldLabels:  { en: 'Field labels only', ar: 'أسماء الحقول' },
  fieldValues:  { en: 'Field values only', ar: 'قيم الحقول' },
  fieldsValues: { en: 'Fields + values',  ar: 'الحقول وقيمها' },
};

export const BLOCK_LAYOUT_LABEL: Record<BlockLayout, { en: string; ar: string }> = {
  pill:        { en: 'Pill',         ar: 'شارة' },
  minimal:     { en: 'Minimal text', ar: 'نص بسيط' },
  card:        { en: 'Vertical card', ar: 'بطاقة رأسية' },
  'chip-row':  { en: 'Chip row',     ar: 'شرائح أفقية' },
  glass:       { en: 'Glass panel',  ar: 'لوحة زجاجية' },
  'spec-sheet': { en: 'Spec sheet',  ar: 'ورقة مواصفات' },
};

/** Zone names address a side of the page, so the Arabic label is the mirrored one. */
export const BLOCK_ZONE_LABEL: Record<BlockZone, { en: string; ar: string }> = {
  'top-left':      { en: 'Top-left',      ar: 'أعلى اليمين' },
  'top-center':    { en: 'Top-center',    ar: 'أعلى الوسط' },
  'top-right':     { en: 'Top-right',     ar: 'أعلى اليسار' },
  'middle-left':   { en: 'Middle-left',   ar: 'وسط اليمين' },
  'middle-center': { en: 'Center',        ar: 'في المنتصف' },
  'middle-right':  { en: 'Middle-right',  ar: 'وسط اليسار' },
  'bottom-left':   { en: 'Bottom-left',   ar: 'أسفل اليمين' },
  'bottom-center': { en: 'Bottom-center', ar: 'أسفل الوسط' },
  'bottom-right':  { en: 'Bottom-right',  ar: 'أسفل اليسار' },
};
