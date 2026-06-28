/* ============================================================
   LPR — Cinematic Motion System (Simplified)
   Removed: ScrollTrigger pinning, scrub animations,
            horizontal scroll reel, hero camera push
   Kept:    Smooth scroll, progress bar, cursor,
            hero intro stagger, scroll-triggered entrance
            reveals (once, no scrub), pipeline, process
            spine draw, package tilts, magnetic buttons
   ============================================================ */

(function () {
  'use strict';

  var R = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
      onUpdate: function (self) { gsap.set(bar, { scaleX: self.progress }); }
    });
  }

  /* ── 3. Gold swipe cursor ───────────────────────────────────── */
  function initCursor() {
    if (R || window.matchMedia('(pointer: coarse)').matches) return;

    /* Hide native cursor; restore pointer on clickables */
    var styleEl = document.createElement('style');
    styleEl.textContent =
      'body{cursor:none!important}' +
      'a,button,select,input,textarea,label,[role="button"],[tabindex]{cursor:pointer!important}';
    document.head.appendChild(styleEl);

    /* Canvas for swipe trail */
    var canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:99998;';
    document.body.appendChild(canvas);
    var ctx = canvas.getContext('2d');

    function resizeCanvas() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    /* Small gold dot as the cursor point */
    var dot = document.createElement('div');
    dot.style.cssText =
      'position:fixed;top:0;left:0;width:12px;height:12px;border-radius:50%;' +
      'background:radial-gradient(circle,#fff5cc 0%,#E2C870 45%,#C8A84B 100%);' +
      'pointer-events:none;z-index:99999;will-change:transform;transition:opacity 0.15s;' +
      'box-shadow:0 0 6px 2px rgba(200,168,75,0.7),0 0 18px 4px rgba(200,168,75,0.28);';
    document.body.appendChild(dot);

    var mx = -400, my = -400;
    var cx = mx,   cy = my;
    var prevMx = mx, prevMy = my;
    var particles = [];
    var hidden = false;
    var onInteractive = false;

    document.addEventListener('mousemove', function (e) {
      prevMx = mx; prevMy = my;
      mx = e.clientX;
      my = e.clientY;
      hidden = false;

      if (onInteractive) return;

      var dx = mx - prevMx, dy = my - prevMy;
      var speed = Math.hypot(dx, dy);
      if (speed < 0.5) return;

      var moveAngle = Math.atan2(dy, dx);
      var count = Math.min(Math.ceil(speed * 0.5) + 1, 8);

      for (var i = 0; i < count; i++) {
        var t = count > 1 ? i / (count - 1) : 0;
        particles.push({
          x:      prevMx + dx * t,
          y:      prevMy + dy * t,
          angle:  moveAngle,
          life:   1,
          length: Math.min(speed * 2.2 + 10, 52),
          width:  Math.random() * 2.5 + 1.2,
          bright: Math.random() > 0.4
        });
      }
    });

    document.addEventListener('mouseleave', function () { hidden = true; });
    document.addEventListener('mouseenter', function () { hidden = false; });

    var interactSel = 'a,button,select,input,textarea,label,[role="button"],[tabindex]';
    document.addEventListener('mouseover', function (e) {
      if (e.target.closest(interactSel)) { onInteractive = true;  dot.style.opacity = '0'; }
    });
    document.addEventListener('mouseout',  function (e) {
      if (e.target.closest(interactSel)) { onInteractive = false; dot.style.opacity = hidden ? '0' : '1'; }
    });

    function drawFrame() {
      requestAnimationFrame(drawFrame);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      cx += (mx - cx) * 0.16;
      cy += (my - cy) * 0.16;

      if (!hidden && !onInteractive) {
        dot.style.transform = 'translate(' + (cx - 6) + 'px,' + (cy - 6) + 'px)';
        dot.style.opacity   = '1';
      } else if (!onInteractive) {
        dot.style.opacity = '0';
      }

      for (var i = particles.length - 1; i >= 0; i--) {
        var p = particles[i];
        p.life -= 0.048;
        if (p.life <= 0) { particles.splice(i, 1); continue; }

        var a = p.life;
        var len = p.length * Math.pow(p.life, 0.6);
        var wid = p.width * p.life;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);

        /* Elongated gold swipe stroke — bright tip fades to nothing behind */
        var g = ctx.createLinearGradient(-len * 0.15, 0, -len, 0);
        if (p.bright) {
          g.addColorStop(0,    'rgba(255,248,200,' + (a * 0.95) + ')');
          g.addColorStop(0.18, 'rgba(226,200,112,' + (a * 0.85) + ')');
          g.addColorStop(0.55, 'rgba(200,168,75,'  + (a * 0.5)  + ')');
          g.addColorStop(1,    'rgba(150,120,40,0)');
        } else {
          g.addColorStop(0,    'rgba(226,200,112,' + (a * 0.8)  + ')');
          g.addColorStop(0.4,  'rgba(200,168,75,'  + (a * 0.45) + ')');
          g.addColorStop(1,    'rgba(130,100,30,0)');
        }

        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(-len * 0.5, 0, len * 0.5, wid, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    drawFrame();
  }

  /* ── 4. Hero: intro stagger (no scroll scrub) ───────────────── */
  function initHero() {
    var video   = document.getElementById('hero-video');
    var bg      = qs('.s-opening__video-bg');
    var eyebrow = qs('.s-opening .scene-eyebrow');
    var h1      = qs('.s-opening__headline');
    var sub     = qs('.s-opening__sub');
    var support = qs('.s-opening__support');
    var cta     = qs('.s-opening__cta');
    var panels  = qsa('.ui-panel');
    var scroller= qs('.s-opening__scroll');

    /* Video fallback */
    if (video) {
      var fallbackTimer = setTimeout(function () {
        if (video.readyState < 2 && bg) bg.classList.add('s-opening__video-bg--fallback');
      }, 3000);
      video.addEventListener('canplay', function () { clearTimeout(fallbackTimer); });
      video.addEventListener('error',   function () { if (bg) bg.classList.add('s-opening__video-bg--fallback'); });
    }

    if (R) return;

    /* Intro stagger — pure timeline, no scroll scrub */
    var els = [eyebrow, h1, sub, support, cta].filter(Boolean);
    gsap.set(els, { opacity: 0, y: 32 });
    if (panels.length) gsap.set(panels, { opacity: 0, x: 40 });
    if (scroller) gsap.set(scroller, { opacity: 0 });

    var tl = gsap.timeline({ delay: 0.3 });
    els.forEach(function (el, i) {
      tl.to(el, { opacity: 1, y: 0, duration: 0.75, ease: 'power3.out' }, i * 0.11);
    });
    if (panels.length) {
      tl.to(panels, { opacity: 1, x: 0, duration: 0.6, ease: 'power3.out', stagger: 0.13 }, 0.4);
    }
    if (scroller) {
      tl.to(scroller, { opacity: 1, duration: 0.9 }, 0.85);
    }
  }

  /* ── 5. Generic scroll-reveal (fade up, once, no scrub) ──────── */
  function initReveal() {
    if (R) {
      qsa('[data-reveal]').forEach(function (el) { el.style.opacity = '1'; });
      return;
    }
    qsa('[data-reveal]').forEach(function (el) {
      var delay = parseFloat(el.getAttribute('data-delay') || '0') * 0.12;
      gsap.set(el, { opacity: 0, y: 26 });
      ScrollTrigger.create({
        trigger: el,
        start: 'top 84%',
        once: true,
        onEnter: function () {
          gsap.to(el, { opacity: 1, y: 0, duration: 0.75, ease: 'power3.out', delay: delay });
        }
      });
    });
  }

  /* ── 6. Problem section reveal ──────────────────────────────── */
  function initProblemReveal() {
    if (R) return;
    var mockup = qs('.s-problem__mockup');
    var copy   = qs('.s-problem__copy');
    var warns  = qsa('.flat-warn');
    var pts    = qsa('.prob-pt');

    if (mockup) {
      gsap.from(mockup, {
        opacity: 0, x: -40, duration: 0.9, ease: 'power3.out',
        scrollTrigger: { trigger: mockup, start: 'top 80%', once: true }
      });
    }
    if (copy) {
      gsap.from(qsa('.s-problem__copy > *'), {
        opacity: 0, y: 24, duration: 0.75, ease: 'power3.out', stagger: 0.12,
        scrollTrigger: { trigger: copy, start: 'top 80%', once: true }
      });
    }
    if (warns.length) {
      gsap.from(warns, {
        opacity: 0, scale: 0.7, duration: 0.4, ease: 'back.out(2)', stagger: 0.18,
        scrollTrigger: { trigger: warns[0], start: 'top 78%', once: true }
      });
    }
    if (pts.length) {
      gsap.from(pts, {
        opacity: 0, x: 20, duration: 0.6, ease: 'power3.out', stagger: 0.14,
        scrollTrigger: { trigger: pts[0], start: 'top 84%', once: true }
      });
    }
  }

  /* ── 7. Compare section reveal ──────────────────────────────── */
  function initCompare() {
    if (R) return;
    var cards = qsa('.compare-card');
    if (!cards.length) return;
    gsap.from(cards, {
      opacity: 0, y: 36, duration: 0.85, ease: 'power3.out', stagger: 0.2,
      scrollTrigger: { trigger: cards[0], start: 'top 80%', once: true }
    });
  }

  /* ── 8. Experience section reveal ───────────────────────────── */
  function initExperience() {
    if (R) return;
    var header  = qs('.s-experience .scene-header');
    var browser = document.getElementById('exp-browser');
    var capCards = qsa('.cap-card');

    if (header) {
      gsap.from(header.querySelectorAll('.scene-eyebrow, .scene-title, .scene-sub'), {
        opacity: 0, y: 24, duration: 0.8, ease: 'power3.out', stagger: 0.12,
        scrollTrigger: { trigger: header, start: 'top 82%', once: true }
      });
    }
    if (browser) {
      gsap.from(browser, {
        opacity: 0, y: 50, scale: 0.96, duration: 1, ease: 'power3.out',
        scrollTrigger: { trigger: browser, start: 'top 82%', once: true }
      });
    }
    capCards.forEach(function (card, i) {
      gsap.from(card, {
        opacity: 0, y: 20, duration: 0.65, ease: 'power3.out', delay: i * 0.07,
        scrollTrigger: { trigger: card, start: 'top 88%', once: true }
      });
    });
  }

  /* ── 9. Animated pipeline (one-shot, no scrub) ──────────────── */
  function initPipeline() {
    var wrap    = document.getElementById('pipeline-wrap');
    var fill    = document.getElementById('pipeline-fill');
    var nodes   = qsa('.p-node');
    var alertEl = document.getElementById('pl-alert');
    var savedEl = document.getElementById('pl-saved');

    if (!wrap || !fill) return;

    var hdr = qs('.s-pipeline .scene-header');
    if (hdr && !R) {
      gsap.from(hdr.querySelectorAll('.scene-eyebrow, .scene-title, .scene-sub'), {
        opacity: 0, y: 22, duration: 0.8, ease: 'power3.out', stagger: 0.12,
        scrollTrigger: { trigger: hdr, start: 'top 82%', once: true }
      });
    }

    if (R) {
      fill.style.width = '100%';
      nodes.forEach(function (n) { n.classList.add('is-active'); });
      if (alertEl) alertEl.style.opacity = '1';
      if (savedEl) savedEl.style.opacity = '1';
      return;
    }

    gsap.set(fill, { width: '0%' });
    if (alertEl) gsap.set(alertEl, { opacity: 0, y: 18 });
    if (savedEl) gsap.set(savedEl, { opacity: 0, y: 18 });

    var nodeDur = 0.36;
    var tl = gsap.timeline({ scrollTrigger: { trigger: wrap, start: 'top 62%', once: true } });
    tl.to(fill, { width: '100%', duration: nodes.length * nodeDur, ease: 'power1.inOut' });
    nodes.forEach(function (node, i) {
      tl.call(function () { node.classList.add('is-active'); }, null, i * nodeDur + 0.08);
    });
    if (alertEl) tl.to(alertEl, { opacity: 1, y: 0, duration: 0.5, ease: 'back.out(1.5)' }, 3 * nodeDur);
    if (savedEl) tl.to(savedEl, { opacity: 1, y: 0, duration: 0.5, ease: 'back.out(1.5)' }, 4 * nodeDur);
  }

  /* ── 10. Process spine draw + item reveals ───────────────────── */
  function initProcessTimeline() {
    var spine   = document.getElementById('process-spine');
    var items   = qsa('.pt-item');
    var section = qs('.s-process');
    if (!section) return;

    var hdr = section.querySelector('.scene-header');
    if (hdr && !R) {
      gsap.from(hdr.querySelectorAll('.scene-eyebrow, .scene-title'), {
        opacity: 0, y: 22, duration: 0.8, ease: 'power3.out', stagger: 0.12,
        scrollTrigger: { trigger: hdr, start: 'top 82%', once: true }
      });
    }

    if (R) {
      if (spine) spine.style.height = '100%';
      items.forEach(function (it) { it.classList.add('is-visible'); });
      return;
    }

    /* Spine draws as section enters — simple trigger, no scrub */
    if (spine) {
      gsap.fromTo(spine, { height: '0%' }, {
        height: '100%', duration: 1.8, ease: 'power2.inOut',
        scrollTrigger: { trigger: section.querySelector('.process-timeline') || section, start: 'top 74%', once: true }
      });
    }

    items.forEach(function (item) {
      ScrollTrigger.create({
        trigger: item, start: 'top 82%', once: true,
        onEnter: function () {
          item.classList.add('is-visible');
          gsap.from(item, { opacity: 0, x: 28, duration: 0.7, ease: 'power3.out' });
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
          opacity: 0, y: 24, duration: 0.8, ease: 'power3.out', stagger: 0.12,
          scrollTrigger: { trigger: hdr, start: 'top 82%', once: true }
        });
      }
      var cards = section.querySelectorAll('.pkg');
      if (cards.length) {
        gsap.from(cards, {
          opacity: 0, y: 48, scale: 0.97, duration: 0.9, ease: 'power3.out', stagger: 0.16,
          scrollTrigger: { trigger: cards[0], start: 'top 84%', once: true }
        });
      }
    }

    /* 3-D tilt on hover */
    if (!window.matchMedia('(pointer: coarse)').matches) {
      section.querySelectorAll('.pkg').forEach(function (card) {
        card.addEventListener('mousemove', function (e) {
          var r = card.getBoundingClientRect();
          var rx = (e.clientX - r.left) / r.width  - 0.5;
          var ry = (e.clientY - r.top)  / r.height - 0.5;
          gsap.to(card, { rotateY: rx * 8, rotateX: -ry * 6, transformPerspective: 1000, duration: 0.38, ease: 'power2.out' });
        });
        card.addEventListener('mouseleave', function () {
          gsap.to(card, { rotateY: 0, rotateX: 0, duration: 0.55, ease: 'power2.out' });
        });
      });
    }
  }

  /* ── 12. FAQ accordion (CSS max-height transition) ──────────── */
  function initFaq() {
    qsa('.faq-item').forEach(function (item) {
      var btn = item.querySelector('.faq-item__q');
      if (!btn) return;

      btn.addEventListener('click', function () {
        var isOpen = item.classList.contains('is-open');

        /* Close all items */
        qsa('.faq-item').forEach(function (it) {
          it.classList.remove('is-open');
          var b = it.querySelector('.faq-item__q');
          if (b) b.setAttribute('aria-expanded', 'false');
          var icon = it.querySelector('.faq-item__icon');
          if (icon) icon.textContent = '+';
        });

        /* Open this item if it was closed */
        if (!isOpen) {
          item.classList.add('is-open');
          btn.setAttribute('aria-expanded', 'true');
          var icon = btn.querySelector('.faq-item__icon');
          if (icon) icon.textContent = '−';
        }
      });
    });

    if (R) return;
    var hdr = qs('.s-faq .scene-header');
    if (hdr) {
      gsap.from(hdr.querySelectorAll('*'), {
        opacity: 0, y: 20, duration: 0.75, ease: 'power3.out', stagger: 0.1,
        scrollTrigger: { trigger: hdr, start: 'top 82%', once: true }
      });
    }
    var items = qsa('.faq-item');
    if (items.length) {
      gsap.from(items, {
        opacity: 0, y: 22, duration: 0.65, ease: 'power3.out', stagger: 0.1,
        scrollTrigger: { trigger: items[0], start: 'top 84%', once: true }
      });
    }
  }

  /* ── 13. Request section — particles + reveal ───────────────── */
  function initRequest() {
    var section = qs('.s-request');
    if (!section) return;

    /* Floating gold sparks */
    for (var i = 0; i < 22; i++) {
      var s = document.createElement('span');
      s.className = 'req-spark';
      s.setAttribute('aria-hidden', 'true');
      s.style.cssText =
        'left:'    + (Math.random() * 100) + '%;' +
        'bottom:'  + (Math.random() * 100) + '%;' +
        '--dur:'   + (4 + Math.random() * 6) + 's;' +
        '--delay:-'+ (Math.random() * 8)    + 's;' +
        'width:'   + (1 + Math.random() * 2.5) + 'px;' +
        'height:'  + (1 + Math.random() * 2.5) + 'px;';
      section.appendChild(s);
    }

    if (R) return;

    /* Scroll reveal */
    var eyebrow  = section.querySelector('.scene-eyebrow');
    var headline = section.querySelector('.s-request__headline');
    var sub      = section.querySelector('.s-request__sub');
    var form     = section.querySelector('.s-request__form');
    var els      = [eyebrow, headline, sub, form].filter(Boolean);

    gsap.set(els, { opacity: 0, y: 30 });
    ScrollTrigger.create({
      trigger: section,
      start: 'top 72%',
      once: true,
      onEnter: function () {
        gsap.to(els, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out', stagger: 0.12 });
      }
    });
  }

  /* ── 14. Finale entrance ────────────────────────────────────── */
  function initFinale() {
    if (R) return;
    var section  = qs('.s-finale');
    if (!section) return;
    var glow     = section.querySelector('.s-finale__glow');
    var beam     = section.querySelector('.s-finale__beam');
    var headline = section.querySelector('.s-finale__headline');
    var cta      = section.querySelector('.btn');

    if (glow) gsap.set(glow, { opacity: 0, scale: 0.4 });
    if (beam) gsap.set(beam, { opacity: 0, scaleY: 0, transformOrigin: 'top center' });

    var tl = gsap.timeline({ scrollTrigger: { trigger: section, start: 'top 70%', once: true } });
    if (glow) tl.to(glow, { opacity: 1, scale: 1, duration: 1.4, ease: 'power3.out' });
    if (beam) tl.to(beam, { opacity: 1, scaleY: 1, duration: 0.9, ease: 'power3.out' }, '-=1');
    var textEls = [headline, cta].filter(Boolean);
    if (textEls.length) {
      gsap.set(textEls, { opacity: 0, y: 32 });
      tl.to(textEls, { opacity: 1, y: 0, duration: 0.85, ease: 'power3.out', stagger: 0.16 }, '-=0.65');
    }
  }

  /* ── 15. Magnetic buttons ───────────────────────────────────── */
  function initMagneticButtons() {
    if (R || window.matchMedia('(pointer: coarse)').matches) return;
    qsa('.btn--cinema.btn--xl, .btn--cinema.btn--lg').forEach(function (btn) {
      btn.addEventListener('mousemove', function (e) {
        var r = btn.getBoundingClientRect();
        var x = (e.clientX - r.left - r.width  / 2) * 0.18;
        var y = (e.clientY - r.top  - r.height / 2) * 0.18;
        gsap.to(btn, { x: x, y: y, duration: 0.32, ease: 'power2.out' });
      });
      btn.addEventListener('mouseleave', function () {
        gsap.to(btn, { x: 0, y: 0, duration: 0.5, ease: 'elastic.out(1, 0.5)' });
      });
    });
  }

  /* ── Init ───────────────────────────────────────────────────── */
  function init() {
    initCursor();
    whenGSAP(function () {
      gsap.registerPlugin(ScrollTrigger);
      initLenis();
      initProgressBar();
      initHero();
      initReveal();
      initProblemReveal();
      initCompare();
      initExperience();
      initPipeline();
      initProcessTimeline();
      initPackages();
      initFaq();
      initRequest();
      initFinale();
      initMagneticButtons();
      ScrollTrigger.refresh();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
