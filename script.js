/*
 * Landing Page Rocket
 *
 * Scenes 1–4 share one sticky stage driven by a single scrubbed timeline; scene 5 is the
 * brief. Motion is transform and opacity only: a focus pull is a crossfade between each
 * line and a pre-blurred twin, so `filter` is never animated.
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

let introPlayed = false;

function boot() {
  document.documentElement.classList.add('is-ready');
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });

  const lines = prepareLines();
  const env = {
    lenis: null,
    motion: false,
    marks: () => [],
    focus(input) {
      input.focus({ preventScroll: true });
      if (this.lenis) this.lenis.scrollTo(input, { offset: -window.innerHeight * 0.3, duration: 1.2 });
      else input.scrollIntoView({ block: 'center' });
    },
    reveal(targets, stagger = 0) {
      if (this.motion) {
        gsap.fromTo(targets, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 1.1, stagger, ease: 'power2.out', clearProps: 'transform' });
      } else {
        gsap.fromTo(targets, { opacity: 0 }, { opacity: 1, duration: 0.8, stagger, ease: 'power1.out' });
      }
    },
  };

  setupBrief(env);
  setupReel(env);

  const mm = gsap.matchMedia();
  mm.add('(prefers-reduced-motion: no-preference)', () => film(env, lines));
  mm.add('(prefers-reduced-motion: reduce)', () => still(env));

  document.fonts?.ready.then(() => ScrollTrigger.refresh());
}

/* Wrap every line in a focus pair: the sharp line and an aria-hidden, pre-blurred twin. */
function prepareLines() {
  const hero = document.querySelector('[data-line="hero"]');
  if (hero) splitWords(hero);

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

function splitWords(el) {
  const words = el.textContent.trim().split(/\s+/);
  el.replaceChildren(
    ...words.flatMap((word, i) => {
      const span = document.createElement('span');
      span.className = 'w';
      span.textContent = word;
      return i ? [' ', span] : [span];
    }),
  );
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function fontsReady(timeout) {
  const fonts = document.fonts
    ? Promise.all([
        document.fonts.load('400 1em "Instrument Serif"'),
        document.fonts.load('400 1em "Geist Variable"'),
      ]).catch(() => {})
    : Promise.resolve();
  return Promise.race([fonts, wait(timeout)]);
}

/* ── The film (full motion) ───────────────────────────────────────────── */

function film(env, L) {
  window.scrollTo(0, 0);

  const lenis = new Lenis({ lerp: 0.075, wheelMultiplier: 0.9 });
  const raf = (time) => lenis.raf(time * 1000);
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(raf);
  gsap.ticker.lagSmoothing(0);
  env.lenis = lenis;
  env.motion = true;

  const vh = (n) => () => (window.innerHeight * n) / 100;
  const state = { alive: true };

  intro(L, state);
  const { T, toScroll } = timeline(L, vh);
  const lights = lightsUp(L, vh);
  heroVideo(() => toScroll(T.heroGone));
  const stopAmbient = ambient();
  const stopDust = window.matchMedia('(min-width: 768px)').matches ? dust() : () => {};

  env.marks = () => [T.own, T.trial, T.sub].map(toScroll).concat(lights.scrollTrigger.end);
  ScrollTrigger.refresh();

  return () => {
    state.alive = false;
    stopDust();
    stopAmbient();
    lights.cleanup();
    gsap.ticker.remove(raf);
    lenis.destroy();
    env.lenis = null;
    env.motion = false;
    env.marks = () => [];
  };
}

/*
 * Black frame → bars open to 2.39:1 → light comes up → the h1 resolves word by word → scroll cue.
 * The h1 is already painted under the closed bars; its words are hidden here, before the bars open.
 */
function intro(L, state) {
  const root = document.documentElement;
  const hero = L.hero;
  const sharp = hero.sharp.querySelectorAll('.w');
  const soft = hero.soft.querySelectorAll('.w');
  gsap.set([hero.sharp, hero.soft], { opacity: 1 });

  if (introPlayed) {
    gsap.set(sharp, { opacity: 1 });
    gsap.set(soft, { opacity: 0 });
    gsap.set('.cue__inner', { opacity: 1 });
    root.classList.add('is-open');
    return;
  }

  gsap.set([...sharp, ...soft], { opacity: 0 });
  gsap.fromTo('.atmos', { opacity: 0 }, { opacity: 1, duration: 3, delay: 0.2, ease: 'power1.inOut' });
  gsap.delayedCall(0.2, () => root.classList.add('is-open'));

  const words = gsap
    .timeline({ paused: true, onComplete: () => { introPlayed = true; } })
    .fromTo(hero.focus, { scale: 1.04 }, { scale: 1, duration: 3.4, ease: 'power2.out' }, 0)
    .to(soft, { opacity: 0.9, duration: 0.7, stagger: 0.14, ease: 'power1.out' }, 0)
    .to(sharp, { opacity: 1, duration: 1.4, stagger: 0.14, ease: 'power2.inOut' }, 0.25)
    .to(soft, { opacity: 0, duration: 1.2, stagger: 0.14, ease: 'power1.inOut' }, 0.75)
    .to('.cue__inner', { opacity: 1, duration: 1.8, ease: 'power1.inOut' }, 2.4);

  Promise.all([fontsReady(1500), wait(1000)]).then(() => {
    if (state.alive) words.play();
  });
}

/* Scenes 1–4. Positions are in beats; the whole timeline maps onto the film's scroll length. */
function timeline(L, vh) {
  const T = {
    heroOut: 0.6,
    own: 0.95,
    keep: 2.15,
    ownOut: 3.45,
    trial: 3.8,
    trialOut: 5.2,
    sub: 5.55,
    subOut: 6.95,
    price: 7.7, // the subscription line is fully gone here: the price lands alone
    fee: 9.5, // a full beat of scroll holds the price on its own first
    priceOut: 10.8,
    end: 11.8,
  };
  T.heroGone = T.heroOut + 0.9;

  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: { trigger: '.film', start: 'top top', end: 'bottom bottom', scrub: 1, invalidateOnRefresh: true },
  });

  const box = (line) => line.focus.closest('.scene__title, .price');

  // Resolve from soft focus: the blurred twin swells, the sharp line arrives through it.
  const enter = (line, at, d = 0.8, glow = 0) => {
    tl.fromTo(line.focus, { y: vh(9), scale: 1.035 }, { y: 0, scale: 1, duration: d, ease: 'power2.out', immediateRender: false }, at)
      .fromTo(line.soft, { opacity: 0 }, { opacity: 0.85, duration: d * 0.45, ease: 'power1.out', immediateRender: false }, at)
      .to(line.soft, { opacity: glow, duration: d * 0.5, ease: 'power1.in' }, at + d * 0.5)
      .fromTo(line.sharp, { opacity: 0 }, { opacity: 1, duration: d * 0.7, ease: 'power1.inOut', immediateRender: false }, at + d * 0.3);
  };

  // Blur out: the sharp line sinks under its twin, then the twin goes too.
  const leave = (line, at, d = 0.75, soft = line.soft) => {
    tl.to(line.focus, { scale: 0.985, duration: d, ease: 'power1.in' }, at)
      .to(line.sharp, { opacity: 0, duration: d * 0.65, ease: 'power1.in' }, at)
      .to(soft, { opacity: 0.7, duration: d * 0.35, ease: 'power1.out' }, at)
      .to(soft, { opacity: 0, duration: d * 0.55, ease: 'power1.in' }, at + d * 0.45);
  };

  // Foreground depth: the scene's text drifts up while it holds, then lifts away as it leaves.
  const drift = (el, from, out, d = 0.75, startY = 3) => {
    tl.fromTo(el, { y: vh(startY) }, { y: vh(-3), duration: out - from, immediateRender: false }, from)
      .to(el, { y: vh(-15), duration: d, ease: 'power1.in' }, out);
  };

  // 1 — We build a cinematic landing page.
  drift(box(L.hero), 0, T.heroOut, 0.75, 0);
  leave(L.hero, T.heroOut, 0.75, L.hero.soft.querySelectorAll('.w'));

  // 2 — The client owns the domain. We keep the page.
  enter(L.own, T.own);
  enter(L.keep, T.keep, 0.7);
  drift(box(L.own), T.own, T.ownOut);
  leave(L.own, T.ownOut);
  leave(L.keep, T.ownOut + 0.06);

  // 3 — You get seven days to keep it or drop it.
  enter(L.trial, T.trial);
  drift(box(L.trial), T.trial, T.trialOut);
  leave(L.trial, T.trialOut);

  // 4 — Then a monthly subscription… / $475 a month. / No setup fee.
  enter(L.subscription, T.sub);
  drift(box(L.subscription), T.sub, T.subOut);
  leave(L.subscription, T.subOut);
  enter(L.price, T.price, 0.9, 0.22); // keeps a faint tungsten halation while it holds
  enter(L.fee, T.fee, 0.7);
  drift(box(L.price), T.price, T.priceOut, 0.8);
  leave(L.price, T.priceOut, 0.8);
  leave(L.fee, T.priceOut + 0.05, 0.75);

  // Far depth: light drifts far slower than the text. The cue leaves with the first scroll.
  tl.fromTo('.atmos__far', { y: 0 }, { y: vh(-8), duration: T.end }, 0)
    .fromTo('.leak--a', { x: 0 }, { x: () => window.innerWidth * 0.16, duration: T.end }, 0)
    .fromTo('.leak--b', { x: 0 }, { x: () => window.innerWidth * -0.12, duration: T.end }, 0)
    .to('.cue', { opacity: 0, duration: 0.3 }, 0.08);

  const media = document.querySelector('.atmos__media');
  if (media) {
    tl.fromTo(media, { scale: 1 }, { scale: 1.12, duration: T.heroGone }, 0)
      .to(media, { opacity: 0, duration: 0.6 }, T.heroOut + 0.1);
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
  live('.scene--1', 0, T.heroGone);
  live('.scene--2', T.own - 0.1, T.ownOut + 0.9);
  live('.scene--3', T.trial - 0.1, T.trialOut + 0.85);
  live('.scene--4', T.sub - 0.1, T.end);

  return { T, toScroll };
}

/* Scene 5: the frame settles and brightens, the heading resolves, the form fades up once. */
function lightsUp(L, vh) {
  const lights = gsap
    .timeline({
      defaults: { ease: 'none', duration: 1 },
      scrollTrigger: { trigger: '.brief', start: 'top bottom', end: 'top 20%', scrub: 1 },
    })
    .to('.frame__bars', { scaleY: 1.6, ease: 'power2.in' }, 0)
    .to('.dust', { opacity: 0 }, 0)
    .to('.atmos__far', { opacity: 0.6 }, 0)
    .to('.flare, .ghost', { opacity: 0.45 }, 0)
    .to('.vignette', { opacity: 0.55 }, 0)
    .to('.house', { opacity: 1, duration: 0.85 }, 0.15);

  const b = L.brief;
  gsap
    .timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: '.brief__title', start: 'top 92%', end: 'top 50%', scrub: 1, invalidateOnRefresh: true },
    })
    .fromTo(b.focus, { y: vh(8), scale: 1.035 }, { y: 0, scale: 1, duration: 1, ease: 'power2.out' }, 0)
    .fromTo(b.soft, { opacity: 0 }, { opacity: 0.85, duration: 0.45, ease: 'power1.out' }, 0)
    .to(b.soft, { opacity: 0, duration: 0.5, ease: 'power1.in' }, 0.5)
    .fromTo(b.sharp, { opacity: 0 }, { opacity: 1, duration: 0.7, ease: 'power1.inOut' }, 0.3);

  // Time-based, not scrubbed, so the form is never left half-lit.
  const form = document.querySelector('.form');
  const items = form.querySelectorAll(':scope > .form__grid:not(.form__more) > .field, :scope > .more, :scope > .form__send');
  const reveal = gsap
    .timeline({ paused: true })
    .fromTo(items, { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: 1.6, stagger: 0.09, ease: 'power2.out', clearProps: 'transform' });
  ScrollTrigger.create({ trigger: form, start: 'top 85%', once: true, onEnter: () => reveal.play() });

  // Keyboard users can arrive before the lights do.
  const lightNow = () => reveal.progress(1);
  form.addEventListener('focusin', lightNow);
  lights.cleanup = () => form.removeEventListener('focusin', lightNow);
  return lights;
}

