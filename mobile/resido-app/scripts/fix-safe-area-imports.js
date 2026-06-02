#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * One-off codemod that moves `SafeAreaView` from the
 * `react-native` import to `react-native-safe-area-context`.
 *
 * The RN-bundled SafeAreaView is a no-op on Android and unreliable on iOS
 * without a `SafeAreaProvider`. The safe-area-context version respects
 * device insets on every platform, which fixes headers that were rendering
 * flush against the status bar.
 *
 * Safe to re-run. Only touches files where:
 *   - SafeAreaView is imported from 'react-native'
 *   - SafeAreaView is NOT already imported from 'react-native-safe-area-context'
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SCAN_DIRS = [
  path.join(ROOT, 'src', 'screens'),
  path.join(ROOT, 'src', 'components', 'dashboards'),
];

function walk(dir, out = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(tsx|ts|jsx|js)$/.test(entry.name)) out.push(full);
  }
  return out;
}

const targets = SCAN_DIRS.flatMap((d) => (fs.existsSync(d) ? walk(d) : []));

let changed = 0;
let skipped = 0;
let already = 0;

for (const file of targets) {
  let src = fs.readFileSync(file, 'utf8');

  // Skip if already imported from safe-area-context.
  if (/from\s+['"]react-native-safe-area-context['"]/m.test(src) &&
      /SafeAreaView/.test(src)) {
    const fromRN = /import\s*\{\s*([^}]*?)\}\s*from\s*['"]react-native['"]/.exec(src);
    if (!fromRN || !/\bSafeAreaView\b/.test(fromRN[1])) {
      already += 1;
      continue;
    }
  }

  const importRegex =
    /import\s*\{\s*([^}]*?)\}\s*from\s*['"]react-native['"]\s*;?/m;
  const match = importRegex.exec(src);
  if (!match) {
    skipped += 1;
    continue;
  }

  const names = match[1]
    .split(',')
    .map((n) => n.trim())
    .filter(Boolean);

  if (!names.includes('SafeAreaView')) {
    skipped += 1;
    continue;
  }

  const remaining = names.filter((n) => n !== 'SafeAreaView');
  const newRNImport = remaining.length
    ? `import { ${remaining.join(', ')} } from 'react-native';`
    : '';
  const safeAreaImport =
    "import { SafeAreaView } from 'react-native-safe-area-context';";

  const replacement = newRNImport
    ? `${newRNImport}\n${safeAreaImport}`
    : safeAreaImport;

  src = src.replace(importRegex, replacement);
  fs.writeFileSync(file, src, 'utf8');
  changed += 1;
  console.log('updated:', path.relative(ROOT, file));
}

console.log(`\nDone. changed=${changed} already=${already} skipped=${skipped}`);
