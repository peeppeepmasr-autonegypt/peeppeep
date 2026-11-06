const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const targetFile = 'E:\\Mostasharak\\mostasharak-accounting.html';
let html = fs.readFileSync(targetFile, 'utf8');

console.log('📄 جاري إضافة مركز طباعة المستندات والفواتير وأذون التسليم الرسمية...');

// 1. Add Print Center Button to Header
const printCenterBtn = `<button class="sm" onclick="openDocPrintCenter()" title="مركز طباعة الفواتير وأذون التسليم والسندات الرسمية" style="padding:6px 12px;font-weight:700;background:#d97706;color:#fff">📄 فواتير وأذون التسليم</button>`;

html = html.replace(
  '<button class="sm purp" onclick="openReportsModal()"',
  printCenterBtn + '\n  <button class="sm purp" onclick="openReportsModal()"'
);

// 2. Add Top Navigation button for Print Center
html = html.replace(
  '<button class="top-nav-btn" data-t="marketorders"',
  '<button class="top-nav-btn" data-t="doccenter" onclick="openDocPrintCenter()" style="background:#fffbeb;border-bottom-color:#d97706">📄 10. طباعة الفواتير والأذون</button>\n <button class="top-nav-btn" data-t="marketorders"'
);

// 3. Update Contracts card buttons to include direct Print Invoice and Delivery Note
html = html.replace(
  '<button class="blue sm" onclick="printContractSummary(${c.id})">🖨️ طباعة ملخص العقد</button>',
  `<button class="blue sm" onclick="printContractSummary(\${c.id})">🖨️ ملخص العقد</button>
         <button class="sm" style="background:#0f766e;color:#fff" onclick="printSalesInvoice(\${c.id})">📄 فاتورة بيع A4</button>
         <button class="sm" style="background:#b45309;color:#fff" onclick="printDeliveryNote(\${c.id})">🚗 إذن ومحضر تسليم</button>`
);

// 4. Update Cars card buttons to include print Delivery Note
html = html.replace(
  '<button class="sm" onclick="openCarModal(${c.id})">تعديل</button>',
  `<button class="sm" style="background:#b45309;color:#fff;padding:3px 8px" onclick="printCarDeliveryNoteById(\${c.id})" title="طباعة محضر وإذن تسليم للمشتري">🚗 إذن تسليم</button>
     <button class="sm" onclick="openCarModal(\${c.id})">تعديل</button>`
);

// 5. Update Purchase System to include print Purchase Invoice
html = html.replace(
  "toast('✅ تم شراء المركبة وتوليد القيد المحاسبي بنجاح!');",
  "toast('✅ تم شراء المركبة وتوليد القيد المحاسبي بنجاح!');\n  setTimeout(() => { if (confirm('هل تريد طباعة فاتورة التوريد وإذن استلام المركبة الآن؟')) printPurchaseInvoice(carObj.id); }, 600);"
);

