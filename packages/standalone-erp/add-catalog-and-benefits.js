const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const baseDir = __dirname;
const desktop = path.join(process.env.USERPROFILE || 'C:\\Users\\7assan', 'Desktop');

console.log('✨ جاري إضافة كتالوج الاستخدام ومزايا كل نظام إلى تبويب الإعدادات...');

const catalogAndBenefitsHTML = `
  <!-- ══════════════════════════════════════════════════════════
       CATALOG OF USE & BENEFITS OF EACH SYSTEM (كتالوج ومزايا المنظومة)
  ══════════════════════════════════════════════════════════ -->
  <div class="card" style="border:2px solid var(--acc);background:linear-gradient(to bottom, #ffffff, #f0fdf4);box-shadow:0 4px 14px rgba(15,107,92,0.08);margin-top:20px">
   <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid var(--acc);padding-bottom:12px;margin-bottom:14px;flex-wrap:wrap;gap:10px">
    <div>
     <h2 style="margin:0;color:var(--acc);font-size:17px">📚 كتالوج الاستخدام ومزايا منظومة مستشارك (System Catalog & Benefits)</h2>
     <div class="mute" style="font-size:12px">دليل الإمكانيات والفوائد المباشرة لصاحب المعرض، المحاسب، وفريق المبيعات والعملاء</div>
    </div>
    <div style="display:flex;gap:6px;flex-wrap:wrap">
     <a href="mostasharak-market.html" target="_blank" class="sm" style="background:#059669;color:#fff;text-decoration:none;padding:6px 12px;border-radius:8px;font-weight:700">🛍️ تصفح كتالوج السوق</a>
     <button class="sm" onclick="openAccountingGuideModal()" style="background:#4338ca;color:#fff;padding:6px 12px;font-weight:700">📖 دليل المحاسبة</button>
    </div>
   </div>

   <!-- QUICK INTERACTIVE ACTIONS -->
   <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:10px;margin-bottom:18px">
    <div onclick="location.href='mostasharak-market.html'" style="background:#fff;border:1px solid #d1fae5;border-radius:10px;padding:12px;cursor:pointer;transition:0.2s;text-align:center" onmouseover="this.style.borderColor='#059669'" onmouseout="this.style.borderColor='#d1fae5'">
     <div style="font-size:24px;margin-bottom:4px">🚗</div>
     <strong style="color:#065f46;font-size:13px">كتالوج السيارات والمركبات</strong>
     <div class="mute" style="font-size:11px">تصفح الأسعار، المواصفات، وكروت واتساب</div>
    </div>
    <div onclick="openAccountingGuideModal()" style="background:#fff;border:1px solid #e0e7ff;border-radius:10px;padding:12px;cursor:pointer;transition:0.2s;text-align:center" onmouseover="this.style.borderColor='#4338ca'" onmouseout="this.style.borderColor='#e0e7ff'">
     <div style="font-size:24px;margin-bottom:4px">📖</div>
     <strong style="color:#3730a3;font-size:13px">دليل القيود والأستاذ العام</strong>
     <div class="mute" style="font-size:11px">5 أمثلة عملية لقيود الشراء والبيع والعمولة</div>
    </div>
    <div onclick="openRibbonManagerModal()" style="background:#fff;border:1px solid #fef3c7;border-radius:10px;padding:12px;cursor:pointer;transition:0.2s;text-align:center" onmouseover="this.style.borderColor='#d97706'" onmouseout="this.style.borderColor='#fef3c7'">
     <div style="font-size:24px;margin-bottom:4px">📢</div>
     <strong style="color:#92400e;font-size:13px">شريط الإعلانات المجدول</strong>
     <div class="mute" style="font-size:11px">بث أخبار وتحذيرات بتوقيت وروابط نصية</div>
    </div>
    <div onclick="openReportsModal()" style="background:#fff;border:1px solid #f3e8ff;border-radius:10px;padding:12px;cursor:pointer;transition:0.2s;text-align:center" onmouseover="this.style.borderColor='#7c3aed'" onmouseout="this.style.borderColor='#f3e8ff'">
     <div style="font-size:24px;margin-bottom:4px">📊</div>
     <strong style="color:#5b21b6;font-size:13px">ميزان المراجعة والتقارير</strong>
     <div class="mute" style="font-size:11px">تطابق الحسابات 100% وطباعة A4 وصور PNG</div>
    </div>
   </div>

   <!-- DETAILED BENEFITS BREAKDOWN -->
   <div style="display:flex;flex-direction:column;gap:14px">

    <!-- 1. ACCOUNTING ERP BENEFITS -->
    <div style="background:#fff;border:1px solid var(--line);border-radius:12px;padding:14px;border-right:4px solid #0f6b5c">
     <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
      <span style="font-size:20px">💼</span>
      <h3 style="margin:0;font-size:15px;color:#0f6b5c">1. مزايا وفوائد نظام المحاسبة والإدارة المالية (Accounting ERP)</h3>
      <span class="badge" style="background:#e6f4ea;color:#137333;font-size:10px">للمدير والمحاسب</span>
     </div>
     <ul style="padding-right:20px;margin:6px 0;font-size:12px;line-height:1.9;color:var(--ink)">
      <li><strong>القيد المزدوج الآلي الفوري (Double-Entry):</strong> يتم إنشاء قيود اليومية المحاسبية المعقدة تلقائياً بمجرد إتمام أي عملية بيع، شراء، أو تحصيل قسط، دون الحاجة لخبرة محاسبية مسبقة.</li>
      <li><strong>فصل دقيق بين سيارات المعرض وسيارات الأمانة/الوساطة:</strong> يحمي رأس مال المعرض من خلال عدم تحميل سيارات الأمانة على مخزون المعرض، وقيد عمولة المعرض فقط كإيراد صافٍ، مع إثبات حق المالك الخارجي كالتزام أمانة.</li>
      <li><strong>محرك تقسيط مالي متكامل:</strong> حساب دقيق لفوائد الأقساط (ثابتة أو متناقصة)، جدولة مواعيد الاستحقاق، التنبيه التلقائي بالمتأخرات، وإصدار وطباعة سندات قبض فورية.</li>
      <li><strong>إدارة علاقات العملاء (CRM) وفحص سياسات البنوك:</strong> فحص فوري لعبء الدين (DBR) والحد الأدنى للرواتب ومطابقتها مع شروط كبرى البنوك المصرية (الأهلي، مصر، CIB، QNB).</li>
      <li><strong>تقارير مالية جاهزة للطباعة والمشاركة:</strong> جرد وتقييم المخزون، ميزان المراجعة الشامل، تقرير المتأخرات، مع إمكانية أخذ لقطة شاشة صورة PNG للمشاركة المباشرة عبر الواتساب.</li>
     </ul>
    </div>

    <!-- 2. MARKETPLACE APP BENEFITS -->
    <div style="background:#fff;border:1px solid var(--line);border-radius:12px;padding:14px;border-right:4px solid #059669">
     <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
      <span style="font-size:20px">🛍️</span>
      <h3 style="margin:0;font-size:15px;color:#059669">2. مزايا وفوائد تطبيق سوق ومعرض السيارات (Marketplace App)</h3>
      <span class="badge" style="background:#ecfdf5;color:#047857;font-size:10px">لمسؤولي المبيعات والعملاء</span>
     </div>
     <ul style="padding-right:20px;margin:6px 0;font-size:12px;line-height:1.9;color:var(--ink)">
      <li><strong>كتالوج بصري جذاب للمركبات:</strong> يدعم السيارات، الموتوسيكلات، السكوتر، والشاحنات، مع فلترة سريعة بالماركة والموديل والحالة والمدينة.</li>
      <li><strong>كروت واتساب التسويقية بضغطة زر (📸 كارت صورة):</strong> توليد صورة احترافية لكل سيارة تشمل المواصفات والسعر والمقدم وقسط البنك لمشاركتها فوراً على حالات ومجموعات الواتساب.</li>
      <li><strong>حاسبة أقساط تفاعلية أمام العميل:</strong> تمكن موظف المبيعات أو الزائر من تجربة مختلف الدفعات المقدمة وعدد الأشهر ومعرفة القسط الشهري فورياً.</li>
      <li><strong>نظام حجز إلكتروني سريع مع إشعار للمالك:</strong> عندما يطلب العميل حجز سيارة، يصدر لابتوب المعرض نغمة رنين فورية مع إشعار بالاسم ورقم الواتساب ونوع الحجز.</li>
      <li><strong>توضيح ملكية وموقع المعاينة:</strong> بيان واضح عما إذا كانت السيارة متواجدة بالمعرض الرئيسي، بالتوكيل، مع المالك، أو بمستودع خارجي لراحة العميل.</li>
     </ul>
    </div>

    <!-- 3. SCHEDULED RIBBON BROADCAST BENEFITS -->
    <div style="background:#fff;border:1px solid var(--line);border-radius:12px;padding:14px;border-right:4px solid #d97706">
     <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
      <span style="font-size:20px">📢</span>
      <h3 style="margin:0;font-size:15px;color:#d97706">3. مزايا وفوائد شريط الإعلانات والتنبيهات المجدول (Ribbon System)</h3>
      <span class="badge" style="background:#fef3c7;color:#92400e;font-size:10px">للتسويق وإدارة الأمان</span>
     </div>
     <ul style="padding-right:20px;margin:6px 0;font-size:12px;line-height:1.9;color:var(--ink)">
      <li><strong>جدولة زمنية ذاتية (Per Timer):</strong> ضبط وقت البدء والانتهاء بالساعة والدقيقة، بحيث ينتهي ظهور العرض تلقائياً دون تدخل يدوي.</li>
      <li><strong>إمكانية الاستهداف الخاص أو العام:</strong> بث إعلانات عامة لكافة زوار السوق، أو إرسال إشعار سري وخاص يظهر فقط لعميل محدد برقم هاتفه المسجل.</li>
      <li><strong>روابط نصية ذكية داخل الكلمات (Word Links):</strong> دعم صيغة <code>[اضغط هنا](رابط)</code> لتحويل الكلمات لروابط تفاعلية تحول الزائر لواتساب الإدارة فوراً.</li>
      <li><strong>تصنيف لوني ونفسي للرسائل:</strong> أخبار خضراء 📢، إشعارات زرقاء 🔔، ورسائل تحذير حمراء عاجلة ⚠️ لمنع التعاملات غير المعتمدة وحماية أموال الزبائن.</li>
     </ul>
    </div>

    <!-- 4. DUAL-MODE STANDALONE & SYNC BENEFITS -->
    <div style="background:#fff;border:1px solid var(--line);border-radius:12px;padding:14px;border-right:4px solid #7c3aed">
     <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
      <span style="font-size:20px">🔄</span>
      <h3 style="margin:0;font-size:15px;color:#7c3aed">4. مزايا المعمارية المزدوجة (محلي مستقل Standalone أو سحابي متصل)</h3>
      <span class="badge" style="background:#f3e8ff;color:#6b21a8;font-size:10px">حرية تامة وأمان 100%</span>
     </div>
     <ul style="padding-right:20px;margin:6px 0;font-size:12px;line-height:1.9;color:var(--ink)">
      <li><strong>العمل بدون إنترنت وبدون خادم (Offline Standalone):</strong> يعمل ملف المحاسبة وملف السوق كملفات مستقلة ذاتياً بنسبة 100%، ويتم حفظ كافة العمليات بأمان على جهاز المستخدم.</li>
      <li><strong>مزامنة لحظية بين النوافذ (BroadcastChannel):</strong> إذا فتح المستخدم كلا الملفين في نفس المتصفح، تتدفق طلبات الشراء وتحديثات الأشرطة فورياً بينهما بدون شبكة وبدون سيرفر!</li>
      <li><strong>السحابة المركزية والربط عبر الشبكة (Connected Mode):</strong> عند الرغبة في ربط أجهزة المعرض عبر الواي فاي أو السحابة المركزية، يتم تفعيل المزامنة مع سحابة مستشارك (تحت إشراف <code>peeppeepmasr@gmail.com</code> وهاتف <code>+201222597304</code>).</li>
      <li><strong>التوافق مع كافة الأجهزة وأنظمة التشغيل:</strong> يعمل بسلاسة على لابتوب وكمبيوتر ويندوز، ماك، هواتف أندرويد، وآيفون وآيباد، مع إمكانية التثبيت كتطبيق أصلي (PWA).</li>
     </ul>
    </div>

   </div>
  </div>
`;

