# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Car buyers in Greater Cairo evaluating premium new and certified pre-owned vehicles, arriving at the
apex host (`autonegypt.com`, `autonegypt.local:3000`), which `src/middleware.ts` maps to the
`auto-one-egypt` minisite. They are in a decide-and-contact situation: compare what the showroom
actually stocks, judge whether the financing route fits them, then reach a human.

Secondary audience, not yet confirmed as a design driver: showroom owners evaluating the portal after
seeing this minisite as its demonstration.

## Product Purpose

Auto One Egypt's minisite is the showroom's front door on the web: it presents identity, inventory,
financing and physical location for one business, and converts a visitor into an inbound lead by phone
or WhatsApp. Success is a contact, not a pageview.

## Positioning

The page is generated from a topology, not hand-built. Content arrives either as authored field values
(`businesses.custom_data` shaped by `sections` / `form_fields` / `field_groups`) or as relational shelves
read from `business_relationships` and `businesses.parent_business_id`, with a per-section render
contract (`options.relationship`: relation, direction, `as`, `linkTo`). The same record renders in both
languages, and a section is data-driven rather than code-per-car. A neighboring page builder cannot copy
that: it would need the graph.

## Operating Context

- Admins and vendors author content through the admin routes (`/admin`, `/admin/showroom/[id]/…`), not by editing markup.
- Photography is captured and uploaded on the shop floor via `MobileCameraUploader` into `vendor_gallery` (R2-backed).
- Value-bound shots become carousel slides; unbound shots become the gallery grid.
- Local data lives in Cloudflare D1 (`autoportal-d1`, `--local` state under `.wrangler/state`); deploy target is Cloudflare via OpenNext.
- Routes: bare path serves Arabic under `src/app/(ar)`, `/en` serves English; both render `MinisiteView`.
- Windows dev shell blocks `npm.ps1`, so commands run as `npm.cmd` / `npx.cmd`.

## Capabilities and Constraints

- Next.js 16.4.3 (Turbopack), React 19.3.0, Tailwind 4, Node >= 22. Minisite pages are `force-dynamic` server components fed by `loadMinisite(slug, locale)`.
- A carousel slide cannot exist unless its field is flagged `show_as_slide` or a gallery row is bound to it (`buildSlides` in `src/lib/minisite.ts`). UI ambition is capped by authored data.
- Arabic is a first-class rendering mode: `dir`/`lang` come from the locale, and spacing must use logical utilities (`ms-`/`me-`/`ps-`/`text-end`).
- External media URLs render through plain `<img>` because no `next/image` remotePatterns config exists for them.
- YouTube slides embed through `youtube-nocookie.com`; the finance calculator binds to `sec_listing_price::price_egp`.
- WhatsApp lead widget currently carries a hardcoded phone number in `MinisiteView`.
- No image converter (cwebp, sips, magick, ffmpeg) is installed; ship PNG output unconverted.
- Global editorial blog is separate from business section blogs: `/blog` and `/en/blog`, managed at `/admin/platform/blog`, with bilingual Markdown, scheduling, categories/tags, SEO fields and configurable widgets. Comments have a schema foundation only and are deferred; no public comment flow is enabled.

## Brand Commitments

- Name is authored as `Auto One Egypt` / `أوتو ون مصر` (see `custom_data.sec_1_identity`).
- Tagline and description are authored product truth and are reused verbatim unless the owner rewrites them: "Your Trusted Premium Automotive Destination" / "وجهتك الأولى للسيارات الفاخرة والمعتمدة في مصر"; new and certified pre-owned luxury vehicles with in-house financing, bank loan facilities, and direct cash purchase. Arabic: "أوتو ون مصر يقدم أحدث السيارات الجديدة والمستعملة الفاخرة المعتمدة مع حلول تقسيط مباشر، تمويل بنكي معتمد، وتسهيلات خاصة للشراء النقدي."
- Showroom records as authored: address "Plot 12, Auto Zone, New Cairo, Egypt" / "القطعة 12، منطقة السيارات، القاهرة الجديدة، مصر"; phone "+20 100 000 1234"; hours "Daily 10 AM - 10 PM" / "يومياً من 10 صباحاً حتى 10 مساءً". These are factual records, not design filler.
- Reading Arabic out of D1: `[Console]::OutputEncoding = [Text.Encoding]::UTF8` must be set *before* the `npx.cmd wrangler d1 execute --json` call, then piped to a UTF-8 file and read from disk. Two Arabic strings were once transcribed into this file from a raw console capture and were wrong; the versions above were re-read from the database through that method and match `migrations/0005_auto_one_and_video.sql`.
- **Owner decision, binding: the owner supplies the real photography.** Generated, archive, or stock imagery is not acceptable as final product content on this surface.

## Evidence on Hand

`businesses.custom_data` for `auto-one-egypt` (783 bytes) holds `sec_1_identity`: business_name,
business_name_ar, tagline, tagline_ar, description, description_ar; and `sec_auto_showroom`: address
"Plot 12, Auto Zone, New Cairo, Egypt", address_ar, phone "+20 100 000 1234", opening_hours
"Daily 10 AM - 10 PM", opening_hours_ar.

Real absence that future work must not paper over: `vendor_gallery` has **0 rows** for this business, so
there is no showroom photograph, no vehicle photography, and no video bound today. Also absent, and not to
be invented: customer reviews or testimonials, specific vehicle inventory and prices, delivery or warranty
figures, and any count of cars in stock.

## Product Principles

1. Earn a contact, not admiration: every surface decision is judged by whether it makes reaching the showroom easier.
2. Show only what is authored. An unfinished minisite advertises itself as unfinished rather than pretending.
3. Arabic is not a translation layer bolted on last; the same record must read correctly in both directions.
4. The graph is the differentiator — relate cars, showroom, financing and origin instead of restating them.
5. Proof over polish: physical address, hours, phone and financing routes are the trust assets on this page.

## Accessibility & Inclusion

Arabic-first market with RTL rendering and bilingual labels throughout. No formally adopted conformance
target yet (open decision); treat text legibility over media overlays and keyboard-operable carousels as
requirements regardless.
