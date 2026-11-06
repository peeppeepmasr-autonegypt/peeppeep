import type { Metadata } from 'next';
import Link from 'next/link';
import { localePath, type SiteLocale } from '@/lib/site-locale';
import {
  excerptFor, getPublishedPost, listBlogCategories, listBlogTags, listPublishedPosts,
  localized, markdownToSafeHtml, BLOG_WIDGETS, type BlogWidget, type GlobalBlogPost,
} from '@/lib/global-blog';
import { queryOne } from '@/lib/db';
import BlogCarousel from '@/components/BlogCarousel';

const language = (locale: SiteLocale) => locale === 'ar' ? 'ar-EG' : 'en';
const dateLabel = (value: string | null, locale: SiteLocale) => value
  ? new Intl.DateTimeFormat(language(locale), { dateStyle: 'long' }).format(new Date(value))
  : '';

async function enabledWidgets(): Promise<BlogWidget[]> {
  const row = await queryOne<{ widgets: string }>('SELECT widgets FROM global_blog_settings WHERE id = 1');
  try {
    const raw = JSON.parse(row?.widgets ?? '["carousel","search","recent","categories","tags"]') as unknown;
    return Array.isArray(raw)
      ? raw.filter((v): v is BlogWidget => typeof v === 'string' && BLOG_WIDGETS.includes(v as BlogWidget))
      : [...BLOG_WIDGETS];
  } catch {
    return [...BLOG_WIDGETS];
  }
}

