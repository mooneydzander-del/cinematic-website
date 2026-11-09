/*
 * Locks the live offer, the honest brief path, and the real work proof.
 *   node scripts/check-page.mjs
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../style.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../script.js', import.meta.url), 'utf8');
const vercel = readFileSync(new URL('../vercel.json', import.meta.url), 'utf8');

const must = [
  'No setup fee.',
  '$150/mo',
  '$150',
  '$50 per booking',
  '4% of tracked online store sales',
  '$475/mo',
  '$475',
  '3-month term',
  'month to month',
  'You own the domain',
  'We keep the page',
  'don’t guarantee any number of sales',
  'tctacoscatering.com',
  '$200 deposit',
  'Opens your email app',
  'Nothing is stored on this page',
  'mooneydzander@gmail.com',
  'mailto:mooneydzander@gmail.com',
];
for (const phrase of must) assert.ok(html.includes(phrase), `missing: ${phrase}`);

for (const banned of [/free trial/i, /7-day/i, /keep-or-drop/i, /only pay when/i, /limited time/i, /spots left/i]) {
  assert.doesNotMatch(html, banned, String(banned));
}

assert.equal((html.match(/<h1[\s>]/g) ?? []).length, 1, 'one h1');
assert.ok(html.includes('id="brief"'), 'brief anchor');
assert.ok(html.includes('Open email with this brief'));
assert.ok(html.includes('Copy the brief instead'));
assert.ok(!/<script(?![^>]*\bsrc=)/.test(html), 'no inline scripts');
assert.ok(!/\sstyle=/.test(html), 'no inline styles');

const alts = [...html.matchAll(/<img\b[^>]*>/g)].map((m) => m[0]);
assert.ok(alts.length >= 5, 'proof images');
for (const tag of alts) {
  const alt = tag.match(/\balt="([^"]+)"/);
  assert.ok(alt && alt[1].length > 20, `descriptive alt: ${tag.slice(0, 80)}`);
  const src = tag.match(/\bsrc="([^"]+)"/)[1];
  assert.ok(src.startsWith('/work/'), src);
  assert.ok(existsSync(new URL(`../public${src}`, import.meta.url)), src);
}

assert.doesNotMatch(js, /from 'gsap'|from 'lenis'|fetch\(/);
assert.match(js, /window\.location\.href = brief\.href/);
assert.match(vercel, /form-action mailto:/);
assert.match(vercel, /connect-src 'none'/);
assert.match(css, /prefers-reduced-motion:\s*reduce/);
assert.doesNotMatch(css, /Instrument Serif|Cormorant|Montserrat/);

console.log('Page checks passed.');
