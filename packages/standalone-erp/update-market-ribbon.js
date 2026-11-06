const fs = require('fs');
const path = require('path');

const marketPath = path.join(__dirname, 'market.html');
let html = fs.readFileSync(marketPath, 'utf8');

// 1. Update Title
html = html.replace(
  '<title>ShowroomOS Market — السوق العام</title>',
  '<title>Mostasharak Market — سوق مستشارك للسيارات والمركبات</title>'
);

// 2. Add Ribbon CSS before </style>
const ribbonStyles = `
/* ═══ MOSTASHARAK ANNOUNCEMENT RIBBON ═══ */
#mostasharak-ribbon-bar {
  display: flex;
  flex-direction: column;
  background: #111827;
  color: #fff;
  z-index: 9999;
  position: relative;
  box-shadow: 0 2px 10px rgba(0,0,0,0.18);
  font-family: 'Cairo', sans-serif;
  transition: all 0.3s ease;
}
.ribbon-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  font-size: 13px;
  gap: 12px;
  animation: ribbonSlideDown 0.3s ease-out;
  border-bottom: 1px solid rgba(255,255,255,0.08);
}
@keyframes ribbonSlideDown {
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
}
.ribbon-item.type-news {
  background: linear-gradient(90deg, #064e3b 0%, #047857 100%);
  color: #f0fdf4;
}
.ribbon-item.type-notice {
  background: linear-gradient(90deg, #1e3a8a 0%, #2563eb 100%);
  color: #eff6ff;
}
.ribbon-item.type-warning {
  background: linear-gradient(90deg, #991b1b 0%, #dc2626 100%);
  color: #fef2f2;
}
.ribbon-content-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
  overflow: hidden;
}
.ribbon-badge {
  font-size: 11px;
  font-weight: 800;
  padding: 2px 8px;
  border-radius: 12px;
  background: rgba(255,255,255,0.22);
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.ribbon-audience-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 10px;
  background: rgba(0,0,0,0.25);
  white-space: nowrap;
}
.ribbon-text {
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}
@media(max-width: 720px) {
  .ribbon-item {
    padding: 7px 10px;
    font-size: 12px;
    gap: 6px;
  }
  .ribbon-text {
    white-space: normal;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    line-height: 1.4;
  }
}
.ribbon-word-link {
  color: #fff !important;
  background: rgba(255,255,255,0.25);
  padding: 1px 7px;
  border-radius: 6px;
  text-decoration: underline;
  text-underline-offset: 3px;
  font-weight: 800;
  transition: 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 3px;
}
.ribbon-word-link:hover {
  background: #fff;
  color: #111 !important;
  text-decoration: none;
}
.ribbon-timer-badge {
  font-size: 11px;
  color: rgba(255,255,255,0.85);
  background: rgba(0,0,0,0.22);
  padding: 2px 8px;
  border-radius: 8px;
  white-space: nowrap;
}
.ribbon-close-btn {
  background: transparent;
  border: none;
  color: rgba(255,255,255,0.8);
  font-size: 16px;
  cursor: pointer;
  padding: 0 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ribbon-close-btn:hover {
  color: #fff;
}
</style>`;

html = html.replace('</style>', ribbonStyles);

// 3. Update body layout style
html = html.replace(
  'html,body{height:100%;overflow:hidden}',
  'html,body{height:100%;overflow:hidden}\nbody{display:flex;flex-direction:column;font-family:\'Cairo\',sans-serif;background:var(--wa-chat)}'
);
html = html.replace(
  '#app{display:flex;height:100vh}',
  '#app{display:flex;flex:1;min-height:0;height:auto}'
);

// 4. Update Left Header Logo & Actions
html = html.replace(
  '<div class="lh-logo"><div class="lh-logo-icon">🚗</div>سوق المركبات</div>',
  '<div class="lh-logo"><div class="lh-logo-icon">🚗</div>مستشارك — Mostasharak</div>'
);

html = html.replace(
  '<span title="إضافة إعلان" onclick="openAddListing()">➕</span>',
  '<span title="شريط التنبيهات والأخبار" onclick="openRibbonManager()">📢</span>\n      <span title="إضافة إعلان" onclick="openAddListing()">➕</span>'
);

// 5. Add Ribbon Bar right above <div id="app">
html = html.replace(
  '<body>\n<div id="app">',
  '<body>\n<!-- ═══ MOSTASHARAK RIBBON NOTIFICATION BAR ═══ -->\n<div id="mostasharak-ribbon-bar"></div>\n\n<div id="app">'
);

