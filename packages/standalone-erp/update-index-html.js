const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

// 1. Update Title and Branding Meta
html = html.replace(
  '<title>معرض السيارات - ERP & CRM الشامل</title>',
  '<title>Mostasharak ERP — نظام مستشارك لإدارة معارض السيارات والحسابات</title>'
);
html = html.replace(
  '<meta name="apple-mobile-web-app-title" content="معرض السيارات">',
  '<meta name="apple-mobile-web-app-title" content="مستشارك ERP">'
);

// 2. Update Header Title and Add Quick Action Buttons
const oldHeader = `<header>
 <div>
  <h1>🚗 معرض السيارات ERP <span id="devRoleBadge" class="device-tag">جهاز محلي</span></h1>
  <div class="mute" id="stat" style="margin-top:2px">تحميل البيانات...</div>
 </div>
 <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
  <button class="sm purp" onclick="openReportsModal()" title="مركز التقارير والتحليلات الشاملة" style="padding:6px 12px;font-weight:700">📊 التقارير</button>
  <button class="sm blue" onclick="captureCurrentScreen()" title="حفظ لقطة شاشة للتبويب كـ صورة PNG" style="padding:6px 10px">📸 حفظ الشاشة</button>
  <button class="sm sec" onclick="printCurrentView()" title="طباعة الصفحة أو حفظ كـ PDF" style="padding:6px 10px">🖨️ طباعة</button>
  <button id="pwaInstallBtn" class="sm blue" style="display:none;padding:6px 12px;font-weight:700" onclick="installPwa()">📲 تثبيت كـ تطبيق</button>
  <button class="sm sec" onclick="toggleTheme()" title="تبديل المظهر" style="padding:6px 10px">🌓</button>
 </div>
</header>`;

const newHeader = `<header>
 <div>
  <h1>🚗 <span id="hdrCompanyName">مستشارك ERP</span> <span id="devRoleBadge" class="device-tag">جهاز محلي</span></h1>
  <div class="mute" id="stat" style="margin-top:2px">تحميل البيانات...</div>
 </div>
 <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
  <button class="sm" onclick="openRibbonManagerModal()" title="إدارة شريط أخبار وتنبيهات السوق المجدولة" style="padding:6px 12px;font-weight:700;background:#059669;color:#fff">📢 شريط السوق</button>
  <button class="sm" onclick="openAccountingGuideModal()" title="دليل المحاسبة والتوجيه المالي لأصحاب المعارض" style="padding:6px 12px;font-weight:700;background:#4338ca;color:#fff">📖 دليل المحاسبة</button>
  <button class="sm purp" onclick="openReportsModal()" title="مركز التقارير والتحليلات الشاملة" style="padding:6px 12px;font-weight:700">📊 التقارير</button>
  <button class="sm blue" onclick="captureCurrentScreen()" title="حفظ لقطة شاشة للتبويب كـ صورة PNG" style="padding:6px 10px">📸 حفظ الشاشة</button>
  <button class="sm sec" onclick="printCurrentView()" title="طباعة الصفحة أو حفظ كـ PDF" style="padding:6px 10px">🖨️ طباعة</button>
  <button id="pwaInstallBtn" class="sm blue" style="display:none;padding:6px 12px;font-weight:700" onclick="installPwa()">📲 تثبيت كـ تطبيق</button>
  <button class="sm sec" onclick="toggleTheme()" title="تبديل المظهر" style="padding:6px 10px">🌓</button>
 </div>
</header>`;

html = html.replace(oldHeader, newHeader);

