/**
 * ============================================================
 * 🚗 نظام إدارة التحديثات والعملاء - معرض السيارات
 * Car Showroom - Client Update Manager (update-manager.js)
 * 
 * الاستخدام:
 *   node update-manager.js list               → عرض قائمة جميع العملاء
 *   node update-manager.js add                → إضافة عميل جديد بشكل تفاعلي
 *   node update-manager.js update <client-id> → تحديث عميل واحد بالاسم أو الـ ID
 *   node update-manager.js update-all         → إرسال تحديث لجميع العملاء (توليد zip لكل منهم)
 *   node update-manager.js remove <client-id> → حذف عميل من السجل
 * ============================================================
 */

const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

// ─── Paths ────────────────────────────────────────────────────────────────────
const PROJECT_DIR   = __dirname;
const REGISTRY_PATH = path.join(PROJECT_DIR, 'clients', 'registry.json');
const DESKTOP_DIR   = path.join(process.env.USERPROFILE || 'C:\\Users\\7assan', 'Desktop');
const UPDATES_DIR   = path.join(DESKTOP_DIR, 'Showroom-Updates');

// ─── Source files included in every package ───────────────────────────────────
const CORE_FILES = [
  'index.html',
  'landing.html',
  'market.html',
  'license.js',
  'start-laptop.bat',
  'start-server.bat',
  'serve.js',
  'manifest.json',
  'service-worker.js',
  'package.json',
  'Code.gs',
  'README.md',
  'update-manager.js',
  'update-clients.bat',
  'clients',
  'icons'
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function loadRegistry() {
  if (!fs.existsSync(REGISTRY_PATH)) {
    const dir = path.dirname(REGISTRY_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(REGISTRY_PATH, JSON.stringify({ clients: [] }, null, 2), 'utf-8');
  }
  return JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf-8'));
}

function saveRegistry(reg) {
  fs.writeFileSync(REGISTRY_PATH, JSON.stringify(reg, null, 2), 'utf-8');
}

function sanitize(name) {
  return name.replace(/[^a-zA-Z0-9\u0600-\u06FF_\- ]/g, '-').replace(/\s+/g, '-').replace(/-+/g, '-').trim();
}

function getVersion() {
  try {
    return JSON.parse(fs.readFileSync(path.join(PROJECT_DIR, 'package.json'), 'utf-8')).version || '2.0.0';
  } catch { return '2.0.0'; }
}

function today() {
  return new Date().toISOString().split('T')[0];
}

function generateLicense(client) {
  return `// Auto-generated Showroom Client License & Branding Configuration
// Client: ${client.companyName} | Version: ${getVersion()} | Date: ${today()}
window.SHOWROOM_LICENSE = {
  companyName: ${JSON.stringify(client.companyName)},
  licensee: ${JSON.stringify(client.companyName)},
  masterSenderPhone: ${JSON.stringify(client.phone || '01222597304')},
  allowedDevices: 2,
  issueDate: ${JSON.stringify(client.addedDate || today())},
  updateDate: ${JSON.stringify(today())},
  version: ${JSON.stringify(getVersion())},
  clientId: ${JSON.stringify(client.id)},
  isLockedBranding: true
};
`;
}

function buildZipForClient(client, outputDir) {
  // Write the client-specific license.js temporarily
  fs.writeFileSync(path.join(PROJECT_DIR, 'license.js'), generateLicense(client), 'utf-8');

  const safeName = sanitize(client.companyName);
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const zipName   = `${safeName}-Showroom-v${getVersion()}-${today()}.zip`;
  const zipPath   = path.join(outputDir, zipName);

  const paths = CORE_FILES
    .map(f => path.join(PROJECT_DIR, f))
    .filter(p => fs.existsSync(p))
    .map(p => `'${p}'`)
    .join(',');

  const psCmd = `Compress-Archive -Path ${paths} -DestinationPath '${zipPath}' -Force`;
  execSync(`powershell -Command "${psCmd}"`, { stdio: 'pipe' });

  return zipPath;
}

// ─── Commands ─────────────────────────────────────────────────────────────────

// LIST
function cmdList() {
  const reg = loadRegistry();
  if (!reg.clients.length) {
    console.log('\n⚠️  لا يوجد عملاء مسجلون بعد. استخدم: node update-manager.js add\n');
    return;
  }
  console.log('\n════════════════════════════════════════════════════════');
  console.log('  📋 قائمة العملاء المسجلين في السجل');
  console.log('════════════════════════════════════════════════════════');
  reg.clients.forEach((c, i) => {
    console.log(`  ${i + 1}. [${c.id}] ${c.companyName}`);
    console.log(`       📞 ${c.phone || '---'}  📅 أُضيف: ${c.addedDate}  🔄 آخر تحديث: ${c.lastUpdate || '---'}  📦 إصدار: v${c.version || '?'}`);
    if (c.notes) console.log(`       📝 ${c.notes}`);
  });
  console.log('════════════════════════════════════════════════════════\n');
}

// ADD
function cmdAdd() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = q => new Promise(r => rl.question(q, r));

  (async () => {
    console.log('\n════════════════════════════════════════════════════════');
    console.log('  ➕ إضافة عميل / معرض جديد');
    console.log('════════════════════════════════════════════════════════');

    const name    = (await ask('  اسم المعرض / الشركة (مثال: Auto One Egypt): ')).trim();
    const phone   = (await ask('  رقم واتساب العميل (مثال: 01xxxxxxxxx): ')).trim();
    const address = (await ask('  العنوان (اختياري): ')).trim();
    const notes   = (await ask('  ملاحظات (اختياري): ')).trim();
    rl.close();

    if (!name) { console.log('\n❌ الاسم مطلوب.\n'); return; }

    const reg = loadRegistry();
    const newId = 'client-' + String(reg.clients.length + 1).padStart(3, '0');
    const client = { id: newId, companyName: name, phone, address, addedDate: today(), lastUpdate: today(), version: getVersion(), notes };
    reg.clients.push(client);
    saveRegistry(reg);

    console.log(`\n✅ تم تسجيل العميل بالـ ID: [${newId}]`);
    console.log('  جاري إنشاء حزمة الترخيص...');

    const zipPath = buildZipForClient(client, UPDATES_DIR);
    console.log(`\n🎉 تم إنشاء الحزمة على:\n   📁 ${zipPath}`);
    console.log('  📲 أرسل هذا الملف للعميل عبر واتساب!\n');
  })();
}

// UPDATE ONE CLIENT
function cmdUpdate(idOrName) {
  const reg = loadRegistry();
  const client = reg.clients.find(c =>
    c.id.toLowerCase() === idOrName.toLowerCase() ||
    c.companyName.toLowerCase().includes(idOrName.toLowerCase())
  );
  if (!client) {
    console.log(`\n❌ لم يُعثر على عميل بالاسم أو الـ ID: "${idOrName}"`);
    console.log('  استخدم: node update-manager.js list  لعرض القائمة.\n');
    return;
  }

  console.log(`\n🔄 جاري إنشاء تحديث مخصص للعميل: [${client.companyName}]`);

  const zipPath = buildZipForClient(client, UPDATES_DIR);

  client.lastUpdate = today();
  client.version    = getVersion();
  saveRegistry(reg);

  console.log('\n════════════════════════════════════════════════════════');
  console.log(`  ✅ تم إنشاء تحديث مخصص لـ: ${client.companyName}`);
  console.log(`  📁 ${zipPath}`);
  console.log(`  📲 أرسل هذا الملف فقط لهذا العميل عبر واتساب.`);
  console.log(`  🔒 الملف يحمل هويته الخاصة ولا يعمل لأي عميل آخر.`);
  console.log('════════════════════════════════════════════════════════\n');
}

// UPDATE ALL CLIENTS
function cmdUpdateAll() {
  const reg = loadRegistry();
  if (!reg.clients.length) {
    console.log('\n⚠️  لا يوجد عملاء. استخدم: node update-manager.js add\n');
    return;
  }

  console.log('\n════════════════════════════════════════════════════════');
  console.log(`  📡 إرسال تحديث لجميع العملاء (${reg.clients.length} عميل)`);
  console.log('════════════════════════════════════════════════════════');

  const results = [];
  reg.clients.forEach((client, i) => {
    process.stdout.write(`  [${i + 1}/${reg.clients.length}] ${client.companyName} ... `);
    try {
      const zipPath = buildZipForClient(client, UPDATES_DIR);
      client.lastUpdate = today();
      client.version    = getVersion();
      results.push({ client, zipPath, ok: true });
      console.log('✅');
    } catch (err) {
      results.push({ client, ok: false, err: err.message });
      console.log('❌ خطأ: ' + err.message);
    }
  });

  saveRegistry(reg);

  console.log('\n════════════════════════════════════════════════════════');
  console.log('  📊 ملخص التحديث الشامل:');
  results.forEach(r => {
    if (r.ok) {
      console.log(`  ✅ ${r.client.companyName}`);
      console.log(`     📁 ${r.zipPath}`);
    } else {
      console.log(`  ❌ ${r.client.companyName}: ${r.err}`);
    }
  });
  console.log(`\n  📁 جميع الحزم موجودة في مجلد: ${UPDATES_DIR}`);
  console.log('  📲 أرسل كل حزمة ZIP للعميل الخاص بها فقط عبر واتساب!');
  console.log('════════════════════════════════════════════════════════\n');
}

// REMOVE
function cmdRemove(idOrName) {
  const reg = loadRegistry();
  const idx = reg.clients.findIndex(c =>
    c.id.toLowerCase() === idOrName.toLowerCase() ||
    c.companyName.toLowerCase().includes(idOrName.toLowerCase())
  );
  if (idx === -1) {
    console.log(`\n❌ لم يُعثر على عميل: "${idOrName}"\n`);
    return;
  }
  const removed = reg.clients.splice(idx, 1)[0];
  saveRegistry(reg);
  console.log(`\n🗑️  تم حذف العميل: [${removed.companyName}] من السجل.\n`);
}

// ─── CLI Router ────────────────────────────────────────────────────────────────
const [,, cmd, arg] = process.argv;

switch ((cmd || '').toLowerCase()) {
  case 'list':        cmdList();         break;
  case 'add':         cmdAdd();          break;
  case 'update':      cmdUpdate(arg || ''); break;
  case 'update-all':  cmdUpdateAll();    break;
  case 'remove':      cmdRemove(arg || ''); break;
  default:
    console.log(`
══════════════════════════════════════════════════════════
  🚗 نظام إدارة تحديثات العملاء - معرض السيارات
══════════════════════════════════════════════════════════
  الاستخدام:

  node update-manager.js list
    → عرض جميع العملاء المسجلين

  node update-manager.js add
    → إضافة عميل جديد وتوليد حزمة ZIP مخصصة له

  node update-manager.js update <client-id أو اسم>
    → توليد حزمة تحديث مخصصة لعميل واحد فقط

  node update-manager.js update-all
    → توليد حزمة تحديث مخصصة لكل عميل في السجل

  node update-manager.js remove <client-id أو اسم>
    → حذف عميل من السجل

  جميع الحزمات تُحفظ في: Desktop\\Showroom-Updates\\
══════════════════════════════════════════════════════════
`);
}
