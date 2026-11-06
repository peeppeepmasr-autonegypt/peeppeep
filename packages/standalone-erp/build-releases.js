const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const baseDir = 'E:\\Mostasharak';
const destReleases = 'E:\\Mostasharak\\Releases';
const desktop = path.join(process.env.USERPROFILE, 'Desktop');

if (!fs.existsSync(destReleases)) fs.mkdirSync(destReleases, { recursive: true });

// 1. Accounting System ZIP
const zip1Name = 'Mostasharak-Accounting-System.zip';
const zip1Path = path.join(destReleases, zip1Name);
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
].map(f => "'" + path.join(baseDir, f) + "'").join(',');

execSync('powershell -NoProfile -Command "Compress-Archive -Path ' + zip1Files + " -DestinationPath '" + zip1Path + '\' -Force"', { stdio: 'inherit' });
fs.copyFileSync(zip1Path, path.join(desktop, zip1Name));
console.log('✅ Created:', zip1Path);

// 2. Marketplace App ZIP
const zip2Name = 'Mostasharak-Marketplace-App.zip';
const zip2Path = path.join(destReleases, zip2Name);
const zip2Files = [
  'mostasharak-market.html',
  'install.html',
  'Setup-Mostasharak.bat',
  'MOSTASHARAK_ACCOUNTING_MANUAL_AR.html',
  'manifest.json',
  'service-worker.js',
  'icons'
].map(f => "'" + path.join(baseDir, f) + "'").join(',');

execSync('powershell -NoProfile -Command "Compress-Archive -Path ' + zip2Files + " -DestinationPath '" + zip2Path + '\' -Force"', { stdio: 'inherit' });
fs.copyFileSync(zip2Path, path.join(desktop, zip2Name));
console.log('✅ Created:', zip2Path);

// 3. Complete Suite ZIP
const zip3Name = 'Mostasharak-Complete-Suite.zip';
const zip3Path = path.join(destReleases, zip3Name);
const zip3Files = [
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
].map(f => "'" + path.join(baseDir, f) + "'").join(',');

execSync('powershell -NoProfile -Command "Compress-Archive -Path ' + zip3Files + " -DestinationPath '" + zip3Path + '\' -Force"', { stdio: 'inherit' });
fs.copyFileSync(zip3Path, path.join(desktop, zip3Name));
console.log('✅ Created:', zip3Path);

console.log('🎉 All packages ready on Drive E and Desktop!');
