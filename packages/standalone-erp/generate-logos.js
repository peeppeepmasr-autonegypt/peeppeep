const fs = require('fs');
const path = require('path');

const iconsDir = 'E:\\Mostasharak\\icons';
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

console.log('🎨 جاري تصميم شعار Almostashar Auto | المستشار أوتو (عربي + إنجليزي)...');

// 1. MASTER BILINGUAL HORIZONTAL LOGO (عربي + إنجليزي متوازن بدون أي تعارض)
const bilingualLogoSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 240" width="100%" height="100%">
  <defs>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#E5C07B"/>
      <stop offset="50%" stop-color="#D4AF37"/>
      <stop offset="100%" stop-color="#9A7B1C"/>
    </linearGradient>
    <linearGradient id="tealGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#14B8A6"/>
      <stop offset="50%" stop-color="#0F6B5C"/>
      <stop offset="100%" stop-color="#064E3B"/>
    </linearGradient>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0F172A"/>
      <stop offset="100%" stop-color="#070D18"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="3" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Background Card -->
  <rect width="900" height="240" rx="20" fill="url(#bgGrad)"/>
  <rect width="896" height="236" x="2" y="2" rx="18" fill="none" stroke="url(#goldGrad)" stroke-width="1.5" stroke-opacity="0.4"/>

  <!-- ─── CENTRAL / EMBLEM EMBED ─── -->
  <g transform="translate(450, 120)">
    <!-- Outer Shield / Halo -->
    <circle r="82" fill="url(#tealGrad)" fill-opacity="0.15"/>
    <circle r="72" fill="none" stroke="url(#goldGrad)" stroke-width="2.5" stroke-dasharray="8 4"/>
    <circle r="64" fill="#0B132B" stroke="#1E293B" stroke-width="2"/>

    <!-- Winged Automotive Crest -->
    <!-- Stylized Wings / Speed Lines -->
    <path d="M-52,-8 C-35,-26 -12,-35 0,-35 C12,-35 35,-26 52,-8 C38,-15 20,-20 0,-20 C-20,-20 -38,-15 -52,-8 Z" fill="url(#goldGrad)" filter="url(#glow)"/>
    
    <!-- Aerodynamic Sports Car Silhouette Top Curve -->
    <path d="M-40,8 C-25,-12 -8,-18 0,-18 C8,-18 25,-12 40,8 C28,1 15,-4 0,-4 C-15,-4 -28,1 -40,8 Z" fill="#2DD4BF"/>
    
    <!-- Bold 'A' Monogram intertwined with Steering / Road Vector -->
    <path d="M0,-30 L-22,25 L-10,25 L-5,10 L5,10 L10,25 L22,25 Z M-3,2 L0,-12 L3,2 Z" fill="url(#goldGrad)"/>
    
    <!-- Golden Core Star / Diamond -->
    <polygon points="0,32 5,42 0,40 -5,42" fill="url(#goldGrad)"/>
  </g>

  <!-- ─── RIGHT SIDE: ARABIC BRAND (المستشار أوتو) ─── -->
  <!-- Text Anchor: start, right-to-left natural placement -->
  <g transform="translate(480, 0)">
    <!-- Primary Arabic Heading -->
    <text x="70" y="105" font-family="'Cairo', 'Tajawal', sans-serif" font-size="44" font-weight="900" fill="#FFFFFF" letter-spacing="0">
      المُسْتَشَار <tspan fill="url(#goldGrad)">أوتو</tspan>
    </text>
    
    <!-- Arabic Subtitle -->
    <text x="70" y="142" font-family="'Cairo', sans-serif" font-size="14" font-weight="700" fill="#94A3B8" letter-spacing="1">
      أنظمة إدارة معارض السيارات والحسابات
    </text>

    <!-- Arabic Badge -->
    <rect x="70" y="160" width="160" height="24" rx="6" fill="#0F6B5C" fill-opacity="0.3" stroke="#14B8A6" stroke-width="1"/>
    <text x="150" y="177" font-family="'Cairo', sans-serif" font-size="11" font-weight="800" fill="#2DD4BF" text-anchor="middle">
      المنظومة السحابية المعتمدة
    </text>
  </g>

  <!-- ─── LEFT SIDE: ENGLISH BRAND (ALMOSTASHAR AUTO) ─── -->
  <!-- Text Anchor: end for symmetric balance -->
  <g transform="translate(420, 0)">
    <!-- Primary English Heading -->
    <text x="-70" y="105" text-anchor="end" font-family="'Montserrat', 'Cairo', sans-serif" font-size="34" font-weight="900" fill="#FFFFFF" letter-spacing="1.5">
      ALMOSTASHAR <tspan fill="url(#goldGrad)">AUTO</tspan>
    </text>
    
    <!-- English Subtitle -->
    <text x="-70" y="142" text-anchor="end" font-family="'Montserrat', 'Cairo', sans-serif" font-size="12" font-weight="700" fill="#94A3B8" letter-spacing="2">
      DEALERSHIP ERP & MARKETPLACE
    </text>

    <!-- English Badge -->
    <rect x="-240" y="160" width="170" height="24" rx="6" fill="#1E293B" stroke="url(#goldGrad)" stroke-width="1"/>
    <text x="-155" y="177" font-family="'Montserrat', sans-serif" font-size="10" font-weight="800" fill="#D4AF37" text-anchor="middle" letter-spacing="1">
      OFFICIAL EDITION
    </text>
  </g>
