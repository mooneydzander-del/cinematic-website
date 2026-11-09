/*
 * Landing Page Rocket
 *
 * The brief is composed in the browser and handed to the visitor's email app.
 * Nothing is stored here. /api/lpr-lead only acknowledges a POST and does not
 * persist it, so this page does not call it. A future integration can replace
 * openBrief() once a real recipient exists.
 *
 * Motion is a short CSS entrance and, where supported, a few pixels of parallax
 * on the phone frame. This file does not hijack scroll.
 */
const ADDRESS = 'mooneydzander@gmail.com';
const SHORT_MAX = 200;

/* ── The brief: pure functions, exercised by scripts/check-brief.mjs ──── */

const DOMAIN = /^(?=.{1,253}$)(?:[\p{L}\p{N}](?:[\p{L}\p{N}-]{0,61}[\p{L}\p{N}])?\.)+(?:\p{L}{2,63}|xn--[a-z\d-]{1,59})$/u;
const EMAIL = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)*\.[^\s@.]{2,}$/;

export const isEmail = (value) => EMAIL.test(value);
export const isDomain = (value) => DOMAIN.test(value);

/** "https://www.Example.com/about" → "www.example.com" */
export function normalizeDomain(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/^[a-z][a-z\d+.-]*:\/\//, '')
    .split(/[/?#]/)[0]
    .replace(/:\d+$/, '')
    .replace(/\.$/, '');
}

/** One line per field: collapse whitespace, then cap by character without splitting a code point. */
export function clean(value, max = SHORT_MAX) {
  const flat = String(value ?? '').replace(/\s+/g, ' ').trim();
  const chars = Array.from(flat);
  return chars.length > max ? chars.slice(0, max).join('').trimEnd() : flat;
}

/** Required fields first, then only the optional fields that were filled in. */
export function composeBrief(entries) {
  const line = ({ label, value }) => `${label}: ${value}`;
  const required = entries.filter((entry) => entry.required).map(line);
  const optional = entries.filter((entry) => !entry.required && entry.value).map(line);
  return [...required, ...(optional.length ? ['', ...optional] : [])].join('\r\n');
}

export const subjectFor = (business) => `New brief — ${business}`;

export const mailtoHref = (subject, body) =>
  `mailto:${ADDRESS}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

const CHECKS = {
  name: (v) => (v ? '' : 'Enter your name.'),
  email: (v) => (!v ? 'Enter your email.' : isEmail(v) ? '' : 'Enter a valid email, like name@company.com.'),
  business: (v) => (v ? '' : 'Enter the business name.'),
  domain: (v) => (!v ? 'Enter the domain you own.' : isDomain(normalizeDomain(v)) ? '' : 'Enter a domain like example.com.'),
  goal: (v) => (v ? '' : 'Say what the page should do.'),
};

/* ── Boot ─────────────────────────────────────────────────────────────── */

function boot() {
  const brief = document.getElementById('brief');
  for (const link of document.querySelectorAll('a[href="#brief"]')) {
    link.addEventListener('click', () => {
      requestAnimationFrame(() => brief?.focus({ preventScroll: true }));
    });
  }
  setupBrief();
}

function setupBrief() {
  const form = document.getElementById('brief-form');
  if (!form) return;

  const labelFor = (input) => {
    const label = form.querySelector(`label[for="${input.id}"]`);
    return (label.querySelector('.field__name') ?? label).textContent.trim();
  };

  const fields = [...form.querySelectorAll('.field__input')].filter((input) => input.name).map((input) => ({
    input,
    name: input.name,
    label: labelFor(input),
    required: input.required,
    max: input.maxLength > 0 ? input.maxLength : SHORT_MAX,
    msg: document.getElementById(`${input.id}-msg`),
    check: CHECKS[input.name],
  }));
  const required = fields.filter((field) => field.required && field.check);
  const byName = Object.fromEntries(fields.map((field) => [field.name, field]));

  const validate = (field) => {
    const message = field.check(field.input.value.trim());
    if (field.msg) field.msg.textContent = message;
    if (message) field.input.setAttribute('aria-invalid', 'true');
    else field.input.removeAttribute('aria-invalid');
    return !message;
  };

  for (const field of required) {
    field.input.addEventListener('blur', () => {
      if (field.name === 'domain') {
        const tidy = normalizeDomain(field.input.value);
        if (tidy !== field.input.value && isDomain(tidy)) field.input.value = tidy;
      }
      if (field.input.value.trim() || field.input.hasAttribute('aria-invalid')) validate(field);
    });
    field.input.addEventListener('input', () => {
      if (field.input.hasAttribute('aria-invalid')) validate(field);
    });
  }

  const goal = byName.goal.input;
  const count = form.querySelector('.field__count');
  goal.addEventListener('input', () => {
    const used = goal.value.length;
    count.textContent = used >= goal.maxLength * 0.75 ? `${used}/${goal.maxLength}` : '';
  });

  const more = form.querySelector('.more');
  const extra = document.getElementById(more.getAttribute('aria-controls'));
  more.addEventListener('click', () => {
    const open = more.getAttribute('aria-expanded') !== 'true';
    more.setAttribute('aria-expanded', String(open));
    extra.hidden = !open;
    if (open) extra.querySelector('.field__input')?.focus();
  });

  const fallback = document.getElementById('fallback');
  const status = document.getElementById('copy-status');
  const announce = document.getElementById('form-announce');
  const readout = document.getElementById('brief-out');

  const collect = () => {
    const invalid = required.filter((field) => !validate(field));
    if (invalid.length) {
      invalid[0].input.focus();
      announce.textContent = invalid[0].msg?.textContent ?? '';
      return null;
    }
    byName.domain.input.value = normalizeDomain(byName.domain.input.value);
    const entries = fields.map((field) => ({
      label: field.label,
      value: clean(field.input.value, field.max),
      required: field.required,
    }));
    return {
      body: composeBrief(entries),
      href: mailtoHref(subjectFor(clean(byName.business.input.value)), composeBrief(entries)),
    };
  };

  const showReadout = (body) => {
    readout.value = body;
    readout.hidden = false;
    readout.focus();
    readout.select();
  };

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const brief = collect();
    if (!brief) return;
    fallback.hidden = false;
    status.textContent = 'Opens your email app. If it doesn’t, copy the brief and send it yourself.';
    announce.textContent = 'Opens your email app.';
    window.location.href = brief.href;
  });

  document.getElementById('copy-brief').addEventListener('click', async () => {
    const brief = collect();
    if (!brief) return;
    const copied = await copyText(brief.body);
    if (copied) {
      readout.hidden = true;
      status.textContent = 'Copied. Paste it into an email to mooneydzander@gmail.com.';
      announce.textContent = 'Copied the brief.';
    } else {
      status.textContent = 'Copy was blocked by the browser. The brief is selected below.';
      announce.textContent = 'Copy was blocked. The brief is selected in the text box.';
      showReadout(brief.body);
    }
  });
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.className = 'sr-only';
    document.body.append(area);
    area.select();
    let copied = false;
    try {
      copied = document.execCommand('copy');
    } catch {
      copied = false;
    }
    area.remove();
    return copied;
  }
}

if (typeof document !== 'undefined') boot();
