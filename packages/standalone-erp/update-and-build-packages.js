const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const baseDir = __dirname;
const mobileDir = path.join(baseDir, 'mobile-package');
const desktop = path.join(process.env.USERPROFILE || 'C:\\Users\\7assan', 'Desktop');

console.log('🔄 1. مزامنة ملفات مستشارك الموحدة لكافة الأجهزة...');

const filesToSync = [
  'install.html',
  'mostasharak-accounting.html',
  'mostasharak-market.html',
  'Setup-Mostasharak.bat',
  'MOSTASHARAK_ACCOUNTING_MANUAL_AR.html',
  'MOSTASHARAK_ACCOUNTING_MANUAL_AR.md',
  'license.js',
  'manifest.json'
];

filesToSync.forEach(f => {
  const src = path.join(baseDir, f);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(mobileDir, f));
    // Also copy to desktop directly
    fs.copyFileSync(src, path.join(desktop, f));
  }
});

console.log('✅ تمت المزامنة والنسخ إلى سطح المكتب.');

// Package: Mostasharak Unified All-In-One (Windows & Mobile)
console.log('📦 2. تجميع الحزمة الشاملة Mostasharak-Complete-Suite.zip...');
const suiteZip = path.join(desktop, 'Mostasharak-Complete-Suite.zip');
const pcZip = path.join(desktop, 'Mostasharak-PC-Accounting.zip');
const mobileZip = path.join(desktop, 'Mostasharak-Market-Mobile.zip');

const allItems = [
  'install.html',
  'mostasharak-accounting.html',
  'mostasharak-market.html',
  'Setup-Mostasharak.bat',
  'index.html',
  'market.html',
  'serve.js',
  'license.js',
  'Code.gs',
  'MOSTASHARAK_ACCOUNTING_MANUAL_AR.html',
  'MOSTASHARAK_ACCOUNTING_MANUAL_AR.md',
  'manifest.json',
  'service-worker.js',
  'icons'
].map(f => `'${path.join(baseDir, f)}'`).join(',');

execSync(`powershell -NoProfile -Command "Compress-Archive -Path ${allItems} -DestinationPath '${suiteZip}' -Force"`, { stdio: 'inherit' });
fs.copyFileSync(suiteZip, pcZip);
fs.copyFileSync(suiteZip, mobileZip);

console.log('✅ تم إنشاء الحزمة الشاملة بنجاح: ' + suiteZip);
console.log('🎉 جميع الخيارات والملفات جاهزة الآن على سطح المكتب!');
