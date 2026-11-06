const fs = require('fs');
const path = require('path');

const baseDir = __dirname;
const desktop = path.join(process.env.USERPROFILE || 'C:\\Users\\7assan', 'Desktop');

console.log('🚀 بدء تجهيز الملفين المتكاملين والمحسنين لنظام مستشارك...');

// ══════════════════════════════════════════════════════════
//  1. FILE 1: MOSTASHARAK ACCOUNTING SYSTEM (PC & MOBILE)
// ══════════════════════════════════════════════════════════
let accHtml = fs.readFileSync(path.join(baseDir, 'index.html'), 'utf8');

// Ensure license fallback is inlined so the file can run anywhere standalone
const inlineLicense = `
<script>
// Default embedded license fallback for standalone execution
if (typeof window.SHOWROOM_LICENSE === 'undefined') {
  window.SHOWROOM_LICENSE = {
    productName: "Mostasharak",
    productNameAr: "مستشارك",
    companyName: "Auto One Egypt",
    licensee: "Auto One Egypt",
    masterSenderPhone: "01222597304",
    masterEmail: "peeppeepmasr@gmail.com",
    allowedDevices: 2,
    issueDate: "2026-11-03",
    version: "2.5.0",
    isLockedBranding: false
  };
}
</script>
`;
accHtml = accHtml.replace('<script src="license.js"></script>', '<script src="license.js" onerror="console.log(\'Using embedded standalone license\')"></script>' + inlineLicense);

// Add Mode Switch & Sync Indicator to the header
const accModePill = `
  <div style="display:flex;align-items:center;gap:6px">
    <button id="systemModeBtn" onclick="toggleSystemSyncMode()" class="sm" style="background:#0f766e;color:#fff;font-weight:700;padding:5px 10px;border-radius:20px;font-size:12px;border:none;cursor:pointer" title="تبديل وضع التشغيل بين مستقل وسحابي">
      <span id="systemModeDot">🟢</span> <span id="systemModeText">متصل ومزامن</span>
    </button>
    <a href="mostasharak-market.html" target="_blank" class="sm sec" style="text-decoration:none;display:inline-flex;align-items:center;gap:4px;font-weight:700;padding:5px 10px;border-radius:8px;font-size:12px" title="فتح تطبيق السوق العام">
      🛍️ السوق
    </a>
  </div>
`;

accHtml = accHtml.replace(
  '<button class="sm sec" onclick="toggleTheme()" title="تبديل المظهر" style="padding:6px 10px">🌓</button>',
  '<button class="sm sec" onclick="toggleTheme()" title="تبديل المظهر" style="padding:6px 10px">🌓</button>\n' + accModePill
);

