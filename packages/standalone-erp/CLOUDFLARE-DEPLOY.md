# 🚀 autonegypt.com — Cloudflare Pages Deployment Guide

> **Domain:** autonegypt.com | **Hosting:** Cloudflare Pages (Free) | **Database:** Google Sheets via Apps Script

---

## Step 1 — Deploy Code.gs as a Web App (Google Apps Script)

This is what gives your website live data from your accounting system.

1. Open [script.google.com](https://script.google.com)
2. Create a new project → paste the contents of `Code.gs`
3. Click **Deploy → New deployment**
4. Choose type: **Web app**
5. Set:
   - Execute as: **Me**
   - Who has access: **Anyone** (so the public site can read listings)
6. Click **Deploy** → Copy the **Web App URL**
   - It looks like: `https://script.google.com/macros/s/AKfycbxXXXXX/exec`
7. **Paste that URL** into `autonegypt-public.html` line:
   ```js
   const GAS_URL = 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE';
   ```
   Replace with your actual URL.

---

## Step 2 — Prepare the Website Files

The public website is a **single HTML file**: `autonegypt-public.html`

For Cloudflare Pages, rename it to `index.html` or create a folder.

Create a folder called `autonegypt-site/` with these files:
```
autonegypt-site/
├── index.html          ← (copy of autonegypt-public.html, with GAS_URL filled in)
├── icons/              ← (optional: copy the icons folder for logo)
└── install.html        ← (optional: link from CTA button)
```

---

## Step 3 — Upload to Cloudflare Pages

### Option A: Direct Upload (Easiest)
1. Go to [dash.cloudflare.com](https://dash.cloudflare.com)
2. Left sidebar → **Pages** → **Create a project**
3. Choose **Direct Upload** (not Git)
4. Name the project: `autonegypt`
5. Drag & drop the `autonegypt-site/` folder (or upload files)
6. Click **Deploy site**

### Option B: GitHub Integration (Best for auto-updates)
1. Create a new GitHub repo (e.g. `autonegypt-website`)
2. Push the site files to it
3. In Cloudflare Pages → **Connect to Git** → select the repo
4. Build settings: none needed (pure HTML)
5. Cloudflare auto-deploys on every push

---

## Step 4 — Connect autonegypt.com Domain

1. In Cloudflare → Your Pages project → **Custom Domains**
2. Click **Set up a custom domain**
3. Enter: `autonegypt.com`
4. Since your domain is already on Cloudflare, it auto-configures the DNS
5. Wait 1-2 minutes → done! 🎉

---

## Step 5 — Test the Live Connection

1. Add a car in `mostasharak-accounting.html`
2. Check the **"🌐 نشر على الموقع العام"** checkbox
3. Click **حفظ وتسجيل المركبة**
4. The system will push to Google Sheets via Code.gs
5. Visit `autonegypt.com` → the car should appear within seconds

---

## 🔄 How Data Flows

```
Showroom PC (accounting HTML)
  → ticks "نشر على الموقع" checkbox
  → saves car to local DB
  → pushes_public_listings action → Code.gs → Google Sheets
                                                    ↓
autonegypt.com (Cloudflare Pages HTML)
  → fetches GAS_URL?action=get_public_listings
  → displays cars in real-time grid
```

---

## ⚙️ Keeping It Always Fresh

The website auto-refreshes every **5 minutes**. For instant updates:

Add this to your `addCarToInventory()` after `saveLocal()`:
```js
// Sync public cars to cloud instantly
const publicCars = (db.cars || []).filter(c => c.isPublic && c.status !== 'Sold');
// ... (auto-push to Code.gs happens via cloudPush() if connected)
```

Or add a "🌐 مزامنة الموقع العام" button in the accounting Settings tab.

---

## 🛡️ What's Private vs Public

| Data | Public Website | Private (Accounting Only) |
|------|---------------|--------------------------|
| ماركة، موديل، سنة، لون | ✅ Shown | — |
| سعر البيع | ✅ Shown | — |
| اسم المعرض + واتساب | ✅ Shown | — |
| تكلفة الشراء (cost) | ❌ Hidden | ✅ Internal |
| رقم الشاسيه/الموتور | ❌ Hidden | ✅ Internal |
| بيانات العملاء والعقود | ❌ Hidden | ✅ Internal |
| الربح والخسارة | ❌ Hidden | ✅ Internal |

---

## 🌍 Multi-Showroom (Future)

When a second showroom joins:
- They register in `Code.gs` with their own company name + phone
- Their public cars are tagged with their showroom name
- All appear on `autonegypt.com` under their own brand
- Each showroom manages their own "نشر" toggle independently