/* Far layer, time-based: leaks breathe, the beam sways, the flare crosses the frame. */
function ambient() {
  const loop = { ease: 'sine.inOut', yoyo: true, repeat: -1 };
  gsap.to('.leak--a .leak__glow', { xPercent: 9, yPercent: -7, scale: 1.12, duration: 27, ...loop });
  gsap.to('.leak--a .leak__glow', { opacity: 0.62, duration: 9.5, ...loop });
  gsap.to('.leak--b .leak__glow', { xPercent: -8, yPercent: 8, scale: 0.9, duration: 33, ...loop });
  gsap.to('.leak--b .leak__glow', { opacity: 0.55, duration: 12.5, delay: 2, ...loop });
  gsap.to('.beam', { rotation: 2.4, duration: 21, ...loop });
  gsap.to('.beam', { opacity: 0.82, duration: 9, ...loop });
  gsap.to('.flare__core, .flare__halo', { opacity: 0.6, duration: 8.5, ...loop });

  // Ghosts sit on the line from the source through the frame centre, on the far side.
  const flare = document.querySelector('.flare');
  const reach = [0.45, 0.9, 1.35];
  const setFlare = [gsap.quickSetter(flare, 'x', 'px'), gsap.quickSetter(flare, 'y', 'px')];
  const setGhosts = [...document.querySelectorAll('.ghost')].map((ghost) => [
    gsap.quickSetter(ghost, 'x', 'px'),
    gsap.quickSetter(ghost, 'y', 'px'),
  ]);
  const source = { x: 0.22 };
  const place = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const sx = source.x * w;
    const sy = 0.26 * h;
    setFlare[0](sx);
    setFlare[1](sy);
    setGhosts.forEach(([setX, setY], i) => {
      setX(w / 2 + (w / 2 - sx) * reach[i]);
      setY(h / 2 + (h / 2 - sy) * reach[i]);
    });
  };
  gsap.to(source, { x: 0.78, duration: 46, ...loop, onUpdate: place });
  place();
  window.addEventListener('resize', place);
  return () => window.removeEventListener('resize', place);
}