// 6. Add Ribbon Manager Modal before closing </body>
const ribbonModalHTML = `
<!-- ══════════════════════════════════════
     MODAL: RIBBON ANNOUNCEMENT MANAGER
══════════════════════════════════════ -->
<div class="ov" id="ribbonManagerModal">
<div class="sheet" style="max-height:92vh;overflow-y:auto">
  <div class="sh-handle"></div>
  <div class="sh-hd">
    <div class="sh-title">📢 إدارة شريط أخبار وتنبيهات مستشارك (Mostasharak Ribbon)</div>
    <span class="sh-close" onclick="closeModal('ribbonManagerModal')">✕</span>
  </div>

  <div style="background:var(--wa-panel);border-radius:10px;padding:12px;margin-bottom:14px;font-size:13px;line-height:1.7;color:var(--ink)">
    💡 <strong>شريط التنبيهات المجدول:</strong> يمكنك بث أخبار عامة أو إشعارات أو رسائل تحذيرية محددة بوقت بدء وانتهاء (من تاريخ وساعة إلى تاريخ وساعة)، إما <strong>عامة لجميع الزوار</strong> أو <strong>خاصة برقم هاتف عميل محدد</strong> مع دعم الروابط النصية داخل الكلمات مثل <code>[نص الرابط](رابط)</code>.
  </div>

  <div class="section-sep">➕ إنشاء / تعديل رسالة شريط جديدة</div>

  <input type="hidden" id="rb_id">

  <div class="f-row">
    <div>
      <label class="f-label">نوع الرسالة *</label>
      <select class="f-sel" id="rb_type">
        <option value="news">📢 أخبار عامة وعروض (News)</option>
        <option value="notice">🔔 إشعار وتنبيه هام (Notification)</option>
        <option value="warning">⚠️ رسالة تحذيرية عاجلة (Warning)</option>
      </select>
    </div>
    <div>
      <label class="f-label">الجمهور المستهدف *</label>
      <select class="f-sel" id="rb_audience" onchange="toggleRibbonAudienceField()">
        <option value="public">🌐 عام لكافة زوار السوق (Public)</option>
        <option value="private">🔒 رسالة خاصة لعميل محدد (Private)</option>
      </select>
    </div>
  </div>

  <div id="rb_private_box" style="display:none;background:#fef3c7;border:1px solid #f59e0b;border-radius:10px;padding:10px 14px;margin-bottom:12px">
    <label class="f-label" style="color:#92400e">📱 رقم هاتف / واتساب العميل المستهدف *</label>
    <input class="f-inp" id="rb_targetPhone" placeholder="مثال: 01222597304 أو +201222597304">
    <div style="font-size:11px;color:#b45309;margin-top:4px">تظهر الرسالة فقط للمستخدم الذي يحمل هذا الرقم عند زيارة السوق.</div>
  </div>

  <div class="f-row">
    <div>
      <label class="f-label">📅 يبدأ الظهور من (تاريخ ووقت) *</label>
      <input class="f-inp" type="datetime-local" id="rb_fromDateTime">
    </div>
    <div>
      <label class="f-label">📅 ينتهي الظهور في (تاريخ ووقت) *</label>
      <input class="f-inp" type="datetime-local" id="rb_toDateTime">
    </div>
  </div>

  <label class="f-label">عنوان الرسالة أو الخبر *</label>
  <input class="f-inp" id="rb_title" placeholder="مثال: عروض تقسيط حصرية بدون فوائد">

  <div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px;margin-bottom:4px">
    <label class="f-label" style="margin:0">نص الرسالة مع إمكانية إضافة روابط كلمات *</label>
    <button type="button" onclick="insertRibbonLinkSample()" style="background:#e0f2fe;color:#0369a1;border:1px solid #bae6fd;padding:3px 10px;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;font-family:Cairo,sans-serif">
      🔗 + إدراج رابط كلمة [نص](رابط)
    </button>
  </div>
  <textarea class="f-inp" id="rb_content" rows="3" placeholder="اكتب نص الخبر أو التحذير هنا. لإضافة رابط داخل كلمة اكتب: [اسم الرابط](https://wa.me/201222597304)..."></textarea>

  <div style="margin-bottom:14px;display:flex;align-items:center;gap:8px">
    <input type="checkbox" id="rb_active" checked style="width:18px;height:18px">
    <label for="rb_active" style="font-size:13px;font-weight:700;cursor:pointer">تفعيل هذا الشريط فوراً في السوق</label>
  </div>

  <div style="display:flex;gap:10px">
    <button class="f-btn f-btn-green" onclick="saveRibbonAnnouncement()" style="flex:2">💾 حفظ وبث الشريط الآن</button>
    <button class="f-btn f-btn-out" onclick="resetRibbonForm()" style="flex:1">إعادة تعيين</button>
  </div>

  <div class="section-sep" style="margin-top:20px">📋 الرسائل المسجلة والمجدولة حالياً</div>
  <div id="ribbon-list-table" style="display:flex;flex-direction:column;gap:8px;max-height:220px;overflow-y:auto"></div>

  <button class="f-btn f-btn-out" onclick="closeModal('ribbonManagerModal')" style="margin-top:14px">إغلاق النافذة</button>
</div>
</div>
`;

