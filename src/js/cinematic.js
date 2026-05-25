/* ============================================================
   Cinema — Cinematic Motion System
   Library: GSAP 3 + ScrollTrigger (CDN) + Lenis (CDN)

   Mechanics implemented:
   ✓ Lenis smooth scroll tied to GSAP ticker
   ✓ Scroll progress bar (scaleX scrub)
   ✓ Custom cursor (lag-tracked crosshair)
   ✓ Hero: intro stagger + camera push-out (scroll-linked scale)
   ✓ Pinned transform scene: GSAP timeline driven by scrub
       pin: true, scrub: 1.5, 4 cross-fade stages with scale+blur
   ✓ Horizontal reel: gsap.to(track) x-translate, pin + scrub
   ✓ Problem section scroll reveal
   ✓ Experience parallax (browser + cap-cards)
   ✓ Pipeline: fill rail + sequential node activation
   ✓ Process: spine scrub-draw + item reveals
   ✓ Packages: card reveals + 3-D tilt on hover
   ✓ Finale: glow + beam + text entrance
   ✓ Magnetic buttons
   ✓ prefers-reduced-motion guard on every animation
   ============================================================ */

(function () {
  'use strict';

  var R = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── Utilities ──────────────────────────────────────────────── */

  /* Poll until GSAP + ScrollTrigger are available, then call cb */
  function whenGSAP(cb) {
    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
      cb();
    } else {
      var t = setInterval(function () {
        if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
          clearInterval(t);
          cb();
        }
      }, 40);
    }
  }

  function qs(sel) { return document.querySelector(sel); }
  function qsa(sel) { return Array.from(document.querySelectorAll(sel)); }

  /* ── 1. Lenis smooth scroll ─────────────────────────────────── */
  function initLenis() {
    if (typeof Lenis === 'undefined' || R) return;
    var lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  /* ── 2. Scroll progress bar ─────────────────────────────────── */
  function initProgressBar() {
    var bar = document.getElementById('scroll-progress');
    if (!bar) return;
    gsap.set(bar, { scaleX: 0, transformOrigin: 'left center' });
    ScrollTrigger.create({
      trigger: document.body,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0,
      onUpdate: function (self) {
        gsap.set(bar, { scaleX: self.progress });
      }
    });
  }

  /* ── 3. Custom cursor ───────────────────────────────────────── */
  function initCursor() {
    if (R || window.matchMedia('(pointer: coarse)').matches) return;

    var el = document.createElement('div');
    el.className = 'c-cursor';
    document.body.appendChild(el);

    var mx = -200, my = -200, cx = mx, cy = my;

    document.addEventListener('mousemove', function (e) { mx = e.clientX; my = e.clientY; });
    document.addEventListener('mouseleave', function () { gsap.to(el, { opacity: 0, duration: 0.25 }); });
    document.addEventListener('mouseenter', function () { gsap.to(el, { opacity: 1,  duration: 0.25 }); });

    /* Lag-tracked position using GSAP ticker */
    gsap.ticker.add(function () {
      cx += (mx - cx) * 0.11;
      cy += (my - cy) * 0.11;
      gsap.set(el, { x: cx, y: cy });
    });

    /* Hover expansion on interactive elements */
    qsa('a, button, [role="button"], label, select').forEach(function (node) {
      node.addEventListener('mouseenter', function () { el.classList.add('is-hover'); });
      node.addEventListener('mouseleave', function () { el.classList.remove('is-hover'); });
    });
  }

  /* ── 4. Hero: intro stagger + scroll-linked camera push ─────── */
  function initHero() {
    var video   = document.getElementById('hero-video');
    var bg      = qs('.s-opening__video-bg');
    var eyebrow = qs('.s-opening .scene-eyebrow');
    var h1      = qs('.s-opening__headline');
    var sub     = qs('.s-opening__sub');
    var cta     = qs('.s-opening__cta');
    var panels  = qsa('.ui-panel');
    var scroller= qs('.s-opening__scroll');
    var section = qs('.s-opening');

    /* Video fallback */
    if (video) {
      var fallbackTimer = setTimeout(function () {
        if (video.readyState < 2 && bg) bg.classList.add('s-opening__video-bg--fallback');
      }, 3000);
      video.addEventListener('canplay', function () { clearTimeout(fallbackTimer); });
      video.addEventListener('error',   function () { if (bg) bg.classList.add('s-opening__video-bg--fallback'); });
    }

    if (R) return;

    /* Camera push-in: video starts slightly zoomed and relaxes on scroll */
    if (video) {
      gsap.set(video, { scale: 1.14, transformOrigin: 'center center' });
      gsap.to(video, {
        scale: 1.0,
        ease: 'none',
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: 'bottom top',
          scrub: 2
        }
      });
    }

    /* Intro stagger */
    var els = [eyebrow, h1, sub, cta].filter(Boolean);
    gsap.set(els, { opacity: 0, y: 36 });
    if (panels.length) gsap.set(panels, { opacity: 0, x: 50 });
    if (scroller) gsap.set(scroller, { opacity: 0 });

    var tl = gsap.timeline({ delay: 0.25 });
    els.forEach(function (el, i) {
      tl.to(el, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }, i * 0.12);
    });
    if (panels.length) {
      tl.to(panels, { opacity: 1, x: 0, duration: 0.65, ease: 'power3.out', stagger: 0.14 }, 0.45);
    }
    if (scroller) {
      tl.to(scroller, { opacity: 1, duration: 1 }, 0.9);
    }

    /* Hero parallax: text scrolls up faster than viewport */
    var heroInner = qs('.s-opening__inner');
    if (heroInner) {
      gsap.to(heroInner, {
        y: -80,
        ease: 'none',
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: 'bottom top',
          scrub: 1.2
        }
      });
    }
  }

  /* ── 5. Pinned transform scene (GSAP timeline + scrub) ───────── */
  function initTransformScene() {
    var section = qs('.s-transform');
    var wrap    = document.getElementById('transform-wrap');
    if (!section || !wrap) return;

    var layers = qsa('.t-layer');   /* 4 visual mockup layers */
    var copies = qsa('.t-copy');    /* 4 copy panels */
    var fill   = document.getElementById('t-progress-fill');
    var dots   = qsa('.t-progress__dot');

    if (!layers.length || !copies.length) return;

    /* ── Set all to starting state — GSAP owns these from here ── */
    /* Layer 0 starts visible; 1-3 start hidden */
    layers.forEach(function (l, i) {
      gsap.set(l, {
        opacity: i === 0 ? 1 : 0,
        scale:   i === 0 ? 1 : 0.95,
        filter:  'blur(0px)'
      });
    });

    /* Copy 0 starts visible; 1-3 start hidden */
    copies.forEach(function (c, i) {
      gsap.set(c, { opacity: i === 0 ? 1 : 0, y: i === 0 ? 0 : 28 });
    });

    if (R) {
      /* Reduced motion: show final state immediately */
      gsap.set(layers[layers.length - 1], { opacity: 1, scale: 1, filter: 'blur(0px)' });
      gsap.set(copies[copies.length - 1], { opacity: 1, y: 0 });
      layers.slice(0, -1).forEach(function (l) { gsap.set(l, { opacity: 0 }); });
      copies.slice(0, -1).forEach(function (c) { gsap.set(c, { opacity: 0 }); });
      if (dots.length) dots.forEach(function (d) { d.classList.add('t-progress__dot--active'); });
      return;
    }

    /* ── Build master timeline (3 cross-fade transitions: 0→1, 1→2, 2→3) ─ */
    var tl = gsap.timeline();
    var segDur = 1; /* duration in timeline "seconds" per transition */

    for (var i = 0; i < layers.length - 1; i++) {
      var pos = i * segDur;

      /* Current layer blurs out and scales up */
      tl.to(layers[i], {
        opacity: 0,
        scale: 1.06,
        filter: 'blur(7px)',
        duration: segDur * 0.55,
        ease: 'power2.in'
      }, pos);

      /* Next layer materializes from slightly-small + blurred */
      tl.fromTo(layers[i + 1],
        { opacity: 0, scale: 0.94, filter: 'blur(7px)' },
        { opacity: 1, scale: 1,    filter: 'blur(0px)', duration: segDur * 0.65, ease: 'power2.out' },
        pos + segDur * 0.35
      );

      /* Current copy slides up and fades */
      tl.to(copies[i], {
        opacity: 0, y: -28,
        duration: segDur * 0.4, ease: 'power2.in'
      }, pos);

      /* Next copy rises in */
      tl.fromTo(copies[i + 1],
        { opacity: 0, y: 28 },
        { opacity: 1, y: 0, duration: segDur * 0.5, ease: 'power3.out' },
        pos + segDur * 0.45
      );
    }

    /* ── Pin + scrub the timeline to scroll ─── */
    ScrollTrigger.create({
      trigger: section,
      start: 'top top',
      end: '+=' + (window.innerHeight * 4),  /* 4× viewport scroll */
      pin: wrap,
      pinSpacing: true,
      scrub: 1.5,
      animation: tl,
      onUpdate: function (self) {
        /* Update progress dots and fill bar */
        var stage = Math.min(layers.length - 1, Math.floor(self.progress * layers.length));
        if (fill) fill.style.height = (self.progress * 100) + '%';
        dots.forEach(function (d, di) {
          d.classList.toggle('t-progress__dot--active', di <= stage);
        });
      }
    });
  }

  /* ── 6. Horizontal reel (film-card slide with pin + scrub) ──── */
  function initHorizontalReel() {
    var section  = qs('.s-reel');
    var pinEl    = document.getElementById('reel-pin');
    var track    = document.getElementById('reel-track');
    var progFill = document.getElementById('reel-progress');

    if (!section || !pinEl || !track) return;

    /* Header text entrance */
    var hdr = qs('.reel__hdr');
    if (hdr && !R) {
      gsap.from(hdr.children, {
        opacity: 0, y: 22, duration: 0.75, ease: 'power3.out', stagger: 0.12,
        scrollTrigger: { trigger: hdr, start: 'top 80%', once: true }
      });
    }

    if (R) {
      /* No horizontal scroll for reduced-motion — show as vertical grid */
      track.style.flexWrap = 'wrap';
      track.style.paddingBlock = '2rem';
      return;
    }

    /* Film cards: entrance fade before horizontal scroll begins */
    var cards = qsa('.film-card');
    gsap.set(cards, { opacity: 0, y: 30 });
    gsap.to(cards, {
      opacity: 1, y: 0,
      duration: 0.65, ease: 'power3.out', stagger: 0.07,
      scrollTrigger: { trigger: section, start: 'top 80%', once: true }
    });

    /* ── Horizontal scroll ── */
    /* Scroll distance = total track width minus the visible viewport */
    var getTotalX = function () {
      return track.scrollWidth - window.innerWidth;
    };

    gsap.to(track, {
      x: function () { return -getTotalX(); },
      ease: 'none',
      scrollTrigger: {
        trigger: section,
        pin: pinEl,
        start: 'top top',
        end: function () { return '+=' + getTotalX(); },
        scrub: 0.8,
        invalidateOnRefresh: true,
        onUpdate: function (self) {
          if (progFill) progFill.style.width = (self.progress * 100) + '%';
        }
      }
    });
  }

  /* ── 7. Problem section reveal ──────────────────────────────── */
  function initProblemReveal() {
    if (R) return;
    var mockup = qs('.s-problem__mockup');
    var copy   = qs('.s-problem__copy');
    var warns  = qsa('.flat-warn');
    var pts    = qsa('.prob-pt');

    if (mockup) {
      gsap.from(mockup, {
        opacity: 0, x: -50, duration: 1, ease: 'power3.out',
        scrollTrigger: { trigger: mockup, start: 'top 78%', once: true }
      });
    }
    if (copy) {
      gsap.from(qsa('.s-problem__copy .scene-eyebrow, .s-problem__copy .scene-title, .s-problem__copy .scene-sub'), {
        opacity: 0, y: 26, duration: 0.8, ease: 'power3.out', stagger: 0.13,
        scrollTrigger: { trigger: copy, start: 'top 78%', once: true }
      });
    }
    if (warns.length) {
      gsap.from(warns, {
        opacity: 0, scale: 0.65, duration: 0.45, ease: 'back.out(2)', stagger: 0.2,
        scrollTrigger: { trigger: warns[0], start: 'top 75%', once: true }
      });
    }
    if (pts.length) {
      gsap.from(pts, {
        opacity: 0, x: 24, duration: 0.65, ease: 'power3.out', stagger: 0.16,
        scrollTrigger: { trigger: pts[0], start: 'top 82%', once: true }
      });
    }
  }

  /* ── 8. Experience parallax ─────────────────────────────────── */
  function initExperience() {
    if (R) return;
    var browser  = document.getElementById('exp-browser');
    var capCards = qsa('.cap-card');
    var header   = qs('.s-experience .scene-header');

    if (header) {
      gsap.from(qsa('.s-experience .scene-eyebrow, .s-experience .scene-title, .s-experience .scene-sub'), {
        opacity: 0, y: 28, duration: 0.85, ease: 'power3.out', stagger: 0.13,
        scrollTrigger: { trigger: header, start: 'top 80%', once: true }
      });
    }

    if (browser) {
      gsap.from(browser, {
        opacity: 0, y: 70, scale: 0.95, duration: 1.1, ease: 'power3.out',
        scrollTrigger: { trigger: browser, start: 'top 80%', once: true }
      });
      /* Continuous parallax drift upward */
      gsap.to(browser, {
        y: -50, ease: 'none',
        scrollTrigger: {
          trigger: '.s-experience',
          start: 'top bottom', end: 'bottom top',
          scrub: 1.8
        }
      });
    }

    capCards.forEach(function (card, i) {
      var dir = i % 2 === 0 ? 1 : -1;
      gsap.from(card, {
        opacity: 0, x: dir * 35, y: 18, duration: 0.72, ease: 'power3.out',
        scrollTrigger: { trigger: card, start: 'top 88%', once: true }
      });
      /* Each card drifts at different speed */
      gsap.to(card, {
        y: dir * 24, ease: 'none',
        scrollTrigger: {
          trigger: '.s-experience',
          start: 'top bottom', end: 'bottom top',
          scrub: 0.9 + i * 0.28
        }
      });
    });
  }

  /* ── 9. Animated pipeline ───────────────────────────────────── */
  function initPipeline() {
    var wrap   = document.getElementById('pipeline-wrap');
    var fill   = document.getElementById('pipeline-fill');
    var nodes  = qsa('.p-node');
    var alertEl = document.getElementById('pl-alert');
    var savedEl = document.getElementById('pl-saved');

    if (!wrap || !fill) return;

    /* Header */
    var hdr = qs('.s-pipeline .scene-header');
    if (hdr && !R) {
      gsap.from(qsa('.s-pipeline .scene-eyebrow, .s-pipeline .scene-title, .s-pipeline .scene-sub'), {
        opacity: 0, y: 24, duration: 0.85, ease: 'power3.out', stagger: 0.13,
        scrollTrigger: { trigger: hdr, start: 'top 80%', once: true }
      });
    }

    if (R) {
      fill.style.width = '100%';
      nodes.forEach(function (n) { n.classList.add('is-active'); });
      if (alertEl) alertEl.style.opacity = '1';
      if (savedEl) savedEl.style.opacity = '1';
      return;
    }

    /* Initial states */
    gsap.set(fill, { width: '0%' });
    if (alertEl) gsap.set(alertEl, { opacity: 0, y: 20 });
    if (savedEl) gsap.set(savedEl, { opacity: 0, y: 20 });

    var nodeDur = 0.38; /* time per node */
    var totalFillDur = nodes.length * nodeDur;

    var tl = gsap.timeline({
      scrollTrigger: { trigger: wrap, start: 'top 60%', once: true }
    });

    /* Rail fills left to right */
    tl.to(fill, { width: '100%', duration: totalFillDur, ease: 'power1.inOut' });

    /* Each node activates after rail passes it */
    nodes.forEach(function (node, i) {
      tl.call(function () { node.classList.add('is-active'); }, null, i * nodeDur + 0.1);
    });

    /* Alert card slides in at step 3, saved at step 4 */
    if (alertEl) {
      tl.to(alertEl, { opacity: 1, y: 0, duration: 0.55, ease: 'back.out(1.5)' }, 3 * nodeDur + 0.05);
    }
    if (savedEl) {
      tl.to(savedEl, { opacity: 1, y: 0, duration: 0.55, ease: 'back.out(1.5)' }, 4 * nodeDur + 0.05);
    }
  }

  /* ── 10. Process spine scrub + item reveals ─────────────────── */
  function initProcessTimeline() {
    var spine   = document.getElementById('process-spine');
    var items   = qsa('.pt-item');
    var section = qs('.s-process');
    if (!section) return;

    /* Header */
    var hdr = section.querySelector('.scene-header');
    if (hdr && !R) {
      gsap.from(hdr.querySelectorAll('.scene-eyebrow, .scene-title'), {
        opacity: 0, y: 24, duration: 0.85, ease: 'power3.out', stagger: 0.13,
        scrollTrigger: { trigger: hdr, start: 'top 80%', once: true }
      });
    }

    if (R) {
      if (spine) spine.style.height = '100%';
      items.forEach(function (it) { it.classList.add('is-visible'); });
      return;
    }

    /* Spine draws as section scrolls by */
    if (spine) {
      var timeline = section.querySelector('.process-timeline') || section;
      gsap.fromTo(spine,
        { height: '0%' },
        {
          height: '100%', ease: 'none',
          scrollTrigger: {
            trigger: timeline,
            start: 'top 72%',
            end: 'bottom 55%',
            scrub: 1
          }
        }
      );
    }

    /* Each item reveals from right as spine reaches it */
    items.forEach(function (item) {
      ScrollTrigger.create({
        trigger: item,
        start: 'top 80%',
        once: true,
        onEnter: function () {
          item.classList.add('is-visible');
          gsap.from(item, { opacity: 0, x: 32, duration: 0.75, ease: 'power3.out' });
        }
      });
    });
  }

  /* ── 11. Package card reveals + 3-D tilt ───────────────────── */
  function initPackages() {
    var section = qs('.s-packages');
    if (!section) return;

    if (!R) {
      var hdr = section.querySelector('.scene-header');
      if (hdr) {
        gsap.from(hdr.querySelectorAll('.scene-eyebrow, .scene-title, .scene-sub'), {
          opacity: 0, y: 26, duration: 0.85, ease: 'power3.out', stagger: 0.13,
          scrollTrigger: { trigger: hdr, start: 'top 80%', once: true }
        });
      }

      var cards = section.querySelectorAll('.pkg');
      if (cards.length) {
        gsap.from(cards, {
          opacity: 0, y: 55, scale: 0.96, duration: 0.95, ease: 'power3.out', stagger: 0.18,
          scrollTrigger: { trigger: cards[0], start: 'top 82%', once: true }
        });
      }
    }

    /* 3-D tilt on hover (desktop only) */
    if (!window.matchMedia('(pointer: coarse)').matches) {
      section.querySelectorAll('.pkg').forEach(function (card) {
        card.addEventListener('mousemove', function (e) {
          var r = card.getBoundingClientRect();
          var rx = (e.clientX - r.left) / r.width  - 0.5;
          var ry = (e.clientY - r.top)  / r.height - 0.5;
          gsap.to(card, {
            rotateY: rx * 9,
            rotateX: -ry * 7,
            transformPerspective: 1000,
            duration: 0.4,
            ease: 'power2.out'
          });
        });
        card.addEventListener('mouseleave', function () {
          gsap.to(card, { rotateY: 0, rotateX: 0, duration: 0.6, ease: 'power2.out' });
        });
      });
    }
  }

  /* ── 12. Request form reveal ────────────────────────────────── */
  function initRequest() {
    if (R) return;
    var section = qs('.s-request');
    if (!section) return;

    var hdr = section.querySelector('.scene-header');
    if (hdr) {
      gsap.from(hdr.querySelectorAll('*'), {
        opacity: 0, y: 22, duration: 0.78, ease: 'power3.out', stagger: 0.1,
        scrollTrigger: { trigger: hdr, start: 'top 80%', once: true }
      });
    }

    var groups = section.querySelectorAll('.req-group');
    if (groups.length) {
      gsap.from(groups, {
        opacity: 0, y: 30, duration: 0.7, ease: 'power3.out', stagger: 0.12,
        scrollTrigger: { trigger: groups[0], start: 'top 82%', once: true }
      });
    }
  }

  /* ── 13. Finale entrance ────────────────────────────────────── */
  function initFinale() {
    if (R) return;
    var section = qs('.s-finale');
    if (!section) return;

    var glow     = section.querySelector('.s-finale__glow');
    var beam     = section.querySelector('.s-finale__beam');
    var headline = section.querySelector('.s-finale__headline');
    var cta      = section.querySelector('.btn');

    if (glow) gsap.set(glow, { opacity: 0, scale: 0.4 });
    if (beam) gsap.set(beam, { opacity: 0, scaleY: 0, transformOrigin: 'top center' });

    var tl = gsap.timeline({
      scrollTrigger: { trigger: section, start: 'top 68%', once: true }
    });

    if (glow) tl.to(glow, { opacity: 1, scale: 1, duration: 1.5, ease: 'power3.out' });
    if (beam) tl.to(beam, { opacity: 1, scaleY: 1, duration: 1, ease: 'power3.out' }, '-=1.1');

    var textEls = [headline, cta].filter(Boolean);
    if (textEls.length) {
      gsap.set(textEls, { opacity: 0, y: 36 });
      tl.to(textEls, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', stagger: 0.18 }, '-=0.75');
    }
  }

  /* ── 14. Magnetic buttons ───────────────────────────────────── */
  function initMagneticButtons() {
    if (R || window.matchMedia('(pointer: coarse)').matches) return;
    qsa('.btn--cinema.btn--xl, .btn--cinema.btn--lg').forEach(function (btn) {
      btn.addEventListener('mousemove', function (e) {
        var r = btn.getBoundingClientRect();
        var x = (e.clientX - r.left - r.width  / 2) * 0.2;
        var y = (e.clientY - r.top  - r.height / 2) * 0.2;
        gsap.to(btn, { x: x, y: y, duration: 0.35, ease: 'power2.out' });
      });
      btn.addEventListener('mouseleave', function () {
        gsap.to(btn, { x: 0, y: 0, duration: 0.55, ease: 'elastic.out(1, 0.48)' });
      });
    });
  }

  /* ── Init ───────────────────────────────────────────────────── */
  function init() {
    /* Cursor doesn't need GSAP so init immediately */
    initCursor();

    /* Everything else waits for GSAP + ScrollTrigger CDNs to load */
    whenGSAP(function () {
      gsap.registerPlugin(ScrollTrigger);

      initLenis();
      initProgressBar();
      initHero();
      initTransformScene();
      initHorizontalReel();
      initProblemReveal();
      initExperience();
      initPipeline();
      initProcessTimeline();
      initPackages();
      initRequest();
      initFinale();
      initMagneticButtons();

      /* Refresh after all ScrollTriggers are created so positions are correct */
      ScrollTrigger.refresh();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