/* Mid layer: dust motes, brightest inside the beam, moving at a fraction of the text's rate. */
function dust() {
  const canvas = document.querySelector('.dust');
  const ctx = canvas?.getContext('2d');
  if (!ctx) return () => {};

  const far = document.querySelector('.atmos__far');
  const beam = document.querySelector('.beam');
  const sprite = makeSprite();
  let width = 0;
  let height = 0;
  let motes = [];
  let cone = { x: 0.06, y: -0.06, axis: 133 };
  let lastScroll = window.scrollY;

  const spawn = () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    z: 0.3 + Math.random() * 0.7,
    vx: (Math.random() - 0.5) * 7,
    vy: -(1.5 + Math.random() * 5),
    phase: Math.random() * Math.PI * 2,
    rate: 0.35 + Math.random() * 0.8,
  });

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    motes = Array.from({ length: Math.round(Math.min(90, Math.max(36, (width * height) / 15000))) }, spawn);
    const style = getComputedStyle(beam);
    cone = {
      x: (parseFloat(style.getPropertyValue('--beam-x')) || 6) / 100,
      y: (parseFloat(style.getPropertyValue('--beam-y')) || -6) / 100,
      axis: (parseFloat(style.getPropertyValue('--beam-from')) || 116) + 17,
    };
  };

  const tick = (time, deltaMs) => {
    const scroll = window.scrollY;
    const shift = scroll - lastScroll;
    lastScroll = scroll;
    if (Number(gsap.getProperty(canvas, 'opacity')) < 0.01) return;

    const step = Math.min(deltaMs, 64) / 1000;
    // Beam apex in viewport space: .atmos__far spans 116% of the height from -8%.
    const ax = width * cone.x;
    const ay = -0.08 * height + Number(gsap.getProperty(far, 'y')) + 1.16 * height * cone.y;
    const axis = ((cone.axis + Number(gsap.getProperty(beam, 'rotation'))) * Math.PI) / 180;
    const reach = Math.hypot(width, height) * 1.25;

    ctx.clearRect(0, 0, width, height);
    for (const mote of motes) {
      mote.x += mote.vx * step;
      mote.y += mote.vy * step - shift * 0.07 * (0.5 + mote.z);
      if (mote.y < -8) mote.y += height + 16;
      else if (mote.y > height + 8) mote.y -= height + 16;
      if (mote.x < -8) mote.x += width + 16;
      else if (mote.x > width + 8) mote.x -= width + 16;

      const dx = mote.x - ax;
      const dy = mote.y - ay;
      let off = Math.abs(Math.atan2(dx, -dy) - axis);
      if (off > Math.PI) off = 2 * Math.PI - off;
      const lit = Math.max(0, 1 - off / 0.25) ** 2 * Math.max(0, 1 - Math.hypot(dx, dy) / reach);
      const alpha = (0.05 + 0.55 * lit) * (0.6 + 0.4 * Math.sin(time * mote.rate + mote.phase)) * mote.z;
      if (alpha < 0.012) continue;
      const r = (0.6 + mote.z * 1.4 + lit) * 2;
      ctx.globalAlpha = alpha;
      ctx.drawImage(sprite, mote.x - r, mote.y - r, r * 2, r * 2);
    }
    ctx.globalAlpha = 1;
  };

  resize();
  window.addEventListener('resize', resize);
  gsap.ticker.add(tick);
  return () => {
    gsap.ticker.remove(tick);
    window.removeEventListener('resize', resize);
    ctx.clearRect(0, 0, width, height);
  };
}

