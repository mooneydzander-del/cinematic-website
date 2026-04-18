/* ============================================================
   Cinema — Cinematic Effects
   Requires: GSAP 3 + ScrollTrigger, Lenis (both via CDN)

   Effects:
     1. Lenis smooth scroll (tied to GSAP ticker)
     2. Gold scroll-progress bar
     3. Custom crosshair cursor (desktop only)
     4. Magnetic primary buttons
     5. Hero parallax (bg-text + content drift)
     6. Clip-path title reveals
     7. Section label + subtitle stagger
     8. Statement quote entrance
     9. Cards / pillars / steps stagger
    10. Pillar number counter
    11. Section header reveal lines
    12. Contact section split entrance
    13. CTA entrance
    14. Cinematic reel (letterbox open, video parallax, text reveal)
   ============================================================ */

(function () {
  'use strict';

  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

  gsap.registerPlugin(ScrollTrigger);

  var isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

  /* ── 1. Lenis Smooth Scroll ─────────────────────────────── */
  var lenis = null;

  function initLenis() {
    if (typeof Lenis === 'undefined') return;

    lenis = new Lenis({
      duration: 1.25,
      easing: function (t) { return 1 - Math.pow(1 - t, 4); },
      smoothWheel: true,
      syncTouch: false,
    });

    // Drive Lenis via GSAP ticker so ScrollTrigger stays in sync
    gsap.ticker.add(function (time) {
      lenis.raf(time * 1000);
    });
    gsap.ticker.lagSmoothing(0);
    lenis.on('scroll', ScrollTrigger.update);

    // Anchor links go through Lenis for smooth offset scrolling
    document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
      anchor.addEventListener('click', function (e) {
        var hash = anchor.getAttribute('href');
        if (!hash || hash === '#') return;
        var target = document.querySelector(hash);
        if (!target) return;
        e.preventDefault();
        lenis.scrollTo(target, { offset: -72, duration: 1.5 });
      });
    });
  }

  /* ── 2. Scroll Progress Bar ─────────────────────────────── */
  function initProgressBar() {
    var bar = document.getElementById('scroll-progress');
    if (!bar) return;

    gsap.to(bar, {
      scaleX: 1,
      ease: 'none',
      scrollTrigger: {
        trigger: document.documentElement,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0,
      },
    });
  }

  /* ── 3. Custom Cursor ───────────────────────────────────── */
  function initCursor() {
    if (isTouchDevice) return;

    var dot  = document.getElementById('cursor-dot');
    var ring = document.getElementById('cursor-ring');
    if (!dot || !ring) return;

    document.body.classList.add('custom-cursor');
    gsap.set([dot, ring], { x: -120, y: -120 });

    var mx = -120, my = -120;
    var rx = -120, ry = -120;

    window.addEventListener('mousemove', function (e) {
      mx = e.clientX;
      my = e.clientY;
      gsap.to(dot, { x: mx, y: my, duration: 0.06, ease: 'none' });
    }, { passive: true });

    // Ring follows with lag
    gsap.ticker.add(function () {
      rx += (mx - rx) * 0.10;
      ry += (my - ry) * 0.10;
      gsap.set(ring, { x: rx, y: ry });
    });

    // Expand ring on interactive elements
    document.querySelectorAll('a, button, .card, .pillar, .step, input, textarea').forEach(function (el) {
      el.addEventListener('mouseenter', function () {
        ring.classList.add('cursor-ring--active');
        dot.classList.add('cursor-dot--active');
      });
      el.addEventListener('mouseleave', function () {
        ring.classList.remove('cursor-ring--active');
        dot.classList.remove('cursor-dot--active');
      });
    });
  }

  /* ── 4. Magnetic Buttons ────────────────────────────────── */
  function initMagnetic() {
    if (isTouchDevice) return;

    document.querySelectorAll('.btn--primary, .btn--gold').forEach(function (btn) {
      btn.addEventListener('mousemove', function (e) {
        var r  = btn.getBoundingClientRect();
        var dx = (e.clientX - (r.left + r.width  / 2)) * 0.32;
        var dy = (e.clientY - (r.top  + r.height / 2)) * 0.32;
        gsap.to(btn, { x: dx, y: dy, duration: 0.3, ease: 'power2.out' });
      });
      btn.addEventListener('mouseleave', function () {
        gsap.to(btn, { x: 0, y: 0, duration: 0.65, ease: 'elastic.out(1, 0.42)' });
      });
    });
  }

  /* ── 5. Hero Parallax ───────────────────────────────────── */
  function initHeroParallax() {
    var bgText = document.querySelector('.hero__bg-text');
    var inner  = document.querySelector('.hero__inner');

    if (bgText) {
      gsap.to(bgText, {
        y: -140,
        ease: 'none',
        scrollTrigger: {
          trigger: '.hero',
          start: 'top top',
          end: 'bottom top',
          scrub: 1.2,
        },
      });
    }

    // Content floats up and fades as hero exits
    if (inner) {
      gsap.to(inner, {
        y: 70,
        opacity: 0,
        ease: 'none',
        scrollTrigger: {
          trigger: '.hero',
          start: '50% top',
          end: 'bottom top',
          scrub: 1,
        },
      });
    }
  }

  /* ── 6 & 7. Title / Label / Sub Reveals ─────────────────── */
  function initTextReveals() {
    // Section labels — slide in from slight left with letter-spacing contraction
    document.querySelectorAll('.section-label').forEach(function (el) {
      if (el.closest('.hero') || el.closest('.gate')) return;
      gsap.fromTo(el,
        { opacity: 0, y: 10, letterSpacing: '0.36em' },
        {
          opacity: 1, y: 0, letterSpacing: '0.22em',
          duration: 0.85, ease: 'power2.out',
          scrollTrigger: { trigger: el, start: 'top 90%', once: true },
        }
      );
    });

    // Section titles — clip-path wipe upward
    document.querySelectorAll('.section-title, .cta__headline').forEach(function (el) {
      if (el.closest('.hero') || el.closest('.gate')) return;
      gsap.fromTo(el,
        { clipPath: 'inset(0 0 100% 0)', y: 22, opacity: 1 },
        {
          clipPath: 'inset(0 0 0% 0)', y: 0,
          duration: 1.05, ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 88%', once: true },
        }
      );
    });

    // Section subs — gentle fade rise
    document.querySelectorAll('.section-sub').forEach(function (el) {
      if (el.closest('.hero') || el.closest('.gate')) return;
      gsap.fromTo(el,
        { opacity: 0, y: 18 },
        {
          opacity: 1, y: 0,
          duration: 0.9, ease: 'power2.out',
          scrollTrigger: { trigger: el, start: 'top 90%', once: true },
        }
      );
    });
  }

  /* ── 8. Statement Quote ─────────────────────────────────── */
  function initStatementReveal() {
    var quote = document.querySelector('.statement__quote');
    if (!quote) return;

    gsap.fromTo(quote,
      { opacity: 0, scale: 0.962, y: 28 },
      {
        opacity: 1, scale: 1, y: 0,
        duration: 1.35, ease: 'power3.out',
        scrollTrigger: { trigger: '.statement', start: 'top 72%', once: true },
      }
    );

    // Gold em scrubs in as you scroll through the section
    var em = quote.querySelector('em');
    if (em) {
      gsap.fromTo(em,
        { opacity: 0.25, color: 'var(--cream)' },
        {
          opacity: 1, color: 'var(--gold)',
          scrollTrigger: {
            trigger: '.statement',
            start: 'top 55%',
            end: 'bottom 55%',
            scrub: 1.5,
          },
        }
      );
    }
  }

  /* ── 9. Cards / Pillars / Steps ─────────────────────────── */
  function initGridAnimations() {
    var cards = document.querySelectorAll('.card');
    if (cards.length) {
      gsap.fromTo(cards,
        { opacity: 0, y: 56, scale: 0.94 },
        {
          opacity: 1, y: 0, scale: 1,
          duration: 0.9, ease: 'power3.out',
          stagger: { amount: 0.38 },
          scrollTrigger: { trigger: '.cards', start: 'top 83%', once: true },
        }
      );
    }

    var pillars = document.querySelectorAll('.pillar');
    if (pillars.length) {
      gsap.fromTo(pillars,
        { opacity: 0, x: -28 },
        {
          opacity: 1, x: 0,
          duration: 0.78, ease: 'power2.out',
          stagger: { amount: 0.5 },
          scrollTrigger: { trigger: '.pillars', start: 'top 83%', once: true },
        }
      );
    }

    var steps = document.querySelectorAll('.step');
    if (steps.length) {
      gsap.fromTo(steps,
        { opacity: 0, y: 52, scale: 0.95 },
        {
          opacity: 1, y: 0, scale: 1,
          duration: 0.82, ease: 'power3.out',
          stagger: { amount: 0.44 },
          scrollTrigger: { trigger: '.steps', start: 'top 83%', once: true },
        }
      );
    }
  }

  /* ── 10. Pillar Number Counter ──────────────────────────── */
  function initCounters() {
    document.querySelectorAll('.pillar__number').forEach(function (el, i) {
      var target  = i + 1;
      var counter = { val: 0 };
      gsap.to(counter, {
        val: target,
        duration: 1.5,
        delay: i * 0.13,
        ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 85%', once: true },
        onUpdate: function () {
          el.textContent = String(Math.round(counter.val)).padStart(2, '0');
        },
      });
    });
  }

  /* ── 11. Section Header Reveal Lines ────────────────────── */
  function initRevealLines() {
    document.querySelectorAll('.section-header').forEach(function (header) {
      var line = document.createElement('div');
      line.className = 'reveal-line';
      header.appendChild(line);

      gsap.fromTo(line,
        { scaleX: 0, opacity: 0 },
        {
          scaleX: 1, opacity: 1,
          duration: 1.2, ease: 'power3.inOut',
          scrollTrigger: { trigger: header, start: 'top 80%', once: true },
        }
      );
    });
  }

  /* ── 12. Contact Split Entrance ─────────────────────────── */
  function initContactReveal() {
    var copy    = document.querySelector('.contact__copy');
    var formWrap = document.querySelector('.contact__form-wrap');
    var listItems = document.querySelectorAll('.contact__list li');

    if (copy) {
      gsap.fromTo(copy,
        { opacity: 0, x: -40 },
        {
          opacity: 1, x: 0, duration: 1.05, ease: 'power3.out',
          scrollTrigger: { trigger: '.contact__inner', start: 'top 78%', once: true },
        }
      );
    }
    if (formWrap) {
      gsap.fromTo(formWrap,
        { opacity: 0, x: 40 },
        {
          opacity: 1, x: 0, duration: 1.05, ease: 'power3.out', delay: 0.14,
          scrollTrigger: { trigger: '.contact__inner', start: 'top 78%', once: true },
        }
      );
    }
    if (listItems.length) {
      gsap.fromTo(listItems,
        { opacity: 0, x: -14 },
        {
          opacity: 1, x: 0, duration: 0.55, ease: 'power2.out',
          stagger: 0.09, delay: 0.28,
          scrollTrigger: { trigger: '.contact__list', start: 'top 85%', once: true },
        }
      );
    }
  }

  /* ── 13. CTA Entrance ───────────────────────────────────── */
  function initCTAReveal() {
    var ctaInner = document.querySelector('.cta__inner');
    if (!ctaInner) return;
    gsap.fromTo(ctaInner,
      { opacity: 0, y: 36 },
      {
        opacity: 1, y: 0, duration: 1.0, ease: 'power3.out',
        scrollTrigger: { trigger: '.cta', start: 'top 78%', once: true },
      }
    );
  }

  /* ── 14. Cinematic Reel ─────────────────────────────────── */
  function initReel() {
    var reel       = document.querySelector('.reel');
    var barTop     = document.querySelector('.reel__bar--top');
    var barBottom  = document.querySelector('.reel__bar--bottom');
    var video      = document.querySelector('.reel__video');
    var label      = document.querySelector('.reel__label');
    var headline   = document.querySelector('.reel__headline');
    var rule       = document.querySelector('.reel__rule');

    if (!reel) return;

    // Letterbox bars retract as section enters viewport
    if (barTop && barBottom) {
      gsap.to(barTop, {
        scaleY: 0,
        ease: 'power2.inOut',
        scrollTrigger: {
          trigger: reel,
          start: 'top 95%',
          end: 'top 15%',
          scrub: 1.4,
        },
      });
      gsap.to(barBottom, {
        scaleY: 0,
        ease: 'power2.inOut',
        scrollTrigger: {
          trigger: reel,
          start: 'top 95%',
          end: 'top 15%',
          scrub: 1.4,
        },
      });
    }

    // Video slow parallax drift (slightly slower than scroll)
    if (video) {
      gsap.fromTo(video,
        { y: -50 },
        {
          y: 50,
          ease: 'none',
          scrollTrigger: {
            trigger: reel,
            start: 'top bottom',
            end: 'bottom top',
            scrub: 1,
          },
        }
      );
    }

    // Label fades in when bars are ~halfway open
    if (label) {
      gsap.to(label, {
        opacity: 1, y: 0,
        duration: 1.1, ease: 'power3.out',
        scrollTrigger: { trigger: reel, start: 'top 55%', once: true },
      });
    }

    // Headline enters after label
    if (headline) {
      gsap.fromTo(headline,
        { opacity: 0, y: 32 },
        {
          opacity: 1, y: 0,
          duration: 1.35, ease: 'power3.out', delay: 0.18,
          scrollTrigger: { trigger: reel, start: 'top 55%', once: true },
        }
      );
    }

    // Gold rule expands after headline
    if (rule) {
      gsap.to(rule, {
        width: 120,
        duration: 1.4, ease: 'power3.inOut', delay: 0.45,
        scrollTrigger: { trigger: reel, start: 'top 55%', once: true },
      });
    }
  }

  /* ── 15. 3D Card / Step Hover Tilt ─────────────────────── */
  function init3DTilt() {
    if (isTouchDevice) return;

    document.querySelectorAll('.card, .step').forEach(function (el) {
      el.addEventListener('mousemove', function (e) {
        var r    = el.getBoundingClientRect();
        var xPct = (e.clientX - r.left) / r.width  - 0.5;
        var yPct = (e.clientY - r.top)  / r.height - 0.5;

        gsap.to(el, {
          rotateY:              xPct * 16,
          rotateX:              -yPct * 11,
          transformPerspective: 700,
          duration:             0.35,
          ease:                 'power2.out',
        });
      });

      el.addEventListener('mouseleave', function () {
        gsap.to(el, {
          rotateY:  0,
          rotateX:  0,
          duration: 1.1,
          ease:     'elastic.out(1, 0.44)',
        });
      });
    });
  }

  /* ── 16. 3D Scroll Depth Rotations ─────────────────────── */
  function init3DScrollDepth() {
    // Grid containers tilt in from below (like a stage rising)
    ['.cards', '.pillars', '.steps'].forEach(function (sel) {
      var el = document.querySelector(sel);
      if (!el) return;

      gsap.fromTo(el,
        { transformPerspective: 1100, rotateX: 7 },
        {
          rotateX:  0,
          duration: 1.5,
          ease:     'power3.out',
          scrollTrigger: { trigger: el, start: 'top 88%', once: true },
        }
      );
    });

    // Hero bg-text gets additional depth on scroll-out
    var bgText = document.querySelector('.hero__bg-text');
    if (bgText) {
      gsap.to(bgText, {
        rotateX:              15,
        transformPerspective: 900,
        ease:                 'none',
        scrollTrigger: {
          trigger: '.hero',
          start:   'top top',
          end:     'bottom top',
          scrub:   1.8,
        },
      });
    }

    // Statement section rises from 3D depth
    var statement = document.querySelector('.statement');
    if (statement) {
      gsap.fromTo(statement,
        { transformPerspective: 1400, rotateX: 5 },
        {
          rotateX:  0,
          duration: 1.6,
          ease:     'power3.out',
          scrollTrigger: { trigger: statement, start: 'top 86%', once: true },
        }
      );
    }

    // CTA enters with Z-depth push
    var cta = document.querySelector('.cta__inner');
    if (cta) {
      gsap.fromTo(cta,
        { transformPerspective: 900, z: -80, scale: 0.96 },
        {
          z:        0,
          scale:    1,
          duration: 1.2,
          ease:     'power3.out',
          scrollTrigger: { trigger: cta, start: 'top 82%', once: true },
        }
      );
    }
  }

  /* ── 17. Contact Video Parallax ─────────────────────────── */
  function initContactVideoParallax() {
    var video = document.querySelector('.contact__video');
    if (!video) return;

    gsap.fromTo(video,
      { y: -50, scale: 1.08 },
      {
        y:    50,
        ease: 'none',
        scrollTrigger: {
          trigger: '.contact--cinematic',
          start:   'top bottom',
          end:     'bottom top',
          scrub:   1.8,
        },
      }
    );

    // Reveal contact section with dramatic gold flash
    var overlay = document.querySelector('.contact__video-overlay');
    if (overlay) {
      gsap.fromTo(overlay,
        { opacity: 1.4 },
        {
          opacity:  1,
          duration: 1.8,
          ease:     'power2.inOut',
          scrollTrigger: {
            trigger: '.contact--cinematic',
            start:   'top 75%',
            once:    true,
          },
        }
      );
    }
  }

  /* ── 18. Gold Dust Particle System ─────────────────────── */
  function initGoldDust() {
    var canvas = document.getElementById('gold-dust-canvas');
    if (!canvas) return;

    var COUNT = 28;

    for (var i = 0; i < COUNT; i++) {
      (function (idx) {
        var p     = document.createElement('span');
        var size  = 1 + Math.random() * 3.5;
        var startX = Math.random() * 100;
        var startY = 20 + Math.random() * 80;
        var alpha  = 0.25 + Math.random() * 0.55;
        var dur    = 18 + Math.random() * 22;
        var delay  = Math.random() * 20;

        p.style.cssText = [
          'position:absolute',
          'border-radius:50%',
          'width:'     + size + 'px',
          'height:'    + size + 'px',
          'left:'      + startX + '%',
          'top:'       + startY + '%',
          'background: rgba(192,154,69,' + alpha + ')',
          'box-shadow: 0 0 ' + (size * 3.5) + 'px ' + Math.ceil(size * 1.2) + 'px rgba(192,154,69,' + (alpha * 0.5) + ')',
          'will-change:transform,opacity',
          'pointer-events:none',
        ].join(';');

        canvas.appendChild(p);

        function animate() {
          gsap.fromTo(p,
            { x: 0, y: 0, opacity: 0 },
            {
              x:       (Math.random() - 0.5) * 130,
              y:       -(220 + Math.random() * 460),
              opacity: 0,
              duration: dur,
              delay:   delay,
              ease:    'none',
              onComplete: function () {
                // Reset and loop
                delay = Math.random() * 8;
                dur   = 18 + Math.random() * 22;
                animate();
              },
              onStart: function () {
                gsap.to(p, { opacity: alpha, duration: dur * 0.08, ease: 'power1.in' });
              },
            }
          );
        }

        animate();
      })(i);
    }
  }

  /* ── Neutralize CSS data-reveal (GSAP owns all reveals) ─── */
  function neutralizeDataReveal() {
    document.querySelectorAll('[data-reveal]').forEach(function (el) {
      // Add is-revealed so CSS opacity:0 no longer applies
      el.classList.add('is-revealed');
      // Remove CSS transition so it doesn't interfere with GSAP
      el.style.transition = 'none';
    });
  }

  /* ── Master Init ────────────────────────────────────────── */
  function init() {
    neutralizeDataReveal();
    initLenis();
    initProgressBar();
    initCursor();
    initMagnetic();
    initHeroParallax();
    initTextReveals();
    initStatementReveal();
    initReel();
    initGridAnimations();
    initCounters();
    initRevealLines();
    initContactReveal();
    initCTAReveal();
    init3DTilt();
    init3DScrollDepth();
    initContactVideoParallax();
    initGoldDust();
    ScrollTrigger.refresh();
  }

  /* ── Wait for gate dismiss before initializing ──────────── */
  /*
   * The site starts as display:none (#main-site.site--hidden).
   * ScrollTrigger can't measure layout until it's in the DOM.
   * We watch for site--visible class, then init after the CSS
   * opacity transition has started (300ms delay is enough).
   */
  function waitForSite() {
    var site = document.getElementById('main-site');
    if (!site) { init(); return; }

    if (site.classList.contains('site--visible')) {
      setTimeout(init, 300);
      return;
    }

    var observer = new MutationObserver(function (mutations) {
      for (var i = 0; i < mutations.length; i++) {
        if (site.classList.contains('site--visible')) {
          observer.disconnect();
          setTimeout(init, 300);
          return;
        }
      }
    });

    observer.observe(site, { attributes: true, attributeFilter: ['class'] });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitForSite);
  } else {
    waitForSite();
  }

})();
