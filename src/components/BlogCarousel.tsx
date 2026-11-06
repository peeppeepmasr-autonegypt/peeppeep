'use client';

import Link from 'next/link';
import { useState } from 'react';
import { localePath, type SiteLocale } from '@/lib/site-locale';
import type { GlobalBlogPost } from '@/lib/global-blog';

const localized = (post: GlobalBlogPost, locale: SiteLocale) =>
  (locale === 'ar' ? post.title_ar : post.title) || '';

const excerptFor = (post: GlobalBlogPost, locale: SiteLocale) =>
  (locale === 'ar' ? post.excerpt_ar : post.excerpt)
  || (locale === 'ar' ? post.content_ar : post.content)
    .replace(/[#*_`[\]()!>-]/g, '').replace(/\s+/g, ' ').trim().slice(0, 180);

export default function BlogCarousel({ posts, locale }: { posts: GlobalBlogPost[]; locale: SiteLocale }) {
  const [index, setIndex] = useState(0);
  if (!posts.length) return null;
  const post = posts[index % posts.length];
  const title = localized(post, locale);
  const previous = () => setIndex((current) => (current - 1 + posts.length) % posts.length);
  const next = () => setIndex((current) => (current + 1) % posts.length);
  return (
    <section className="blog-carousel mb-8" aria-roledescription="carousel" aria-label={locale === 'ar' ? 'مقالات مميزة' : 'Featured stories'}>
      {post.featured_image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.featured_image_url} alt="" className="blog-carousel-image" />
      ) : null}
      <div className="blog-carousel-shade" />
      <div className="blog-carousel-copy" aria-live="polite">
        <p className="text-xs font-bold uppercase tracking-[.2em] text-white/75">{locale === 'ar' ? 'مقال مميز' : 'Featured story'}</p>
        <h2 className="mt-2 max-w-3xl font-display text-3xl font-bold text-white sm:text-5xl">
          <Link href={localePath(locale, ['blog', post.slug])}>{title}</Link>
        </h2>
        <p className="mt-3 max-w-2xl text-sm text-white/85">{excerptFor(post, locale)}</p>
        <div className="mt-5 flex items-center gap-2">
          <button type="button" className="blog-carousel-control" onClick={previous} aria-label={locale === 'ar' ? 'المقال السابق' : 'Previous story'}>‹</button>
          {posts.map((item, i) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`${locale === 'ar' ? 'مقال' : 'Story'} ${i + 1}`}
              aria-current={i === index}
              className={`blog-carousel-dot${i === index ? ' is-active' : ''}`}
            />
          ))}
          <button type="button" className="blog-carousel-control" onClick={next} aria-label={locale === 'ar' ? 'المقال التالي' : 'Next story'}>›</button>
        </div>
      </div>
    </section>
  );
}
