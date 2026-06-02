#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Replaces white back-arrow icons that sit on LIGHT backgrounds with the
 * brand dark colour so the back button is visible.
 *
 * Many screens used `<Ionicons name="arrow-back" color="#fff" />` inside a
 * light pill (e.g. `backBtn: { backgroundColor: '#F4EEFC' }`) on an
 * off-white page, which made the chevron disappear entirely.
 *
 * Rule of thumb:
 *   - If the wrapping container's `backgroundColor` is one of the known
 *     LIGHT tokens listed below, swap the icon colour to `#2D2445`.
 *   - If the wrapping container's `backgroundColor` is dark / transparent
 *     (rgba over a dark hero, '#000', '#1c1c1e', etc.) leave it as `#fff`.
 *   - If we cannot find the container style, leave the icon alone.
 *
 * Safe to re-run. Only swaps when the heuristic is confident.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SCAN_DIR = path.join(ROOT, 'src', 'screens');

// Background tokens we consider "light" enough that white icons disappear.
const LIGHT_BG_REGEX = new RegExp(
  [
    "['\"]#fff['\"]",
    "['\"]#FFF['\"]",
    "['\"]#ffffff['\"]",
    "['\"]#FFFFFF['\"]",
    "['\"]#f8fafc['\"]",
    "['\"]#F8FAFC['\"]",
    "['\"]#f1f5f9['\"]",
    "['\"]#F1F5F9['\"]",
    "['\"]#F4EEFC['\"]",
    "['\"]#F8F5FF['\"]",
    "['\"]#E8E2F2['\"]",
    "['\"]#EFE9F8['\"]",
    "['\"]#EDE9FE['\"]",
    "['\"]#FAFBFF['\"]",
    "['\"]#FCFAFF['\"]",
    "['\"]#fafafa['\"]",
    "['\"]#FAFAFA['\"]",
    "['\"]#e2e8f0['\"]",
    "['\"]white['\"]",
  ].join('|'),
);

const DARK_ARROW = '#2D2445';

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (/\.tsx$/.test(e.name)) out.push(full);
  }
  return out;
}

const files = walk(SCAN_DIR);
let touched = 0;
let edits = 0;
let skippedDark = 0;
let skippedUnknown = 0;

for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');

  // Find every <Ionicons name="arrow-back" ... color="#fff" .../>
  // and the wrapping <TouchableOpacity ... style={styles.<key>} ...>
  // immediately before it.
  const ICON_RE =
    /<Ionicons[^>]*\bname\s*=\s*["']arrow-back["'][^>]*\bcolor\s*=\s*["']#(?:fff|FFFFFF|ffffff|FFF)["'][^>]*\/>/g;

  let out = '';
  let cursor = 0;
  let fileEdits = 0;
  let m;

  while ((m = ICON_RE.exec(src)) !== null) {
    const iconStart = m.index;
    const iconText = m[0];

    // Look backwards (max 400 chars) for the closest `style={styles.<key>}`
    const before = src.slice(Math.max(0, iconStart - 400), iconStart);
    const styleMatch =
      /style\s*=\s*\{\s*(?:\[\s*)?styles\.([a-zA-Z_][a-zA-Z0-9_]*)/.exec(
        before.split('').reverse().join(''),
      );
    // Above regex on reversed string is brittle - do it the easy way:
    const fwd = [...before.matchAll(/style\s*=\s*\{\s*(?:\[\s*)?styles\.([a-zA-Z_][a-zA-Z0-9_]*)/g)];
    const lastStyle = fwd.length ? fwd[fwd.length - 1][1] : null;

    let action = 'skip-unknown';
    if (lastStyle) {
      // Locate the style entry definition in the same file.
      const defRe = new RegExp(
        `${lastStyle}\\s*:\\s*\\{([^}]*)\\}`,
        'm',
      );
      const def = defRe.exec(src);
      if (def) {
        const body = def[1];
        const bgMatch = /backgroundColor\s*:\s*('[^']+'|"[^"]+")/.exec(body);
        if (bgMatch) {
          if (LIGHT_BG_REGEX.test(bgMatch[1])) action = 'swap';
          else action = 'skip-dark';
        } else {
          // No explicit bg in container — many such cases are bare pills on
          // a light page (`#F8F5FF`). Treat as light.
          action = 'swap';
        }
      }
    }

    out += src.slice(cursor, iconStart);

    if (action === 'swap') {
      const swapped = iconText.replace(
        /(\bcolor\s*=\s*["'])#(?:fff|FFFFFF|ffffff|FFF)(["'])/,
        `$1${DARK_ARROW}$2`,
      );
      out += swapped;
      fileEdits += 1;
    } else if (action === 'skip-dark') {
      out += iconText;
      skippedDark += 1;
    } else {
      out += iconText;
      skippedUnknown += 1;
    }

    cursor = iconStart + iconText.length;
  }

  out += src.slice(cursor);

  if (fileEdits > 0) {
    fs.writeFileSync(file, out, 'utf8');
    touched += 1;
    edits += fileEdits;
    console.log(`updated ${path.relative(ROOT, file)} (${fileEdits} edits)`);
  }
}

console.log(
  `\nDone. files=${touched} edits=${edits} skipped(dark)=${skippedDark} skipped(unknown)=${skippedUnknown}`,
);
