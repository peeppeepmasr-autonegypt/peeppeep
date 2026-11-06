const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const baseDir = __dirname;
const desktop = path.join(process.env.USERPROFILE || 'C:\\Users\\7assan', 'Desktop');

console.log('📦 جاري إنشاء وتجهيز الحزمتين المضغوطتين المنفصلتين بدقة...');

// 1. ZIP 1: Mostasharak Accounting System
const zip1Name = 'Mostasharak-Accounting-System.zip';
const zip1Path = path.join(desktop, zip1Name);
const zip1Legacy = path.join(desktop, 'Mostasharak-PC-Accounting.zip');

const zip1Files = [
  'mostasharak-accounting.html',
  'install.html',
  'Setup-Mostasharak.bat',
  'serve.js',
  'Code.gs',
  'license.js',
  'MOSTASHARAK_ACCOUNTING_MANUAL_AR.html',
  'MOSTASHARAK_ACCOUNTING_MANUAL_AR.md',
  'manifest.json',
  'service-worker.js',
  'icons'
].map(f => `'${path.join(baseDir, f)}'`).join(',');

execSync(`powershell -NoProfile -Command "Compress-Archive -Path ${zip1Files} -DestinationPath '${zip1Path}' -Force"`, { stdio: 'inherit' });
fs.copyFileSync(zip1Path, zip1Legacy);
console.log('✅ تم إنشاء الحزمة 1 (المحاسبة والإدارة):', zip1Path, '(' + fs.statSync(zip1Path).size + ' bytes)');


// 2. ZIP 2: Mostasharak Marketplace App
const zip2Name = 'Mostasharak-Marketplace-App.zip';
const zip2Path = path.join(desktop, zip2Name);
const zip2Legacy = path.join(desktop, 'Mostasharak-Market-Mobile.zip');

const zip2Files = [
  'mostasharak-market.html',
  'install.html',
  'Setup-Mostasharak.bat',
  'MOSTASHARAK_ACCOUNTING_MANUAL_AR.html',
  'manifest.json',
  'service-worker.js',
  'icons'
].map(f => `'${path.join(baseDir, f)}'`).join(',');

execSync(`powershell -NoProfile -Command "Compress-Archive -Path ${zip2Files} -DestinationPath '${zip2Path}' -Force"`, { stdio: 'inherit' });
fs.copyFileSync(zip2Path, zip2Legacy);
console.log('✅ تم إنشاء الحزمة 2 (سوق السيارات):', zip2Path, '(' + fs.statSync(zip2Path).size + ' bytes)');

console.log('🎉 تم إنشاء وتجهيز الحزمتين على سطح المكتب بنجاح!');