// 6. Modal HTML for Document Printing Center
const docPrintCenterModalHTML = `
<!-- ══════════════════════════════════════════════════════════
     MODAL: OFFICIAL DOCUMENT PRINTING CENTER (مركز طباعة المستندات والفواتير)
══════════════════════════════════════════════════════════ -->
<div id="docPrintCenterModal" class="ov">
 <div class="card" style="max-width:860px;width:95%;margin:auto;max-height:92vh;overflow-y:auto;border:2px solid #d97706;box-shadow:0 12px 36px rgba(0,0,0,0.25)">
  <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #d97706;padding-bottom:12px;margin-bottom:14px">
   <div>
    <h2 style="margin:0;color:#d97706;font-size:18px">📄 مركز طباعة المستندات والفواتير الرسمية (A4 Document Center)</h2>
    <div class="mute" style="font-size:12px">طباعة فواتير البيع والشراء · محاضر وأذون تسليم المركبات · سندات الصرف والقبض المعتمدة</div>
   </div>
   <button class="sm del" onclick="closeDocPrintCenter()">✕ إغلاق</button>
  </div>

  <!-- TABS FOR DOCUMENT TYPES -->
  <div class="report-subnav" style="margin-bottom:16px">
   <button class="on" id="docTab_invoices" onclick="switchDocTab('invoices', this)">📄 1. فواتير بيع السيارات</button>
   <button id="docTab_delivery" onclick="switchDocTab('delivery', this)">🚗 2. أذون ومحاضر التسليم</button>
   <button id="docTab_purchase" onclick="switchDocTab('purchase', this)">🧾 3. فواتير الشراء والتوريد</button>
   <button id="docTab_vouchers" onclick="switchDocTab('vouchers', this)">💵 4. سندات القبض والصرف</button>
  </div>

  <!-- TAB 1: SALES INVOICES -->
  <div id="docSec_invoices" class="doc-sec">
   <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:10px 14px;margin-bottom:12px;font-size:12px;color:#92400e">
    💡 اختر عقداً لطباعة <strong>فاتورة بيع سيارة رسمية A4</strong> تتضمن بيانات المعرض، المشتري، مواصفات المركبة، والمقدم والأقساط والشروط والتواقيع الرسمية:
   </div>
   <div id="docInvoicesList" style="display:flex;flex-direction:column;gap:8px;max-height:300px;overflow-y:auto"></div>
  </div>

  <!-- TAB 2: DELIVERY NOTES -->
  <div id="docSec_delivery" class="doc-sec" style="display:none">
   <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:10px 14px;margin-bottom:12px;font-size:12px;color:#1e40af">
    🚗 اختر سيارة أو عقداً لطباعة <strong>محضر وإذن تسليم واستلام مركبة A4</strong> مع فحص العداد (KM) والمفاتيح والملكية وإقرار الاستلام والتواقيع:
   </div>
   <div id="docDeliveryList" style="display:flex;flex-direction:column;gap:8px;max-height:300px;overflow-y:auto"></div>
  </div>

  <!-- TAB 3: PURCHASE INVOICES -->
  <div id="docSec_purchase" class="doc-sec" style="display:none">
   <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:10px 14px;margin-bottom:12px;font-size:12px;color:#166534">
    🧾 طباعة <strong>فاتورة شراء وتوريد مركبة جديدة للمخزون</strong> لإثبات عملية الشراء من المورد أو المالك الأصلي والتكلفة وطريقة السداد:
   </div>
   <div id="docPurchaseList" style="display:flex;flex-direction:column;gap:8px;max-height:300px;overflow-y:auto"></div>
  </div>

  <!-- TAB 4: CASH VOUCHERS -->
  <div id="docSec_vouchers" class="doc-sec" style="display:none">
   <div style="background:#faf5ff;border:1px solid #e9d5ff;border-radius:10px;padding:10px 14px;margin-bottom:12px;font-size:12px;color:#6b21a8">
    💵 طباعة <strong>سند صرف نقدية</strong> أو <strong>سند قبض نقدية عام</strong> مع تفقيط المبلغ والتوجيه المحاسبي:
   </div>
   
   <div class="card" style="background:#fff;border:1px solid var(--line);margin:10px 0">
    <h4 style="margin:0 0 10px;color:#6b21a8">إنشاء وطباعة سند فوري:</h4>
    <div class="g2">
     <div>
      <label>نوع السند *</label>
      <select id="v_type">
       <option value="receipt">🟢 سند قبض نقدية (Cash Receipt)</option>
       <option value="payment">🔴 سند صرف نقدية (Payment Voucher)</option>
      </select>
     </div>
     <div>
      <label>المبلغ (جنيه مصري) *</label>
      <input id="v_amount" type="number" placeholder="مثال: 25000">
     </div>
    </div>
    <div class="g2" style="margin-top:8px">
     <div><label>اسم الطرف المعني (المستلم / الدافع) *</label><input id="v_party" placeholder="اسم الشخص أو الشركة"></div>
     <div><label>البيان / سبب الصرف أو القبض *</label><input id="v_desc" placeholder="مثال: دفعة مقدمة لشراء سيارة / عمولة وساطة"></div>
    </div>
    <button class="purp" style="margin-top:12px;width:100%" onclick="printCustomVoucher()">🖨️ طباعة سند رسمي A4 فوراً</button>
   </div>

   <div style="font-weight:700;font-size:13px;margin:14px 0 6px">📋 سندات القيود المحاسبية المسجلة بالدفاتر:</div>
   <div id="docJournalVouchersList" style="display:flex;flex-direction:column;gap:8px;max-height:220px;overflow-y:auto"></div>
  </div>

  <button class="sec" onclick="closeDocPrintCenter()" style="width:100%;margin-top:14px">إغلاق المركز</button>
 </div>
</div>
`;

// Insert Modal before ACTIVATION MODAL
html = html.replace('<!-- ACTIVATION MODAL -->', docPrintCenterModalHTML + '\n<!-- ACTIVATION MODAL -->');