html = html.replace('<!-- ══════════════════════════════════════\n     MODAL: ADD LISTING', ribbonModalHTML + '\n<!-- ══════════════════════════════════════\n     MODAL: ADD LISTING');

// 7. Add Ribbon Logic JavaScript
const ribbonScript = `
// ════════════════════════════════════════════
//  MOSTASHARAK RIBBON ANNOUNCEMENT SYSTEM
// ════════════════════════════════════════════
let MOSTASHARAK_RIBBONS = [
  {
    id: 'ribbon-welcome-1',
    type: 'news',
    audience: 'public',
    targetPhone: '',
    title: 'منصة مستشارك (Mostasharak)',
    content: 'أهلاً بكم في منظومة مستشارك لإدارة المعارض والسيارات. [تواصل مع الإدارة عبر الواتساب](https://wa.me/201222597304) لأي طلب أو استفسار.',
    fromDateTime: '2026-11-01T00:00',
    toDateTime: '2026-12-31T23:59',
    active: true
  },
  {
    id: 'ribbon-warning-1',
    type: 'warning',
    audience: 'public',
    targetPhone: '',
    title: 'تنبيه أمان مالي',
    content: 'يرجى العلم بأن سداد العربون يتم حصرياً بمقر المعرض أو بالحسابات البنكية المعتمدة فقط. [اقرأ إرشادات الأمان المالي](https://wa.me/201222597304).',
    fromDateTime: '2026-11-01T00:00',
    toDateTime: '2026-12-31T23:59',
    active: true
  }
];

function parseRibbonWordLinks(str) {
  if (!str) return '';
  // Convert [text](url) to clickable hyperlink with safe attributes
  return esc(str).replace(/\\[(.*?)\\]\\((https?:\\/\\/[^\\s\\)]+)\\)/g, (match, txt, url) => {
    return \`<a href="\${url}" target="_blank" rel="noopener noreferrer" class="ribbon-word-link">\${txt} ↗</a>\`;
  });
}

function isRibbonTimeValid(r) {
  if (!r || r.active === false) return false;
  const now = new Date();
  if (r.fromDateTime) {
    const from = new Date(r.fromDateTime);
    if (now < from) return false;
  }
  if (r.toDateTime) {
    const to = new Date(r.toDateTime);
    if (now > to) return false;
  }
  return true;
}

function isRibbonAudienceMatch(r) {
  if (!r.audience || r.audience === 'public') return true;
  // Private check: check localStorage phone or user profile
  const storedPhone = (localStorage.getItem('user_phone') || localStorage.getItem('client_phone') || '').replace(/[^0-9]/g, '');
  const target = (r.targetPhone || '').replace(/[^0-9]/g, '');
  if (!target) return true;
  if (!storedPhone) return true; // if not set yet, display with private badge or let admin view
  return storedPhone.endsWith(target) || target.endsWith(storedPhone);
}

function renderMostasharakRibbons() {
  const container = $('mostasharak-ribbon-bar');
  if (!container) return;

  const validRibbons = MOSTASHARAK_RIBBONS.filter(r => {
    if (!isRibbonTimeValid(r)) return false;
    if (!isRibbonAudienceMatch(r)) return false;
    // Check if dismissed in this session
    if (sessionStorage.getItem('dismissed_ribbon_' + r.id)) return false;
    return true;
  });

  if (!validRibbons.length) {
    container.innerHTML = '';
    container.style.display = 'none';
    return;
  }

  container.style.display = 'flex';
  container.innerHTML = validRibbons.map(r => {
    const typeLabel = r.type === 'warning' ? '⚠️ تحذير' : r.type === 'notice' ? '🔔 إشعار' : '📢 خبر';
    const audLabel = r.audience === 'private' ? '🔒 خاص لك' : '🌐 عام';
    const typeClass = 'type-' + (r.type || 'news');
    const parsedText = parseRibbonWordLinks(r.content || '');
    
    // Format expiration time
    let expText = '';
    if (r.toDateTime) {
      try {
        const d = new Date(r.toDateTime);
        expText = \`سارٍ حتى \${d.toLocaleDateString('ar-EG', {month:'short', day:'numeric'})} \${d.toLocaleTimeString('ar-EG', {hour:'2-digit', minute:'2-digit'})}\`;
      } catch(e){}
    }

    return \`
      <div class="ribbon-item \${typeClass}" id="ribbon-row-\${r.id}">
        <div class="ribbon-content-wrap">
          <span class="ribbon-badge">\${typeLabel}</span>
          <span class="ribbon-audience-badge">\${audLabel}</span>
          \${r.title ? \`<strong style="white-space:nowrap;margin-left:4px">\${esc(r.title)}:</strong>\` : ''}
          <span class="ribbon-text">\${parsedText}</span>
        </div>
        <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
          \${expText ? \`<span class="ribbon-timer-badge">⏱️ \${expText}</span>\` : ''}
          <button class="ribbon-close-btn" onclick="dismissRibbon('\${r.id}')" title="إغلاق التنبيه">✕</button>
        </div>
      </div>
    \`;
  }).join('');
}

function dismissRibbon(id) {
  sessionStorage.setItem('dismissed_ribbon_' + id, '1');
  const el = $('ribbon-row-' + id);
  if (el) el.remove();
  const container = $('mostasharak-ribbon-bar');
  if (container && !container.children.length) {
    container.style.display = 'none';
  }
}

async function loadRibbonsFromServer() {
  try {
    const saved = localStorage.getItem('mostasharak_ribbons_cache');
    if (saved) {
      try { MOSTASHARAK_RIBBONS = JSON.parse(saved); } catch(e){}
    }
    const apiUrl = localStorage.getItem('accounting_server_url') || '';
    const res = await fetch((apiUrl || '') + '/api/ribbons');
    if (res.ok) {
      const data = await res.json();
      if (data && data.ribbons && Array.isArray(data.ribbons)) {
        MOSTASHARAK_RIBBONS = data.ribbons;
        localStorage.setItem('mostasharak_ribbons_cache', JSON.stringify(data.ribbons));
      }
    }
  } catch(e) {
    console.log('Ribbon server not reachable, using cached/local ribbons.');
  }
  renderMostasharakRibbons();
}

function openRibbonManager() {
  renderRibbonListTable();
  resetRibbonForm();
  $('ribbonManagerModal').classList.add('open');
}

function toggleRibbonAudienceField() {
  const aud = $('rb_audience').value;
  $('rb_private_box').style.display = aud === 'private' ? 'block' : 'none';
}

function insertRibbonLinkSample() {
  const ta = $('rb_content');
  const sample = '[اضغط هنا لمعرفة التفاصيل](https://wa.me/201222597304)';
  ta.value += (ta.value ? ' ' : '') + sample;
  ta.focus();
}

function resetRibbonForm() {
  $('rb_id').value = '';
  $('rb_type').value = 'news';
  $('rb_audience').value = 'public';
  $('rb_private_box').style.display = 'none';
  $('rb_targetPhone').value = '';
  $('rb_title').value = '';
  $('rb_content').value = '';
  $('rb_active').checked = true;

  // Default time: now until +7 days
  const now = new Date();
  const plus7 = new Date(Date.now() + 7 * 86400000);
  $('rb_fromDateTime').value = now.toISOString().slice(0, 16);
  $('rb_toDateTime').value = plus7.toISOString().slice(0, 16);
}

function editRibbonItem(id) {
  const r = MOSTASHARAK_RIBBONS.find(item => item.id === id);
  if (!r) return;
  $('rb_id').value = r.id;
  $('rb_type').value = r.type || 'news';
  $('rb_audience').value = r.audience || 'public';
  toggleRibbonAudienceField();
  $('rb_targetPhone').value = r.targetPhone || '';
  $('rb_title').value = r.title || '';
  $('rb_content').value = r.content || '';
  $('rb_fromDateTime').value = (r.fromDateTime || '').slice(0, 16);
  $('rb_toDateTime').value = (r.toDateTime || '').slice(0, 16);
  $('rb_active').checked = r.active !== false;
  $('rb_title').focus();
}

async function saveRibbonAnnouncement() {
  const title = $('rb_title').value.trim();
  const content = $('rb_content').value.trim();
  const type = $('rb_type').value;
  const audience = $('rb_audience').value;
  const targetPhone = $('rb_targetPhone').value.trim();
  const fromDateTime = $('rb_fromDateTime').value;
  const toDateTime = $('rb_toDateTime').value;
  const active = $('rb_active').checked;
  const id = $('rb_id').value || ('ribbon-' + Date.now());

  if (!title || !content) {
    toast('⚠️ يرجى كتابة عنوان ونص الرسالة');
    return;
  }
  if (!fromDateTime || !toDateTime) {
    toast('⚠️ يرجى تحديد وقت البدء ووقت الانتهاء للظهور');
    return;
  }

  const ribbonObj = {
    id, type, audience, targetPhone, title, content, fromDateTime, toDateTime, active,
    updatedAt: new Date().toISOString()
  };

  const idx = MOSTASHARAK_RIBBONS.findIndex(r => r.id === id);
  if (idx >= 0) MOSTASHARAK_RIBBONS[idx] = ribbonObj;
  else MOSTASHARAK_RIBBONS.unshift(ribbonObj);

  localStorage.setItem('mostasharak_ribbons_cache', JSON.stringify(MOSTASHARAK_RIBBONS));

  // Sync to server
  try {
    const apiUrl = localStorage.getItem('accounting_server_url') || '';
    await fetch((apiUrl || '') + '/api/ribbons', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(ribbonObj)
    });
  } catch(e){}

  toast('✅ تم حفظ ونشر شريط التنبيهات بنجاح!');
  renderMostasharakRibbons();
  renderRibbonListTable();
  resetRibbonForm();
}

async function deleteRibbonItem(id) {
  if (!confirm('هل تريد حذف هذه الرسالة من شريط التنبيهات؟')) return;
  MOSTASHARAK_RIBBONS = MOSTASHARAK_RIBBONS.filter(r => r.id !== id);
  localStorage.setItem('mostasharak_ribbons_cache', JSON.stringify(MOSTASHARAK_RIBBONS));
  try {
    const apiUrl = localStorage.getItem('accounting_server_url') || '';
    await fetch((apiUrl || '') + '/api/ribbons/delete', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({id})
    });
  } catch(e){}
  renderMostasharakRibbons();
  renderRibbonListTable();
  toast('🗑 تم حذف الرسالة');
}

function renderRibbonListTable() {
  const container = $('ribbon-list-table');
  if (!container) return;
  if (!MOSTASHARAK_RIBBONS.length) {
    container.innerHTML = '<div style="font-size:12px;color:var(--mute);text-align:center;padding:12px">لا توجد رسائل مسجلة حالياً</div>';
    return;
  }
  container.innerHTML = MOSTASHARAK_RIBBONS.map(r => {
    const activeBadge = isRibbonTimeValid(r) ? '🟢 سارٍ ونشط' : '⚪ منتهٍ أو معطل';
    const audBadge = r.audience === 'private' ? \`🔒 خاص: \${esc(r.targetPhone || 'بدون رقم')}\` : '🌐 عام للجميع';
    return \`
      <div style="background:#fff;border:1px solid var(--border);border-radius:8px;padding:8px 12px;display:flex;justify-content:space-between;align-items:center;font-size:12px">
        <div>
          <div style="font-weight:700;color:var(--ink)">\${esc(r.title)} <span style="font-weight:normal;color:var(--mute)">(\${r.type})</span></div>
          <div style="color:var(--mute);font-size:11px">\${audBadge} · \${activeBadge} · من \${(r.fromDateTime||'').slice(0,10)} إلى \${(r.toDateTime||'').slice(0,10)}</div>
        </div>
        <div style="display:flex;gap:6px">
          <button onclick="editRibbonItem('\${r.id}')" style="background:#f0f2f5;border:1px solid #ddd;border-radius:6px;padding:3px 8px;cursor:pointer;font-family:Cairo,sans-serif">✏️ تعديل</button>
          <button onclick="deleteRibbonItem('\${r.id}')" style="background:#fee2e2;color:#b91c1c;border:1px solid #fecaca;border-radius:6px;padding:3px 8px;cursor:pointer;font-family:Cairo,sans-serif">🗑️ حذف</button>
        </div>
      </div>
    \`;
  }).join('');
}

// Check and refresh ribbons on load and periodically
loadRibbonsFromServer();
setInterval(renderMostasharakRibbons, 20000);
`;

html = html.replace('renderSellers();\n</script>', 'renderSellers();\n' + ribbonScript + '\n</script>');

fs.writeFileSync(marketPath, html, 'utf8');
console.log('market.html updated with Mostasharak Ribbon system successfully!');