// Add BroadcastChannel & Local Storage Bridge for Zero-Server Instant Sync
const accSyncBridge = `
// ══════════════════════════════════════════════════════════
//  MOSTASHARAK DUAL-MODE SYNC & BROADCAST ENGINE
// ══════════════════════════════════════════════════════════
let mostasharakBus = null;
try {
  if (typeof BroadcastChannel !== 'undefined') {
    mostasharakBus = new BroadcastChannel('mostasharak_bus');
    mostasharakBus.onmessage = function(ev) {
      if (!ev.data) return;
      if (ev.data.type === 'MARKET_ORDER_PLACED') {
        console.log('📡 Order received via BroadcastChannel:', ev.data.order);
        onIncomingMarketOrder(ev.data.order);
      } else if (ev.data.type === 'SYNC_REQUEST') {
        broadcastStateToMarket();
      }
    };
  }
} catch(e) {
  console.log('BroadcastChannel not supported, falling back to localStorage bridge');
}

// Window Storage Event Fallback for Safari & older webviews
window.addEventListener('storage', function(e) {
  if (e.key === 'mostasharak_new_order_event' && e.newValue) {
    try {
      const order = JSON.parse(e.newValue);
      onIncomingMarketOrder(order);
    } catch(err){}
  }
});

function onIncomingMarketOrder(order) {
  playOrderChime();
  loadMarketOrders();
  toast('📲 طلب شراء جديد ورد من السوق: ' + (order.productName || 'مركبة') + ' من ' + (order.buyerName || 'عميل'));
}

function broadcastStateToMarket() {
  if (!mostasharakBus) return;
  try {
    mostasharakBus.postMessage({
      type: 'STATE_BROADCAST',
      cars: db.cars || [],
      ribbons: PC_RIBBONS || [],
      companyName: db.settings.companyName,
      companyPhone: db.settings.companyPhone
    });
  } catch(e){}
}

function toggleSystemSyncMode() {
  const cur = localStorage.getItem('mostasharak_sync_mode') || 'connected';
  const next = cur === 'connected' ? 'standalone' : 'connected';
  localStorage.setItem('mostasharak_sync_mode', next);
  updateSystemModeUI();
  toast(next === 'standalone' ? '🟡 تم التبديل إلى: نمط العمل المحلي المستقل (Offline Standalone)' : '🟢 تم التبديل إلى: نمط المزامنة السحابية / الشبكية (Connected)');
}

function updateSystemModeUI() {
  const mode = localStorage.getItem('mostasharak_sync_mode') || 'connected';
  const dot = $('systemModeDot');
  const txt = $('systemModeText');
  const btn = $('systemModeBtn');
  if (!dot || !txt || !btn) return;
  if (mode === 'standalone') {
    dot.textContent = '🟡';
    txt.textContent = 'مستقل (أوفلاين)';
    btn.style.background = '#854d0e';
    btn.title = 'النظام يعمل بوضع مستقل كامل بدون الحاجة لأي خادم أو اتصال';
  } else {
    dot.textContent = '🟢';
    txt.textContent = 'متصل ومزامن';
    btn.style.background = '#0f766e';
    btn.title = 'النظام متصل بالسيرفر المحلي أو السحابة المركزية';
  }
}

// Hook into initial sync and boot
setTimeout(updateSystemModeUI, 500);
`;

accHtml = accHtml.replace('// Initialize Application', accSyncBridge + '\n// Initialize Application');

const accDest = path.join(baseDir, 'mostasharak-accounting.html');
const accDesktopDest = path.join(desktop, 'mostasharak-accounting.html');
fs.writeFileSync(accDest, accHtml, 'utf8');
fs.writeFileSync(accDesktopDest, accHtml, 'utf8');
console.log('✅ 1. تم إنشاء ملف المحاسبة والإدارة المتكامل: mostasharak-accounting.html (' + accHtml.length + ' bytes)');


// ══════════════════════════════════════════════════════════
//  2. FILE 2: MOSTASHARAK MARKETPLACE APPLICATION
// ══════════════════════════════════════════════════════════
let mktHtml = fs.readFileSync(path.join(baseDir, 'market.html'), 'utf8');

// Add Quick Link to Accounting System in Left Header
const mktAccLink = `
      <a href="mostasharak-accounting.html" target="_blank" title="لوحة المحاسبة والإدارة الخاصة" style="color:#ffffffcc;text-decoration:none;font-size:18px">💼</a>
`;
mktHtml = mktHtml.replace(
  '<span title="الصفحة الرئيسية" onclick="location.href=\'landing.html\'">🏠</span>',
  '<span title="الصفحة الرئيسية" onclick="location.href=\'landing.html\'">🏠</span>\n' + mktAccLink
);