// 1. Update mostasharak-accounting.html
const accPath = path.join(baseDir, 'mostasharak-accounting.html');
let acc = fs.readFileSync(accPath, 'utf8');

acc = acc.replace(
  '<button class="del" style="width:100%;margin-top:14px" onclick="wipe()">⚠️ مسح كل بيانات الجهاز وإعادة الضبط</button>\n </div>\n</section>',
  '<button class="del" style="width:100%;margin-top:14px" onclick="wipe()">⚠️ مسح كل بيانات الجهاز وإعادة الضبط</button>\n </div>\n' + catalogAndBenefitsHTML + '\n</section>'
);

fs.writeFileSync(accPath, acc, 'utf8');
fs.writeFileSync(path.join(desktop, 'mostasharak-accounting.html'), acc, 'utf8');
console.log('✅ تم دمج الكتالوج والمزايا في ملف المحاسبة: mostasharak-accounting.html');

// 2. Also update index.html in main dir
const indexPath = path.join(baseDir, 'index.html');
let idx = fs.readFileSync(indexPath, 'utf8');
idx = idx.replace(
  '<button class="del" style="width:100%;margin-top:14px" onclick="wipe()">⚠️ مسح كل بيانات الجهاز وإعادة الضبط</button>\n </div>\n</section>',
  '<button class="del" style="width:100%;margin-top:14px" onclick="wipe()">⚠️ مسح كل بيانات الجهاز وإعادة الضبط</button>\n </div>\n' + catalogAndBenefitsHTML + '\n</section>'
);
fs.writeFileSync(indexPath, idx, 'utf8');

