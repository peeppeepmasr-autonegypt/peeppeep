/**
 * Minisite loader — the read path (D1 / SQLite).
 *
 * Given a business slug (and the optional active section), it assembles a single
 * view model the renderer can present without more queries:
 *   - the node + its kind,
 *   - the effective section shelves (resolved down the business_types kind chain),
 *   - for the active shelf: grouped authored fields, gallery rows with caption #1
 *     and a composed caption #2, blog entries, and graph shelves (children/edges),
 *   - the ancestry chain for the breadcrumb.
 *
 * All bilingual: every localized read carries both the EN and AR string and lets
 * the view pick by locale.
 */
import { query, queryOne, parseJson } from '@/lib/db';
import { getAncestry, type AncestryNode } from '@/lib/topology';
import { localePath, type SiteLocale } from '@/lib/site-locale';
import { loadSiteProfile, type SiteProfile } from '@/lib/site-builder';
import {
  sanitizeSlideBlocks, extractClaimedFieldKeys, humanizeStoredKey, stringifyFieldValue,
  isPrintable, STORED_KEY_SKIP, maybeFormatPriceField,
  type FlatFieldsIndex, type ResolvedField, type SlideBlock, type SlideFieldsIndex,
} from '@/lib/slide-blocks';

// The slide-block types are part of this module's public surface — components read
// the view model from here and should not have to know where the library lives.
export type {
  BlockKind, BlockLayout, BlockZone, FlatFieldsIndex, ResolvedField,
  SlideBlock, SlideFieldsIndex,
} from '@/lib/slide-blocks';

export interface SectionOptions {
  markets?: string[];
  component?: string;
  aspect?: string;
  relationship?: RelationshipSpec[];
  /** Section-level carousel defaults; a slide's own `media_data` overrides them. */
  carousel?: CarouselDefaults;
}

/** How the shelf's carousel behaves when no slide says otherwise. */
export interface CarouselDefaults {
  autoPlay?: boolean;
  /** Milliseconds a still slide holds before advancing. */
  interval?: number;
  /** Crossfade length in milliseconds. */
  transition?: number;
  showProgress?: boolean;
  showIndicators?: boolean;
  showArrows?: boolean;
  /** CSS aspect-ratio for the pane, e.g. '21 / 9'. */
  aspect?: string;
  accent?: string;
  watermark?: string;
  contentAlign?: 'start' | 'center' | 'end';
  titleSize?: number;
  subtitleSize?: number;
}
export interface RelationshipSpec {
  relation: string;      // 'children' (tree) or a RELATION_TYPES key (graph)
  direction?: 'in' | 'out' | 'both';
  scope?: string;        // business_types id to filter children
  as?: 'cards' | 'list' | 'chips' | 'table' | 'tree';
}
export interface Section {
  id: string;
  name: string;
  name_ar: string | null;
  icon: string | null;
  sort_order: number;
  enable_gallery: number;
  enable_blog: number;
  options: SectionOptions;
}
export interface FieldView {
  name: string;
  label: string;
  label_ar: string | null;
  field_type: string;
  value: string | null;   // display string, locale-resolved
}
export interface FieldGroupView {
  key: string;
  label: string;
  label_ar: string | null;
  fields: FieldView[];
}
export interface GalleryItem {
  id: string;
  url: string;
  caption: string;        // caption #1 (locale-resolved)
  caption2Title: string | null;  // caption #2 (overlay or group-derived)
  caption2Subtitle: string | null;
  is_hero: number;
  placement: string;
  fieldKey: string | null;        // value binding, when this image is a slide
  fieldSectionId: string | null;
  mediaType: SlideMedia['mediaType'];
  videoId: string | null;
}

/** How a slide carries its media, and how it dresses it. */
export type SlideMedia = {
  /**
   * `youtube` and `video` need a real player; `embed` is any other iframe URL;
   * `branded` is a typographic slide with no media at all, which is what an
   * unfinished minisite should reach for instead of a dashed empty box.
   */
  mediaType: 'image' | 'youtube' | 'video' | 'embed' | 'branded';
  videoId: string | null;
  /** Ken Burns needs 20s, a spec slide does not; both are authored choices. */
  animation?: 'kenburns' | 'fade' | 'zoom' | 'slide';
  transition?: number;
  /** 0..1 scrim strength over the media. */
  overlayOpacity?: number;
  imageFit?: 'cover' | 'contain';
  imagePosition?: 'center' | 'top' | 'bottom';
  bgColor?: string;
  displayMode?: 'media' | 'text_only';
  caption?: string | null;
  ctaText?: string | null;
  ctaLink?: string | null;
  /** Element id on the same page this slide scrolls to when activated. */
  targetSectionId?: string | null;
  /** Seconds a video pane plays before it stops; the source's teaser gate. */
  maxDuration?: number;
  /** Hide the slide's caption without hiding its headline or approved blocks. */
  showCaption?: boolean;
  watermark?: string | null;
  titleColor?: string;
  titleSize?: number;
  subtitleSize?: number;
  textAlign?: 'start' | 'center' | 'end';
  fontFamily?: string;
  /** Placed content layer, admin-approved before it prints. */
  blocks?: SlideBlock[];
};

/**
 * One carousel slide. A slide is a *value*, not a photo: the headline is the
 * bound field's authored value, the eyebrow is the field's label, and `note` is
 * the optional editorial line (media_data overlay, else the row's own caption).
 * `url` is null when the field is carousel-eligible but no photo exists yet --
 * the slide still renders, as a labelled placeholder, so an unfinished minisite
 * reads as unfinished instead of accidentally looking empty.
 */
export interface Slide extends SlideMedia {
  id: string;
  fieldKey: string;
  fieldSectionId: string;
  eyebrow: string;        // field label, locale-resolved
  title: string;          // the VALUE (or the label when nothing is authored yet)
  note: string | null;
  url: string | null;
  isHero: number;
  placeholder: boolean;
}
export interface ShelfItem {
  id: string;
  name: string;
  name_ar: string | null;
  slug: string | null;
  type_id: string;
  meta: string | null;    // e.g. role_data-derived line
}
export interface GraphShelf {
  label: string;
  as: NonNullable<RelationshipSpec['as']>;
  items: ShelfItem[];
}
export interface BlogEntry { id: string; title: string; content: string; }

export interface ActiveSectionView {
  section: Section;
  groups: FieldGroupView[];
  gallery: GalleryItem[];
  slides: Slide[];
  shelves: GraphShelf[];
  blogs: BlogEntry[];
}

/** Keys an approved block (or a slide headline) already prints on the hero. */
export interface ClaimedKeys {
  anySection: string[];
  bySection: Record<string, string[]>;
}

export interface MinisiteView {
  locale: SiteLocale;
  siteProfile: SiteProfile;
  business: {
    id: string; slug: string; name: string; name_ar: string | null;
    type_id: string; typeName: string; typeName_ar: string | null;
    identity: Record<string, unknown>;
    /** Authored `sec_auto_showroom` answers: address, phone, hours. */
    contact: Record<string, unknown>;
  };
  sections: Section[];
  /** Every authored section's current values, used by full model-page layouts. */
  specifications: Array<{ section: Section; groups: FieldGroupView[] }>;
  active: ActiveSectionView | null;
  activeSectionId: string | null;
  ancestry: AncestryNode[];
  /**
   * Field name → printable label/value for every carousel-eligible answer on
   * this business, which is what lets a slide block print a value from ANY
   * section (a photo under Exterior quoting a range authored in Specifications).
   */
  fieldsIndex: SlideFieldsIndex;
  /** Answers the hero already prints, so the body grid does not repeat them. */
  claimed: ClaimedKeys;
  /** Carousel behaviour for the active shelf, from `sections.options.carousel`. */
  carousel: CarouselDefaults;
}

