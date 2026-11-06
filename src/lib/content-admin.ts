/**
 * Content-admin data layer — the WRITE counterpart to minisite.ts (the READ layer).
 *
 * Provides everything the admin Content Studio needs to display and edit a
 * business's minisite: resolved sections, inherited field definitions,
 * current authored values, gallery rows, blog entries, and the permission
 * verdict for each operation.
 *
 * Design:
 *  - One public function `loadContentStudioData(businessId)` fetches in a
 *    single round so the server page component can pass it as props.
 *  - Permission helpers are kept here (not in admin-auth.ts) because they
 *    depend on typology (section-level `curation_policy`) rather than identity.
 */
import { query, queryOne, parseJson, execute } from '@/lib/db';
import type { AdminUser } from '@/lib/admin-auth';
export type { AdminUser };

// ── Types ─────────────────────────────────────────────────────────────────────

export interface StudioSection {
  id: string;
  name: string;
  name_ar: string | null;
  icon: string | null;
  sort_order: number;
  enable_gallery: number;
  enable_blog: number;
  /** From `options` JSON: { markets, relationship, carousel, curation_policy } */
  options: Record<string, unknown>;
}

export interface StudioField {
  id: number;
  name: string;
  label: string | null;
  label_ar: string | null;
  field_type: string;       // text | number | select | boolean | textarea | image | video | youtube | rich_text
  group_key: string | null;
  sort_order: number;
  show_as_slide: number;
  destination: string | null; // carousel | body | both | hidden | null
  options: Record<string, unknown> | null; // JSON { enum: [...] }
}

export interface StudioGalleryItem {
  id: string;
  url: string;
  caption: string | null;
  caption_ar: string | null;
  media_data: Record<string, unknown> | null;
  group_key: string | null;
  field_key: string | null;
  field_section_id: string | null;
  display_order: number;
  placement: string;         // body | carousel | both
  is_hero: number;
  show_on_minisite: number;
  approval_status: string;   // approved | pending | rejected
  media_type: string;        // image | youtube | video
  video_id: string | null;
}

export interface StudioBlog {
  id: string;
  section_id: string;
  title: string | null;
  title_ar: string | null;
  content: string | null;
  content_ar: string | null;
  status: string;
  show_on_minisite: number;
}

/** Everything the Content Studio UI needs to render one business. */
export interface ContentStudioData {
  business: {
    id: string;
    name: string;
    name_ar: string | null;
    slug: string;
    type_id: string;
    custom_data: Record<string, Record<string, unknown>>;
  };
  sections: StudioSection[];
  /** section_id → field definitions (inherited up the tree). */
  fields: Record<string, StudioField[]>;
  /** section_id → gallery rows. */
  gallery: Record<string, StudioGalleryItem[]>;
  /** section_id → blog entries. */
  blogs: Record<string, StudioBlog[]>;
  /** Permission verdict for this user on this business. */
  permissions: ContentPermissions;
}

export interface ContentPermissions {
  canEditFields: boolean;
  canUploadMedia: boolean;
  canDeleteMedia: boolean;
  canWriteBlog: boolean;
  canApprove: boolean;
  canChangeSectionVisibility: boolean;
  /** If true, vendor edits are published immediately. If false, they go pending. */
  autoPublish: boolean;
}

// ── Permission resolution ─────────────────────────────────────────────────────

/**
 * Derive permissions from role + section-level curation policy.
 *
 * Rules:
 *  - platform_admin: all capabilities on, autoPublish always true
 *  - vendor: can edit fields, upload media, write blog; cannot delete others'
 *    media, cannot approve, cannot change section visibility;
 *    autoPublish depends on section's `curation_policy`.
 */