// Add Dual-Mode Broadcast and Storage Bridge in Market
const mktSyncBridge = `
// ══════════════════════════════════════════════════════════
//  MOSTASHARAK MARKETPLACE DUAL-MODE SYNC ENGINE
// ══════════════════════════════════════════════════════════
let marketBus = null;
try {
  if (typeof BroadcastChannel !== 'undefined') {
    marketBus = new BroadcastChannel('mostasharak_bus');
    marketBus.onmessage = function(ev) {
      if (!ev.data) return;
      if (ev.data.type === 'RIBBONS_UPDATED' && Array.isArray(ev.data.ribbons)) {
        MOSTASHARAK_RIBBONS = ev.data.ribbons;
        renderMostasharakRibbons();
      } else if (ev.data.type === 'STATE_BROADCAST') {
        if (Array.isArray(ev.data.ribbons)) {
          MOSTASHARAK_RIBBONS = ev.data.ribbons;
          renderMostasharakRibbons();
        }
      }
    };
  }
} catch(e){}

// Enhanced submitReserve with dual delivery: Server + Direct Inter-Tab Bus + WhatsApp Fallback
const originalSubmitReserve = submitReserve;
submitReserve = async function() {
  const name = $('res-name').value.trim();
  const phone = $('res-phone').value.trim();
  const type = $('res-type').value;
  const notes = $('res-notes').value.trim();
  const typeLabel = {reserve:'حجز (عربون)',cash:'شراء نقدي',install:'تقسيط مباشر',bank:'تمويل بنكي'}[type]||type;
  if(!name||!phone){ toast('⚠️ الاسم ورقم الواتساب مطلوبان'); return; }

  // Save customer phone for private notifications
  localStorage.setItem('user_phone', phone);

  const orderPayload = {
    id: 'ORD-' + Date.now(),
    buyerName: name,
    buyerPhone: phone,
    orderType: typeLabel,
    productId: activeProduct.id,
    productName: activeProduct.brand + ' ' + activeProduct.model + ' ' + activeProduct.year,
    price: activeProduct.price,
    seller: activeProduct.seller,
    sellerPhone: activeProduct.phone,
    isOurStock: activeProduct.isOurStock !== false,
    custody: activeProduct.custody || 'showroom',
    locationName: activeProduct.locationName || '',
    ownerName: activeProduct.ownerName || activeProduct.seller,
    notes: notes,
    date: new Date().toISOString()
  };

  // 1. Deliver to BroadcastChannel (Instant local inter-tab sync without any server)
  if (marketBus) {
    try {
      marketBus.postMessage({ type: 'MARKET_ORDER_PLACED', order: orderPayload });
    } catch(e){}
  }

  // 2. Deliver via localStorage Event Fallback
  try {
    localStorage.setItem('mostasharak_new_order_event', JSON.stringify(orderPayload));
  } catch(e){}

  // 3. Deliver via Local/Cloud Accounting Server API (if connected)
  let serverDelivered = false;
  try {
    const apiUrl = localStorage.getItem('accounting_server_url') || '';
    const res = await fetch((apiUrl || '') + '/api/orders', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(orderPayload)
    });
    if (res.ok) serverDelivered = true;
  } catch(e){}

  closeModal('reserveModal');
  toast(serverDelivered ? '✅ تم إرسال الطلب وإشعار المالك فورياً عبر السيرفر والسوق!' : '✅ تم حفظ وتمرير طلبك بنجاح!');

  // 4. WhatsApp Direct Bridge
  const msg = encodeURIComponent(
    'السلام عليكم، أود تقديم طلب ' + typeLabel + ' لسيارة:\n' +
    '🚗 ' + activeProduct.brand + ' ' + activeProduct.model + ' ' + activeProduct.year + '\n' +
    '💰 السعر: ' + fmt(activeProduct.price) + ' ج.م\n' +
    '🏢 المعرض: ' + activeProduct.seller + '\n' +
    '👤 الاسم: ' + name + '\n' +
    '📱 الهاتف: ' + phone + '\n' +
    (notes ? ('📝 ملاحظات: ' + notes + '\n') : '') +
    '-- مرسل عبر منصة مستشارك (Mostasharak)'
  );

  const targetWaPhone = (activeProduct.phone || '01222597304').replace(/[^0-9]/g, '');
  const finalWa = targetWaPhone.startsWith('2') ? targetWaPhone : ('20' + targetWaPhone.replace(/^0/, ''));

  setTimeout(() => {
    window.open('https://wa.me/' + finalWa + '?text=' + msg, '_blank');
  }, 400);
};
`;

mktHtml = mktHtml.replace('// ════════════════════════════════════════════\n//  BOOT', mktSyncBridge + '\n// ════════════════════════════════════════════\n//  BOOT');

const mktDest = path.join(baseDir, 'mostasharak-market.html');
const mktDesktopDest = path.join(desktop, 'mostasharak-market.html');
fs.writeFileSync(mktDest, mktHtml, 'utf8');
fs.writeFileSync(mktDesktopDest, mktHtml, 'utf8');
console.log('✅ 2. تم إنشاء تطبيق السوق المتكامل: mostasharak-market.html (' + mktHtml.length + ' bytes)');

console.log('🎉 تم إنشاء وحفظ الملفين على سطح المكتب وبالمشروع بنجاح!');
