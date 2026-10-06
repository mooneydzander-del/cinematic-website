/*
 * Landing Page Rocket
 *
 * Scenes 1–5 share one sticky stage driven by a single scrubbed timeline; the brief follows.
 * Without this script, or with reduced motion, the scenes simply stack. Motion is transform
 * and opacity only: a focus pull is a crossfade between each line and a pre-blurred twin, so
 * `filter` is never animated from here.
 */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

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
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });

  const lines = prepareLines();
  const env = {
    lenis: null,
    motion: false,
    focus(input) {
      input.focus({ preventScroll: true });
      if (this.lenis) this.lenis.scrollTo(input, { offset: -window.innerHeight * 0.3, duration: 1.5 });
      else input.scrollIntoView({ block: 'center' });
    },
    reveal(targets, stagger = 0) {
      if (this.motion) {
        gsap.fromTo(targets, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 1.4, stagger, ease: 'power2.out', clearProps: 'transform' });
      } else {
        gsap.fromTo(targets, { opacity: 0 }, { opacity: 1, duration: 1, stagger, ease: 'power1.out' });
      }
    },
  };

  setupBrief(env);
  setupNav(env);
  stars();

  const mm = gsap.matchMedia();
  mm.add('(prefers-reduced-motion: no-preference)', () => film(env, lines));
  mm.add('(prefers-reduced-motion: reduce)', () => still());

  document.fonts?.ready.then(() => ScrollTrigger.refresh());
}

/* Wrap every line in a focus pair: the sharp line and an aria-hidden, pre-blurred twin. */
function prepareLines() {
  const lines = {};
  for (const sharp of document.querySelectorAll('[data-line]')) {
    const focus = document.createElement('span');
    focus.className = 'focus';
    const soft = sharp.cloneNode(true);
    soft.removeAttribute('data-line');
    soft.classList.add('line--soft');
    soft.setAttribute('aria-hidden', 'true');
    sharp.replaceWith(focus);
    focus.append(sharp, soft);
    lines[sharp.dataset.line] = { focus, sharp, soft };
  }
  return lines;
}

/* ── The film (full motion) ───────────────────────────────────────────── */

function film(env, L) {
  const root = document.documentElement;
  const target = location.hash.length > 1 ? document.getElementById(location.hash.slice(1)) : null;
  root.classList.add('is-film');
  window.scrollTo(0, 0);

  const lenis = new Lenis({ lerp: 0.06, wheelMultiplier: 0.9 });
  const raf = (time) => lenis.raf(time * 1000);
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(raf);
  gsap.ticker.lagSmoothing(0);
  env.lenis = lenis;
  env.motion = true;

  const vh = (n) => () => (window.innerHeight * n) / 100;
  const { T, toScroll } = timeline(L, vh);
  const brief = arrival(L, vh);
  depth(vh);
  heroVideo(() => toScroll(T.heroGone));
  ScrollTrigger.refresh();
  if (target) lenis.scrollTo(target, { immediate: true });

  return () => {
    brief.cleanup();
    gsap.ticker.remove(raf);
    lenis.destroy();
    root.classList.remove('is-film');
    env.lenis = null;
    env.motion = false;
  };
}

