This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Admin site builder

Open `/admin/site-builder` to choose a customer site or inventory listing. Customer minisites share the same editorial layout and page structure, while each business can customize its own logo, accent color, and background color. Individual vehicle listings retain their reusable layout presets. Vendor/model content, carousels, and blogs are edited in Content Studio, while each vehicle listing has its own gallery/carousel editor. The global journal is available to platform admins at `/admin/platform/blog`.

For automotive make/model sites, choose **Manage pages and components** from the Site Builder target to open the page editor. Each make/model has a main page and can have additional update pages at `/{site}/pages/{page-slug}`. Arrange a required hero carousel and reusable model-details, model-lineup, inventory, offers, gallery, blog, finance, FAQ, and contact components; blocks can be dragged to reorder or managed with the arrow controls. Draft edits stay private until published, and custom pages can be unpublished without losing their draft.

Inventory supports cars, motorcycles, scooters, and commercial vehicles; new/used/demo/lease-return remains a separate condition filter. Apply local D1 migrations with `npm run db:migrate:local`; apply them to production only through the separately reviewed remote migration command.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