// ── small localizers ─────────────────────────────────────────────────────────
function loc(en: string | null | undefined, ar: string | null | undefined, locale: SiteLocale): string | null {
  const primary = locale === 'ar' ? ar : en;
  return primary && primary.trim() ? primary : null;
}

const YES = { en: 'Yes', ar: 'نعم' };
const NO = { en: 'No', ar: 'لا' };

function displayValue(raw: unknown, type: string, locale: SiteLocale, arKeyHint?: string): string | null {
  if (raw === null || raw === undefined || raw === '') return null;
  if (type === 'boolean' || typeof raw === 'boolean') {
    const truthy = raw === true || raw === 1 || raw === '1';
    return truthy ? YES[locale] : NO[locale];
  }
  // Field-level Arabic override convention: "<name>_ar" authored alongside value.
  if (locale === 'ar' && arKeyHint && raw && typeof raw === 'object') {
    // handled by caller for select enums if needed
  }
  const text = String(raw);
  if (/^-?[\d.,%+\s]+$/.test(text)) return text;
  if (locale === 'ar' && /[A-Za-z]/.test(text) && !/[\u0600-\u06FF]/.test(text)) return null;
  if (locale === 'en' && /[\u0600-\u06FF]/.test(text)) return null;
  return text;
}

// ── section resolution down the kind chain ───────────────────────────────────
interface BusinessTypeRow {
  id: string; name: string; name_ar: string | null;
  parent_id: string | null; sections: string | null; own_sections: string | null;
}

async function loadTypeChain(typeId: string): Promise<BusinessTypeRow[]> {
  const chain: BusinessTypeRow[] = [];
  let cursor: string | null = typeId;
  let guard = 0;
  while (cursor && guard++ < 15) {
    const row: BusinessTypeRow | null = await queryOne<BusinessTypeRow>(
      'SELECT id, name, name_ar, parent_id, sections, own_sections FROM business_types WHERE id = ?',
      [cursor],
    );
    if (!row) break;
    chain.push(row);
    cursor = row.parent_id ?? null;
  }
  return chain;
}

/**
 * The shelves a kind carries, resolved down its type chain.
 *
 * Exported because the write path needs the same answer the renderer uses: a
 * field declared on a shelf the kind does not carry is stored and never printed,
 * and only this function knows what a kind carries.
 */
export async function resolveSections(typeId: string): Promise<Section[]> {
  const chain = await loadTypeChain(typeId);
  const ids = new Set<string>();
  for (const node of chain) {
    for (const id of parseJson<string[]>(node.sections, [])) ids.add(id);
    for (const id of parseJson<string[]>(node.own_sections, [])) ids.add(id);
  }
  if (!ids.size) return [];
  const list = [...ids];
  const placeholders = list.map(() => '?').join(',');
  const rows = await query<Section & { options: string | null }>(
    `SELECT id, name, name_ar, icon, sort_order, enable_gallery, enable_blog, options
       FROM sections WHERE id IN (${placeholders}) ORDER BY sort_order`,
    list,
  );
  return rows.map((r) => ({
    id: r.id, name: r.name, name_ar: r.name_ar, icon: r.icon,
    sort_order: r.sort_order, enable_gallery: r.enable_gallery, enable_blog: r.enable_blog,
    options: parseJson<SectionOptions>(r.options, {}),
  }));
}

// ── field definitions, resolved up the BUSINESS TREE ─────────────────────────
interface FieldDef {
  business_type_id: string; section_id: string;
  name: string; label: string | null; label_ar: string | null;
  field_type: string; group_key: string | null; sort_order: number;
  show_as_slide: number;
  /** Author-level routing (`carousel | body | both | hidden`); NULL = no opinion. */
  destination: string | null;
}
interface GroupDef {
  business_type_id: string; section_id: string;
  name: string; label: string | null; label_ar: string | null; sort_order: number;
}

/**
 * Field DEFINITIONS live on the business type; field VALUES live on the
 * business. A trim is a `vehicle_trim`, whose parent in the *type* chain is the
 * `auto_vehicles` grouping -- never `vehicle_model` -- so resolving definitions
 * through the type chain alone left every trim page holding authored values with
 * no labels to print them under. The typology is therefore resolved up the
 * BUSINESS TREE: own type first, then each ancestor business's type, nearest
 * definition winning. That is what lets a model own the questions once while each
 * trim answers them differently.
 */
async function fieldTypePriority(businessId: string, ownTypeId: string): Promise<string[]> {
  const ids: string[] = [];
  let cursor: string | null = businessId;
  let guard = 0;
  while (cursor && guard++ < 15) {
    const row: { type_id: string; parent_business_id: string | null } | null =
      await queryOne<{ type_id: string; parent_business_id: string | null }>(
        'SELECT type_id, parent_business_id FROM businesses WHERE id = ?',
        [cursor],
      );
    if (!row) break;
    if (!ids.includes(row.type_id)) ids.push(row.type_id);
    cursor = row.parent_business_id ?? null;
  }
  if (!ids.includes(ownTypeId)) ids.unshift(ownTypeId);
  return ids;
}

/**
 * Nearest type wins when two types in the chain define the same name, so a child
 * type can override one label without re-authoring the whole section. Indexed by
 * section because a slide may point at a field owned by ANOTHER section.
 */
function indexByTypePriority<
  T extends { business_type_id: string; section_id: string; sort_order: number },
>(rows: T[], typeOrder: string[], nameOf: (r: T) => string): Map<string, T[]> {
  const out = new Map<string, T[]>();
  const seen = new Set<string>();
  for (const typeId of typeOrder) {
    for (const r of rows) {
      if (r.business_type_id !== typeId) continue;
      const dedupe = `${r.section_id}::${nameOf(r)}`;
      if (seen.has(dedupe)) continue;
      seen.add(dedupe);
      const list = out.get(r.section_id);
      if (list) list.push(r);
      else out.set(r.section_id, [r]);
    }
  }
  for (const list of out.values()) list.sort((a, b) => a.sort_order - b.sort_order);
  return out;
}

async function loadFieldDefs(typeIds: string[]): Promise<Map<string, FieldDef[]>> {
  if (!typeIds.length) return new Map();
  const ph = typeIds.map(() => '?').join(',');
  const rows = await query<FieldDef>(
    `SELECT business_type_id, section_id, name, label, label_ar, field_type,
            group_key, sort_order, show_as_slide, destination
       FROM form_fields WHERE business_type_id IN (${ph})`,
    typeIds,
  );
  return indexByTypePriority(rows, typeIds, (r) => r.name);
}

async function loadGroupDefs(typeIds: string[]): Promise<Map<string, GroupDef[]>> {
  if (!typeIds.length) return new Map();
  const ph = typeIds.map(() => '?').join(',');
  const rows = await query<GroupDef>(
    `SELECT business_type_id, section_id, name, label, label_ar, sort_order
       FROM field_groups WHERE business_type_id IN (${ph}) AND active = 1`,
    typeIds,
  );
  return indexByTypePriority(rows, typeIds, (r) => r.name);
}

/** One authored answer, locale-resolved (the Arabic override is "<name>_ar"). */
function resolveFieldView(
  f: FieldDef, values: Record<string, unknown>, locale: SiteLocale,
): FieldView {
  const arOverride = locale === 'ar' ? values[`${f.name}_ar`] : undefined;
  return {
    name: f.name,
    label: loc(f.label, f.label_ar, locale) ?? (locale === 'ar' ? '' : f.name),
    label_ar: f.label_ar,
    field_type: f.field_type,
    value: displayValue(arOverride ?? values[f.name], f.field_type, locale),
  };
}