export function resolvePermissions(
  user: AdminUser,
  sections: StudioSection[],
): ContentPermissions {
  const isAdmin = user.role === 'platform_admin';
  // Check if ANY section requires review (vendor path only)
  const hasReviewRequired = sections.some(
    (s) => (s.options as { curation_policy?: string }).curation_policy === 'review_required',
  );

  return {
    canEditFields: true,
    canUploadMedia: true,
    canDeleteMedia: isAdmin,
    canWriteBlog: true,
    canApprove: isAdmin,
    canChangeSectionVisibility: isAdmin,
    autoPublish: isAdmin || !hasReviewRequired,
  };
}

// ── Main loader ───────────────────────────────────────────────────────────────

/**
 * Load all Content Studio data for a business in one shot.
 * Called by the server component of /admin/showroom/[id]/content.
 */
export async function loadContentStudioData(businessId: string): Promise<ContentStudioData | null> {
  // 1. Load business row
  const biz = await queryOne<{
    id: string; name: string; name_ar: string | null; slug: string;
    type_id: string; custom_data: string;
  }>(
    `SELECT id, name, name_ar, slug, type_id, custom_data
       FROM businesses WHERE id = ? AND status = 'active'`,
    [businessId],
  );
  if (!biz) return null;

  const customData = parseJson<Record<string, Record<string, unknown>>>(biz.custom_data, {});

  // 2. Resolve sections via the type chain (same algorithm as minisite.ts)
  const sections = await resolveSectionsForAdmin(biz.type_id);

  // 3. Load inherited field definitions
  const typeIds = await buildTypePriority(businessId, biz.type_id);
  const fieldsMap = await loadFieldsForAdmin(typeIds);

  // 4. Load gallery rows grouped by section
  const galleryMap = await loadGalleryForAdmin(businessId);

  // 5. Load blog entries grouped by section
  const blogsMap = await loadBlogsForAdmin(businessId);

  return {
    business: {
      id: biz.id, name: biz.name, name_ar: biz.name_ar,
      slug: biz.slug, type_id: biz.type_id, custom_data: customData,
    },
    sections,
    fields: fieldsMap,
    gallery: galleryMap,
    blogs: blogsMap,
    // Permissions are resolved by the caller (the page has the user object)
    permissions: {
      canEditFields: true, canUploadMedia: true, canDeleteMedia: true,
      canWriteBlog: true, canApprove: true, canChangeSectionVisibility: true,
      autoPublish: true,
    },
  };
}

/**
 * Attach permissions after user is known. Called from the page component
 * because loadContentStudioData is pure data and the user comes from headers.
 */
export function attachPermissions(
  data: ContentStudioData,
  user: AdminUser,
): ContentStudioData {
  data.permissions = resolvePermissions(user, data.sections);
  return data;
}

// ── Internal helpers ──────────────────────────────────────────────────────────

async function resolveSectionsForAdmin(typeId: string): Promise<StudioSection[]> {
  // Walk the type chain (business_types.parent_type_id)
  const chain = await walkTypeChain(typeId);
  const ids = new Set<string>();
  for (const node of chain) {
    for (const id of parseJson<string[]>(node.sections, [])) ids.add(id);
    for (const id of parseJson<string[]>(node.own_sections, [])) ids.add(id);
  }
  if (!ids.size) return [];
  const list = [...ids];
  const ph = list.map(() => '?').join(',');
  const rows = await query<StudioSection & { options: string | null }>(
    `SELECT id, name, name_ar, icon, sort_order, enable_gallery, enable_blog, options
       FROM sections WHERE id IN (${ph}) ORDER BY sort_order`,
    list,
  );
  return rows.map((r) => ({
    ...r,
    options: parseJson<Record<string, unknown>>(r.options, {}),
  }));
}

interface TypeNode { sections: string; own_sections: string; parent_id: string | null }
async function walkTypeChain(typeId: string): Promise<TypeNode[]> {
  const result: TypeNode[] = [];
  let cursor: string | null = typeId;
  let guard = 0;
  while (cursor && guard++ < 20) {
    const row: TypeNode | null = await queryOne<TypeNode>(
      `SELECT sections, own_sections, parent_id FROM business_types WHERE id = ?`,
      [cursor],
    );
    if (!row) break;
    result.push(row);
    cursor = row.parent_id;
  }
  return result;
}

