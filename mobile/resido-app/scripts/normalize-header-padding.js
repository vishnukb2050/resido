#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Normalises `paddingTop` on screen `header`-style entries that were
 * previously inflated (>=50) to compensate for the no-op react-native
 * SafeAreaView. With `react-native-safe-area-context` now providing the
 * device inset, anything 50+ produces a wall of empty space above the
 * title. We pin those back to a sane 12px so the header sits cleanly
 * below the notch/status bar.
 *
 * Heuristics:
 *   - Only style entries whose name *ends with* `Header` or is `header`,
 *     `psHeader`, `topBar`, `topbar`, `headerWrap`, `headerRow`,
 *     `headerContainer`, `headerBar`, `appBar`, `appbar`, `navBar`,
 *     `navbar` are eligible.
 *   - Only `paddingTop: <number>` >= 50 is rewritten.
 *   - Does NOT touch `padding:` shorthand or `paddingVertical:`.
 *
 * Safe to re-run.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SCAN_DIRS = [
  path.join(ROOT, 'src', 'screens'),
  path.join(ROOT, 'src', 'components', 'dashboards'),
];

const HEADER_KEY_RE =
  /^(header|psHeader|topBar|topbar|headerWrap|headerRow|headerContainer|headerBar|appBar|appbar|navBar|navbar|.*Header)$/;

const SAFE_TOP = 12;

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

let touched = 0;
let edits = 0;

for (const file of targets) {
  const src = fs.readFileSync(file, 'utf8');
  // Find StyleSheet.create object literal(s).
  // We do a lightweight scan: look for `<key>: {` then read until matching `}`
  // tracking braces so multi-line entries are captured correctly.
  let out = '';
  let i = 0;
  let fileEdits = 0;

  while (i < src.length) {
    // Match a style key like `header:` or `psHeader:` or `headerRow:` at start
    // of an entry (preceded by `{` or `,` and whitespace).
    const keyMatch = /([\{\,\s])([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*\{/.exec(
      src.slice(i),
    );
    if (!keyMatch) {
      out += src.slice(i);
      break;
    }

    const before = src.slice(i, i + keyMatch.index);
    const lead = keyMatch[1];
    const key = keyMatch[2];
    const keyStart = i + keyMatch.index + keyMatch[0].length; // position just after `{`

    out += before + lead + key + ': {';

    // Track braces to find the matching `}`.
    let depth = 1;
    let j = keyStart;
    while (j < src.length && depth > 0) {
      const ch = src[j];
      if (ch === '{') depth += 1;
      else if (ch === '}') depth -= 1;
      if (depth === 0) break;
      j += 1;
    }

    let body = src.slice(keyStart, j);

    if (HEADER_KEY_RE.test(key)) {
      const replaced = body.replace(
        /paddingTop\s*:\s*(\d+)/g,
        (m, n) => {
          const v = parseInt(n, 10);
          if (v >= 50) {
            fileEdits += 1;
            return `paddingTop: ${SAFE_TOP}`;
          }
          return m;
        },
      );
      body = replaced;
    }

    out += body + (src[j] || '');
    i = j + 1;
  }

  if (fileEdits > 0) {
    fs.writeFileSync(file, out, 'utf8');
    touched += 1;
    edits += fileEdits;
    console.log(`updated: ${path.relative(ROOT, file)} (${fileEdits} edits)`);
  }
}

console.log(`\nDone. files=${touched} totalEdits=${edits}`);