function buildGroups(
  fields: FieldDef[], groupDefs: GroupDef[], values: Record<string, unknown>, locale: SiteLocale,
): FieldGroupView[] {
  if (!fields.length) return [];
  const metaByName = new Map(groupDefs.map((g) => [g.name, g]));

  const byKey = new Map<string, FieldView[]>();
  for (const f of fields) {
    const gk = f.group_key || 'general';
    const fv = resolveFieldView(f, values, locale);
    if (!byKey.has(gk)) byKey.set(gk, []);
    byKey.get(gk)!.push(fv);
  }

  // Preserve group order from field_groups, then any orphan keys.
  const orderedKeys: string[] = [];
  for (const g of groupDefs) if (byKey.has(g.name) && !orderedKeys.includes(g.name)) orderedKeys.push(g.name);
  for (const k of byKey.keys()) if (!orderedKeys.includes(k)) orderedKeys.push(k);

  return orderedKeys.map((key) => {
    const meta = metaByName.get(key);
    return {
      key,
      label: loc(meta?.label ?? null, meta?.label_ar ?? null, locale) ?? (locale === 'ar' ? '' : key),
      label_ar: meta?.label_ar ?? null,
      fields: byKey.get(key)!.filter((f) => f.value !== null && f.label !== ''),
    };
  }).filter((g) => g.fields.length);
}

// ── gallery: unbound images (grid) + value-bound slides (carousel) ───────────
interface GalleryRow {
  id: string; url: string; caption: string | null; caption_ar: string | null;
  media_data: string | null; group_key: string | null; display_order: number;
  is_hero: number; placement: string;
  field_key: string | null; field_section_id: string | null;
  media_type: string | null; video_id: string | null;
}

/**
 * Media rows for one shelf.
 *
 * `unitId` splits the two readings of the same table. With it, the rows are one
 * car's photographs. Without it, the query asks for `unit_id IS NULL`, which is
 * what keeps a showroom's own wall from being assembled out of five hundred
 * cars' pictures now that its listings live in `units`.
 */
async function loadGalleryRows(
  businessId: string,
  sectionId: string,
  unitId?: string | null,
): Promise<GalleryRow[]> {
  return query<GalleryRow>(
    `SELECT id, url, caption, caption_ar, media_data, group_key, display_order,
            is_hero, placement, field_key, field_section_id, media_type, video_id
       FROM vendor_gallery
      WHERE business_id = ? AND section_id = ? AND show_on_minisite = 1 AND approval_status = 'approved'
        AND ${unitId ? 'unit_id = ?' : 'unit_id IS NULL'}
      ORDER BY display_order`,
    unitId ? [businessId, sectionId, unitId] : [businessId, sectionId],
  );
}

/**
 * The same rows for several shelves at once.
 *
 * A unit page shows every shelf it holds an answer for, and calling the
 * single-shelf reader in a loop would cost one D1 round trip per shelf for what
 * is one indexed query. `section_id` comes back because the caller has to put
 * each row back under the shelf that authored it.
 */
async function loadGalleryRowsMany(
  businessId: string,
  sectionIds: string[],
  unitId?: string | null,
): Promise<Array<GalleryRow & { section_id: string }>> {
  if (!sectionIds.length) return [];
  const ph = sectionIds.map(() => '?').join(',');
  return query<GalleryRow & { section_id: string }>(
    `SELECT id, section_id, url, caption, caption_ar, media_data, group_key, display_order,
            is_hero, placement, field_key, field_section_id, media_type, video_id
       FROM vendor_gallery
      WHERE business_id = ? AND section_id IN (${ph})
        AND show_on_minisite = 1 AND approval_status = 'approved'
        AND ${unitId ? 'unit_id = ?' : 'unit_id IS NULL'}
      ORDER BY display_order`,
    unitId ? [businessId, ...sectionIds, unitId] : [businessId, ...sectionIds],
  );
}

function readOverlay(raw: string | null, locale: SiteLocale): { title: string | null; subtitle: string | null } {
  const o = raw ? parseJson<Record<string, unknown> | null>(raw, null) : null;
  if (!o) return { title: null, subtitle: null };
  return {
    title: loc(o.title as string, o.title_ar as string, locale),
    subtitle: loc(o.subtitle as string, o.subtitle_ar as string, locale),
  };
}

// ── slide presentation ────────────────────────────────────────────────
//
// Everything the carousel needs to *stage* a slide lives inside the existing
// `vendor_gallery.media_data` JSON, so the feature ships without a migration and
// a row authored before it existed still renders on the shelf defaults.
const ANIMATIONS = ['kenburns', 'fade', 'zoom', 'slide'] as const;
const FITS = ['cover', 'contain'] as const;
const POSITIONS = ['center', 'top', 'bottom'] as const;
const ALIGNS = ['start', 'center', 'end'] as const;
const DISPLAY_MODES = ['media', 'text_only'] as const;

type SlideStage = Partial<Omit<SlideMedia, 'mediaType' | 'videoId'>>;

function pickIn<T extends string>(v: unknown, allowed: readonly T[]): T | undefined {
  return typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : undefined;
}

function positive(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : undefined;
}

function phrase(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() ? v.trim().slice(0, 240) : undefined;
}

/**
 * The staging half of `media_data`. Unknown keys and out-of-range values are
 * dropped rather than guessed at, because this blob is hand-editable and a typo
 * must degrade to the default, never to a broken pane.
 */
