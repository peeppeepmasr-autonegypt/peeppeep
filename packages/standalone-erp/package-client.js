const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const companyName = process.argv[2] || 'Auto One Egypt';
const phone = process.argv[3] || '01222597304';

console.log('=====================================================');
console.log(`🚗 جاري تجهيز حزمة مخصصة للمستهلك: "${companyName}"`);
console.log('=====================================================');

// 1. Generate customized license.js
const licenseContent = `// Auto-generated Showroom Client License & Branding Configuration
window.SHOWROOM_LICENSE = {
  companyName: ${JSON.stringify(companyName)},
  licensee: ${JSON.stringify(companyName)},
  masterSenderPhone: ${JSON.stringify(phone)},
  allowedDevices: 2,
  issueDate: ${JSON.stringify(new Date().toISOString().split('T')[0])},
  isLockedBranding: true
};
`;

const projectDir = __dirname;
fs.writeFileSync(path.join(projectDir, 'license.js'), licenseContent, 'utf-8');
console.log('✅ تم إنشاء وتثبيت ملف الهوية والترخيص: license.js');

// 2. Prepare destination zip name on Desktop
const sanitized = companyName.replace(/[^a-zA-Z0-9\u0600-\u06FF_-]/g, '-').replace(/-+/g, '-');
const desktopDir = path.join(process.env.USERPROFILE || 'C:\\Users\\7assan', 'Desktop');
const destZipPath = path.join(desktopDir, `${sanitized}-Showroom-Package.zip`);

console.log(`📦 جاري ضغط ملفات النظام إلى: ${destZipPath}`);

// 3. Create zip using powershell Compress-Archive
// Files to include
const filesToInclude = [
  'index.html',
  'license.js',
  'start-laptop.bat',
  'start-server.bat',
  'serve.js',
  'manifest.json',
  'service-worker.js',
  'package.json',
  'Code.gs',
  'README.md',
  'icons'
];

const pathsString = filesToInclude
  .map(f => `'${path.join(projectDir, f)}'`)
  .filter(p => fs.existsSync(p.replace(/'/g, '')))
  .join(',');

const psCmd = `Compress-Archive -Path ${pathsString} -DestinationPath '${destZipPath}' -Force`;

try {
  execSync(`powershell -Command "${psCmd}"`, { stdio: 'inherit' });
  console.log('=====================================================');
  console.log(`🎉 تم بنجاح إنشاء حزمة (${companyName}) على سطح المكتب:`);
  console.log(`📁 ${destZipPath}`);
  console.log('📲 جاهز للإرسال الفوري كملف عبر واتساب!');
  console.log('=====================================================');
} catch (err) {
  console.error('❌ حدث خطأ أثناء الضغط:', err);
}