async function buildTypePriority(businessId: string, ownTypeId: string): Promise<string[]> {
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
    cursor = row.parent_business_id;
  }
  if (!ids.includes(ownTypeId)) ids.unshift(ownTypeId);
  return ids;
}

async function loadFieldsForAdmin(typeIds: string[]): Promise<Record<string, StudioField[]>> {
  if (!typeIds.length) return {};
  const ph = typeIds.map(() => '?').join(',');
  const rows = await query<StudioField & { section_id: string; business_type_id: string; options: string | null }>(
    `SELECT id, business_type_id, section_id, name, label, label_ar, field_type,
            group_key, sort_order, show_as_slide, destination, options
       FROM form_fields WHERE business_type_id IN (${ph})
      ORDER BY sort_order`,
    typeIds,
  );
  // Group by section_id, nearest type wins on name collision
  const seen = new Map<string, Set<string>>(); // section → set of field names
  const result: Record<string, StudioField[]> = {};
  for (const r of rows) {
    const sec = r.section_id;
    if (!result[sec]) { result[sec] = []; seen.set(sec, new Set()); }
    const names = seen.get(sec)!;
    if (names.has(r.name)) continue; // already filled by a nearer type
    names.add(r.name);
    result[sec].push({
      id: r.id, name: r.name, label: r.label, label_ar: r.label_ar,
      field_type: r.field_type, group_key: r.group_key, sort_order: r.sort_order,
      show_as_slide: r.show_as_slide, destination: r.destination,
      options: r.options ? parseJson<Record<string, unknown> | null>(r.options, null) : null,
    });
  }
  return result;
}

async function loadGalleryForAdmin(businessId: string): Promise<Record<string, StudioGalleryItem[]>> {
  const rows = await query<StudioGalleryItem & { section_id: string | null }>(
    `SELECT id, url, caption, caption_ar, media_data, group_key, field_key,
            field_section_id, display_order, placement, is_hero, show_on_minisite,
            approval_status, media_type, video_id, section_id
       FROM vendor_gallery
      WHERE business_id = ?
      ORDER BY display_order`,
    [businessId],
  );
  const result: Record<string, StudioGalleryItem[]> = {};
  for (const r of rows) {
    const sec = r.section_id ?? '_ungrouped';
    if (!result[sec]) result[sec] = [];
    result[sec].push({
      ...r,
      media_data: r.media_data ? parseJson<Record<string, unknown> | null>(r.media_data as unknown as string, null) : null,
    });
  }
  return result;
}

async function loadBlogsForAdmin(businessId: string): Promise<Record<string, StudioBlog[]>> {
  const rows = await query<StudioBlog>(
    `SELECT id, section_id, title, title_ar, content, content_ar, status, show_on_minisite
       FROM section_blogs WHERE business_id = ?
      ORDER BY rowid DESC`,
    [businessId],
  );
  const result: Record<string, StudioBlog[]> = {};
  for (const r of rows) {
    const sec = r.section_id ?? '_ungrouped';
    if (!result[sec]) result[sec] = [];
    result[sec].push(r);
  }
  return result;
}

// ── Write helpers ─────────────────────────────────────────────────────────────

/** Update custom_data for a section. Merges into existing JSON. */
export async function saveSectionValues(
  businessId: string,
  sectionId: string,
  values: Record<string, unknown>,
): Promise<void> {
  const row = await queryOne<{ custom_data: string }>(
    'SELECT custom_data FROM businesses WHERE id = ?',
    [businessId],
  );
  if (!row) throw new Error('business not found');
  const data = parseJson<Record<string, Record<string, unknown>>>(row.custom_data, {});
  data[sectionId] = { ...(data[sectionId] ?? {}), ...values };
  await execute(
    'UPDATE businesses SET custom_data = ? WHERE id = ?',
    [JSON.stringify(data), businessId],
  );
}