function readStage(raw: string | null): SlideStage {
  const o = raw ? parseJson<Record<string, unknown> | null>(raw, null) : null;
  if (!o) return {};
  const stage: SlideStage = {};
  const animation = pickIn(o.animation, ANIMATIONS); if (animation) stage.animation = animation;
  const imageFit = pickIn(o.imageFit, FITS); if (imageFit) stage.imageFit = imageFit;
  const imagePosition = pickIn(o.imagePosition, POSITIONS); if (imagePosition) stage.imagePosition = imagePosition;
  const textAlign = pickIn(o.textAlign, ALIGNS); if (textAlign) stage.textAlign = textAlign;
  const displayMode = pickIn(o.displayMode, DISPLAY_MODES); if (displayMode) stage.displayMode = displayMode;
  const overlay = typeof o.overlayOpacity === 'number' ? o.overlayOpacity : undefined;
  if (overlay !== undefined && Number.isFinite(overlay)) stage.overlayOpacity = Math.min(1, Math.max(0, overlay));
  const transition = positive(o.transition); if (transition) stage.transition = transition;
  const maxDuration = positive(o.maxDuration); if (maxDuration) stage.maxDuration = maxDuration;
  const titleSize = positive(o.titleSize); if (titleSize) stage.titleSize = titleSize;
  const subtitleSize = positive(o.subtitleSize); if (subtitleSize) stage.subtitleSize = subtitleSize;
  const color = phrase(o.titleColor); if (color && /^(#[0-9a-f]{3,8}|[a-z]+)$/i.test(color)) stage.titleColor = color;
  const bg = phrase(o.bgColor); if (bg && /^(#[0-9a-f]{3,8}|[a-z]+)$/i.test(bg)) stage.bgColor = bg;
  const font = phrase(o.fontFamily); if (font) stage.fontFamily = font;
  const watermark = phrase(o.watermark); if (watermark) stage.watermark = watermark;
  const ctaText = phrase(o.ctaText); if (ctaText) stage.ctaText = ctaText;
  if (o.showCaption === false) stage.showCaption = false;
  const ctaLink = phrase(o.ctaLink);
  // A slide may point at an in-page shelf or out at the world; both are authored
  // links, so both are kept -- but only in shapes a browser can be trusted with.
  if (ctaLink && /^(https?:\/\/|\/|#|mailto:|tel:)/i.test(ctaLink)) stage.ctaLink = ctaLink;
  const target = phrase(o.targetSectionId); if (target) stage.targetSectionId = target;
  const caption = phrase(o.caption); if (caption) stage.caption = caption;
  const blocks = sanitizeSlideBlocks(o.blocks, { trusted: true });
  if (blocks.length) stage.blocks = blocks;
  return stage;
}

/** A YouTube link pasted straight into the media field is still a video. */
function ytIdFromUrl(url: string | null): string | null {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  return m ? m[1] : null;
}

/**
 * What kind of media a row actually holds.
 *
 * `media_type`/`video_id` are the columns the admin writes, and an unbound
 * thumbnail URL is not an image to display when it is a video's poster: reading
 * the declared type is what makes an embedded walkaround play instead of sitting
 * still. A missing declaration falls back to sniffing the URL, so a hand-inserted
 * row behaves too.
 */
function mediaOf(r: Pick<GalleryRow, 'url' | 'media_type' | 'video_id'>): {
  mediaType: SlideMedia['mediaType']; videoId: string | null;
} {
  const videoId = r.video_id?.trim() || ytIdFromUrl(r.url);
  switch (r.media_type) {
    case 'youtube': return { mediaType: 'youtube', videoId };
    case 'video': return videoId ? { mediaType: 'youtube', videoId } : { mediaType: 'video', videoId: null };
    case 'embed': return videoId
      ? { mediaType: 'youtube', videoId }
      : { mediaType: 'embed', videoId: null };
    case 'branded': return { mediaType: 'branded', videoId: null };
    default: return videoId ? { mediaType: 'youtube', videoId } : { mediaType: 'image', videoId: null };
  }
}

const targetOf = (sectionId: string, r: Pick<GalleryRow, 'field_key' | 'field_section_id'>) =>
  `${r.field_section_id ?? sectionId}::${r.field_key}`;

function splitTarget(target: string): [string, string] {
  const i = target.indexOf('::');
  return i < 0 ? [target, ''] : [target.slice(0, i), target.slice(i + 2)];
}

function findField(
  fieldsBySection: Map<string, FieldDef[]>, target: string,
): FieldDef | null {
  const [sec, key] = splitTarget(target);
  return (fieldsBySection.get(sec) ?? []).find((f) => f.name === key) ?? null;
}

/** The authored answer behind a binding, read from the OWNING section's bag. */
function boundValue(
  f: FieldDef, target: string,
  customData: Record<string, Record<string, unknown>>, locale: SiteLocale,
): string | null {
  const [sec] = splitTarget(target);
  return resolveFieldView(f, customData[sec] ?? {}, locale).value;
}

/**
 * Caption #2 from the bound field GROUP, resolved through the field definitions.
 * The version this replaces read the flat value bag directly and took the first
 * four entries of the whole SECTION, so an image bound to group 'economy' inside
 * Specifications would have advertised engine power. Groups are a property of
 * the definition, not of storage order, so they can only be honoured by joining.
 */
function groupCaption(
  groups: FieldGroupView[], groupKey: string | null, max = 4,
): string | null {
  if (!groupKey) return null;
  const group = groups.find((g) => g.key === groupKey);
  if (!group) return null;
  const parts = group.fields.map((f) => f.value).filter((v): v is string => !!v);
  if (!parts.length) return null;
  const shown = parts.slice(0, max);
  const extra = parts.length - shown.length;
  return extra > 0 ? `${shown.join(' · ')} +${extra}` : shown.join(' · ');
}

/** Grid tiles: unbound images, plus bound ones that explicitly repeat there. */
function toGalleryItems(
  rows: GalleryRow[], groups: FieldGroupView[], locale: SiteLocale,
): GalleryItem[] {
  return rows
    .filter((r) => !r.field_key || r.placement === 'body' || r.placement === 'both')
    .map((r) => {
      const overlay = readOverlay(r.media_data, locale);
      const media = mediaOf(r);
      return {
        id: r.id, url: r.url,
        caption: loc(r.caption, r.caption_ar, locale) ?? '',
        caption2Title: overlay.title ?? groupCaption(groups, r.group_key),
        caption2Subtitle: overlay.subtitle,
        is_hero: r.is_hero, placement: r.placement,
        fieldKey: r.field_key, fieldSectionId: r.field_section_id,
        mediaType: media.mediaType, videoId: media.videoId,
      };
    });
}

function makeSlide(
  r: GalleryRow, target: string,
  fieldsBySection: Map<string, FieldDef[]>,
  customData: Record<string, Record<string, unknown>>, locale: SiteLocale,
): Slide {
  const [sec, key] = splitTarget(target);
  const f = findField(fieldsBySection, target);
  const overlay = readOverlay(r.media_data, locale);
  const caption1 = loc(r.caption, r.caption_ar, locale);
  const answer = f ? boundValue(f, target, customData, locale) : null;
  // A price is written as a price, in one form shared with the slide blocks.
  const value = answer ? maybeFormatPriceField(key, answer, locale === 'ar') : null;
  const notes = [overlay.title, overlay.subtitle].filter((v): v is string => !!v);
  return {
    // Staging first, so the identity and the value below can never be overwritten
    // by a stray `title` inside the media blob.
    ...readStage(r.media_data),
    ...mediaOf(r),
    id: r.id,
    fieldKey: key,
    fieldSectionId: sec,
    eyebrow: f ? (loc(f.label, f.label_ar, locale) ?? (locale === 'ar' ? '' : key)) : (locale === 'ar' ? '' : key),
    // The value is the headline -- the photo exists to prove it. The row's own
    // caption demotes to a note, and an explicit overlay wins over it.
    title: value ?? caption1 ?? key,
    note: notes.length ? notes.join(' · ') : (value ? caption1 : null),
    url: r.url,
    isHero: r.is_hero,
    placeholder: false,
  };
}

/**
 * Is this field a slide?
 *
 * `destination` is the author's explicit routing and wins outright; `show_as_slide`
 * is the typology's default underneath it. `hidden` answers exist in storage and
 * are printed nowhere, which is what makes an internal note safe to keep on the
 * same record as a public one.
 */
function carouselEligible(f: FieldDef): boolean {
  if (f.destination === 'hidden') return false;
  if (f.destination) return f.destination === 'carousel' || f.destination === 'both';
  return f.show_as_slide === 1;
}

/**
 * Every answer on this business that a slide block is allowed to print, keyed by
 * field name and again by section.
 *
 * A block reads its own section first, so two sections asking the same question
 * (`price`, `address`) cannot print each other's answer. Fields routed to the
 * body or hidden never enter this index at all, so no block can name them back
 * onto a slide. Stored-only answers -- typed before a definition existed -- join
 * with their key humanized as the label, because nobody wrote a translation for
 * them and inventing one here would be a fabrication.
 */
function buildFieldsIndex(
  fieldsBySection: Map<string, FieldDef[]>,
  groupsBySection: Map<string, GroupDef[]>,
  customData: Record<string, Record<string, unknown>>,
  locale: SiteLocale,
): SlideFieldsIndex {
  const flat: FlatFieldsIndex = {};
  const bySection: Record<string, FlatFieldsIndex> = {};
  const groupLabels: Record<string, { en: string; ar?: string | null }> = {};
  // `custom_data.field_visibility[sectionId][fieldName]` — the older two-state mask
  // that sits alongside the four-state `field_destinations` on `form_fields`.
  const visibility =
    (customData as Record<string, Record<string, Record<string, string>>>)['field_visibility'] ?? {};

  for (const [sectionId, defs] of fieldsBySection) {
    const values = customData[sectionId] ?? {};
    const masked: Record<string, string> = visibility[sectionId] ?? {};
    const bucket: FlatFieldsIndex = {};

    for (const f of defs) {
      if (f.destination === 'hidden' || f.destination === 'body') continue;
      if (masked[f.name] === 'hide_field') continue;
      const view = resolveFieldView(f, values, locale);
      const resolved: ResolvedField = {
        label: view.label,
        value: view.value ?? '',
        valueHidden: masked[f.name] === 'hide_value',
        ...(f.group_key ? { groupKey: f.group_key } : {}),
      };
      if (!bucket[f.name]) bucket[f.name] = resolved;
      // First write wins across sections too, so an unscoped block cannot be
      // flipped by whichever section the map happened to iterate first.
      if (!flat[f.name]) flat[f.name] = resolved;
    }

    for (const [name, raw] of Object.entries(values)) {
      if (!name || name.startsWith('_') || name.endsWith('_ar')) continue;
      if (STORED_KEY_SKIP.has(name) || !isPrintable(raw)) continue;
      if (bucket[name] || flat[name]) continue;
      if (masked[name] === 'hide_field') continue;
      const resolved: ResolvedField = {
        label: humanizeStoredKey(name),
        value: masked[name] === 'hide_value' ? '' : stringifyFieldValue(raw),
        valueHidden: masked[name] === 'hide_value',
        fromStoredValue: true,
      };
      bucket[name] = resolved;
      if (!flat[name]) flat[name] = resolved;
    }

    bySection[sectionId] = bucket;
    for (const g of groupsBySection.get(sectionId) ?? []) {
      groupLabels[`${sectionId}:${g.name}`] = {
        en: g.label || humanizeStoredKey(g.name),
        ar: g.label_ar,
      };
    }
  }
  return { flat, bySection, groupLabels };
}

/**
 * Slides for one section, in two passes:
 *   1. every field flagged `show_as_slide` in THIS section gets a slide -- and a
 *      field with no photo yet gets a labelled placeholder, so an unfinished
 *      minisite advertises itself instead of looking merely empty;
 *   2. any bound image whose target was not already emitted still counts: an
 *      explicit binding is authoring intent and outranks the typology flag.
 *      Pass 2 is also how a cross-section binding gets its turn (an engine-bay
 *      shot advertising a Top Speed that is authored under Specifications).
 * Order follows form_fields.sort_order, so the carousel reads in the same order
 * as the body grid beneath it.
 */
function buildSlides(
  sectionId: string, rows: GalleryRow[],
  fieldsBySection: Map<string, FieldDef[]>,
  customData: Record<string, Record<string, unknown>>, locale: SiteLocale,
): Slide[] {
  const eligible = (fieldsBySection.get(sectionId) ?? []).filter(carouselEligible);
  const bound = rows.filter((r) => r.field_key);
  const slides: Slide[] = [];
  const emitted = new Set<string>();

  for (const f of eligible) {
    const target = `${sectionId}::${f.name}`;
    const shots = bound.filter((r) => targetOf(sectionId, r) === target);
    if (shots.length) {
      for (const r of shots) {
        slides.push(makeSlide(r, target, fieldsBySection, customData, locale));
        emitted.add(r.id);
      }
    } else {
      // No media yet: the slide still carries its value, staged as a typographic
      // pane rather than a photo the visitor can only imagine.
      slides.push({
        id: `placeholder-${target}`,
        fieldKey: f.name,
        fieldSectionId: sectionId,
        eyebrow: loc(f.label, f.label_ar, locale) ?? (locale === 'ar' ? '' : f.name),
        title: boundValue(f, target, customData, locale) ?? '',
        note: null, url: null, isHero: 0, placeholder: true,
        mediaType: 'branded', videoId: null,
      });
    }
  }

  for (const r of bound) {
    if (emitted.has(r.id)) continue;
    slides.push(makeSlide(r, targetOf(sectionId, r), fieldsBySection, customData, locale));
  }
  return slides;
}

/** How many frames one car is allowed to take in a showroom showreel. */
const SHOWREEL_PER_CHILD = 3;
/** ...and how many when the car has no photographs yet: its authored facts stand in. */
const SHOWREEL_FACTS_PER_CHILD = 2;
const SHOWREEL_MAX = 12;
/** Frames a shelf may borrow from the other shelves of the same business. */
const HIGHLIGHT_MAX = 8;
/** Fact frames a leaf page may borrow when nothing anywhere is photographed. */
const HIGHLIGHT_FACTS = 4;

/**
 * What a buyer decides on, in the order a fact frame should say it: the money,
 * then what the car does, then how it looks. Matched on the field's name rather
 * than a fixed list of ids, because the typology grows new fields and an unknown
 * question still belongs behind a known one, not in front of it.
 */
const ADVERTISE_FIRST: RegExp[] = [
  /^price/i, /year$/, /mileage/i, /power|_hp/i, /torque/i, /zero_to|acceleration/i,
  /range|consumption|fuel/i, /top_speed/i, /paint|color/i, /wheels/i, /seats/i,
];

function advertiseFirst(fields: FieldDef[]): FieldDef[] {
  const rank = (name: string) => {
    const i = ADVERTISE_FIRST.findIndex((re) => re.test(name));
    return i < 0 ? ADVERTISE_FIRST.length : i;
  };
  return fields
    .map((f, i) => ({ f, i }))
    .sort((a, b) => (rank(a.f.name) - rank(b.f.name)) || (a.i - b.i))
    .map((x) => x.f);
}

/**
 * Frames made of typed answers rather than photographs.
 *
 * Each one headlines a value the owner authored and credits the question it
 * answers, over the glass plate that admits no photograph exists yet. This is the
 * honest stand-in for a hero with nothing to show: it advertises the record, not
 * a picture nobody took.
 *
 * `local` says whose record the values belong to. On the owner's own page a frame
 * may lead to the shelf that holds the field; borrowed from a child it may not,
 * because that section id names a shelf on the child's minisite. Either way the
 * value is not bound as a slide's field key: claiming a key suppresses it from
 * the body grid, and a frame standing in for missing photography has not printed
 * the answer where the grid can see it.
 */
function factFrames(
  fields: FieldDef[],
  values: Record<string, Record<string, unknown>>,
  locale: SiteLocale,
  cap: number,
  frame: { owner: string; idPrefix: string; ctaLink: string; local: boolean },
): Slide[] {
  const out: Slide[] = [];
  const shown = new Set<string>();
  for (const f of fields) {
    if (out.length >= cap) break;
    // An eligible field nobody answered has nothing to advertise.
    const answer = boundValue(f, `${f.section_id}::${f.name}`, values, locale);
    if (!answer) continue;
    // Money is written the way the slide blocks write it, so a hero and a block
    // can never disagree about what the same answer looks like.
    const title = maybeFormatPriceField(f.name, answer, locale === 'ar');
    // Two questions can carry one answer -- "Colour" under Price, "Paint finish"
    // under Exterior. A second frame with the same headline is an echo, not news.
    if (shown.has(title)) continue;
    shown.add(title);
    out.push({
      id: `${frame.idPrefix}-${f.section_id}-${f.name}`,
      fieldKey: '',
      fieldSectionId: '',
      eyebrow: frame.owner,
      title,
      note: loc(f.label, f.label_ar, locale),
      url: null,
      isHero: 0,
      placeholder: true,
      mediaType: 'branded',
      videoId: null,
      blocks: undefined,
      targetSectionId: frame.local ? f.section_id : null,
      watermark: null,
      ctaLink: frame.ctaLink,
    });
  }
  return out;
}

interface ShowreelChild {
  id: string; name: string; name_ar: string | null; slug: string;
  type_id: string; custom_data: string | null;
  type_name: string | null; type_name_ar: string | null;
}

/**
 * The network showreel: what a shelf shows when its owner has photographed cars
 * rather than walls.
 *
 * A showroom sells its children's inventory and almost never has media of its
 * own. Rather than an empty hero -- or a decorative one built from pictures
 * nobody took -- the carousel takes one frame per published child that authored
 * a carousel image or film, headed with that car's own name, and hands the
 * visitor to the car's minisite. Every pixel is uploaded authoring; nothing here
 * is generated, and a business with no media anywhere simply has no showreel.
 *
 * A car with no media at all is not a car with nothing to say: it has the
 * numbers its owner typed. Those get a glass frame with the value as its
 * headline and the honest "photograph to come" plate behind it, which is the
 * same treatment the car's own section gives an unfinished field.
 *
 * The child's own slide *dressing* is deliberately dropped. Blocks and
 * `targetSectionId` name field keys inside the child's record, and resolving
 * them against this business would print another car's numbers as this one's.
 */
async function buildNetworkShowreel(businessId: string, locale: SiteLocale): Promise<Slide[]> {
  const children = await query<ShowreelChild>(
    `SELECT b.id, b.name, b.name_ar, b.slug, b.type_id, b.custom_data,
            t.name AS type_name, t.name_ar AS type_name_ar
       FROM businesses b
       LEFT JOIN business_types t ON t.id = b.type_id
      WHERE b.parent_business_id = ? AND b.published = 1
      ORDER BY b.name`,
    [businessId],
  );
  if (!children.length) return [];

  const media = await query<GalleryRow & { child_id: string }>(
    `SELECT g.id, g.url, g.caption, g.caption_ar, g.media_data, g.group_key, g.display_order,
            g.is_hero, g.placement, g.field_key, g.field_section_id, g.media_type, g.video_id,
            g.business_id AS child_id
       FROM vendor_gallery g
      WHERE g.business_id IN (${children.map(() => '?').join(',')})
        AND g.show_on_minisite = 1 AND g.approval_status = 'approved'
        AND g.placement IN ('carousel', 'both')
      ORDER BY g.is_hero DESC, g.display_order`,
    children.map((c) => c.id),
  );

  // Definitions are read from the CHILD's type, so a frame labels a value with
  // the wording that belongs to that record rather than the showroom's.
  const typeIds = [...new Set(children.map((c) => c.type_id))];
  const defs = await query<FieldDef>(
    `SELECT business_type_id, section_id, name, label, label_ar, field_type, group_key,
            sort_order, show_as_slide, destination
       FROM form_fields
      WHERE business_type_id IN (${typeIds.map(() => '?').join(',')})
      ORDER BY business_type_id, section_id, sort_order`,
    typeIds,
  );
  const factsByType = new Map<string, FieldDef[]>();
  for (const f of defs) {
    if (!carouselEligible(f)) continue;
    const list = factsByType.get(f.business_type_id);
    if (list) list.push(f);
    else factsByType.set(f.business_type_id, [f]);
  }

  const slides: Slide[] = [];
  for (const child of children) {
    if (slides.length >= SHOWREEL_MAX) break;
    const room = SHOWREEL_MAX - slides.length;
    const name = loc(child.name, child.name_ar, locale) ?? (locale === 'ar' ? '' : child.slug);
    const kind = loc(child.type_name, child.type_name_ar, locale) ?? '';
    const cta = localePath(locale, [child.slug]);
    const frames: Slide[] = [];

    for (const r of media.filter((m) => m.child_id === child.id).slice(0, Math.min(SHOWREEL_PER_CHILD, room))) {
      frames.push({
        ...readStage(r.media_data),
        ...mediaOf(r),
        id: `showreel-${r.id}`,
        fieldKey: r.field_key ?? '',
        fieldSectionId: r.field_section_id ?? '',
        eyebrow: kind,
        title: name,
        note: loc(r.caption, r.caption_ar, locale),
        url: r.url,
        isHero: r.is_hero,
        placeholder: false,
        blocks: undefined,
        targetSectionId: null,
        watermark: null,
        ctaLink: cta,
      });
    }

    if (!frames.length) {
      const values = parseJson<Record<string, Record<string, unknown>>>(child.custom_data, {});
      // Answered fields only, and in their authored order: the definition list is
      // walked rather than sliced up front, because two empty questions must not
      // crowd out the facts the owner actually typed.
      frames.push(...factFrames(advertiseFirst(factsByType.get(child.type_id) ?? []), values, locale,
        Math.min(SHOWREEL_FACTS_PER_CHILD, room),
        { owner: name, idPrefix: `showreel-fact-${child.id}`, ctaLink: cta, local: false }));
    }

    slides.push(...frames);
  }
  return slides;
}

/**
 * The highlight reel for a shelf that carries no media of its own.
 *
 * A car opens on Overview, and Overview is where a buyer decides -- but its
 * photographs are authored under Exterior and its numbers under Specifications.
 * So the hero reads this business's own rows across every shelf it owns, never
 * another business's, and keeps the contracts the shelf itself would honour: the
 * approval gate, the value binding, and the claimed-key dedupe.
 *
 * Each frame points back at the shelf the media lives on, so a pane that
 * interests the visitor is one step from the full section. Nothing here is
 * generated: a business with no media anywhere falls through to its facts.
 */
async function buildOwnHighlightReel(
  business: { id: string; name: string; name_ar: string | null; slug: string },
  fieldsBySection: Map<string, FieldDef[]>,
  customData: Record<string, Record<string, unknown>>,
  locale: SiteLocale,
): Promise<Slide[]> {
  const rows = await query<GalleryRow & { section_id: string | null }>(
    `SELECT id, url, caption, caption_ar, media_data, group_key, display_order, is_hero,
            placement, field_key, field_section_id, media_type, video_id, section_id
       FROM vendor_gallery
      WHERE business_id = ? AND show_on_minisite = 1 AND approval_status = 'approved'
        AND placement IN ('carousel', 'both')
      ORDER BY is_hero DESC, display_order`,
    [business.id],
  );

  const owner = loc(business.name, business.name_ar, locale) ?? '';
  const cta = localePath(locale, [business.slug]);

  if (rows.length) {
    return rows.slice(0, HIGHLIGHT_MAX).map((r) => (r.field_key
      ? {
          ...makeSlide(r, targetOf(r.section_id ?? '', r), fieldsBySection, customData, locale),
          targetSectionId: r.section_id ?? null,
        }
      : {
          ...readStage(r.media_data),
          ...mediaOf(r),
          id: r.id,
          fieldKey: '',
          fieldSectionId: '',
          eyebrow: owner,
          // An unbound frame has no value to headline, so its own caption leads.
          title: loc(r.caption, r.caption_ar, locale) ?? '',
          note: null,
          url: r.url,
          isHero: r.is_hero,
          placeholder: false,
          targetSectionId: r.section_id ?? null,
          ctaLink: cta,
        }));
  }

  // Nothing photographed anywhere: the facts the owner did type carry the hero.
  const facts = advertiseFirst([...fieldsBySection.values()].flat().filter(carouselEligible));
  return factFrames(facts, customData, locale, HIGHLIGHT_FACTS,
    { owner, idPrefix: `highlight-fact-${business.id}`, ctaLink: cta, local: true });
}

// ── blogs ────────────────────────────────────────────────────────────────────
async function buildBlogs(businessId: string, sectionId: string, locale: SiteLocale): Promise<BlogEntry[]> {
  const rows = await query<{ id: string; title: string | null; title_ar: string | null; content: string | null; content_ar: string | null }>(
    `SELECT id, title, title_ar, content, content_ar FROM section_blogs
      WHERE business_id = ? AND section_id = ? AND show_on_minisite = 1 AND status = 'published'`,
    [businessId, sectionId],
  );
  return rows.map((r) => ({
    id: r.id,
    title: loc(r.title, r.title_ar, locale) ?? '',
    content: loc(r.content, r.content_ar, locale) ?? '',
  }));
}

// ── graph shelves ────────────────────────────────────────────────────────────
async function buildShelf(spec: RelationshipSpec, businessId: string, section: Section, locale: SiteLocale): Promise<GraphShelf | null> {
  const direction = spec.direction ?? 'out';
  let items: ShelfItem[] = [];

  if (spec.relation === 'children') {
    const typeFilter = spec.scope ? 'AND b.type_id = ?' : '';
    const params = spec.scope ? [businessId, spec.scope] : [businessId];
    const rows = await query<{ id: string; name: string; name_ar: string | null; slug: string; type_id: string }>(
      `SELECT b.id, b.name, b.name_ar, b.slug, b.type_id
         FROM businesses b
        WHERE b.parent_business_id = ? AND b.published = 1 ${typeFilter}
        ORDER BY b.name`,
      params,
    );
    items = rows.map((r) => ({ id: r.id, name: r.name, name_ar: r.name_ar, slug: r.slug, type_id: r.type_id, meta: null }));
  } else {
    // Graph edge: join the "other side" of a typed relationship.
    const build = (side: 'out' | 'in') =>
      query<{ id: string; name: string; name_ar: string | null; slug: string; type_id: string; role_data: string | null }>(
        `SELECT o.id, o.name, o.name_ar, o.slug, o.type_id, r.role_data
           FROM business_relationships r
           JOIN businesses o ON o.id = ${side === 'out' ? 'r.to_business_id' : 'r.from_business_id'}
          WHERE r.${side === 'out' ? 'from' : 'to'}_business_id = ? AND r.relation_type = ? AND o.published = 1
          ORDER BY o.name`,
        [businessId, spec.relation],
      );
    let rows: Array<{ id: string; name: string; name_ar: string | null; slug: string; type_id: string; role_data: string | null }> = [];
    if (direction === 'out' || direction === 'both') rows = rows.concat(await build('out'));
    if (direction === 'in' || direction === 'both') rows = rows.concat(await build('in'));
    const seen = new Set<string>();
    items = rows.filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true))).map((r) => {
      const role = r.role_data ? parseJson<Record<string, unknown>>(r.role_data, {}) : {};
      const meta = loc(role.line as string, role.line_ar as string, locale)
        || loc(role.plan as string, role.plan_ar as string, locale);
      return { id: r.id, name: r.name, name_ar: r.name_ar, slug: r.slug, type_id: r.type_id, meta: meta ?? null };
    });
  }

  if (!items.length) return null;
  return {
    label: loc(section.name, section.name_ar, locale) ?? (locale === 'ar' ? '' : section.name),
    as: spec.as ?? 'cards',
    items,
  };
}

// ── public entrypoint ────────────────────────────────────────────────────────
export interface FeaturedItem {
  id: string; slug: string; name: string; name_ar: string | null;
  type_id: string; typeName: string | null; typeName_ar: string | null;
}

/**
 * Root nodes for the home showcase, ordered so car brands lead, then the
 * consumer-facing vendors (dealers, agencies, service, finance, insurance).
 * Pure-infrastructure kinds (factory) are excluded from the landing.
 */
export async function listFeatured(): Promise<FeaturedItem[]> {
  const rows = await query<FeaturedItem>(
    `SELECT b.id, b.slug, b.name, b.name_ar, b.type_id,
            bt.name AS typeName, bt.name_ar AS typeName_ar
       FROM businesses b
       LEFT JOIN business_types bt ON bt.id = b.type_id
      WHERE b.parent_business_id IS NULL AND b.published = 1 AND b.status = 'active'
        AND b.type_id <> 'factory'
      ORDER BY
        CASE b.type_id
          WHEN 'vehicle_brand'   THEN 0
          WHEN 'main_agency'      THEN 1
          WHEN 'showroom'         THEN 2
          WHEN 'distributor'      THEN 3
          WHEN 'used_car_dealer'  THEN 4
          WHEN 'agent_broker'     THEN 5
          WHEN 'service_center'   THEN 6
          WHEN 'spare_parts'      THEN 7
          ELSE 8
        END,
        b.name`,
  );
  return rows;
}

export async function loadMinisite(
  slug: string,
  locale: SiteLocale,
  sectionId?: string | null,
): Promise<MinisiteView | null> {
  const business = await queryOne<{
    id: string; name: string; name_ar: string | null; slug: string;
    type_id: string; custom_data: string; path: string | null;
    parent_business_id: string | null;
  }>(
    `SELECT id, name, name_ar, slug, type_id, custom_data, path, parent_business_id
       FROM businesses WHERE slug = ? AND published = 1 AND status = 'active'`,
    [slug],
  );
  if (!business) return null;

  const typeRow = await queryOne<{ id: string; name: string; name_ar: string | null }>(
    'SELECT id, name, name_ar FROM business_types WHERE id = ?',
    [business.type_id],
  );

  const sections = await resolveSections(business.type_id);
  const activeSection =
    (sectionId && sections.find((s) => s.id === sectionId)) || sections[0] || null;

  const customData = parseJson<Record<string, Record<string, unknown>>>(business.custom_data, {});

  // Definitions are resolved once for the whole tree, then indexed by section:
  // a slide may point at a field owned by another section, so per-section
  // loading would not be able to answer it.
  const typeIds = await fieldTypePriority(business.id, business.type_id);
  const fieldsBySection = await loadFieldDefs(typeIds);
  const groupsBySection = await loadGroupDefs(typeIds);

  let active: ActiveSectionView | null = null;
  if (activeSection) {
    const values = customData[activeSection.id] ?? {};
    const groups = buildGroups(
      fieldsBySection.get(activeSection.id) ?? [],
      groupsBySection.get(activeSection.id) ?? [],
      values, locale,
    );
    // One round trip for both surfaces: the grid tiles and the value slides are
    // two readings of the same rows, and splitting them in SQL would mean a
    // second query for every section view.
    const rows = activeSection.enable_gallery
      ? await loadGalleryRows(business.id, activeSection.id)
      : [];
    const gallery = toGalleryItems(rows, groups, locale);
    const ownSlides = activeSection.enable_gallery
      ? buildSlides(activeSection.id, rows, fieldsBySection, customData, locale)
      : [];
    // An empty shelf on a business that contains other businesses is not an
    // empty showroom: read the network instead of printing nothing. And a leaf
    // whose open shelf holds no media is not a page with nothing to show: read
    // its own other shelves. Both borrow real authoring; neither invents a frame.
    let slides = ownSlides;
    if (!slides.length) slides = await buildNetworkShowreel(business.id, locale);
    if (!slides.length) {
      slides = await buildOwnHighlightReel(business, fieldsBySection, customData, locale);
    }
    const blogs = activeSection.enable_blog
      ? await buildBlogs(business.id, activeSection.id, locale)
      : [];
    const shelves: GraphShelf[] = [];
    for (const spec of activeSection.options.relationship ?? []) {
      const shelf = await buildShelf(spec, business.id, activeSection, locale);
      if (shelf) shelves.push(shelf);
    }
    active = { section: activeSection, groups, gallery, slides, shelves, blogs };
  }

  const ancestry = await getAncestry(business.id);
  const siteProfile = await loadSiteProfile('business', business.id);

  // Contact first from this record, then from the ancestor that actually owns it:
  // a leaf listing must still be callable.
  const ownContact = findContact(customData);
  const contact = Object.keys(ownContact).length
    ? ownContact
    : await inheritedContact(business.parent_business_id, new Set([business.id]));

  // Blocks resolve against the whole business, not the open shelf: a photo under
  // Exterior is allowed to quote a range authored under Specifications, which is
  // the same cross-section contract `vendor_gallery.field_section_id` already
  // offers. The claimed set comes after it, because a key only counts as printed
  // once the slides that carry it exist.
  const fieldsIndex = buildFieldsIndex(fieldsBySection, groupsBySection, customData, locale);
  const claimed = toClaimedKeys(active?.slides ?? [], fieldsIndex);
  const specifications = sections.map((section) => ({
    section,
    groups: buildGroups(
      fieldsBySection.get(section.id) ?? [],
      groupsBySection.get(section.id) ?? [],
      customData[section.id] ?? {},
      locale,
    ),
  }));

  return {
    locale,
    siteProfile,
    business: {
      id: business.id, slug: business.slug, name: business.name, name_ar: business.name_ar,
      type_id: business.type_id,
      typeName: typeRow?.name ?? business.type_id,
      typeName_ar: typeRow?.name_ar ?? null,
      identity: customData['sec_1_identity'] ?? {},
      contact,
    },
    sections,
    specifications,
    active,
    activeSectionId: activeSection?.id ?? null,
    ancestry,
    fieldsIndex,
    claimed,
    carousel: activeSection?.options.carousel ?? {},
  };
}

/** Sets to printable keys, in the one shape the body grid understands. */
function toClaimedKeys(slides: Slide[], index: SlideFieldsIndex): ClaimedKeys {
  const found = extractClaimedFieldKeys(slides, index);
  return {
    anySection: [...found.anySection],
    bySection: Object.fromEntries(
      Object.entries(found.bySection).map(([id, keys]) => [id, [...keys]]),
    ),
  };
}

// ── one host, one bag of values, every shelf read the same way ───────────────
export interface AuthoredShelf {
  section: Section;
  groups: FieldGroupView[];
  slides: Slide[];
  gallery: GalleryItem[];
}

export interface AuthoredReading {
  sections: Section[];
  shelves: AuthoredShelf[];
  fieldsIndex: SlideFieldsIndex;
  /**
   * Whose photographs the slides ended up carrying. `host` on a unit page means
   * the frames are the model's imagery and the view has to say so — a car's page
   * must never pass a studio shot off as this exact chassis.
   */
  mediaFrom: 'unit' | 'host' | 'none';
  claimed: ClaimedKeys;
}

/**
 * Read every authored shelf of a host on behalf of a caller that is not that host.
 *
 * `loadMinisite` reads one shelf of one business, where the definitions, the
 * values and the photographs all belong to the same row. A unit needs the same
 * contract across three owners: the definitions belong to the model's kind, the
 * values are the model's answers with the unit's overrides merged over them, and
 * the photographs belong to the car. Exporting this rather than duplicating it is
 * what stops a unit page and a model page from disagreeing about what
 * `show_as_slide` or `destination` means -- and two renderings of one record
 * telling different stories is how a portal loses a buyer's trust.
 *
 * `mediaFrom: 'none'` is a real answer, not a failure: a unit with no photographs
 * anywhere shows the honest "photo pending" plate rather than a borrowed frame.
 */
export async function loadAuthoredShelves(opts: {
  /** Where the definitions and the authored answers live. */
  hostBusinessId: string;
  hostTypeId: string;
  /** Model custom_data ⊕ unit overrides, already merged by the caller. */
  values: Record<string, Record<string, unknown>>;
  locale: SiteLocale;
  /**
   * Whose account the unit's own photographs are billed to -- the seller, which
   * need not be the host. The fallback is always the host's own wall, because a
   * model's gallery is not filed under the dealer who happens to be selling it.
   */
  mediaBusinessId?: string | null;
  /** The unit whose photographs to read; without it, the host's own wall. */
  mediaUnitId?: string | null;
}): Promise<AuthoredReading> {
  const sections = await resolveSections(opts.hostTypeId);
  const typeIds = await fieldTypePriority(opts.hostBusinessId, opts.hostTypeId);
  const fieldsBySection = await loadFieldDefs(typeIds);
  const groupsBySection = await loadGroupDefs(typeIds);

  const mediaBusinessId = opts.mediaBusinessId ?? opts.hostBusinessId;
  const shelfIds = sections.filter((s) => s.enable_gallery).map((s) => s.id);
  let rows: Array<GalleryRow & { section_id: string }> = [];
  let mediaFrom: AuthoredReading['mediaFrom'] = 'none';
  if (shelfIds.length) {
    if (opts.mediaUnitId) rows = await loadGalleryRowsMany(mediaBusinessId, shelfIds, opts.mediaUnitId);
    if (rows.length) mediaFrom = opts.mediaUnitId ? 'unit' : 'host';
    if (!rows.length) {
      // No photograph of this chassis: borrow the host's own frames, and mark the
      // reading so the view can label them as the model's rather than the car's.
      rows = await loadGalleryRowsMany(opts.hostBusinessId, shelfIds, null);
      if (rows.length) mediaFrom = 'host';
    }
  }

  const rowsBySection = new Map<string, GalleryRow[]>();
  for (const r of rows) {
    const list = rowsBySection.get(r.section_id);
    if (list) list.push(r);
    else rowsBySection.set(r.section_id, [r]);
  }

  const shelves: AuthoredShelf[] = [];
  for (const section of sections) {
    const shelfRows = rowsBySection.get(section.id) ?? [];
    const groups = buildGroups(
      fieldsBySection.get(section.id) ?? [],
      groupsBySection.get(section.id) ?? [],
      opts.values[section.id] ?? {}, opts.locale,
    );
    shelves.push({
      section,
      groups,
      slides: section.enable_gallery
        ? buildSlides(section.id, shelfRows, fieldsBySection, opts.values, opts.locale)
        : [],
      gallery: section.enable_gallery ? toGalleryItems(shelfRows, groups, opts.locale) : [],
    });
  }

  const fieldsIndex = buildFieldsIndex(fieldsBySection, groupsBySection, opts.values, opts.locale);
  return {
    sections,
    shelves,
    fieldsIndex,
    mediaFrom,
    // Every shelf counts as printed, because this caller runs its hero off the
    // whole set: a value that headlined a frame must not reappear in the grid.
    claimed: toClaimedKeys(shelves.flatMap((s) => s.slides), fieldsIndex),
  };
}

/**
 * The reachable-details bag.
 *
 * Which section carries a phone is a typology question -- `sec_auto_showroom` for
 * a showroom, something else for a service centre or a broker -- so it is found by
 * what it holds rather than by an id hardcoded into the renderer. The header needs
 * it on every shelf: a visitor who decides to call should not have to find the
 * contact section first.
 */
function findContact(customData: Record<string, Record<string, unknown>>): Record<string, unknown> {
  for (const bag of Object.values(customData)) {
    if (bag && typeof bag === 'object' && typeof bag.phone === 'string' && bag.phone.trim()) return bag;
  }
  return {};
}

/**
 * Details a record does not hold itself but inherits.
 *
 * A car listing is sold by a showroom, and the buyer who decides to call from the
 * car's own page has nowhere to call without it -- so the reachability of the
 * ancestor that owns the car is walked up `parent_business_id` and borrowed whole.
 * Only contact is inherited: the name, the address of record and every authored
 * value stay this business's own.
 */
async function inheritedContact(
  startId: string | null,
  exclude: Set<string>,
): Promise<Record<string, unknown>> {
  let cursor = startId;
  let guard = 0;
  while (cursor && guard++ < 5 && !exclude.has(cursor)) {
    exclude.add(cursor);
    const row = await queryOne<{ id: string; custom_data: string; parent_business_id: string | null }>(
      `SELECT id, custom_data, parent_business_id
         FROM businesses WHERE id = ? AND published = 1 AND status = 'active'`,
      [cursor],
    );
    if (!row) break;
    const contact = findContact(parseJson<Record<string, Record<string, unknown>>>(row.custom_data, {}));
    if (Object.keys(contact).length) return contact;
    cursor = row.parent_business_id ?? null;
  }
  return {};
}

/**
 * Reachability for a page that is not a minisite.
 *
 * A unit is not a businesses node: it holds no `custom_data` to search and no
 * ancestry to walk, because the number a buyer must dial belongs to the showroom
 * that sold the car. This applies the same rule `loadMinisite` applies -- own bag
 * first, then up the tree -- to that one row, so a car's page and its seller's
 * page can never print two different phone numbers.
 */
export async function contactFor(businessId: string): Promise<Record<string, unknown>> {
  const row = await queryOne<{ id: string; custom_data: string; parent_business_id: string | null }>(
    'SELECT id, custom_data, parent_business_id FROM businesses WHERE id = ?',
    [businessId],
  );
  if (!row) return {};
  const own = findContact(parseJson<Record<string, Record<string, unknown>>>(row.custom_data, {}));
  return Object.keys(own).length
    ? own
    : inheritedContact(row.parent_business_id, new Set([row.id]));
}