/* Scenes 1–5. Positions are in beats; the whole timeline maps onto the film's scroll length. */
function timeline(L, vh) {
  const T = {
    heroOut: 0.75,
    own: 1.65,
    keep: 2.15,
    ownSub: 2.75,
    ownOut: 4.55,
    trial: 5.55,
    trialSub: 6.2,
    trialOut: 7.9,
    sub: 8.9,
    subOut: 10.7,
    price: 11.7, // the subscription line is fully gone here: the price lands alone
    fee: 13.1, // a beat of scroll holds the price on its own first
    end: 15, // then the stage scrolls away and arrival() lets the price go
  };
  T.heroGone = T.heroOut + 0.85;

  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: { trigger: '.film', start: 'top top', end: 'bottom bottom', scrub: 1.3, invalidateOnRefresh: true },
  });

  const text = (line) => line.focus.closest('.scene__text, .price');

  // Resolve from soft focus: the blurred twin swells, the sharp line arrives through it.
  const enter = (line, at, d = 0.95) => {
    tl.fromTo(line.focus, { y: vh(7), scale: 1.025 }, { y: 0, scale: 1, duration: d, ease: 'power2.out', immediateRender: false }, at)
      .fromTo(line.soft, { opacity: 0 }, { opacity: 0.85, duration: d * 0.45, ease: 'power1.out', immediateRender: false }, at)
      .to(line.soft, { opacity: 0, duration: d * 0.5, ease: 'power1.in' }, at + d * 0.5)
      .fromTo(line.sharp, { opacity: 0 }, { opacity: 1, duration: d * 0.7, ease: 'power1.inOut', immediateRender: false }, at + d * 0.3);
  };

  // Soften and go: the sharp line sinks under its twin, then the twin goes too.
  const leave = (line, at, d = 0.85) => {
    tl.to(line.sharp, { opacity: 0, duration: d * 0.65, ease: 'power1.in' }, at)
      .to(line.soft, { opacity: 0.7, duration: d * 0.35, ease: 'power1.out' }, at)
      .to(line.soft, { opacity: 0, duration: d * 0.55, ease: 'power1.in' }, at + d * 0.45);
  };

  // Sub lines are small enough that a plain fade reads as the same focus pull.
  const enterSub = (el, at, d = 0.8) => {
    tl.fromTo(el, { opacity: 0, y: vh(2.5) }, { opacity: 1, y: 0, duration: d, ease: 'power2.out', immediateRender: false }, at);
  };
  const leaveSub = (el, at, d = 0.6) => {
    tl.to(el, { opacity: 0, duration: d, ease: 'power1.in' }, at);
  };

  // Foreground depth: the scene's text drifts up while it holds, then lifts away as it leaves.
  const drift = (el, from, out, d = 0.85, startY = 3) => {
    tl.fromTo(el, { y: vh(startY) }, { y: vh(-3), duration: out - from, immediateRender: false }, from)
      .to(el, { y: vh(-14), duration: d, ease: 'power1.in' }, out);
  };

  // 1 — We build a cinematic landing page.
  drift(text(L.hero), 0, T.heroOut, 0.85, 0);
  leave(L.hero, T.heroOut);

  // 2 — You own the domain. We keep the page.
  const own = text(L.own);
  const ownSub = own.querySelector('.scene__sub');
  enter(L.own, T.own);
  enter(L.keep, T.keep, 0.9);
  enterSub(ownSub, T.ownSub);
  drift(own, T.own, T.ownOut);
  leave(L.own, T.ownOut);
  leave(L.keep, T.ownOut + 0.06);
  leaveSub(ownSub, T.ownOut + 0.1);

  // 3 — You get seven days to keep it or drop it.
  const trial = text(L.trial);
  const trialSub = trial.querySelector('.scene__sub');
  enter(L.trial, T.trial);
  enterSub(trialSub, T.trialSub);
  drift(trial, T.trial, T.trialOut);
  leave(L.trial, T.trialOut);
  leaveSub(trialSub, T.trialOut + 0.06);

  // 4 — Then a monthly subscription for anything still running.
  enter(L.subscription, T.sub);
  drift(text(L.subscription), T.sub, T.subOut);
  leave(L.subscription, T.subOut);

  // 5 — $475 a month. alone on screen, then No setup fee. beneath it. It holds to the end of the film.
  enter(L.price, T.price, 1.1);
  enter(L.fee, T.fee, 0.9);
  tl.fromTo(text(L.price), { y: vh(3) }, { y: 0, duration: T.end - T.price, immediateRender: false }, T.price);

  // The horizon glow belongs to the opening shot.
  tl.fromTo('.horizon', { opacity: 1 }, { opacity: 0.35, duration: T.trial, ease: 'power1.inOut' }, 0);

  const media = document.querySelector('.atmos__media');
  if (media) {
    tl.fromTo(media, { scale: 1 }, { scale: 1.08, duration: T.heroGone }, 0)
      .to(media, { opacity: 0, duration: 0.7 }, T.heroOut + 0.1);
  }

  const toScroll = (beat) => {
    const st = tl.scrollTrigger;
    return st.start + (beat / tl.duration()) * (st.end - st.start);
  };

  // will-change only while a scene is on screen.
  const live = (selector, from, to) =>
    ScrollTrigger.create({
      start: () => toScroll(from) - 1,
      end: () => toScroll(to),
      toggleClass: { targets: selector, className: 'is-live' },
    });
  live('.scene--hero', 0, T.heroGone);
  live('.scene--own', T.own - 0.1, T.ownOut + 0.95);
  live('.scene--trial', T.trial - 0.1, T.trialOut + 0.9);
  live('.scene--sub', T.sub - 0.1, T.subOut + 0.9);
  live('.scene--price', T.price - 0.1, T.end);

  return { T, toScroll };
}