// 3. Add EULA Modal, Ribbon Manager Modal, and Accounting Guide Modal right before </main> or after #lock
const modalsToInsert = `
<!-- ══════════════════════════════════════════════════════════
     MODAL: MOSTASHARAK EULA & LICENSE 1-CLICK RESERVATION
══════════════════════════════════════════════════════════ -->
<div id="eulaModal" class="ov">
 <div class="card" style="max-width:680px;width:95%;margin:auto;max-height:92vh;overflow-y:auto;border:2px solid var(--acc);box-shadow:0 12px 36px rgba(0,0,0,0.25)">
  <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid var(--acc);padding-bottom:12px;margin-bottom:12px">
   <div>
    <h2 style="margin:0;color:var(--acc);font-size:18px">🔐 حجز ترخيص نظام مستشارك (Mostasharak)</h2>
    <div class="mute" style="font-size:12px">إقرار واعتماد شروط الاستخدام وحقوق الملكية التجارية</div>
   </div>
   <span class="badge" style="background:#0f6b5c;color:#fff">إصدار 2.5 معتمد</span>
  </div>

  <div style="background:var(--accs);border-radius:12px;padding:12px;margin-bottom:14px;font-size:13px;line-height:1.7">
   مرحباً بك في <strong>نظام مستشارك (Mostasharak)</strong> لإدارة معارض السيارات والحسابات العامة. لربط نسختك وحجز قاعدة بياناتك السحابية المعزولة، يرجى تسجيل بيانات المعرض والاطلاع على شروط الاستخدام والضغط على زر التأكيد:
  </div>

  <div class="g2">
   <div>
    <label>🏢 اسم المعرض / الشركة التجارية *</label>
    <input id="eula_compName" placeholder="مثال: معرض الأهرام للسيارات" style="font-weight:700">
   </div>
   <div>
    <label>📱 رقم هاتف المعرض / الموبايل المعتمد *</label>
    <input id="eula_compPhone" inputmode="tel" placeholder="مثال: 01012345678 أو 01222597304" style="font-weight:700">
   </div>
  </div>

  <div style="margin-top:10px">
   <label>💻 نوع هذا الجهاز المصرح له:</label>
   <select id="eula_deviceType">
    <option value="Laptop" selected>💻 جهاز كمبيوتر رئيسي / لابتوب (Laptop/PC)</option>
    <option value="Mobile">📱 هاتف محمول للمدير / المبيعات (Mobile)</option>
   </select>
  </div>

  <div style="background:#fff;border:1px solid var(--line);border-radius:12px;padding:14px;margin:14px 0;max-height:160px;overflow-y:auto;font-size:12px;line-height:1.8;color:var(--ink)">
   <h4 style="margin:0 0 8px;color:#0f6b5c">📜 وثيقة شروط الاستخدام وحقوق الترخيص التجاري:</h4>
   1. <strong>الترخيص الحصري:</strong> هذه النسخة وقواعد بياناتها مرخصة ومحجوزة حصرياً لاسم المعرض ورقم الهاتف المسجلين أعلاه، ولا يحق نقلها أو التنازل عنها لأي طرف ثالث.<br>
   2. <strong>حد الأجهزة المسموح به:</strong> يسمح الترخيص بربط وتفعيل <strong>جهازين فقط (1 لابتوب رئيسي + 1 هاتف محمول)</strong> للمنشأة الواحدة.<br>
   3. <strong>حفظ البيانات والإشراف السحابي:</strong> يتم تشفير وحفظ السجلات المالية وحركة المخزون والعقود بسحابة المنظومة المركزية تحت حساب الإدارة: <code>peeppeepmasr@gmail.com</code> وهاتف/واتساب الدعم الفني: <code>+201222597304</code>.<br>
   4. <strong>المسؤولية المحاسبية والضريبية:</strong> المعرض هو المسؤول القانوني الأول والأخير عن صحة القيود والأسعار والمبالغ المقيدة، والبرنامج يقدم المعالجة والتدقيق المحاسبي المزدوج والتنبيهات.<br>
   5. <strong>الحماية والملكية الفكرية:</strong> جميع الحقوق البرمجية والعلامة التجارية (Mostasharak - مستشارك) محفوظة بالكامل، وأي نسخ أو تلاعب يوقع صاحبه تحت طائلة المسؤولية القانونية.
  </div>

  <div style="margin:12px 0;background:#fef3c7;border:1px solid #f59e0b;border-radius:10px;padding:10px 14px;display:flex;align-items:center;gap:10px">
   <input type="checkbox" id="eula_agree_check" style="width:20px;height:20px;cursor:pointer">
   <label for="eula_agree_check" style="margin:0;font-size:13px;font-weight:700;color:#92400e;cursor:pointer">
    أقر بأنني اطلعت على كافة الشروط وحقوق الاستخدام وأوافق عليها وأحجز نسختي الآن باسم المعرض ورقم الهاتف أعلاه.
   </label>
  </div>

  <div id="eula_error_msg" style="display:none;color:var(--bad);font-weight:700;font-size:13px;margin-bottom:10px"></div>

  <button class="blue" style="width:100%;font-size:16px;padding:12px;font-weight:800" onclick="confirmEulaRegistration()">
   🚀 تأكيد حجز النسخة واعتماد الترخيص فوراً (1-Click Activate)
  </button>
 </div>
</div>

<!-- ══════════════════════════════════════════════════════════
     MODAL: ACCOUNTING GUIDE (دليل المحاسبة والتوجيه المالي)
══════════════════════════════════════════════════════════ -->
<div id="accountingGuideModal" class="ov">
 <div class="card" style="max-width:850px;width:95%;margin:auto;max-height:92vh;overflow-y:auto;border:2px solid #4338ca;box-shadow:0 12px 36px rgba(0,0,0,0.25)">
  <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #4338ca;padding-bottom:12px;margin-bottom:14px">
   <div>
    <h2 style="margin:0;color:#4338ca;font-size:18px">📖 دليل المحاسبة والتوجيه المالي لأصحاب معارض السيارات</h2>
    <div class="mute" style="font-size:12px">منظومة مستشارك (Mostasharak) — شرح عملي مبسط مع قيود اليومية وأمثلة واقعية</div>
   </div>
   <div style="display:flex;gap:8px">
    <button class="sm blue" onclick="printAccountingGuide()">🖨️ طباعة الدليل</button>
    <button class="sm del" onclick="closeAccountingGuideModal()">✕ إغلاق</button>
   </div>
  </div>

  <div id="accountingGuideContent" style="line-height:1.8;font-size:13px;color:var(--ink)">
   <div style="background:var(--accs);border-radius:10px;padding:12px;margin-bottom:14px">
    💡 <strong>رسالة لصاحب المعرض والمحاسب:</strong> صُمم نظام "مستشارك" ليقوم بكافة القيود المحاسبية المعقدة تلقائياً بنظام القيد المزدوج المعتمد عالمياً (Double-Entry). هذا الدليل يوضح لك كيف تسير أموالك بين المخزون، الخزينة، أصحاب السيارات، والبنوك خطوة بخطوة.
   </div>

   <h3 style="color:#0f6b5c;border-bottom:1px solid var(--line);padding-bottom:6px">📌 1. دليل الحسابات الرئيسي (Chart of Accounts)</h3>
   <ul style="padding-right:20px;margin:8px 0">
    <li><strong>1010 - النقدية بالخزينة (Cash):</strong> المبالغ الفعلية المتوفرة في درج المعرض.</li>
    <li><strong>1020 - الحسابات البنكية (Bank):</strong> أرصدة المعرض بالبنوك (الأهلي، مصر، CIB...).</li>
    <li><strong>1040 - مخزون السيارات (Inventory Asset):</strong> السيارات المملوكة بالكامل للمعرض وتُسجل بسعر تكلفتها الأصلي.</li>
    <li><strong>1050 - مدينو أقساط السيارات (Installments Receivable):</strong> إجمالي الأقساط المستحقة على العملاء بالمستقبل.</li>
    <li><strong>1060 - فوائد أقساط مؤجلة غير مكتسبة:</strong> أرباح التقسيط المستقبلية التي تتحول لإيراد تدريجياً مع كل قسط يتم تحصيله.</li>
    <li><strong>2020 - الموردون والدائنون (Payables):</strong> مستحقات تجار السيارات والشركات التي نشتري منها.</li>
    <li><strong>2030 - مستحقات أصحاب سيارات الأمانة والوساطة:</strong> حق مالك السيارة الخارجي التي بيعت عبر المعرض.</li>
    <li><strong>4010 - إيرادات مبيعات سيارات المعرض:</strong> قيمة بيع سيارة ملك المعرض.</li>
    <li><strong>4030 - إيرادات عمولات ووساطة:</strong> عمولة المعرض عند بيع سيارة بالوساطة/الأمانة.</li>
    <li><strong>5010 - تكلفة مبيعات السيارات (COGS):</strong> التكلفة الشرائية الأصلية للسيارة المباعة.</li>
   </ul>

   <h3 style="color:#0f6b5c;border-bottom:1px solid var(--line);padding-bottom:6px;margin-top:18px">🚗 2. أمثلة عملية توضيحية من واقع سوق السيارات</h3>

   <div style="background:#fff;border:1px solid var(--line);border-radius:10px;padding:12px;margin-bottom:12px">
    <strong style="color:#1d4ed8">المثال 1: شراء سيارة لحساب مخزون المعرض (نقداً أو آجل)</strong><br>
    اشتريت سيارة (تويوتا كورولا 2023) بسعر <strong>500,000 ج.م</strong> من أحد الموردين ودفعتها نقداً:<br>
    <div style="background:#f8fafc;padding:8px 12px;border-radius:6px;font-family:monospace;font-size:12px;margin:6px 0">
     من حـ/ 1040 - مخزون السيارات: 500,000 ج.م (مدين - زاد المخزون)<br>
     &nbsp;&nbsp;&nbsp;&nbsp;إلى حـ/ 1010 - النقدية بالخزينة: 500,000 ج.م (دائن - خرجت النقدية)
    </div>
    <em>النتيجة: رأس مالك ثابت، تحولت النقدية إلى أصل بضاعة (سيارة في المعرض).</em>
   </div>

   <div style="background:#fff;border:1px solid var(--line);border-radius:10px;padding:12px;margin-bottom:12px">
    <strong style="color:#1d4ed8">المثال 2: بيع سيارة ملك المعرض كاش وتحقيق ربح</strong><br>
    تم بيع السيارة أعلاه (تكلفتها 500,000 ج.م) للعميل نقداً بمبلغ <strong>560,000 ج.م</strong>:<br>
    <div style="background:#f8fafc;padding:8px 12px;border-radius:6px;font-family:monospace;font-size:12px;margin:6px 0">
     قيد التحصيل والمبيعات:<br>
     من حـ/ 1010 - النقدية: 560,000 ج.م (مدين)<br>
     &nbsp;&nbsp;&nbsp;&nbsp;إلى حـ/ 4010 - إيرادات مبيعات السيارات: 560,000 ج.م (دائن)<br><br>
     قيد خروج السيارة وإثبات التكلفة:<br>
     من حـ/ 5010 - تكلفة مبيعات السيارات: 500,000 ج.م (مدين - تكلفة)<br>
     &nbsp;&nbsp;&nbsp;&nbsp;إلى حـ/ 1040 - مخزون السيارات: 500,000 ج.م (دائن - خرجت السيارة)
    </div>
    <em>النتيجة: إيراد 560,000 ج.م ناقص تكلفة 500,000 ج.م = <strong>صافي ربح المعرض 60,000 ج.م</strong>.</em>
   </div>

   <div style="background:#fff;border:1px solid var(--line);border-radius:10px;padding:12px;margin-bottom:12px">
    <strong style="color:#1d4ed8">المثال 3: بيع سيارة أمانة / وساطة (Consignment - سيارة شخص آخر)</strong><br>
    أودع عميل سيارته بالمعرض لبيعها بـ <strong>400,000 ج.م</strong>، واتفقت معه على عمولة للمعرض <strong>15,000 ج.م</strong>، وتم بيعها بـ 415,000 ج.م:<br>
    <div style="background:#f8fafc;padding:8px 12px;border-radius:6px;font-family:monospace;font-size:12px;margin:6px 0">
     من حـ/ 1010 - النقدية: 415,000 ج.م (مدين - استلمنا المبلغ كاملاً من المشتري)<br>
     &nbsp;&nbsp;&nbsp;&nbsp;إلى حـ/ 2030 - مستحقات مالك السيارة: 400,000 ج.م (دائن - أمانة للمالك)<br>
     &nbsp;&nbsp;&nbsp;&nbsp;إلى حـ/ 4030 - إيرادات عمولة الوساطة: 15,000 ج.م (دائن - ربح خالص للمعرض)
    </div>
    <em>لاحظ جيداً: لم يقترب القيد من حساب (1040 المخزون)، لأن السيارة ليست أصل ملك المعرض! بل أمانة تم تسويقها.</em>
   </div>

   <div style="background:#fff;border:1px solid var(--line);border-radius:10px;padding:12px;margin-bottom:12px">
    <strong style="color:#1d4ed8">المثال 4: تحصيل قسط شهري وإثبات الإيراد</strong><br>
    جاء العميل لسداد قسطه الشهري البالغ <strong>7,000 ج.م</strong> (منها 5,500 أصل سيارة + 1,500 فائدة):<br>
    <div style="background:#f8fafc;padding:8px 12px;border-radius:6px;font-family:monospace;font-size:12px;margin:6px 0">
     من حـ/ 1010 - النقدية: 7,000 ج.م (مدين - دخلت الخزينة)<br>
     &nbsp;&nbsp;&nbsp;&nbsp;إلى حـ/ 1050 - مدينو الأقساط: 7,000 ج.م (دائن - انخفض دين العميل)<br><br>
     قيد الاعتراف بربح الفائدة:<br>
     من حـ/ 1060 - فوائد مؤجلة: 1,500 ج.م (مدين)<br>
     &nbsp;&nbsp;&nbsp;&nbsp;إلى حـ/ 4020 - إيرادات تمويل محققة: 1,500 ج.م (دائن)
    </div>
    <em>تقوم شاشة العقود بطباعة سند قبض رسمي فوراً وإرساله للعميل على الواتساب.</em>
   </div>

   <div style="background:#fff;border:1px solid var(--line);border-radius:10px;padding:12px">
    <strong style="color:#1d4ed8">المثال 5: كيف تقرأ ميزان المراجعة (Trial Balance)؟</strong><br>
    عند فتح <strong>مركز التقارير 📊 ➔ ميزان المراجعة</strong>، ستجد جدولاً من عمودين متساويين دائماً:<br>
    - <strong>مجموع المدين (Debit) = مجموع الدائن (Credit)</strong>.<br>
    - إذا كانا متساويين، فحساباتك دقيقة 100% ولا يوجد أي قرش ضائع بين الدرج والمخزون والعملاء.
   </div>
  </div>

  <button class="sec" onclick="closeAccountingGuideModal()" style="width:100%;margin-top:14px">إغلاق الدليل</button>
 </div>
</div>

<!-- ══════════════════════════════════════════════════════════
     MODAL: RIBBON ANNOUNCEMENT MANAGER ON PC
══════════════════════════════════════════════════════════ -->
<div id="pcRibbonManagerModal" class="ov">
 <div class="card" style="max-width:760px;width:95%;margin:auto;max-height:92vh;overflow-y:auto;border:2px solid #059669;box-shadow:0 12px 36px rgba(0,0,0,0.25)">
  <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #059669;padding-bottom:12px;margin-bottom:12px">
   <div>
    <h2 style="margin:0;color:#059669;font-size:18px">📢 إدارة شريط أخبار وتنبيهات السوق (Mostasharak Ribbon)</h2>
    <div class="mute" style="font-size:12px">بث رسائل عامة أو خاصة ومجدولة بوقت بدء وانتهاء مع روابط نصية</div>
   </div>
   <button class="sm del" onclick="closeRibbonManagerModal()">✕ إغلاق</button>
  </div>

  <input type="hidden" id="pc_rb_id">

  <div class="g2">
   <div>
    <label>نوع الرسالة *</label>
    <select id="pc_rb_type">
     <option value="news">📢 أخبار عامة وعروض (News)</option>
     <option value="notice">🔔 إشعار وتنبيه هام (Notification)</option>
     <option value="warning">⚠️ رسالة تحذيرية عاجلة (Warning)</option>
    </select>
   </div>
   <div>
    <label>الجمهور المستهدف *</label>
    <select id="pc_rb_audience" onchange="togglePcRibbonAudience()">
     <option value="public">🌐 عام لكافة زوار السوق (Public)</option>
     <option value="private">🔒 رسالة خاصة لعميل محدد (Private)</option>
    </select>
   </div>
  </div>

  <div id="pc_rb_private_box" style="display:none;background:#fef3c7;border:1px solid #f59e0b;border-radius:10px;padding:10px 14px;margin-top:10px">
   <label style="color:#92400e;margin:0 0 4px">📱 رقم هاتف / واتساب العميل المستهدف *</label>
   <input id="pc_rb_targetPhone" placeholder="مثال: 01222597304">
  </div>

  <div class="g2" style="margin-top:10px">
   <div>
    <label>📅 يبدأ الظهور من (تاريخ ووقت) *</label>
    <input type="datetime-local" id="pc_rb_fromDateTime">
   </div>
   <div>
    <label>📅 ينتهي الظهور في (تاريخ ووقت) *</label>
    <input type="datetime-local" id="pc_rb_toDateTime">
   </div>
  </div>

  <div style="margin-top:10px">
   <label>عنوان الرسالة أو التنبيه *</label>
   <input id="pc_rb_title" placeholder="مثال: عروض تقسيط بنكية حصرية">
  </div>

  <div style="margin-top:10px">
   <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
    <label style="margin:0">نص الرسالة مع دعم روابط الكلمات *</label>
    <button type="button" onclick="insertPcRibbonLinkSample()" style="background:#e0f2fe;color:#0369a1;border:1px solid #bae6fd;padding:2px 8px;border-radius:6px;font-size:11px;cursor:pointer">
     🔗 + إدراج رابط كلمة [نص](رابط)
    </button>
   </div>
   <textarea id="pc_rb_content" rows="3" placeholder="اكتب نص الخبر أو التنبيه هنا. لإضافة رابط داخل كلمة اكتب: [اسم الرابط](https://wa.me/201222597304)..."></textarea>
  </div>

  <div style="margin:10px 0;display:flex;align-items:center;gap:8px">
   <input type="checkbox" id="pc_rb_active" checked style="width:18px;height:18px">
   <label for="pc_rb_active" style="margin:0;font-weight:700;cursor:pointer">تفعيل هذا الشريط فوراً وبثه في السوق</label>
  </div>

  <div style="display:flex;gap:10px">
   <button class="blue" onclick="savePcRibbon()" style="flex:2">💾 حفظ وبث الشريط فوراً</button>
   <button class="sec" onclick="resetPcRibbonForm()" style="flex:1">إعادة تعيين</button>
  </div>

  <div style="font-size:13px;font-weight:700;margin-top:18px;margin-bottom:8px">📋 الرسائل المسجلة والمجدولة في النظام:</div>
  <div id="pc-ribbon-list-table" style="display:flex;flex-direction:column;gap:8px;max-height:200px;overflow-y:auto"></div>

  <button class="sec" onclick="closeRibbonManagerModal()" style="width:100%;margin-top:14px">إغلاق النافذة</button>
 </div>
</div>
`;

