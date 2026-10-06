/*
 * Prints the email the form opens — once with every field filled, once with only the
 * required ones — using the real labels from index.html and the real composer from
 * script.js, then checks the caps, the encoding round trip and the validators.
 *
 *   npm run check:brief
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { register } from 'node:module';

// script.js imports the animation libraries; stub them so only the brief functions load.
const stubs = {
  gsap: 'export default {};',
  'gsap/ScrollTrigger': 'export const ScrollTrigger = {};',
  lenis: 'export default class Lenis {}',
};
const loader = `
  const stubs = ${JSON.stringify(stubs)};
  export async function resolve(specifier, context, next) {
    if (Object.hasOwn(stubs, specifier)) {
      return { shortCircuit: true, url: 'data:text/javascript,' + encodeURIComponent(stubs[specifier]) };
    }
    return next(specifier, context);
  }
`;
register(`data:text/javascript,${encodeURIComponent(loader)}`);

const { clean, composeBrief, mailtoHref, subjectFor, normalizeDomain, isDomain, isEmail } = await import('../script.js');

// The form, as the browser sees it: label text, name, required, maxlength, in DOM order.
// Required labels carry a "required" marker beside the name; the email uses the name only.
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const fields = [...html.matchAll(/<label class="field__label" for="([^"]+)">([\s\S]*?)<\/label>/g)].map(([, id, inner]) => {
  const tag = html.match(new RegExp(`<(?:input|textarea)[^>]*\\bid="${id}"[^>]*>`))[0];
  const label = inner.match(/<span class="field__name">([^<]+)<\/span>/)?.[1] ?? inner.replace(/<[^>]*>/g, '');
  return {
    label: label.trim(),
    name: tag.match(/\bname="([^"]+)"/)[1],
    required: /\srequired[\s>]/.test(tag),
    max: Number(tag.match(/\bmaxlength="(\d+)"/)?.[1] ?? 200),
  };
});
assert.equal(fields.length, 13, 'expected 13 fields');
assert.deepEqual(
  fields.filter((f) => f.required).map((f) => f.name),
  ['name', 'email', 'business', 'domain', 'goal'],
);
assert.ok(fields.every((f) => !/required/i.test(f.label)), 'no "required" marker leaks into a label');

// Mirrors the submit handler in script.js.
function send(values) {
  const entries = fields.map((field) => {
    const raw = values[field.name] ?? '';
    return {
      label: field.label,
      value: clean(field.name === 'domain' ? normalizeDomain(raw) : raw, field.max),
      required: field.required,
    };
  });
  const subject = subjectFor(clean(values.business));
  const body = composeBrief(entries);
  return { subject, body, href: mailtoHref(subject, body) };
}

const required = {
  name: 'Ada Lovelace',
  email: 'ada@analytical.engineering',
  business: 'Analytical Engines & Co.',
  domain: 'https://www.Analytical.Engineering/',
  goal: 'Book discovery calls with founders.\nShow the engine in motion; no stock photos.',
};
const everything = {
  ...required,
  offer: 'Your numbers, computed before lunch',
  audience: 'Founders who still do the books themselves',
  proof: 'Ran the Bernoulli numbers, first try',
  leave: 'Pricing tables, team photos',
  photos: 'https://drive.example.com/photos',
  video: 'https://vimeo.com/000000000',
  animation: 'https://example.com/loop.mp4',
  brand: '#1F2A44',
};

for (const [title, values] of [['All fields filled', everything], ['Required fields only', required]]) {
  const { subject, body, href } = send(values);
  const url = new URL(href);
  assert.equal(url.protocol, 'mailto:');
  assert.equal(url.pathname, 'mooneydzander@gmail.com');
  assert.equal(url.searchParams.get('subject'), subject, 'subject survives encoding');
  assert.equal(url.searchParams.get('body'), body, 'body survives encoding');
  // Only the URL's own ? and & survive; anything typed is percent-encoded.
  assert.equal(href.split('?').length, 2);
  assert.equal(href.split('&').length, 2);
  assert.ok(!/[\s#]/.test(href), 'no raw whitespace or # in the URL');

  console.log(`\n── ${title} ${'─'.repeat(Math.max(0, 60 - title.length))}`);
  console.log(`To:      mooneydzander@gmail.com`);
  console.log(`Subject: ${subject}`);
  console.log(`URL:     ${href.length} characters\n`);
  console.log(body.replaceAll('\r\n', '\n'));
}

// Required-only: exactly the five required lines, no blank separator.
assert.equal(send(required).body.split('\r\n').length, 5);
// Everything: five required, a blank line, eight optional.
assert.equal(send(everything).body.split('\r\n').length, 14);

// Caps: 600 for the textarea, 200 for short fields, measured in characters.
const long = send({ ...required, name: 'N'.repeat(260), goal: 'g'.repeat(900) });
assert.match(long.body, new RegExp(`^Name: N{200}\\r\\n`));
assert.ok(long.body.includes(`What the page should do: ${'g'.repeat(600)}`));
assert.ok(!long.body.includes('g'.repeat(601)));
assert.equal(clean('🎬'.repeat(300), 200), '🎬'.repeat(200), 'never splits an emoji');

// Validators.
for (const ok of ['name@company.com', 'a.b+c@sub.domain.io', 'ada@analytical.engineering']) assert.ok(isEmail(ok), ok);
for (const bad of ['', 'name', 'name@', 'name@company', 'name@company.c', 'na me@company.com', 'name@@company.com']) assert.ok(!isEmail(bad), bad);
for (const ok of ['example.com', 'www.example.co.uk', 'münchen.de', 'xn--mnchen-3ya.de', '123.example.io']) assert.ok(isDomain(ok), ok);
for (const bad of ['', 'example', 'example.c', '-example.com', 'exa mple.com', 'example..com', 'http://example.com']) assert.ok(!isDomain(bad), bad);
assert.equal(normalizeDomain(' HTTPS://Example.com:8080/path?q=1#top '), 'example.com');

console.log('\nAll brief checks passed.');