/* The brief arrives: the price drifts up and lets go, the heading resolves, the form fades up once. */
function arrival(L, vh) {
  gsap.fromTo(
    '.scene--price .scene__inner',
    { y: 0, opacity: 1 },
    {
      y: vh(-8),
      opacity: 0,
      ease: 'power1.in',
      immediateRender: false,
      scrollTrigger: { trigger: '.brief', start: 'top bottom', end: 'top 45%', scrub: 1.3, invalidateOnRefresh: true },
    },
  );

  const b = L.brief;
  gsap
    .timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: '.brief__title', start: 'top 92%', end: 'top 50%', scrub: 1.3, invalidateOnRefresh: true },
    })
    .fromTo(b.focus, { y: vh(7), scale: 1.025 }, { y: 0, scale: 1, duration: 1, ease: 'power2.out' }, 0)
    .fromTo(b.soft, { opacity: 0 }, { opacity: 0.85, duration: 0.45, ease: 'power1.out' }, 0)
    .to(b.soft, { opacity: 0, duration: 0.5, ease: 'power1.in' }, 0.5)
    .fromTo(b.sharp, { opacity: 0 }, { opacity: 1, duration: 0.7, ease: 'power1.inOut' }, 0.3);

  // Time-based, not scrubbed, so the form is never left half-lit.
  const form = document.querySelector('.form');
  const items = form.querySelectorAll(
    ':scope > .group:not(.form__more) > .group__title, :scope > .group:not(.form__more) .field, :scope > .more, :scope > .form__send',
  );
  const reveal = gsap
    .timeline({ paused: true })
    .fromTo(items, { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: 1.8, stagger: 0.08, ease: 'power2.out', clearProps: 'transform' });
  ScrollTrigger.create({ trigger: form, start: 'top 85%', once: true, onEnter: () => reveal.play() });

  // Keyboard users can arrive before the form has faded up.
  const lightNow = () => reveal.progress(1);
  form.addEventListener('focusin', lightNow);
  return { cleanup: () => form.removeEventListener('focusin', lightNow) };
}

/*
 * Depth comes from three layers only: the stars barely move, the horizon glow and grain drift at
 * mid speed, the text (driven above) moves most. The trail draws with the whole way down to the brief.
 */
function depth(vh) {
  gsap
    .timeline({
      defaults: { ease: 'none', duration: 1 },
      scrollTrigger: { start: 0, end: 'max', scrub: 1.3, invalidateOnRefresh: true },
    })
    .fromTo('.stars', { y: 0 }, { y: vh(-6) }, 0)
    .fromTo('.mid', { y: 0 }, { y: vh(-24) }, 0);

  gsap.fromTo(
    '.trail__beam',
    { scaleY: 0.03 },
    {
      scaleY: 1,
      ease: 'none',
      scrollTrigger: { trigger: '.brief', start: 0, end: 'top 35%', scrub: 1.3, invalidateOnRefresh: true },
    },
  );
}

/* Hero video (only present when public/hero.mp4 exists): loads after the page is idle, plays only in the hero. */
function heroVideo(end) {
  const video = document.querySelector('.atmos__video');
  if (!video || navigator.connection?.saveData) return;

  let inHero = true;
  const play = () => {
    if (video.src && inHero) video.play().catch(() => {});
  };
  const load = () => {
    if (!video.src) video.src = video.dataset.src;
    if (inHero) play();
    else video.pause(); // cancels the pending autoplay once the hero is gone
  };
  const whenIdle = () => (window.requestIdleCallback ? requestIdleCallback(load, { timeout: 2500 }) : setTimeout(load, 800));
  if (document.readyState === 'complete') whenIdle();
  else window.addEventListener('load', whenIdle, { once: true });

  ScrollTrigger.create({
    start: -1,
    end,
    onToggle: (self) => {
      inHero = self.isActive;
      if (inHero) play();
      else video.pause();
    },
  });
}

/* ── Reduced motion: stacked scenes, fades only ───────────────────────── */

