import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(import.meta.dirname, '..');
const mobileNodeModules = path.join(repoRoot, 'apps', 'mobile', 'node_modules');
const mobilePackageJson = JSON.parse(
  fs.readFileSync(path.join(repoRoot, 'apps', 'mobile', 'package.json'), 'utf8'),
);
const copiedPackages = new Set(['react', 'react-native']);

const links = new Set([
  ...Object.keys(mobilePackageJson.dependencies ?? {}),
  ...Object.keys(mobilePackageJson.devDependencies ?? {}),
  'react-native-safe-area-context',
]);

for (const pkg of links) {
  const source = path.join(repoRoot, 'node_modules', pkg);
  const target = path.join(mobileNodeModules, pkg);

  if (!fs.existsSync(source)) {
    continue;
  }

  fs.mkdirSync(path.dirname(target), { recursive: true });

  try {
    const stat = fs.lstatSync(target);
    if (copiedPackages.has(pkg) && stat.isDirectory() && !stat.isSymbolicLink() && samePackageVersion(source, target)) {
      continue;
    }
    if (!copiedPackages.has(pkg) && stat.isDirectory() && !stat.isSymbolicLink()) {
      continue;
    }
    if (!copiedPackages.has(pkg) && stat.isSymbolicLink() && sameRealPath(source, target)) {
      continue;
    }
    fs.rmSync(target, { recursive: true, force: true });
  } catch {}

  if (copiedPackages.has(pkg)) {
    fs.cpSync(source, target, { recursive: true });
    continue;
  }

  fs.symlinkSync(path.relative(mobileNodeModules, source), target, 'junction');
}

function samePackageVersion(sourceDir, targetDir) {
  try {
    const sourcePackage = JSON.parse(fs.readFileSync(path.join(sourceDir, 'package.json'), 'utf8'));
    const targetPackage = JSON.parse(fs.readFileSync(path.join(targetDir, 'package.json'), 'utf8'));
    return sourcePackage.name === targetPackage.name && sourcePackage.version === targetPackage.version;
  } catch {
    return false;
  }
}

function sameRealPath(sourcePath, targetPath) {
  try {
    return fs.realpathSync(sourcePath) === fs.realpathSync(targetPath);
  } catch {
    return false;
  }
}