export async function GlobalBlogIndex({
  locale,
  searchParams,
}: {
  locale: SiteLocale;
  searchParams: { q?: string; category?: string; tag?: string };
}) {
  const [posts, categories, tags, widgets, recent] = await Promise.all([
    listPublishedPosts(locale, { search: searchParams.q, category: searchParams.category, tag: searchParams.tag }),
    listBlogCategories(),
    listBlogTags(),
    enabledWidgets(),
    listPublishedPosts(locale, { limit: 5 }),
  ]);
  const isAr = locale === 'ar';
  const localizedPosts = posts.filter((post) => localized(post, 'title', 'title_ar', locale));
  const localizedRecent = recent.filter((post) => localized(post, 'title', 'title_ar', locale));
  const localizedCategories = categories.filter((category) => localized(category, 'name', 'name_ar', locale));
  const localizedTags = tags.filter((tag) => localized(tag, 'name', 'name_ar', locale));
  return (
    <main className="blog-index-page" dir={isAr ? 'rtl' : 'ltr'}>
      <header className="blog-index-header">
        <p className="home-section-kicker">{isAr ? 'أوتو بورتال · المقالات' : 'AUTOPORTAL · JOURNAL'}</p>
        <h1>{isAr ? 'المقالات والأخبار' : 'Stories & news'}</h1>
        <p>
          {isAr ? 'رؤى وأدلة وأخبار من عالم السيارات.' : 'Insights, guides, and news from the automotive world.'}
        </p>
      </header>

      {widgets.includes('carousel') && localizedPosts.length ? (
        <BlogCarousel posts={localizedPosts.slice(0, 5)} locale={locale} />
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <section>
          {localizedPosts.length ? (
            <div className="grid gap-5 md:grid-cols-2">
              {localizedPosts.map((post) => <PostCard key={post.id} post={post} locale={locale} />)}
            </div>
          ) : (
            <p className="public-empty-state">
              {isAr ? 'لا توجد مقالات تطابق اختيارك.' : 'No posts match your filters.'}
            </p>
          )}
        </section>
        <aside className="blog-widget-stack">
          {widgets.map((widget) => {
            if (widget === 'carousel') return null;
            if (widget === 'search') return <SearchWidget key={widget} locale={locale} />;
            if (widget === 'recent') return (
              <Widget key={widget} title={isAr ? 'أحدث المقالات' : 'Recent posts'}>
                <ul className="space-y-2 text-sm">
                  {localizedRecent.map((post) => (
                    <li key={post.id}><Link className="hover:underline" href={localePath(locale, ['blog', post.slug])}>{localized(post, 'title', 'title_ar', locale)}</Link></li>
                  ))}
                </ul>
              </Widget>
            );
            if (widget === 'categories') return (
              <Widget key={widget} title={isAr ? 'التصنيفات' : 'Categories'}>
                <ul className="space-y-2 text-sm">
                  {localizedCategories.map((category) => (
                    <li key={category.id}>
                      <Link href={localePath(locale, ['blog']) + `?category=${encodeURIComponent(category.slug)}`} className="flex justify-between gap-2 hover:underline">
                        <span>{localized(category, 'name', 'name_ar', locale)}</span><span className="opacity-50">{category.post_count}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </Widget>
            );
            return (
              <Widget key={widget} title={isAr ? 'الوسوم' : 'Tags'}>
                <div className="flex flex-wrap gap-2">
                  {localizedTags.map((tag) => (
                    <Link key={tag.id} href={localePath(locale, ['blog']) + `?tag=${encodeURIComponent(tag.slug)}`} className="rounded-full border border-[var(--line)] px-2.5 py-1 text-xs hover:bg-[var(--gold-glass)]">
                      {localized(tag, 'name', 'name_ar', locale)}
                    </Link>
                  ))}
                </div>
              </Widget>
            );
          })}
        </aside>
      </div>
    </main>
  );
}

export async function GlobalBlogPostPage({ slug, locale }: { slug: string; locale: SiteLocale }) {
  const post = await getPublishedPost(slug);
  if (!post) return null;
  const title = localized(post, 'title', 'title_ar', locale);
  const content = localized(post, 'content', 'content_ar', locale);
  const excerpt = excerptFor(post, locale);
  return (
    <main className="blog-post-page" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <Link href={localePath(locale, ['blog'])} className="text-sm text-[var(--gold)] hover:underline">
        {locale === 'ar' ? '← العودة للمقالات' : '← Back to stories'}
      </Link>
      <article className="blog-post-article">
        {post.featured_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="mb-8 max-h-[34rem] w-full rounded-2xl border border-[var(--line)] object-cover" src={post.featured_image_url} alt={title} />
        ) : null}
        {post.category_slug ? (
          <Link className="text-xs font-bold uppercase tracking-wider text-[var(--gold)]" href={localePath(locale, ['blog']) + `?category=${encodeURIComponent(post.category_slug)}`}>
            {localized(post, 'category_name', 'category_name_ar', locale)}
          </Link>
        ) : null}
        <h1 className="mt-2 font-display text-4xl font-bold leading-tight sm:text-5xl">{title}</h1>
        <div className="blog-post-meta">
          {post.author_name && locale === 'en' ? <span>{post.author_name}</span> : null}
          {post.published_at ? <time dateTime={post.published_at}>{dateLabel(post.published_at, locale)}</time> : null}
          <span>{post.reading_time} {locale === 'ar' ? 'دقيقة للقراءة' : 'min read'}</span>
        </div>
        {excerpt ? <p className="mt-6 border-s-2 border-[var(--gold)] ps-4 text-lg text-[var(--ink-soft)]">{excerpt}</p> : null}
        <div className="blog-prose mt-8" dangerouslySetInnerHTML={{ __html: markdownToSafeHtml(content) }} />
        {post.tags?.length ? (
          <div className="mt-8 flex flex-wrap gap-2">
            {post.tags.map((tag) => <Link key={tag.id} href={localePath(locale, ['blog']) + `?tag=${encodeURIComponent(tag.slug)}`} className="rounded-full border px-3 py-1 text-xs">{localized(tag, 'name', 'name_ar', locale)}</Link>)}
          </div>
        ) : null}
      </article>
    </main>
  );
}

export async function blogPostMetadata(slug: string, locale: SiteLocale): Promise<Metadata> {
  const post = await getPublishedPost(slug);
  if (!post) return { title: locale === 'ar' ? 'المقال غير موجود' : 'Post not found' };
  const title = (locale === 'ar' ? post.seo_title_ar : post.seo_title)
    || localized(post, 'title', 'title_ar', locale);
  const description = (locale === 'ar' ? post.seo_description_ar : post.seo_description)
    || (locale === 'ar' ? post.excerpt_ar : post.excerpt)
    || excerptFor(post, locale);
  return {
    title,
    description,
    keywords: post.meta_keywords?.split(',').map((keyword) => keyword.trim()).filter(Boolean),
    openGraph: {
      type: 'article',
      title,
      description,
      publishedTime: post.published_at ?? undefined,
      authors: post.author_name ? [post.author_name] : undefined,
      images: post.featured_image_url ? [post.featured_image_url] : undefined,
    },
  };
}

function PostCard({ post, locale }: { post: GlobalBlogPost; locale: SiteLocale }) {
  const title = localized(post, 'title', 'title_ar', locale);
  return (
    <article className="blog-post-card">
      {post.featured_image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="h-52 w-full object-cover" src={post.featured_image_url} alt="" loading="lazy" />
      ) : null}
      <div className="blog-post-card-copy">
        {post.category_slug ? <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--gold)]">{localized(post, 'category_name', 'category_name_ar', locale)}</span> : null}
        <h2 className="font-display text-xl font-bold"><Link href={localePath(locale, ['blog', post.slug])} className="hover:underline">{title}</Link></h2>
        <p className="text-sm leading-7 text-[var(--ink-soft)]">{excerptFor(post, locale)}</p>
        <div className="flex justify-between text-xs text-[var(--ink-soft)]">
          <span>{post.author_name}</span>
          <span>{post.reading_time} {locale === 'ar' ? 'دقيقة' : 'min'}</span>
        </div>
      </div>
    </article>
  );
}

function SearchWidget({ locale }: { locale: SiteLocale }) {
  return (
    <Widget title={locale === 'ar' ? 'بحث' : 'Search'}>
      <form action={localePath(locale, ['blog'])} className="flex gap-2">
        <input name="q" maxLength={120} className="min-w-0 flex-1 rounded border px-2 py-2 text-sm" placeholder={locale === 'ar' ? 'ابحث عن مقال…' : 'Search stories…'} />
        <button className="rounded bg-[var(--gold)] px-3 text-sm font-bold text-white" type="submit">{locale === 'ar' ? 'بحث' : 'Go'}</button>
      </form>
    </Widget>
  );
}

function Widget({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="blog-widget"><h2>{title}</h2>{children}</section>;
}

export async function globalBlogMetadata(locale: SiteLocale): Promise<Metadata> {
  return {
    title: locale === 'ar' ? 'المقالات والأخبار | أوتو بورتال' : 'Stories & news | AutoPortal',
    description: locale === 'ar' ? 'رؤى وأدلة وأخبار من عالم السيارات.' : 'Insights, guides, and news from the automotive world.',
  };
}