function still() {
  // The hero is on screen from the first paint, so it simply stays.
  const faders = [
    ...document.querySelectorAll('.scene:not(.scene--hero) .scene__text, .scene--price .price, .brief__title, .form'),
  ];
  faders.forEach((el) => el.classList.add('rm-fade'));
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      }
    },
    { rootMargin: '0px 0px -8% 0px' },
  );
  faders.forEach((el) => io.observe(el));

  // A hero poster, if there is one, stays with the hero.
  const media = document.querySelector('.atmos__media');
  const poster =
    media &&
    new IntersectionObserver(([entry]) => media.classList.toggle('is-gone', !entry.isIntersecting), { threshold: 0.2 });
  poster?.observe(document.querySelector('.scene--hero'));

  return () => {
    io.disconnect();
    poster?.disconnect();
    faders.forEach((el) => el.classList.remove('rm-fade', 'is-in'));
    media?.classList.remove('is-gone');
  };
}

/* ── The sky: a sparse, still star field, painted once per size ───────── */

function stars() {
  const canvas = document.querySelector('.stars');
  const ctx = canvas?.getContext('2d');
  if (!ctx) return;

  let painted = '';
  const paint = () => {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const size = `${width}x${height}`;
    if (!width || !height || size === painted) return;
    painted = size;

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Seeded, so the sky is the same on every visit and every resize.
    const random = seeded(475);
    const count = Math.round(Math.min(160, Math.max(40, (width * height) / 11000)));
    for (let i = 0; i < count; i++) {
      const x = random() * width;
      const y = random() * height;
      const r = 0.35 + random() ** 3 * 0.85;
      ctx.globalAlpha = 0.2 + random() ** 2 * 0.6;
      ctx.fillStyle = random() < 0.2 ? '#d9e2f2' : '#f1efe9';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  };

  let frame = 0;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(paint);
  });
  paint();
}

function seeded(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ── The header link: straight to the brief ───────────────────────────── */

function setupNav(env) {
  const link = document.querySelector('.masthead__link');
  const brief = document.getElementById('brief');
  if (!link || !brief) return;

  // With smooth scroll, cut to the brief rather than fly through every scene; otherwise the browser jumps.
  link.addEventListener('click', (event) => {
    if (!env.lenis) return;
    event.preventDefault();
    env.lenis.scrollTo(brief, { immediate: true });
    brief.focus({ preventScroll: true });
  });
}

/* ── The form ─────────────────────────────────────────────────────────── */

function setupBrief(env) {
  const form = document.getElementById('brief-form');
  if (!form) return;

  // The email uses the field's name only, never the "required" marker beside it.
  const labelFor = (input) => {
    const label = form.querySelector(`label[for="${input.id}"]`);
    return (label.querySelector('.field__name') ?? label).textContent.trim();
  };

  const fields = [...form.querySelectorAll('.field__input')].map((input) => ({
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
    field.msg.textContent = message;
    if (message) field.input.setAttribute('aria-invalid', 'true');
    else field.input.removeAttribute('aria-invalid');
    return !message;
  };

  // Check a field once it has something in it; after an error, re-check as they type.
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
    if (open) env.reveal(extra.querySelectorAll('.group__title, .field'), 0.06);
    ScrollTrigger.refresh();
  });

  const fallback = document.getElementById('fallback');
  const status = fallback.querySelector('.fallback__status');
  const announce = document.getElementById('form-announce');
  let brief = '';

  const showFallback = () => {
    status.textContent = '';
    if (!fallback.hidden) return;
    fallback.hidden = false;
    env.reveal(fallback);
    ScrollTrigger.refresh();
    setTimeout(() => {
      announce.textContent = fallback.querySelector('.fallback__q').textContent;
    }, 600);
  };

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const invalid = required.filter((field) => !validate(field));
    if (invalid.length) {
      env.focus(invalid[0].input);
      return;
    }

    byName.domain.input.value = normalizeDomain(byName.domain.input.value);
    const entries = fields.map((field) => ({
      label: field.label,
      value: clean(field.input.value, field.max),
      required: field.required,
    }));
    brief = composeBrief(entries);
    window.location.href = mailtoHref(subjectFor(clean(byName.business.input.value)), brief);
    showFallback();
  });

  fallback.querySelector('.fallback__copy').addEventListener('click', async () => {
    status.textContent = (await copyText(brief)) ? 'Copied.' : 'Copy was blocked by the browser.';
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

// The guard lets scripts/check-brief.mjs import the brief functions outside a browser.
if (typeof document !== 'undefined') boot();