</svg>`;

fs.writeFileSync(path.join(iconsDir, 'almostashar-auto-bilingual.svg'), bilingualLogoSVG, 'utf8');

// 2. ARABIC-PRIMARY VERSION (FOR INVOICES & ARABIC ERP)
const arabicLogoSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 140" width="100%" height="100%">
  <defs>
    <linearGradient id="goldA" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#E5C07B"/>
      <stop offset="50%" stop-color="#D4AF37"/>
      <stop offset="100%" stop-color="#9A7B1C"/>
    </linearGradient>
    <linearGradient id="tealA" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#14B8A6"/>
      <stop offset="100%" stop-color="#0F6B5C"/>
    </linearGradient>
  </defs>

  <!-- Emblem on Right -->
  <g transform="translate(460, 70)">
    <circle r="46" fill="url(#tealA)" fill-opacity="0.12"/>
    <circle r="40" fill="none" stroke="url(#goldA)" stroke-width="2"/>
    <path d="M-28,-5 C-18,-18 -6,-24 0,-24 C6,-24 18,-18 28,-5 C18,-10 8,-13 0,-13 C-8,-13 -18,-10 -28,-5 Z" fill="url(#goldA)"/>
    <path d="M0,-20 L-14,16 L-6,16 L-3,7 L3,7 L6,16 L14,16 Z M-2,1 L0,-8 L2,1 Z" fill="url(#goldA)"/>
    <circle cx="0" cy="22" r="3" fill="#14B8A6"/>
  </g>

  <!-- Texts aligned right for Arabic readers -->
  <g transform="translate(390, 0)">
    <text x="0" y="58" text-anchor="end" font-family="'Cairo', sans-serif" font-size="34" font-weight="900" fill="#0F172A">
      المُسْتَشَار <tspan fill="#D4AF37">أوتو</tspan>
    </text>
    <text x="0" y="86" text-anchor="end" font-family="'Montserrat', sans-serif" font-size="14" font-weight="800" fill="#0F6B5C" letter-spacing="2">
      ALMOSTASHAR AUTO
    </text>
    <text x="0" y="110" text-anchor="end" font-family="'Cairo', sans-serif" font-size="11" font-weight="600" fill="#64748B">
      أنظمة إدارة معارض السيارات والحسابات المعتمدة
    </text>
  </g>
</svg>`;

fs.writeFileSync(path.join(iconsDir, 'almostashar-auto-ar.svg'), arabicLogoSVG, 'utf8');