// 7. JavaScript Functions for Document Printing Center
const docPrintFunctions = `
// ══════════════════════════════════════════════════════════
//  OFFICIAL DOCUMENT PRINTING CENTER & TEMPLATES (A4)
// ══════════════════════════════════════════════════════════
function openDocPrintCenter() {
  switchDocTab('invoices', $('docTab_invoices'));
  renderDocInvoicesList();
  $('docPrintCenterModal').classList.add('on');
}

function closeDocPrintCenter() {
  $('docPrintCenterModal').classList.remove('on');
}

function switchDocTab(tab, btn) {
  document.querySelectorAll('.doc-sec').forEach(e => e.style.display = 'none');
  document.querySelectorAll('.report-subnav button').forEach(b => b.classList.remove('on'));
  if (btn) btn.classList.add('on');
  const sec = $('docSec_' + tab);
  if (sec) sec.style.display = 'block';

  if (tab === 'invoices') renderDocInvoicesList();
  else if (tab === 'delivery') renderDocDeliveryList();
  else if (tab === 'purchase') renderDocPurchaseList();
  else if (tab === 'vouchers') renderDocVouchersList();
}

function renderDocInvoicesList() {
  const container = $('docInvoicesList');
  if (!container) return;
  if (!db.contracts || !db.contracts.length) {
    container.innerHTML = '<div class="mute" style="text-align:center;padding:16px">لا توجد عقود مسجلة بعد لطباعة فواتيرها</div>';
    return;
  }
  container.innerHTML = db.contracts.map(c => \`
    <div style="background:#fff;border:1px solid var(--line);border-radius:10px;padding:10px 14px;display:flex;justify-content:space-between;align-items:center;font-size:13px">
      <div>
        <strong>عقد #\${c.id} — \${esc(c.customerName)}</strong>
        <div class="mute" style="font-size:11px">المركبة: \${esc(c.carModel || 'سيارة')} | القيمة: \${fmt(c.price)} ج.م | التاريخ: \${c.date}</div>
      </div>
      <div style="display:flex;gap:6px">
        <button class="sm" style="background:#0f766e;color:#fff" onclick="printSalesInvoice(\${c.id})">📄 طباعة الفاتورة A4</button>
        <button class="sm" style="background:#b45309;color:#fff" onclick="printDeliveryNote(\${c.id})">🚗 إذن تسليم</button>
      </div>
    </div>
  \`).join('');
}

function renderDocDeliveryList() {
  const container = $('docDeliveryList');
  if (!container) return;
  const list = db.contracts && db.contracts.length ? db.contracts : [];
  if (!list.length && (!db.cars || !db.cars.length)) {
    container.innerHTML = '<div class="mute" style="text-align:center;padding:16px">لا توجد سيارات أو عقود مسجلة بعد</div>';
    return;
  }
  let out = list.map(c => \`
    <div style="background:#fff;border:1px solid var(--line);border-radius:10px;padding:10px 14px;display:flex;justify-content:space-between;align-items:center;font-size:13px">
      <div>
        <strong>تسليم للمشتري: \${esc(c.customerName)}</strong>
        <div class="mute" style="font-size:11px">السيارة: \${esc(c.carModel || 'مركبة')} | شاسيه: \${esc(c.carChassis || '---')}</div>
      </div>
      <button class="sm" style="background:#b45309;color:#fff" onclick="printDeliveryNote(\${c.id})">🚗 طباعة محضر التسليم A4</button>
    </div>
  \`).join('');

  container.innerHTML = out || '<div class="mute" style="text-align:center;padding:16px">اختر من العقود أعلاه</div>';
}

function renderDocPurchaseList() {
  const container = $('docPurchaseList');
  if (!container) return;
  const cars = (db.cars || []).filter(c => c.cost > 0);
  if (!cars.length) {
    container.innerHTML = '<div class="mute" style="text-align:center;padding:16px">لا توجد مركبات مسجلة بتكلفة شراء</div>';
    return;
  }
  container.innerHTML = cars.map(c => \`
    <div style="background:#fff;border:1px solid var(--line);border-radius:10px;padding:10px 14px;display:flex;justify-content:space-between;align-items:center;font-size:13px">
      <div>
        <strong>\${esc(c.brand)} \${esc(c.model)} (\${c.year})</strong>
        <div class="mute" style="font-size:11px">سعر الشراء: \${fmt(c.cost)} ج.م | شاسيه: \${esc(c.chassis || '---')} | المالك/المورد: \${esc(c.ownerName || 'المورد')}</div>
      </div>
      <button class="sm" style="background:#166534;color:#fff" onclick="printPurchaseInvoice(\${c.id})">🧾 طباعة فاتورة التوريد والشراء A4</button>
    </div>
  \`).join('');
}

function renderDocVouchersList() {
  const container = $('docJournalVouchersList');
  if (!container) return;
  const journal = db.journal || [];
  if (!journal.length) {
    container.innerHTML = '<div class="mute" style="text-align:center;padding:12px">لا توجد قيود مسجلة بعد</div>';
    return;
  }
  container.innerHTML = journal.slice(0, 15).map(j => \`
    <div style="background:#fff;border:1px solid var(--line);border-radius:8px;padding:8px 12px;display:flex;justify-content:space-between;align-items:center;font-size:12px">
      <div>
        <strong>قيد #\${j.id} — \${esc(j.desc || 'عملية مالية')}</strong>
        <div class="mute" style="font-size:11px">المبلغ: \${fmt(j.amount)} ج.م | من \${j.debit} إلى \${j.credit} | التاريخ: \${j.date}</div>
      </div>
      <button class="sm purp" onclick="printJournalVoucher(\${j.id})">🖨️ طباعة سند</button>
    </div>
  \`).join('');
}

// ──────────────────────────────────────────────────────────
// 1. OFFICIAL CAR SALES INVOICE (فاتورة بيع سيارة معتمدة A4)
// ──────────────────────────────────────────────────────────
function printSalesInvoice(cid) {
  const c = db.contracts.find(x => x.id === cid);
  if (!c) return;
  const comp = db.settings.companyName || 'معرض السيارات';
  const phone = db.settings.companyPhone || '01222597304';
  const addr = db.settings.companyAddress || 'القاهرة - جمهورية مصر العربية';

  const html = \`
    <div style="max-width:760px;margin:auto;font-family:'Cairo',sans-serif;direction:rtl;padding:24px;color:#111;line-height:1.7;border:2px solid #0f6b5c;border-radius:12px">
      <!-- HEADER -->
      <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:3px double #0f6b5c;padding-bottom:14px;margin-bottom:16px">
        <div>
          <h2 style="margin:0;color:#0f6b5c;font-size:22px">🚗 \${esc(comp)}</h2>
          <div style="font-size:12px;color:#555">\${esc(addr)}</div>
          <div style="font-size:12px;color:#555">هاتف وواتساب: \${esc(phone)} | س.ت: 48921 | ب.ض: 621-893-410</div>
        </div>
        <div style="text-align:left;border:1px solid #0f6b5c;padding:8px 14px;border-radius:8px;background:#f0fdf4">
          <div style="font-size:16px;font-weight:900;color:#0f6b5c">فاتورة بيع سيارة</div>
          <div style="font-size:12px">رقم: <strong>INV-\${c.id}-\${(c.date||'').slice(0,4)}</strong></div>
          <div style="font-size:12px">التاريخ: \${c.date || iso(new Date())}</div>
        </div>
      </div>

      <!-- BUYER DETAILS -->
      <table style="width:100%;border-collapse:collapse;margin-bottom:14px;font-size:13px;border:1px solid #ddd">
        <tr style="background:#f1f5f9"><th colspan="2" style="padding:6px 10px;text-align:right;border:1px solid #ddd;color:#0f6b5c">👤 بيانات المشتري (العميل)</th></tr>
        <tr><td style="padding:6px 10px;border:1px solid #ddd;width:50%"><strong>اسم المشتري:</strong> \${esc(c.customerName)}</td><td style="padding:6px 10px;border:1px solid #ddd"><strong>رقم الهاتف:</strong> \${esc(c.customerPhone || '---')}</td></tr>
        <tr><td style="padding:6px 10px;border:1px solid #ddd"><strong>الرقم القومي:</strong> \${esc(c.customerIdNumber || '2940815xxxxxxxx')}</td><td style="padding:6px 10px;border:1px solid #ddd"><strong>العنوان:</strong> \${esc(c.customerAddress || 'جمهورية مصر العربية')}</td></tr>
      </table>

      <!-- VEHICLE DETAILS -->
      <table style="width:100%;border-collapse:collapse;margin-bottom:14px;font-size:13px;border:1px solid #ddd">
        <tr style="background:#f1f5f9"><th colspan="3" style="padding:6px 10px;text-align:right;border:1px solid #ddd;color:#0f6b5c">🚗 مواصفات المركبة المباعة</th></tr>
        <tr>
          <td style="padding:6px 10px;border:1px solid #ddd"><strong>الماركة والموديل:</strong> \${esc(c.carModel || 'سيارة')}</td>
          <td style="padding:6px 10px;border:1px solid #ddd"><strong>سنة الصنع:</strong> \${esc(c.carYear || '---')}</td>
          <td style="padding:6px 10px;border:1px solid #ddd"><strong>اللون:</strong> \${esc(c.carColor || 'أبيض')}</td>
        </tr>
        <tr>
          <td colspan="2" style="padding:6px 10px;border:1px solid #ddd"><strong>رقم الشاسيه (VIN):</strong> \${esc(c.carChassis || '---')}</td>
          <td style="padding:6px 10px;border:1px solid #ddd"><strong>رقم الموتور:</strong> \${esc(c.carEngine || '---')}</td>
        </tr>
      </table>

      <!-- FINANCIAL SUMMARY -->
      <table style="width:100%;border-collapse:collapse;margin-bottom:14px;font-size:13px;border:1px solid #ddd">
        <tr style="background:#0f6b5c;color:#fff"><th style="padding:8px 10px;text-align:right">البيان المالي</th><th style="padding:8px 10px;text-align:left">المبلغ (جنيه مصري)</th></tr>
        <tr><td style="padding:6px 10px;border:1px solid #ddd">سعر البيع الإجمالي المتفق عليه:</td><td style="padding:6px 10px;border:1px solid #ddd;text-align:left;font-weight:700">\${fmt(c.price)} ج.م</td></tr>
        <tr><td style="padding:6px 10px;border:1px solid #ddd">الدفعة المقدمة المسددة نقداً / بنكياً:</td><td style="padding:6px 10px;border:1px solid #ddd;text-align:left;font-weight:700;color:#0f6b5c">\${fmt(c.downPayment)} ج.م</td></tr>
        <tr><td style="padding:6px 10px;border:1px solid #ddd">المتبقي المقسط على العميل:</td><td style="padding:6px 10px;border:1px solid #ddd;text-align:left;font-weight:700">\${fmt(c.price - c.downPayment)} ج.م</td></tr>
        <tr><td style="padding:6px 10px;border:1px solid #ddd">نظام السداد ومدة الأقساط:</td><td style="padding:6px 10px;border:1px solid #ddd;text-align:left">\${c.months ? \`\${c.months} شهر × \${fmt(c.monthly)} ج.م\` : 'سداد كاش بالكامل'}</td></tr>
      </table>

      <div style="font-size:11px;color:#555;border:1px solid #eee;border-radius:6px;padding:8px;margin-bottom:20px;background:#fcfcfc">
        <strong>إقرار وشروط الفاتورة:</strong> تقر إدارة المعرض بخلو المركبة المذكورة من أي موانع بيع قانونية أو مستحقات مالية حتى تاريخ وساعة تحرير هذه الفاتورة، ويتعهد المشتري بسداد الأقساط والالتزامات وفق جدول الاستحقاق المحدد.
      </div>

      <!-- SIGNATURES -->
      <div style="display:flex;justify-content:space-between;text-align:center;font-size:12px;margin-top:20px;padding-top:10px;border-top:1px dashed #ccc">
        <div>توقيع المشتري المقر:<br><br>____________________</div>
        <div>المحاسب المالي:<br><br>____________________</div>
        <div>المدير العام والاعتماد:<br><br>____________________</div>
        <div>خاتم المعرض الرسمي:<br><br>____________________</div>
      </div>
    </div>
  \`;

  openPrintWindow(html, \`فاتورة_بيع_\${c.customerName}_INV_\${c.id}\`);
}

// ──────────────────────────────────────────────────────────
// 2. VEHICLE HANDOVER PROTOCOL (محضر وإذن تسليم واستلام مركبة A4)
// ──────────────────────────────────────────────────────────
function printDeliveryNote(cid) {
  const c = db.contracts.find(x => x.id === cid);
  if (!c) return;
  const comp = db.settings.companyName || 'معرض السيارات';
  const phone = db.settings.companyPhone || '01222597304';

  const html = \`
    <div style="max-width:760px;margin:auto;font-family:'Cairo',sans-serif;direction:rtl;padding:24px;color:#111;line-height:1.7;border:2px solid #b45309;border-radius:12px">
      <!-- HEADER -->
      <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:3px double #b45309;padding-bottom:14px;margin-bottom:16px">
        <div>
          <h2 style="margin:0;color:#b45309;font-size:22px">🚗 \${esc(comp)}</h2>
          <div style="font-size:12px;color:#555">إدارة المبيعات والتسليم | هاتف: \${esc(phone)}</div>
        </div>
        <div style="text-align:left;border:1px solid #b45309;padding:8px 14px;border-radius:8px;background:#fefce8">
          <div style="font-size:16px;font-weight:900;color:#b45309">محضر تسليم واستلام مركبة</div>
          <div style="font-size:12px">رقم الإذن: <strong>DEL-\${c.id}-\${(c.date||'').slice(0,4)}</strong></div>
          <div style="font-size:12px">تاريخ ووقت التسليم: \${iso(new Date())}</div>
        </div>
      </div>

      <div style="background:#f8fafc;padding:10px 14px;border-radius:8px;margin-bottom:14px;font-size:13px">
        إنه في يوم <strong>\${new Date().toLocaleDateString('ar-EG', {weekday:'long', year:'numeric', month:'long', day:'numeric'})}</strong>، تم تسليم واستلام المركبة الموضحة أدناه بين كل من:
        <br><strong>الطرف الأول (المُسَلِّم):</strong> إدارة \${esc(comp)}.
        <br><strong>الطرف الثاني (المُسْتَلِم):</strong> السيد / \${esc(c.customerName)} — بطاقة رقم قومي: \${esc(c.customerIdNumber || '2940815xxxxxxxx')} — هاتف: \${esc(c.customerPhone || '---')}.
      </div>

      <!-- VEHICLE SPECS -->
      <table style="width:100%;border-collapse:collapse;margin-bottom:14px;font-size:13px;border:1px solid #ddd">
        <tr style="background:#fef3c7;color:#92400e"><th colspan="3" style="padding:6px 10px;text-align:right;border:1px solid #ddd">🚗 مواصفات المركبة المسلمة</th></tr>
        <tr>
          <td style="padding:6px 10px;border:1px solid #ddd"><strong>النوع والموديل:</strong> \${esc(c.carModel || 'مركبة')}</td>
          <td style="padding:6px 10px;border:1px solid #ddd"><strong>سنة الصنع:</strong> \${esc(c.carYear || '---')}</td>
          <td style="padding:6px 10px;border:1px solid #ddd"><strong>اللون الخارجي:</strong> \${esc(c.carColor || 'أبيض')}</td>
        </tr>
        <tr>
          <td style="padding:6px 10px;border:1px solid #ddd"><strong>رقم الشاسيه:</strong> \${esc(c.carChassis || '---')}</td>
          <td style="padding:6px 10px;border:1px solid #ddd"><strong>رقم الموتور:</strong> \${esc(c.carEngine || '---')}</td>
          <td style="padding:6px 10px;border:1px solid #ddd"><strong>قراءة العداد الحالية:</strong> \${c.carKm || 0} كم</td>
        </tr>
      </table>

      <!-- HANDOVER CHECKLIST -->
      <table style="width:100%;border-collapse:collapse;margin-bottom:14px;font-size:12px;border:1px solid #ddd">
        <tr style="background:#f1f5f9"><th colspan="2" style="padding:6px 10px;text-align:right;border:1px solid #ddd;color:#333">📋 قائمة الفحص ومشتملات الاستلام (Checklist):</th></tr>
        <tr><td style="padding:5px 10px;border:1px solid #ddd">☑️ أصل رخصة التسيير / تصريح المرور / الإفراج الجمركي</td><td style="padding:5px 10px;border:1px solid #ddd">☑️ المفتاح الأصلي + المفتاح الاحتياطي المشفر</td></tr>
        <tr><td style="padding:5px 10px;border:1px solid #ddd">☑️ الإطار الاحتياطي (الاستبن) + الكوريك ومفتاح العجل</td><td style="padding:5px 10px;border:1px solid #ddd">☑️ طفاية الحريق وحقيبة الإسعافات والمثلث العاكس</td></tr>
        <tr><td style="padding:5px 10px;border:1px solid #ddd">☑️ سلامة الصالون الداخلي والفرش وشاشة التحكم والتابلوه</td><td style="padding:5px 10px;border:1px solid #ddd">☑️ سلامة الزجاج والفوانيس والهيكل الخارجي</td></tr>
      </table>

      <!-- ACKNOWLEDGMENT -->
      <div style="background:#fefce8;border:1px solid #fde047;border-radius:8px;padding:12px;font-size:12px;line-height:1.8;margin-bottom:20px;color:#713f12">
        <strong>إقرار استلام ومعاينة:</strong> أقر أنا الطرف الثاني المستلم بأنني قمت بمعاينة وفحص وتجربة المركبة المذكورة أعلاه المعاينة التامة النافية للجهالة شرعاً وقانوناً، واستلمتها بحالة ممتازة ومطابقة لكافة المواصفات مع كافة أوراقها ومشتملاتها، وأصبحت السيارة في حيازتي وتحت مسؤوليتي المدنية والجنائية الكاملة من تاريخ وساعة هذا المحضر.
      </div>

      <!-- SIGNATURES -->
      <div style="display:flex;justify-content:space-between;text-align:center;font-size:12px;margin-top:20px;padding-top:10px;border-top:1px dashed #ccc">
        <div>توقيع المستلم (الطرف الثاني):<br><br>____________________</div>
        <div>مسؤول التسليم بالمعرض:<br><br>____________________</div>
        <div>اعتماد الإدارة العامة:<br><br>____________________</div>
        <div>الختم الرسمي:<br><br>____________________</div>
      </div>
    </div>
  \`;

  openPrintWindow(html, \`محضر_تسليم_\${c.customerName}_DEL_\${c.id}\`);
}

function printCarDeliveryNoteById(carId) {
  const car = (db.cars || []).find(x => x.id === carId);
  if (!car) return;
  const comp = db.settings.companyName || 'معرض السيارات';
  const phone = db.settings.companyPhone || '01222597304';

  const html = \`
    <div style="max-width:760px;margin:auto;font-family:'Cairo',sans-serif;direction:rtl;padding:24px;color:#111;line-height:1.7;border:2px solid #b45309;border-radius:12px">
      <div style="text-align:center;border-bottom:2px solid #b45309;padding-bottom:12px;margin-bottom:16px">
        <h2 style="margin:0;color:#b45309">🚗 \${esc(comp)} — إذن ومحضر تسليم مركبة</h2>
        <div style="font-size:12px;color:#555">رقم الإذن: DEL-CAR-\${car.id} | التاريخ: \${iso(new Date())}</div>
      </div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:14px;font-size:13px;border:1px solid #ddd">
        <tr><td style="padding:6px;border:1px solid #ddd"><strong>المركبة:</strong> \${esc(car.brand)} \${esc(car.model)} (\${car.year})</td><td style="padding:6px;border:1px solid #ddd"><strong>اللون:</strong> \${esc(car.color || '---')}</td></tr>
        <tr><td style="padding:6px;border:1px solid #ddd"><strong>رقم الشاسيه:</strong> \${esc(car.chassis || '---')}</td><td style="padding:6px;border:1px solid #ddd"><strong>مكان التسليم:</strong> \${esc(car.locationName || 'المعرض الرئيسي')}</td></tr>
      </table>
      <div style="font-size:12px;margin:20px 0;line-height:2">
        تم تسليم المركبة المذكورة أعلاه بحالة فنية ممتازة مع مفاتيحها وأوراقها القانونية.
      </div>
      <div style="display:flex;justify-content:space-between;text-align:center;font-size:12px;margin-top:40px">
        <div>توقيع المستلم:<br><br>____________________</div>
        <div>توقيع مسؤول المعرض:<br><br>____________________</div>
        <div>الختم الرسمي:<br><br>____________________</div>
      </div>
    </div>
  \`;
  openPrintWindow(html, \`إذن_تسليم_\${car.brand}_\${car.model}\`);
}

// ──────────────────────────────────────────────────────────
// 3. CAR INWARD PURCHASE INVOICE (فاتورة شراء وتوريد مركبة A4)
// ──────────────────────────────────────────────────────────
function printPurchaseInvoice(carId) {
  const car = (db.cars || []).find(x => x.id === carId);
  if (!car) return;
  const comp = db.settings.companyName || 'معرض السيارات';
  const phone = db.settings.companyPhone || '01222597304';

  const html = \`
    <div style="max-width:760px;margin:auto;font-family:'Cairo',sans-serif;direction:rtl;padding:24px;color:#111;line-height:1.7;border:2px solid #166534;border-radius:12px">
      <!-- HEADER -->
      <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:3px double #166534;padding-bottom:14px;margin-bottom:16px">
        <div>
          <h2 style="margin:0;color:#166534;font-size:22px">🛒 \${esc(comp)}</h2>
          <div style="font-size:12px;color:#555">إدارة المشتريات والمخازن | هاتف: \${esc(phone)}</div>
        </div>
        <div style="text-align:left;border:1px solid #166534;padding:8px 14px;border-radius:8px;background:#f0fdf4">
          <div style="font-size:16px;font-weight:900;color:#166534">فاتورة شراء وتوريد مركبة</div>
          <div style="font-size:12px">رقم الفاتورة: <strong>PUR-\${car.id}-\${new Date().getFullYear()}</strong></div>
          <div style="font-size:12px">التاريخ: \${iso(new Date())}</div>
        </div>
      </div>

      <!-- SUPPLIER DETAILS -->
      <table style="width:100%;border-collapse:collapse;margin-bottom:14px;font-size:13px;border:1px solid #ddd">
        <tr style="background:#f1f5f9"><th colspan="2" style="padding:6px 10px;text-align:right;border:1px solid #ddd;color:#166534">🏢 بيانات المورد / البائع الأصلي</th></tr>
        <tr><td style="padding:6px 10px;border:1px solid #ddd;width:50%"><strong>اسم المورد:</strong> \${esc(car.ownerName || 'شركة توريد معتمدة')}</td><td style="padding:6px 10px;border:1px solid #ddd"><strong>الهاتف:</strong> \${esc(car.supplierPhone || '01xxxxxxxxx')}</td></tr>
      </table>

      <!-- VEHICLE DETAILS -->
      <table style="width:100%;border-collapse:collapse;margin-bottom:14px;font-size:13px;border:1px solid #ddd">
        <tr style="background:#f0fdf4"><th colspan="3" style="padding:6px 10px;text-align:right;border:1px solid #ddd;color:#166534">📦 مواصفات المركبة الموردة للمخزون</th></tr>
        <tr>
          <td style="padding:6px 10px;border:1px solid #ddd"><strong>الماركة والموديل:</strong> \${esc(car.brand)} \${esc(car.model)}</td>
          <td style="padding:6px 10px;border:1px solid #ddd"><strong>سنة الصنع:</strong> \${car.year}</td>
          <td style="padding:6px 10px;border:1px solid #ddd"><strong>اللون:</strong> \${esc(car.color || 'أبيض')}</td>
        </tr>
        <tr>
          <td style="padding:6px 10px;border:1px solid #ddd"><strong>رقم الشاسيه:</strong> \${esc(car.chassis || '---')}</td>
          <td style="padding:6px 10px;border:1px solid #ddd"><strong>سعر الشراء والتكلفة:</strong> \${fmt(car.cost)} ج.م</td>
          <td style="padding:6px 10px;border:1px solid #ddd"><strong>سعر البيع المقترح:</strong> \${fmt(car.price)} ج.م</td>
        </tr>
      </table>

      <!-- ACCOUNTING RECORD -->
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px 14px;font-size:12px;margin-bottom:20px;font-family:monospace">
        <strong>القيد المحاسبي الآلي المولد:</strong><br>
        من حـ/ 1040 - مخزون السيارات: \${fmt(car.cost)} ج.م (مدين)<br>
        &nbsp;&nbsp;&nbsp;&nbsp;إلى حـ/ 1010 النقدية بالخزينة / 2020 الموردين: \${fmt(car.cost)} ج.م (دائن)
      </div>

      <!-- SIGNATURES -->
      <div style="display:flex;justify-content:space-between;text-align:center;font-size:12px;margin-top:30px">
        <div>توقيع المورد/البائع:<br><br>____________________</div>
        <div>أمين مخزن المعرض:<br><br>____________________</div>
        <div>المحاسب المالي:<br><br>____________________</div>
        <div>اعتماد الإدارة والختم:<br><br>____________________</div>
      </div>
    </div>
  \`;

  openPrintWindow(html, \`فاتورة_شراء_\${car.brand}_\${car.model}_PUR_\${car.id}\`);
}

// ──────────────────────────────────────────────────────────
// 4. CASH VOUCHERS (سند صرف نقدية وسند قبض نقدية A4)
// ──────────────────────────────────────────────────────────
function printCustomVoucher() {
  const type = $('v_type').value;
  const amount = parseFloat($('v_amount').value) || 0;
  const party = $('v_party').value.trim();
  const desc = $('v_desc').value.trim();

  if (!amount || !party) {
    alert('يرجى إدخال المبلغ واسم الطرف المعني');
    return;
  }

  const isReceipt = type === 'receipt';
  const comp = db.settings.companyName || 'معرض السيارات';
  const phone = db.settings.companyPhone || '01222597304';
  const serial = (isReceipt ? 'REC-' : 'PAY-') + Date.now().toString().slice(-6);

  const html = \`
    <div style="max-width:700px;margin:auto;font-family:'Cairo',sans-serif;direction:rtl;padding:24px;color:#111;line-height:1.8;border:2px solid \${isReceipt ? '#0f6b5c' : '#b91c1c'};border-radius:12px">
      <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid \${isReceipt ? '#0f6b5c' : '#b91c1c'};padding-bottom:12px;margin-bottom:16px">
        <div>
          <h2 style="margin:0;color:\${isReceipt ? '#0f6b5c' : '#b91c1c'}">\${esc(comp)}</h2>
          <div style="font-size:12px;color:#555">الإدارة المالية والحسابات العامة | ت: \${esc(phone)}</div>
        </div>
        <div style="text-align:left;border:1px solid #ccc;padding:6px 14px;border-radius:8px;background:#f9fafb">
          <div style="font-size:16px;font-weight:900;color:\${isReceipt ? '#0f6b5c' : '#b91c1c'}">\${isReceipt ? 'سند قبض نقدية (Receipt)' : 'سند صرف نقدية (Payment)'}</div>
          <div style="font-size:12px">رقم السند: <strong>\${serial}</strong></div>
          <div style="font-size:12px">التاريخ: \${iso(new Date())}</div>
        </div>
      </div>

      <div style="background:\${isReceipt ? '#f0fdf4' : '#fef2f2'};padding:12px 18px;border-radius:10px;margin-bottom:16px;font-size:15px;display:flex;justify-content:space-between;align-items:center">
        <span>المبلغ المطلوب:</span>
        <strong style="font-size:20px;color:\${isReceipt ? '#0f6b5c' : '#b91c1c'}">\${fmt(amount)} جنيه مصري فقط لا غير</strong>
      </div>

      <table style="width:100%;font-size:13px;border-collapse:collapse;margin-bottom:20px">
        <tr><td style="padding:8px;border-bottom:1px solid #eee;width:25%"><strong>\${isReceipt ? 'وصلنا من السيد / السادة:' : 'يُصرف للسيد / السادة:'}</strong></td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:700">\${esc(party)}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee"><strong>وذلك عن قيمة (البيان):</strong></td><td style="padding:8px;border-bottom:1px solid #eee">\${esc(desc || 'سداد نقدية مسجلة')}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee"><strong>طريقة السداد:</strong></td><td style="padding:8px;border-bottom:1px solid #eee">نقداً من الخزينة الرئيسية (حـ/ 1010 النقدية)</td></tr>
      </table>

      <div style="display:flex;justify-content:space-between;text-align:center;font-size:12px;margin-top:35px">
        <div>توقيع المستلم:<br><br>____________________</div>
        <div>أمين الخزينة:<br><br>____________________</div>
        <div>المحاسب المالي:<br><br>____________________</div>
        <div>اعتماد الإدارة والختم:<br><br>____________________</div>
      </div>
    </div>
  \`;

  openPrintWindow(html, \`سند_\${isReceipt ? 'قبض' : 'صرف'}_\${serial}\`);
}

function printJournalVoucher(jid) {
  const j = (db.journal || []).find(x => x.id === jid);
  if (!j) return;
  const isReceipt = j.debit === 1010;
  const comp = db.settings.companyName || 'معرض السيارات';

  const html = \`
    <div style="max-width:700px;margin:auto;font-family:'Cairo',sans-serif;direction:rtl;padding:24px;color:#111;line-height:1.8;border:2px solid #4338ca;border-radius:12px">
      <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #4338ca;padding-bottom:12px;margin-bottom:16px">
        <div>
          <h2 style="margin:0;color:#4338ca">\${esc(comp)} — سند قيد محاسبي</h2>
          <div style="font-size:12px;color:#555">رقم القيد: JRN-\${j.id} | التاريخ: \${j.date}</div>
        </div>
        <div style="font-size:16px;font-weight:900;color:#4338ca">\${fmt(j.amount)} ج.م</div>
      </div>
      <table style="width:100%;font-size:13px;border-collapse:collapse;margin:15px 0">
        <tr><td style="padding:6px;border-bottom:1px solid #eee"><strong>الحساب المدين:</strong> حـ/ \${j.debit}</td><td style="padding:6px;border-bottom:1px solid #eee"><strong>الحساب الدائن:</strong> حـ/ \${j.credit}</td></tr>
        <tr><td colspan="2" style="padding:8px;background:#f8fafc;border-radius:6px"><strong>البيان:</strong> \${esc(j.desc || 'قيد أوتوماتيكي')}</td></tr>
      </table>
      <div style="display:flex;justify-content:space-between;text-align:center;font-size:12px;margin-top:35px">
        <div>إعداد المحاسب:<br><br>____________________</div>
        <div>مراجعة الحسابات:<br><br>____________________</div>
        <div>اعتماد المدير المالي:<br><br>____________________</div>
      </div>
    </div>
  \`;
  openPrintWindow(html, \`سند_قيد_JRN_\${j.id}\`);
}
`;

// Insert functions before boot()
html = html.replace('function boot() {', docPrintFunctions + '\nfunction boot() {');

fs.writeFileSync(targetFile, html, 'utf8');
console.log('✅ تم تحديث mostasharak-accounting.html بمركز الطباعة الشامل والفواتير وأذون التسليم بنجاح!');

// Update package on Desktop and in Releases
execSync('node E:\\Mostasharak\\build-official-windows-release.js', { stdio: 'inherit' });
execSync('node E:\\Mostasharak\\build-safe-packages.js', { stdio: 'inherit' });
console.log('🎉 تم إعادة بناء كافة الحزم وتحديثها بنجاح!');
