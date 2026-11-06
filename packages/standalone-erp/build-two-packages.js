const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const baseDir = __dirname;
const desktop = path.join(process.env.USERPROFILE || 'C:\\Users\\7assan', 'Desktop');

console.log('📦 جاري إنشاء الحزمتين المنفصلتين...');

// Package 1: PC Accounting
const pcZip = path.join(desktop, 'ShowroomOS-PC-Accounting.zip');
const pcItems = [
  'index.html',
  'serve.js',
  'start-laptop.bat',
  'start-server.bat',
  'license.js',
  'Code.gs',
  'package.json',
  'manifest.json',
  'service-worker.js',
  'README-PC.md',
  'icons'
].map(f => `'${path.join(baseDir, f)}'`).join(',');

execSync(`powershell -NoProfile -Command "Compress-Archive -Path ${pcItems} -DestinationPath '${pcZip}' -Force"`, { stdio: 'inherit' });
console.log('✅ تم إنشاء حزمة الكمبيوتر بنجاح: ' + pcZip);

// Package 2: Mobile Marketplace
const mobileZip = path.join(desktop, 'ShowroomOS-Market-Mobile.zip');
const mobileDir = path.join(baseDir, 'mobile-package', '*');

execSync(`powershell -NoProfile -Command "Compress-Archive -Path '${mobileDir}' -DestinationPath '${mobileZip}' -Force"`, { stdio: 'inherit' });
console.log('✅ تم إنشاء حزمة الموبايل بنجاح: ' + mobileZip);

console.log('🎉 الحزمتان جاهزتان الآن على سطح المكتب!');