function makeSprite() {
  const sprite = document.createElement('canvas');
  sprite.width = sprite.height = 32;
  const g = sprite.getContext('2d');
  const glow = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  glow.addColorStop(0, 'rgba(255, 244, 228, 1)');
  glow.addColorStop(0.35, 'rgba(255, 236, 212, 0.45)');
  glow.addColorStop(1, 'rgba(255, 230, 200, 0)');
  g.fillStyle = glow;
  g.fillRect(0, 0, 32, 32);
  return sprite;
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

function still(env) {
  // The hero is on screen from the first paint, so it simply stays.
  const faders = [
    ...document.querySelectorAll('.scene:not(.scene--1) .scene__title, .price__amount, .price__fee, .brief__title, .form'),
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
  poster?.observe(document.querySelector('.scene--1'));

  env.marks = () =>
    [...document.querySelectorAll('.scene--2, .scene--3, .scene--4, .brief')].map(
      (el) => el.getBoundingClientRect().top + window.scrollY,
    );
  ScrollTrigger.refresh();

  return () => {
    io.disconnect();
    poster?.disconnect();
    faders.forEach((el) => el.classList.remove('rm-fade', 'is-in'));
    media?.classList.remove('is-gone');
    env.marks = () => [];
  };
}

/* ── The reel: a thin film timeline across the top ────────────────────── */

function setupReel(env) {
  const fill = document.querySelector('.reel__fill');
  const head = document.querySelector('.reel__head');
  const ticks = document.querySelector('.reel__ticks');
  if (!fill || !head || !ticks) return;

  gsap.fromTo(fill, { scaleX: 0 }, { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: true } });
  gsap.fromTo(
    head,
    { x: 0 },
    { x: () => window.innerWidth - 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: true, invalidateOnRefresh: true } },
  );

  ScrollTrigger.addEventListener('refresh', () => {
    const max = ScrollTrigger.maxScroll(window) || 1;
    ticks.replaceChildren(
      ...env.marks().map((at) => {
        const tick = document.createElement('i');
        tick.className = 'reel__tick';
        tick.style.left = `${Math.min(100, (at / max) * 100)}%`;
        return tick;
      }),
    );
  });
}

/* ── The form ─────────────────────────────────────────────────────────── */

function setupBrief(env) {
  const form = document.getElementById('brief-form');
  if (!form) return;

  const fields = [...form.querySelectorAll('.field__input')].map((input) => ({
    input,
    name: input.name,
    label: form.querySelector(`label[for="${input.id}"]`).textContent.trim(),
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
    if (open) env.reveal(extra.children, 0.06);
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
