const fs = require('fs');
const path = require('path');

const srcDir = path.resolve(__dirname, '../src');
const testsUnitDir = path.resolve(__dirname, '../tests/unit');

function walk(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const stat = fs.statSync(path.join(dir, file));
    if (stat.isDirectory()) {
      fileList = walk(path.join(dir, file), fileList);
    } else if (file.endsWith('.spec.ts') || file.endsWith('.test.ts')) {
      fileList.push(path.join(dir, file));
    }
  }
  return fileList;
}

const testFiles = walk(testsUnitDir);

for (const oldPath of testFiles) {
  // e.g. tests\unit\api\authenticate.middleware.spec.ts
  const relPath = path.relative(testsUnitDir, oldPath);
  
  let newPath = path.join(srcDir, relPath);
  // Exception: domain/user-entity.spec.ts should probably go to domain/entities/user.entity.spec.ts
  if (relPath === path.join('domain', 'user-entity.spec.ts')) {
    newPath = path.join(srcDir, 'domain', 'entities', 'user.entity.spec.ts');
  } else if (relPath === path.join('api', 'onboarding.routes.spec.ts')) {
    newPath = path.join(srcDir, 'api', 'routes', 'onboarding.routes.spec.ts');
  } else if (relPath.startsWith('api' + path.sep)) {
    // move middlewares to src/api/middleware
    if (relPath.includes('middleware')) {
      newPath = path.join(srcDir, 'api', 'middleware', path.basename(relPath));
    }
  }

  // Ensure dir exists
  fs.mkdirSync(path.dirname(newPath), { recursive: true });

  // Read content
  let content = fs.readFileSync(oldPath, 'utf8');

  // Replace '../../../src/api/middleware/authenticate.middleware.js' with './authenticate.middleware.js'
  // It's easier to just replace '../../../src/X' with '@X' because we have aliases!
  // Wait, the project doesn't use aliases in the actual src code yet, or maybe it does?
  // Let's just rewrite '../../../src/' to '@/' and configure the alias, OR just calculate relative paths.
  
  // Quick relative path recalculator for any '../../../src/X'
  content = content.replace(/['"]\.\.\/\.\.\/\.\.\/src\/(.*?)['"]/g, (match, p1) => {
    // p1 is something like 'api/middleware/authenticate.middleware.js'
    const targetAbs = path.join(srcDir, p1);
    let newRel = path.relative(path.dirname(newPath), targetAbs).replace(/\\/g, '/');
    if (!newRel.startsWith('.')) newRel = './' + newRel;
    return `'${newRel}'`;
  });

  fs.writeFileSync(newPath, content);
  fs.unlinkSync(oldPath);
  console.log(`Moved ${relPath} to ${path.relative(srcDir, newPath)}`);
}

console.log('Done moving unit tests!');