// 3. Update install.html with the catalog & benefits preview
const installPath = path.join(baseDir, 'install.html');
let inst = fs.readFileSync(installPath, 'utf8');

const benefitsAccordion = [
  '    <!-- ACCORDION: BENEFITS OF EACH SYSTEM -->',
  '    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:14px;margin-top:16px;margin-bottom:14px">',
  '      <div style="font-size:14px;font-weight:800;color:#0f6b5c;margin-bottom:8px;display:flex;align-items:center;gap:6px">',
  '        <span>📚</span> مزايا وفوائد منظومة مستشارك في سطور سريعة:',
  '      </div>',
  '      <div style="font-size:12px;color:#334155;line-height:1.8">',
  '        • <strong>نظام المحاسبة (Accounting ERP):</strong> قيد مزدوج آلي، حماية أصول المعرض عن سيارات الأمانة، ميزان مراجعة متوازن 100%، وتقارير أرباح دقيقة.<br>',
  '        • <strong>تطبيق السوق (Marketplace):</strong> كتالوج مركبات تفاعلي، كروت واتساب بصور عالية الدقة بضغطة زر، حاسبة تمويل البنوك، وإشعار فوري للمالك بحجز العميل.<br>',
  '        • <strong>شريط التنبيهات (Ribbon):</strong> رسائل مؤقتة (من تاريخ ووقت إلى تاريخ ووقت)، استهداف عام أو خاص برقم العميل، وروابط نصية مباشرة.<br>',
  '        • <strong>المرونة الشاملة:</strong> يعمل مستقلاً 100% بدون إنترنت (Standalone) أو متصلاً بالسحابة وشبكة المعرض (Connected).',
  '      </div>',
  '    </div>'
].join('\n');

inst = inst.replace('<!-- Main Launch Button -->', benefitsAccordion + '\n    <!-- Main Launch Button -->');
fs.writeFileSync(installPath, inst, 'utf8');
fs.writeFileSync(path.join(desktop, 'install.html'), inst, 'utf8');
console.log('✅ تم دمج ملخص المزايا في معالج التثبيت: install.html');

// 4. Update the suite zip
console.log('📦 جاري تحديث الحزمة الشاملة على سطح المكتب...');
execSync('node C:/Users/7assan/.gemini/antigravity/scratch/car-showroom-system/update-and-build-packages.js', { stdio: 'inherit' });

console.log('🎉 تم الانتهاء بنجاح!');