// Insert modals before #lock
html = html.replace('<!-- ACTIVATION MODAL -->', modalsToInsert + '\n<!-- ACTIVATION MODAL -->');

// 4. Update JS logic for EULA, Ribbon, and Guide
const jsFunctionsToAppend = `
// ══════════════════════════════════════════════════════════
//  MOSTASHARAK EULA & LICENSE 1-CLICK RESERVATION LOGIC
// ══════════════════════════════════════════════════════════
function checkEulaOnBoot() {
  const accepted = localStorage.getItem('mostasharak_eula_accepted');
  if (!accepted) {
    $('eula_compName').value = db.settings.companyName || 'Auto One Egypt';
    $('eula_compPhone').value = db.settings.companyPhone || '01222597304';
    $('eula_deviceType').value = getDeviceType();
    $('eulaModal').classList.add('on');
    return false;
  }
  return true;
}

async function confirmEulaRegistration() {
  const compName = $('eula_compName').value.trim();
  const compPhone = $('eula_compPhone').value.trim();
  const devType = $('eula_deviceType').value;
  const agreed = $('eula_agree_check').checked;
  const errEl = $('eula_error_msg');

  if (!compName || !compPhone) {
    errEl.textContent = '⚠️ يرجى إدخال اسم المعرض ورقم الهاتف كاملاً';
    errEl.style.display = 'block';
    return;
  }
  if (!agreed) {
    errEl.textContent = '⚠️ يرجى الموافقة على شروط الاستخدام وحقوق الترخيص بالضغط على مربع الإقرار';
    errEl.style.display = 'block';
    return;
  }

  errEl.style.display = 'none';

  // Save to settings
  db.settings.companyName = compName;
  db.settings.companyPhone = compPhone;
  saveLocal();
  updateCompanyBranding();

  localStorage.setItem('mostasharak_eula_accepted', '1');
  localStorage.setItem(ACT_K, '1');
  localStorage.setItem(DEV_TYPE_K, devType);

  // Attempt registration against server or Google Sheets
  try {
    if (syncCfg()) {
      await api('register_and_accept', {
        companyName: compName,
        companyPhone: compPhone,
        deviceType: devType,
        deviceId: devId(),
        notes: 'اعتماد الشروط وحجز النسخة بنجاح'
      });
    }
  } catch(e) {
    console.log('Local acceptance saved, cloud sync will resume when online');
  }

  $('eulaModal').classList.remove('on');
  toast('🎉 تم حجز النسخة واعتماد شروط نظام مستشارك بنجاح!');
  updateDeviceBadge();
  stat();
}

// ══════════════════════════════════════════════════════════
//  ACCOUNTING GUIDE MODAL LOGIC
// ══════════════════════════════════════════════════════════
function openAccountingGuideModal() {
  $('accountingGuideModal').classList.add('on');
}
function closeAccountingGuideModal() {
  $('accountingGuideModal').classList.remove('on');
}
function printAccountingGuide() {
  const content = $('accountingGuideContent').innerHTML;
  const win = window.open('', '_blank');
  win.document.write(\`
    <html lang="ar" dir="rtl">
    <head>
      <title>دليل المحاسبة والتوجيه المالي - نظام مستشارك</title>
      <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;800&display=swap" rel="stylesheet">
      <style>
        body { font-family: 'Cairo', sans-serif; padding: 24px; direction: rtl; line-height: 1.8; color: #111; }
        h2, h3 { color: #0f6b5c; }
        code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; }
        @media print { body { padding: 0; } }
      </style>
    </head>
    <body>
      <div style="text-align:center;border-bottom:2px solid #0f6b5c;padding-bottom:12px;margin-bottom:20px">
        <h1 style="margin:0">نظام مستشارك (Mostasharak) لإدارة معارض السيارات</h1>
        <h3 style="margin:4px 0">دليل المحاسبة والتوجيه المالي لأصحاب المعارض والمديرين</h3>
      </div>
      \${content}
    </body>
    </html>
  \`);
  win.document.close();
  setTimeout(() => { win.print(); }, 500);
}

// ══════════════════════════════════════════════════════════
//  PC RIBBON MANAGER LOGIC
// ══════════════════════════════════════════════════════════
let PC_RIBBONS = [];

function openRibbonManagerModal() {
  loadPcRibbons();
  resetPcRibbonForm();
  $('pcRibbonManagerModal').classList.add('on');
}
function closeRibbonManagerModal() {
  $('pcRibbonManagerModal').classList.remove('on');
}
function togglePcRibbonAudience() {
  const aud = $('pc_rb_audience').value;
  $('pc_rb_private_box').style.display = aud === 'private' ? 'block' : 'none';
}
function insertPcRibbonLinkSample() {
  const ta = $('pc_rb_content');
  const sample = '[اضغط هنا لمعرفة التفاصيل](https://wa.me/201222597304)';
  ta.value += (ta.value ? ' ' : '') + sample;
  ta.focus();
}
function resetPcRibbonForm() {
  $('pc_rb_id').value = '';
  $('pc_rb_type').value = 'news';
  $('pc_rb_audience').value = 'public';
  $('pc_rb_private_box').style.display = 'none';
  $('pc_rb_targetPhone').value = '';
  $('pc_rb_title').value = '';
  $('pc_rb_content').value = '';
  $('pc_rb_active').checked = true;

  const now = new Date();
  const plus7 = new Date(Date.now() + 7 * 86400000);
  $('pc_rb_fromDateTime').value = now.toISOString().slice(0, 16);
  $('pc_rb_toDateTime').value = plus7.toISOString().slice(0, 16);
}

async function loadPcRibbons() {
  try {
    const res = await fetch('/api/ribbons');
    if (res.ok) {
      const data = await res.json();
      if (data && data.ribbons) {
        PC_RIBBONS = data.ribbons;
      }
    }
  } catch(e) {
    const cached = localStorage.getItem('mostasharak_ribbons_cache');
    if (cached) {
      try { PC_RIBBONS = JSON.parse(cached); } catch(err){}
    }
  }
  renderPcRibbonTable();
}

function renderPcRibbonTable() {
  const container = $('pc-ribbon-list-table');
  if (!container) return;
  if (!PC_RIBBONS.length) {
    container.innerHTML = '<div style="font-size:12px;color:var(--mute);text-align:center;padding:12px">لا توجد رسائل مجدولة حالياً</div>';
    return;
  }
  container.innerHTML = PC_RIBBONS.map(r => {
    const audBadge = r.audience === 'private' ? \`🔒 خاص: \${esc(r.targetPhone || '')}\` : '🌐 عام للجميع';
    const typeLabel = r.type === 'warning' ? '⚠️ تحذير' : r.type === 'notice' ? '🔔 إشعار' : '📢 خبر';
    return \`
      <div style="background:var(--card);border:1px solid var(--line);border-radius:8px;padding:8px 12px;display:flex;justify-content:space-between;align-items:center;font-size:12px">
        <div>
          <div style="font-weight:700">\${typeLabel}: \${esc(r.title)}</div>
          <div class="mute" style="font-size:11px">\${audBadge} · من \${(r.fromDateTime||'').slice(0,10)} إلى \${(r.toDateTime||'').slice(0,10)}</div>
        </div>
        <div style="display:flex;gap:6px">
          <button class="sm sec" onclick="editPcRibbon('\${r.id}')">✏️ تعديل</button>
          <button class="sm del" onclick="deletePcRibbon('\${r.id}')">🗑️ حذف</button>
        </div>
      </div>
    \`;
  }).join('');
}

function editPcRibbon(id) {
  const r = PC_RIBBONS.find(item => item.id === id);
  if (!r) return;
  $('pc_rb_id').value = r.id;
  $('pc_rb_type').value = r.type || 'news';
  $('pc_rb_audience').value = r.audience || 'public';
  togglePcRibbonAudience();
  $('pc_rb_targetPhone').value = r.targetPhone || '';
  $('pc_rb_title').value = r.title || '';
  $('pc_rb_content').value = r.content || '';
  $('pc_rb_fromDateTime').value = (r.fromDateTime || '').slice(0, 16);
  $('pc_rb_toDateTime').value = (r.toDateTime || '').slice(0, 16);
  $('pc_rb_active').checked = r.active !== false;
}

async function savePcRibbon() {
  const title = $('pc_rb_title').value.trim();
  const content = $('pc_rb_content').value.trim();
  const type = $('pc_rb_type').value;
  const audience = $('pc_rb_audience').value;
  const targetPhone = $('pc_rb_targetPhone').value.trim();
  const fromDateTime = $('pc_rb_fromDateTime').value;
  const toDateTime = $('pc_rb_toDateTime').value;
  const active = $('pc_rb_active').checked;
  const id = $('pc_rb_id').value || ('ribbon-' + Date.now());

  if (!title || !content) {
    toast('⚠️ يرجى إدخال العنوان ونص الرسالة');
    return;
  }
  if (!fromDateTime || !toDateTime) {
    toast('⚠️ يرجى تحديد وقت البدء والانتهاء');
    return;
  }

  const ribbonObj = {
    id, type, audience, targetPhone, title, content, fromDateTime, toDateTime, active,
    updatedAt: new Date().toISOString()
  };

  const idx = PC_RIBBONS.findIndex(r => r.id === id);
  if (idx >= 0) PC_RIBBONS[idx] = ribbonObj;
  else PC_RIBBONS.unshift(ribbonObj);

  localStorage.setItem('mostasharak_ribbons_cache', JSON.stringify(PC_RIBBONS));

  try {
    await fetch('/api/ribbons', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(ribbonObj)
    });
  } catch(e){}

  toast('✅ تم حفظ وبث شريط التنبيهات إلى السوق بنجاح!');
  renderPcRibbonTable();
  resetPcRibbonForm();
}

async function deletePcRibbon(id) {
  if (!confirm('هل تريد حذف هذه الرسالة من شريط السوق؟')) return;
  PC_RIBBONS = PC_RIBBONS.filter(r => r.id !== id);
  localStorage.setItem('mostasharak_ribbons_cache', JSON.stringify(PC_RIBBONS));
  try {
    await fetch('/api/ribbons/delete', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({id})
    });
  } catch(e){}
  renderPcRibbonTable();
  toast('🗑 تم حذف الرسالة');
}
`;

// Insert JS functions before boot()
html = html.replace('function boot() {', jsFunctionsToAppend + '\nfunction boot() {');

// In boot(), call checkEulaOnBoot()
html = html.replace(
  'updateCompanyBranding();\n  updateDeviceBadge();',
  'updateCompanyBranding();\n  updateDeviceBadge();\n  if (!checkEulaOnBoot()) return;'
);

// Update updateCompanyBranding to support Mostasharak
html = html.replace(
  'function updateCompanyBranding() {',
  `function updateCompanyBranding() {
  const hdrEl = $('hdrCompanyName');
  if (hdrEl) hdrEl.textContent = (db.settings.companyName || 'مستشارك') + ' ERP';`
);

fs.writeFileSync(indexPath, html, 'utf8');
console.log('index.html updated successfully with Mostasharak branding, EULA modal, Ribbon Manager, and Accounting Guide!');
