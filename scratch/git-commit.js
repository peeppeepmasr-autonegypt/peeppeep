const { execSync } = require('child_process');
const cwd = 'e:/autonegyptportal/autoportal';

try {
  execSync('git config user.name "AutoOneEgypt"', { cwd, stdio: 'inherit' });
  execSync('git config user.email "peeppeepmasr@gmail.com"', { cwd, stdio: 'inherit' });
  execSync('git add -A', { cwd, stdio: 'inherit' });
  execSync('git commit -m "feat: Auto One Egypt multi-tenant portal with custom domain and finance calculator"', { cwd, stdio: 'inherit' });
  console.log('Git commit succeeded!');
} catch (e) {
  console.error('Git error:', e.message);
}
