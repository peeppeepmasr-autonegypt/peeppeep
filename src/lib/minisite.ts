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
import type { SiteLocale } from '@/lib/site-locale';

export interface SectionOptions {
  markets?: string[];
  component?: string;
  aspect?: string;
  relationship?: RelationshipSpec[];
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
}
/**
 * One carousel slide. A slide is a *value*, not a photo: the headline is the
 * bound field's authored value, the eyebrow is the field's label, and `note` is
 * the optional editorial line (media_data overlay, else the row's own caption).
 * `url` is null when the field is carousel-eligible but no photo exists yet --
 * the slide still renders, as a labelled placeholder, so an unfinished minisite
 * reads as unfinished instead of accidentally looking empty.
 */
export interface Slide {
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

export interface MinisiteView {
  locale: SiteLocale;
  business: {
    id: string; slug: string; name: string; name_ar: string | null;
    type_id: string; typeName: string; typeName_ar: string | null;
    identity: Record<string, unknown>;
  };
  sections: Section[];
  active: ActiveSectionView | null;
  activeSectionId: string | null;
  ancestry: AncestryNode[];
}

// ── small localizers ─────────────────────────────────────────────────────────
function loc(en: string | null | undefined, ar: string | null | undefined, locale: SiteLocale): string | null {
  const primary = locale === 'ar' ? ar : en;
  if (primary && primary.trim()) return primary;
  const fallback = locale === 'ar' ? en : ar;
  return fallback && fallback.trim() ? fallback : null;
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
  return String(raw);
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

async function resolveSections(typeId: string): Promise<Section[]> {
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
            group_key, sort_order, show_as_slide
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
    label: loc(f.label, f.label_ar, locale) ?? f.name,
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
      label: loc(meta?.label ?? null, meta?.label_ar ?? null, locale) ?? key,
      label_ar: meta?.label_ar ?? null,
      fields: byKey.get(key)!.filter((f) => f.value !== null),
    };
  }).filter((g) => g.fields.length);
}

// ── gallery: unbound images (grid) + value-bound slides (carousel) ───────────
interface GalleryRow {
  id: string; url: string; caption: string | null; caption_ar: string | null;
  media_data: string | null; group_key: string | null; display_order: number;
  is_hero: number; placement: string;
  field_key: string | null; field_section_id: string | null;
}

async function loadGalleryRows(businessId: string, sectionId: string): Promise<GalleryRow[]> {
  return query<GalleryRow>(
    `SELECT id, url, caption, caption_ar, media_data, group_key, display_order,
            is_hero, placement, field_key, field_section_id
       FROM vendor_gallery
      WHERE business_id = ? AND section_id = ? AND show_on_minisite = 1 AND approval_status = 'approved'
      ORDER BY display_order`,
    [businessId, sectionId],
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
      return {
        id: r.id, url: r.url,
        caption: loc(r.caption, r.caption_ar, locale) ?? '',
        caption2Title: overlay.title ?? groupCaption(groups, r.group_key),
        caption2Subtitle: overlay.subtitle,
        is_hero: r.is_hero, placement: r.placement,
        fieldKey: r.field_key, fieldSectionId: r.field_section_id,
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
  const value = f ? boundValue(f, target, customData, locale) : null;
  const notes = [overlay.title, overlay.subtitle].filter((v): v is string => !!v);
  return {
    id: r.id,
    fieldKey: key,
    fieldSectionId: sec,
    eyebrow: f ? (loc(f.label, f.label_ar, locale) ?? key) : key,
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
  const eligible = (fieldsBySection.get(sectionId) ?? []).filter((f) => f.show_as_slide === 1);
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
      slides.push({
        id: `placeholder-${target}`,
        fieldKey: f.name,
        fieldSectionId: sectionId,
        eyebrow: loc(f.label, f.label_ar, locale) ?? f.name,
        title: boundValue(f, target, customData, locale) ?? '',
        note: null, url: null, isHero: 0, placeholder: true,
      });
    }
  }

  for (const r of bound) {
    if (emitted.has(r.id)) continue;
    slides.push(makeSlide(r, targetOf(sectionId, r), fieldsBySection, customData, locale));
  }
  return slides;
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
    label: loc(section.name, section.name_ar, locale) ?? section.name,
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
  }>(
    `SELECT id, name, name_ar, slug, type_id, custom_data, path
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
    const slides = activeSection.enable_gallery
      ? buildSlides(activeSection.id, rows, fieldsBySection, customData, locale)
      : [];
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

  return {
    locale,
    business: {
      id: business.id, slug: business.slug, name: business.name, name_ar: business.name_ar,
      type_id: business.type_id,
      typeName: typeRow?.name ?? business.type_id,
      typeName_ar: typeRow?.name_ar ?? null,
      identity: customData['sec_1_identity'] ?? {},
    },
    sections,
    active,
    activeSectionId: activeSection?.id ?? null,
    ancestry,
  };
}
