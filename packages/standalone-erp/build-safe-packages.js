const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const baseDir = 'E:\\Mostasharak';
const destReleases = 'E:\\Mostasharak\\Releases';
const directFolder = 'E:\\Mostasharak\\Direct-Send-No-Zip';

if (!fs.existsSync(destReleases)) fs.mkdirSync(destReleases, { recursive: true });
if (!fs.existsSync(directFolder)) fs.mkdirSync(directFolder, { recursive: true });

// Copy the direct standalone files for direct sending without ZIP
const directFiles = [
  'mostasharak-accounting.html',
  'mostasharak-market.html',
  'install.html',
  'MOSTASHARAK_ACCOUNTING_MANUAL_AR.html',
  'MOSTASHARAK_ACCOUNTING_MANUAL_AR.md'
];

directFiles.forEach(f => {
  fs.copyFileSync(path.join(baseDir, f), path.join(directFolder, f));
});
console.log('✅ Prepared Direct-Send-No-Zip folder for instant WhatsApp sharing.');

// Create Clean Web-Safe ZIP (No .bat or executable scripts to prevent Antivirus/Email blocking)
const safeFiles = [
  'mostasharak-accounting.html',
  'mostasharak-market.html',
  'install.html',
  'MOSTASHARAK_ACCOUNTING_MANUAL_AR.html',
  'MOSTASHARAK_ACCOUNTING_MANUAL_AR.md',
  'manifest.json'
].map(f => "'" + path.join(baseDir, f) + "'").join(',');

const safeZipPath = path.join(destReleases, 'Mostasharak-WebSafe-Clean.zip');
execSync('powershell -NoProfile -Command "Compress-Archive -Path ' + safeFiles + " -DestinationPath '" + safeZipPath + '\' -Force"', { stdio: 'inherit' });
console.log('✅ Created Clean Web-Safe ZIP (no scripts, 100% antivirus friendly):', safeZipPath);
