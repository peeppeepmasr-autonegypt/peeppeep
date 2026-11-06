const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const baseDir = __dirname;
const desktop = path.join(process.env.USERPROFILE || 'C:\\Users\\7assan', 'Desktop');

const marketPath = path.join(baseDir, 'mostasharak-market.html');
let html = fs.readFileSync(marketPath, 'utf8');

// Add 💡 button to lh-acts
html = html.replace(
  '<span title="إضافة إعلان" onclick="openAddListing()">➕</span>',
  '<span title="دليل ومزايا منظومة مستشارك" onclick="openMarketBenefitsModal()">💡</span>\n      <span title="إضافة إعلان" onclick="openAddListing()">➕</span>'
);

const marketBenefitsModalHTML = `
<!-- ══════════════════════════════════════
     MODAL: MARKETPLACE & SYSTEM BENEFITS
══════════════════════════════════════ -->
<div class="ov" id="marketBenefitsModal">
<div class="sheet" style="max-height:90vh;overflow-y:auto">
  <div class="sh-handle"></div>
  <div class="sh-hd">
    <div class="sh-title">💡 دليل ومزايا منظومة مستشارك (Mostasharak)</div>
    <span class="sh-close" onclick="closeModal('marketBenefitsModal')">✕</span>
  </div>

  <div style="background:var(--wa-panel);border-radius:12px;padding:12px;margin-bottom:14px;font-size:13px;line-height:1.7">
    🚗 أهلاً بكم في <strong>منظومة مستشارك</strong> الشاملة لإدارة معارض السيارات والحسابات والبيع المباشر:
  </div>

  <div style="display:flex;flex-direction:column;gap:12px;font-size:13px">
    <div style="background:#fff;border:1px solid var(--border);border-radius:10px;padding:12px;border-right:4px solid var(--wa-mid)">
      <strong style="color:var(--wa-dark);font-size:14px">🛍️ مزايا سوق ومعرض السيارات (Marketplace):</strong>
      <div style="color:var(--mute);font-size:12px;margin-top:4px;line-height:1.8">
        • كتالوج مركبات متكامل (سيارات، موتوسيكلات، سكوتر، شاحنات).<br>
        • توليد كارت صورة بالواتساب (📸 كارت صورة) بنقرة واحدة للمشاركة السريعة.<br>
        • حاسبة تمويل البنوك المصرية (الأهلي، بنك مصر، CIB، QNB).<br>
        • إرسال طلبات الحجز الفورية للمالك مع إصدار نغمة تنبيه صوتية.
      </div>
    </div>

    <div style="background:#fff;border:1px solid var(--border);border-radius:10px;padding:12px;border-right:4px solid #1d4ed8">
      <strong style="color:#1d4ed8;font-size:14px">💼 مزايا نظام المحاسبة والإدارة (Accounting ERP):</strong>
      <div style="color:var(--mute);font-size:12px;margin-top:4px;line-height:1.8">
        • قيود يومية مزدوجة آلية بدون تدخل يدوي وميزان مراجعة متوازن 100%.<br>
        • حماية أصول المعرض عن سيارات الأمانة والوساطة الخارجية.<br>
        • تقارير مالية تفصيلية عالية الدقة قابلة للطباعة A4 والحفظ كصور PNG.
      </div>
    </div>

    <div style="background:#fff;border:1px solid var(--border);border-radius:10px;padding:12px;border-right:4px solid #f59e0b">
      <strong style="color:#b45309;font-size:14px">📢 مزايا شريط الأخبار والتنبيهات المجدول (Ribbon):</strong>
      <div style="color:var(--mute);font-size:12px;margin-top:4px;line-height:1.8">
        • رسائل مؤقتة مجدولة بوقت بدء وانتهاء (من تاريخ وساعة إلى تاريخ وساعة).<br>
        • استهداف عام للجميع أو خاص لعميل محدد برقم هاتفه.<br>
        • روابط نصية ذكية داخل الكلمات لنقل العميل لواتساب المعرض مباشرة.
      </div>
    </div>
  </div>

  <div style="display:flex;gap:10px;margin-top:16px">
    <a href="mostasharak-accounting.html" target="_blank" class="f-btn f-btn-green" style="flex:2;text-align:center;text-decoration:none">💼 فتح لوحة المحاسبة والإدارة</a>
    <button class="f-btn f-btn-out" onclick="closeModal('marketBenefitsModal')" style="flex:1">إغلاق</button>
  </div>
</div>
</div>
`;

html = html.replace('<!-- ══════════════════════════════════════\n     MODAL: ADD LISTING', marketBenefitsModalHTML + '\n<!-- ══════════════════════════════════════\n     MODAL: ADD LISTING');

const scriptToAdd = `
function openMarketBenefitsModal() {
  $('marketBenefitsModal').classList.add('open');
}
`;
html = html.replace('function openRibbonManager() {', scriptToAdd + '\nfunction openRibbonManager() {');

fs.writeFileSync(marketPath, html, 'utf8');
fs.writeFileSync(path.join(desktop, 'mostasharak-market.html'), html, 'utf8');

// Also update market.html in base dir
fs.writeFileSync(path.join(baseDir, 'market.html'), html, 'utf8');

console.log('✅ تم إضافة نافذة المزايا إلى mostasharak-market.html');

// Rebuild suite package
execSync('node C:/Users/7assan/.gemini/antigravity/scratch/car-showroom-system/update-and-build-packages.js', { stdio: 'inherit' });
console.log('🎉 تم تحديث كافة الملفات والحزم بنجاح!');