// 3. ENGLISH-PRIMARY VERSION (FOR EXPORT & INTERNATIONAL CLIENTS)
const englishLogoSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 140" width="100%" height="100%">
  <defs>
    <linearGradient id="goldE" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#E5C07B"/>
      <stop offset="50%" stop-color="#D4AF37"/>
      <stop offset="100%" stop-color="#9A7B1C"/>
    </linearGradient>
    <linearGradient id="tealE" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#14B8A6"/>
      <stop offset="100%" stop-color="#0F6B5C"/>
    </linearGradient>
  </defs>

  <!-- Emblem on Left -->
  <g transform="translate(70, 70)">
    <circle r="46" fill="url(#tealE)" fill-opacity="0.12"/>
    <circle r="40" fill="none" stroke="url(#goldE)" stroke-width="2"/>
    <path d="M-28,-5 C-18,-18 -6,-24 0,-24 C6,-24 18,-18 28,-5 C18,-10 8,-13 0,-13 C-8,-13 -18,-10 -28,-5 Z" fill="url(#goldE)"/>
    <path d="M0,-20 L-14,16 L-6,16 L-3,7 L3,7 L6,16 L14,16 Z M-2,1 L0,-8 L2,1 Z" fill="url(#goldE)"/>
    <circle cx="0" cy="22" r="3" fill="#14B8A6"/>
  </g>

  <!-- Texts aligned left for English readers -->
  <g transform="translate(140, 0)">
    <text x="0" y="58" font-family="'Montserrat', sans-serif" font-size="30" font-weight="900" fill="#0F172A" letter-spacing="1">
      ALMOSTASHAR <tspan fill="#D4AF37">AUTO</tspan>
    </text>
    <text x="0" y="86" font-family="'Cairo', sans-serif" font-size="18" font-weight="800" fill="#0F6B5C">
      المُسْتَشَار أوتو للسيارات
    </text>
    <text x="0" y="110" font-family="'Montserrat', sans-serif" font-size="11" font-weight="700" fill="#64748B" letter-spacing="1">
      AUTOMOTIVE MANAGEMENT & DEALERSHIP SYSTEMS
    </text>
  </g>
</svg>`;

fs.writeFileSync(path.join(iconsDir, 'almostashar-auto-en.svg'), englishLogoSVG, 'utf8');

// 4. CIRCULAR BADGE / OFFICIAL STAMP (FOR DOCUMENT STAMPS & PWA ICON)
const badgeLogoSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" width="100%" height="100%">
  <defs>
    <linearGradient id="stampGold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FDE047"/>
      <stop offset="50%" stop-color="#D4AF37"/>
      <stop offset="100%" stop-color="#9A7B1C"/>
    </linearGradient>
    <linearGradient id="stampTeal" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0F766E"/>
      <stop offset="100%" stop-color="#042F2E"/>
    </linearGradient>
    <!-- Text Paths for curved bilingual text -->
    <path id="topCurve" d="M 40,150 A 110,110 0 1,1 260,150" fill="none"/>
    <path id="bottomCurve" d="M 260,150 A 110,110 0 0,1 40,150" fill="none"/>
  </defs>

  <!-- Background Base -->
  <circle cx="150" cy="150" r="145" fill="url(#stampTeal)" stroke="url(#stampGold)" stroke-width="4"/>
  <circle cx="150" cy="150" r="135" fill="none" stroke="url(#stampGold)" stroke-width="1.5" stroke-dasharray="6 3"/>

  <!-- Top Arabic Text (Curved) -->
  <text font-family="'Cairo', sans-serif" font-size="20" font-weight="900" fill="#FFFFFF" letter-spacing="2">
    <textPath href="#topCurve" startOffset="50%" text-anchor="middle">
      المُسْتَشَار أوتو • ALMOSTASHAR AUTO
    </textPath>
  </text>

  <!-- Central Crest -->
  <circle cx="150" cy="150" r="62" fill="#0B132B" stroke="url(#stampGold)" stroke-width="2.5"/>
  <g transform="translate(150, 150)">
    <!-- Aerodynamic Speed Wings -->
    <path d="M-42,-8 C-25,-22 -10,-28 0,-28 C10,-28 25,-22 42,-8 C28,-14 14,-17 0,-17 C-14,-17 -28,-14 -42,-8 Z" fill="url(#stampGold)"/>
    <!-- Intertwined 'A' and Car Silhouette -->
    <path d="M0,-24 L-18,20 L-8,20 L-4,8 L4,8 L8,20 L18,20 Z M-2,1 L0,-10 L2,1 Z" fill="url(#stampGold)"/>
    <polygon points="0,26 4,33 0,31 -4,33" fill="#2DD4BF"/>
  </g>

  <!-- Bottom Subtitle Text (Curved) -->
  <text font-family="'Montserrat', 'Cairo', sans-serif" font-size="12" font-weight="800" fill="#FDE047" letter-spacing="3">
    <textPath href="#bottomCurve" startOffset="50%" text-anchor="middle">
      ★ CERTIFIED DEALERSHIP ERP ★
    </textPath>
  </text>
</svg>`;

fs.writeFileSync(path.join(iconsDir, 'almostashar-auto-badge.svg'), badgeLogoSVG, 'utf8');
fs.writeFileSync(path.join(iconsDir, 'icon.svg'), badgeLogoSVG, 'utf8');

console.log('✅ تم إنشاء الشعارات المتكاملة (عربي + إنجليزي) في E:\\Mostasharak\\icons\\');
