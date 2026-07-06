/* ============================================================
   LPR — Cinematic Motion System
   Ultra 3D parallax + section entrance animations
   ============================================================ */

(function () {
  'use strict';

  var R        = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var isDesktop = window.matchMedia('(pointer: fine) and (min-width: 768px)').matches;

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

  function qs(sel)  { return document.querySelector(sel); }
  function qsa(sel) { return Array.from(document.querySelectorAll(sel)); }


  /* ── 1. Lenis smooth scroll ───────────────────────────────── */
  function initLenis() {
    if (typeof Lenis === 'undefined' || R) return;
    var lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  }


  /* ── 2. Scroll progress bar ───────────────────────────────── */
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


  /* ── 3. Cyan orb cursor with comet tail ───────────────────── */
  function initCursor() {
    if (R || window.matchMedia('(pointer: coarse)').matches) return;

    var styleEl = document.createElement('style');
    styleEl.textContent =
      'body{cursor:none!important}' +
      'a,button,select,input,textarea,label,[role="button"],[tabindex]{cursor:pointer!important}';
    document.head.appendChild(styleEl);

    var canvas = document.createElement('canvas');
    canvas.style.cssText =
      'position:fixed;top:0;left:0;width:100%;height:100%;' +
      'pointer-events:none;z-index:99999;opacity:0;transition:opacity 0.55s ease;';
    document.body.appendChild(canvas);
    var ctx = canvas.getContext('2d');

    function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
    resize();
    window.addEventListener('resize', resize, { passive: true });

    var N     = 6;
    var nodes = [];
    var eases = [0.20, 0.155, 0.12, 0.09, 0.068, 0.050];
    for (var k = 0; k < N; k++) nodes.push({ x: -800, y: -800 });

    var mx = -800, my = -800;
    var hidden = false;
    var onInteractive = false;
    var faded = false;

    document.addEventListener('mousemove', function (e) {
      mx = e.clientX; my = e.clientY;
      hidden = false;
      if (!faded) { faded = true; canvas.style.opacity = '1'; }
    }, { passive: true });

    document.addEventListener('mouseleave', function () { hidden = true; });
    document.addEventListener('mouseenter', function () { hidden = false; });

    var iSel = 'a,button,select,input,textarea,label,[role="button"],[tabindex]';
    document.addEventListener('mouseover', function (e) {
      if (e.target.closest(iSel)) onInteractive = true;
    });
    document.addEventListener('mouseout', function (e) {
      if (e.target.closest(iSel)) onInteractive = false;
    });

    function drawNode(x, y, radius, alpha) {
      var aura = ctx.createRadialGradient(x, y, 0, x, y, radius * 3.4);
      aura.addColorStop(0,    'rgba(0,229,255,'  + (alpha * 0.20) + ')');
      aura.addColorStop(0.45, 'rgba(14,165,233,' + (alpha * 0.07) + ')');
      aura.addColorStop(1,    'rgba(0,60,140,0)');
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(x, y, radius * 3.4, 0, Math.PI * 2);
      ctx.fill();

      var core = ctx.createRadialGradient(
        x - radius * 0.28, y - radius * 0.28, 0, x, y, radius
      );
      core.addColorStop(0,    'rgba(255,255,255,' + (alpha * 0.98) + ')');
      core.addColorStop(0.25, 'rgba(200,245,255,' + (alpha * 0.88) + ')');
      core.addColorStop(0.55, 'rgba(0,229,255,'   + (alpha * 0.72) + ')');
      core.addColorStop(0.82, 'rgba(14,165,233,'  + (alpha * 0.42) + ')');
      core.addColorStop(1,    'rgba(0,80,200,0)');
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    function drawFrame() {
      requestAnimationFrame(drawFrame);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (hidden) return;

      nodes[0].x += (mx - nodes[0].x) * eases[0];
      nodes[0].y += (my - nodes[0].y) * eases[0];
      for (var i = 1; i < N; i++) {
        nodes[i].x += (nodes[i - 1].x - nodes[i].x) * eases[i];
        nodes[i].y += (nodes[i - 1].y - nodes[i].y) * eases[i];
      }

      for (var i = N - 1; i >= 1; i--) {
        var t      = 1 - i / (N - 1);
        var alpha  = Math.pow(t, 1.4) * 0.72;
        var radius = 3 + t * 5.5;
        drawNode(nodes[i].x, nodes[i].y, radius, alpha);
      }

      var scale = onInteractive ? 1.22 : 1;
      drawNode(nodes[0].x, nodes[0].y, 15 * scale, onInteractive ? 0.80 : 1);

      if (onInteractive) {
        ctx.beginPath();
        ctx.arc(nodes[0].x, nodes[0].y, 21, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0,229,255,0.38)';
        ctx.lineWidth   = 1.2;
        ctx.stroke();
      }
    }

    drawFrame();
  }


  /* ── 4. Hero: intro stagger (no scroll scrub) ─────────────── */
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

    if (video) {
      var fallbackTimer = setTimeout(function () {
        if (video.readyState < 2 && bg) bg.classList.add('s-opening__video-bg--fallback');
      }, 3000);
      video.addEventListener('canplay', function () { clearTimeout(fallbackTimer); });
      video.addEventListener('error',   function () { if (bg) bg.classList.add('s-opening__video-bg--fallback'); });
    }

    if (R) return;

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


  /* ── 5. Generic scroll-reveal (fade-up, once) ─────────────── */
  function initReveal() {
    if (R) {
      qsa('[data-reveal]').forEach(function (el) { el.style.opacity = '1'; });
      return;
    }
    qsa('[data-reveal]').forEach(function (el) {
      /* Delivers cards handled by initDeliversGrid on desktop */
      if (isDesktop && el.classList.contains('delivers-card')) return;
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


  /* ── 6. Problem section — Z-depth entries + orb parallax ──── */
  function initProblemReveal() {
    if (R) return;
    var copy  = qs('.s-problem__copy');
    var warns = qsa('.flat-warn');
    var pts   = qsa('.prob-pt');

    var mockup = qs('.s-problem__mockup');
    if (mockup) {
      gsap.from(mockup, {
        opacity: 0, x: -40, duration: 0.9, ease: 'power3.out',
        scrollTrigger: { trigger: mockup, start: 'top 80%', once: true }
      });
    }

    if (copy) {
      gsap.from(copy.querySelectorAll('.scene-eyebrow, .scene-title, .scene-sub'), {
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

    /* Problem blocks — translateY(50) opacity 0 → resting, 0.12 stagger, top 80% */
    if (pts.length) {
      gsap.set(pts, { opacity: 0, y: 50 });
      ScrollTrigger.create({
        trigger: pts[0], start: 'top 80%', once: true,
        onEnter: function () {
          gsap.to(pts, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out', stagger: 0.12 });
        }
      });
    }
  }


  /* ── 7. Compare — 3D panel rotation into view ─────────────── */
  function initCompare() {
    if (R) return;
    var section  = qs('.s-compare');
    if (!section) return;
    var badCard  = qs('.compare-card--bad');
    var goodCard = qs('.compare-card--good');
    var glow     = goodCard ? goodCard.querySelector('.compare-card__glow') : null;
    var header   = section.querySelector('.scene-header');

    if (header) {
      gsap.from(header.querySelectorAll('.scene-eyebrow, .scene-title, .scene-sub'), {
        opacity: 0, y: 24, duration: 0.8, ease: 'power3.out', stagger: 0.12,
        scrollTrigger: { trigger: header, start: 'top 82%', once: true }
      });
    }

    if (isDesktop) {
      /* Left card: translateX(-50) rotateY(-6) opacity 0 → resting */
      if (badCard) {
        gsap.set(badCard, { opacity: 0, x: -50, rotateY: -6, transformPerspective: 1200 });
        ScrollTrigger.create({
          trigger: section, start: 'top 75%', once: true,
          onEnter: function () {
            gsap.to(badCard, { opacity: 1, x: 0, rotateY: 0, duration: 0.95, ease: 'power3.out' });
          }
        });
      }
      /* Right card: translateX(50) rotateY(6) opacity 0 → resting, with gold glow */
      if (goodCard) {
        gsap.set(goodCard, { opacity: 0, x: 50, rotateY: 6, transformPerspective: 1200 });
        if (glow) gsap.set(glow, { opacity: 0.2 });
        ScrollTrigger.create({
          trigger: section, start: 'top 75%', once: true,
          onEnter: function () {
            gsap.to(goodCard, { opacity: 1, x: 0, rotateY: 0, duration: 0.95, ease: 'power3.out', delay: 0.12 });
            if (glow) gsap.to(glow, { opacity: 1, duration: 1.4, ease: 'power2.out', delay: 0.3 });
          }
        });
      }
    } else {
      var cards = section.querySelectorAll('.compare-card');
      if (cards.length) {
        gsap.from(cards, {
          opacity: 0, y: 36, duration: 0.85, ease: 'power3.out', stagger: 0.2,
          scrollTrigger: { trigger: cards[0], start: 'top 80%', once: true }
        });
      }
    }
  }


  /* ── 8. Experience section reveal ────────────────────────────  */
  function initExperience() {
    if (R) return;
    var header   = qs('.s-experience .scene-header');
    var browser  = document.getElementById('exp-browser');
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


  /* ── 9. Animated pipeline (one-shot) ─────────────────────── */
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


  /* ── 10. Process — 3D Z-depth step entries + num parallax ──── */
  function initProcessTimeline() {
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

    if (R || !items.length) {
      items.forEach(function (it) { it.classList.add('is-visible'); });
      return;
    }

    /* Steps enter translateY(60) scale(0.96) opacity 0 → resting, 0.15 stagger */
    gsap.set(items, { opacity: 0, y: 60, scale: 0.96 });
    ScrollTrigger.create({
      trigger: items[0], start: 'top 82%', once: true,
      onEnter: function () {
        items.forEach(function (it) { it.classList.add('is-visible'); });
        gsap.to(items, {
          opacity: 1, y: 0, scale: 1,
          duration: 0.85, ease: 'power3.out', stagger: 0.15
        });
      }
    });
  }


  /* ── 11. Delivers/Features — 3D batch stagger ────────────────  */
  function initDeliversGrid() {
    if (R) return;
    var cards = qsa('.delivers-card');
    if (!cards.length) return;

    if (isDesktop) {
      cards.forEach(function (card, idx) {
        var fromX = (idx % 2 === 0) ? -30 : 30;
        gsap.set(card, { opacity: 0, x: fromX });
      });
      ScrollTrigger.batch(cards, {
        start: 'top 86%',
        once: true,
        onEnter: function (batch) {
          gsap.to(batch, {
            opacity: 1, x: 0,
            duration: 0.75, ease: 'power3.out',
            stagger: 0.08
          });
        }
      });
    } else {
      /* Mobile: simple fade-up */
      cards.forEach(function (card) {
        var delay = parseFloat(card.getAttribute('data-delay') || '0') * 0.12;
        gsap.set(card, { opacity: 0, y: 26 });
        ScrollTrigger.create({
          trigger: card, start: 'top 84%', once: true,
          onEnter: function () {
            gsap.to(card, { opacity: 1, y: 0, duration: 0.75, ease: 'power3.out', delay: delay });
          }
        });
      });
    }
  }


  /* ── 12. Packages — rotateX entry + float after ──────────────  */
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

      var cards = Array.from(section.querySelectorAll('.pkg'));
      if (cards.length) {
        if (isDesktop) {
          gsap.set(cards, { opacity: 0, y: 70, rotateX: 5, transformPerspective: 1200 });
          ScrollTrigger.create({
            trigger: cards[0], start: 'top 84%', once: true,
            onEnter: function () {
              gsap.to(cards, {
                opacity: 1, y: 0, rotateX: 0,
                duration: 0.9, ease: 'power3.out', stagger: 0.1,
                onComplete: function () {
                  cards.forEach(function (c) { c.classList.add('has-entered'); });
                }
              });
            }
          });
        } else {
          gsap.from(cards, {
            opacity: 0, y: 48, scale: 0.97, duration: 0.9, ease: 'power3.out', stagger: 0.16,
            scrollTrigger: { trigger: cards[0], start: 'top 84%', once: true }
          });
        }
      }
    }

    /* 3-D hover tilt (desktop only) */
    if (!window.matchMedia('(pointer: coarse)').matches) {
      section.querySelectorAll('.pkg').forEach(function (card) {
        card.addEventListener('mousemove', function (e) {
          var r  = card.getBoundingClientRect();
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


  /* ── 13. FAQ — translateX stagger entry ──────────────────────  */
  function initFaq() {
    /* Accordion toggle */
    qsa('.faq-item').forEach(function (item) {
      var btn = item.querySelector('.faq-item__q');
      if (!btn) return;
      btn.addEventListener('click', function () {
        var isOpen = item.classList.contains('is-open');
        qsa('.faq-item').forEach(function (it) {
          it.classList.remove('is-open');
          var b = it.querySelector('.faq-item__q');
          if (b) b.setAttribute('aria-expanded', 'false');
          var icon = it.querySelector('.faq-item__icon');
          if (icon) icon.textContent = '+';
        });
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
    if (!items.length) return;

    if (isDesktop) {
      gsap.set(items, { opacity: 0, x: -30 });
      ScrollTrigger.create({
        trigger: items[0], start: 'top 84%', once: true,
        onEnter: function () {
          gsap.to(items, { opacity: 1, x: 0, duration: 0.65, ease: 'power3.out', stagger: 0.1 });
        }
      });
    } else {
      gsap.from(items, {
        opacity: 0, y: 22, duration: 0.65, ease: 'power3.out', stagger: 0.1,
        scrollTrigger: { trigger: items[0], start: 'top 84%', once: true }
      });
    }
  }


  /* ── 14. Request section — particles + reveal ────────────────  */
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

    var eyebrow  = section.querySelector('.scene-eyebrow');
    var headline = section.querySelector('.s-request__headline');
    var sub      = section.querySelector('.s-request__sub');
    var form     = section.querySelector('.s-request__form');
    var els      = [eyebrow, headline, sub, form].filter(Boolean);

    gsap.set(els, { opacity: 0, y: 30 });
    ScrollTrigger.create({
      trigger: section, start: 'top 72%', once: true,
      onEnter: function () {
        gsap.to(els, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out', stagger: 0.12 });
      }
    });

    /* Six step cards enter in two waves (first row 40, lower rows 60), 0.1 stagger */
    var cards = qsa('.process-card');
    if (cards.length) {
      cards.forEach(function (card, idx) {
        gsap.set(card, { opacity: 0, y: (idx < 3 ? 40 : 60) });
      });
      ScrollTrigger.create({
        trigger: section.querySelector('.process-grid'), start: 'top 80%', once: true,
        onEnter: function () {
          gsap.to(cards, { opacity: 1, y: 0, duration: 0.75, ease: 'power3.out', stagger: 0.1 });
        }
      });
    }
  }


  /* ── 15. Finale entrance ──────────────────────────────────── */
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


  /* ── 16. Magnetic buttons ────────────────────────────────── */
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


  /* ── 17. Ultra 3D Parallax (desktop / fine-pointer only) ──── */
  function initParallax() {
    if (R || !isDesktop) return;

    var hero    = qs('.s-opening');
    var vidBg   = qs('.s-opening__video-bg');
    var h1      = qs('.s-opening__headline');
    var cta     = qs('.s-opening__cta');
    var heroGl  = qs('.s-opening__glow');
    var heroEnd = 'bottom top';

    /* Hero Layer 1 — video background scale 1 → 1.1, scrub 1.2 */
    if (vidBg && hero) {
      gsap.fromTo(vidBg, { scale: 1 }, {
        scale: 1.1, ease: 'none',
        scrollTrigger: { trigger: hero, start: 'top top', end: heroEnd, scrub: 1.2 }
      });
    }

    /* Hero Layer 2 — headline translateY 0 → -70, scrub 1 */
    if (h1 && hero) {
      gsap.to(h1, {
        y: -70, ease: 'none',
        scrollTrigger: { trigger: hero, start: 'top top', end: heroEnd, scrub: 1 }
      });
    }

    /* Hero Layer 3 — CTA translateY 0 → -30, scrub 0.8 */
    if (cta && hero) {
      gsap.to(cta, {
        y: -30, ease: 'none',
        scrollTrigger: { trigger: hero, start: 'top top', end: heroEnd, scrub: 0.8 }
      });
    }

    /* Hero glow fades and scales out */
    if (heroGl && hero) {
      gsap.to(heroGl, {
        y: -55, scale: 1.4, opacity: 0, ease: 'none',
        scrollTrigger: { trigger: hero, start: 'top top', end: '65% top', scrub: 1 }
      });
    }

    /* Problem — gold ambient orb drifts 40 → -40, scrub 1.5 */
    var probOrb = qs('.s-problem .parallax-bg');
    if (probOrb) {
      gsap.fromTo(probOrb, { y: 40 }, {
        y: -40, ease: 'none',
        scrollTrigger: { trigger: '.s-problem', start: 'top bottom', end: 'bottom top', scrub: 1.5 }
      });
    }

    /* Process — large numerals float independently, scrub 1 */
    qsa('.pt-item__num').forEach(function (numEl) {
      gsap.fromTo(numEl, { y: 0 }, {
        y: -20, ease: 'none',
        scrollTrigger: { trigger: numEl.closest('.pt-item'), start: 'top bottom', end: 'bottom top', scrub: 1 }
      });
    });
  }


  /* ── 18. CTA radial-pulse on viewport entry ──────────────── */
  function initCtaPulse() {
    if (R || !('IntersectionObserver' in window)) return;
    var btns = qsa('.btn--cinema');
    if (!btns.length) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var btn = entry.target;
        btn.classList.remove('btn--pulse');
        void btn.offsetWidth;
        btn.classList.add('btn--pulse');
        io.unobserve(btn);
      });
    }, { threshold: 0.75 });
    btns.forEach(function (btn) { io.observe(btn); });
  }


  /* ── 19. Ambient particles: hero sparks + problem orb ─────── */
  function initAmbientParticles() {
    var hero = qs('.s-opening');
    if (hero && !R) {
      for (var i = 0; i < 14; i++) {
        var sp = document.createElement('span');
        sp.className = 'hero-spark';
        sp.setAttribute('aria-hidden', 'true');
        sp.style.cssText =
          'left:'     + (4 + Math.random() * 92)   + '%;' +
          'bottom:'   + (Math.random() * 78)        + '%;' +
          '--dur:'    + (6 + Math.random() * 9)     + 's;' +
          '--delay:-' + (Math.random() * 13)        + 's;' +
          '--drift:'  + (Math.random() * 54 - 27)   + 'px;' +
          'width:'    + (1 + Math.random() * 1.8)   + 'px;' +
          'height:'   + (1 + Math.random() * 1.8)   + 'px;';
        hero.appendChild(sp);
      }
    }

    var prob = qs('.s-problem');
    if (prob) {
      var orb = document.createElement('div');
      orb.className = 'parallax-bg';
      orb.setAttribute('aria-hidden', 'true');
      prob.prepend(orb);
    }
  }


  /* ── 20. 20 CSS micro-particles sitewide (pure CSS, no JS loop) */
  function initMicroParticles() {
    if (R) return;
    var anims   = ['micro-a','micro-b','micro-c','micro-d'];
    var cssText = '';
    /* Inject keyframes once */
    cssText +=
      '@keyframes micro-a{0%{transform:translateY(0) translateX(0);opacity:var(--op)}' +
                         '50%{transform:translateY(-115px) translateX(7px);opacity:0}' +
                         '100%{transform:translateY(-220px) translateX(3px);opacity:0}}' +
      '@keyframes micro-b{0%{transform:translateY(0) translateX(0);opacity:var(--op)}' +
                         '50%{transform:translateY(-95px) translateX(-6px);opacity:0}' +
                         '100%{transform:translateY(-200px) translateX(-2px);opacity:0}}' +
      '@keyframes micro-c{0%{transform:translateY(0) translateX(0);opacity:var(--op)}' +
                         '50%{transform:translateY(-135px) translateX(10px);opacity:0}' +
                         '100%{transform:translateY(-240px) translateX(5px);opacity:0}}' +
      '@keyframes micro-d{0%{transform:translateY(0) translateX(0);opacity:var(--op)}' +
                         '50%{transform:translateY(-85px) translateX(-8px);opacity:0}' +
                         '100%{transform:translateY(-180px) translateX(-3px);opacity:0}}';
    var style = document.createElement('style');
    style.textContent = cssText;
    document.head.appendChild(style);

    var host = document.getElementById('main-site') || document.body;

    for (var i = 0; i < 16; i++) {
      var p   = document.createElement('span');
      var dur = (14 + Math.random() * 8).toFixed(1);   /* 14–22s */
      var del = -(Math.random() * parseFloat(dur)).toFixed(1);
      var op  = (0.3 + Math.random() * 0.3).toFixed(2);
      var an  = anims[Math.floor(Math.random() * anims.length)];
      p.className = 'c-micro';
      p.setAttribute('aria-hidden', 'true');
      p.style.cssText =
        'left:'       + (Math.random() * 100).toFixed(1) + '%;' +
        'top:'        + (Math.random() * 100).toFixed(1) + '%;' +
        '--op:'       + op + ';' +
        'opacity:'    + op + ';' +
        'animation:'  + an + ' ' + dur + 's ' + del + 's ease-in-out infinite;';
      host.appendChild(p);
    }
  }


  /* ── Init ────────────────────────────────────────────────── */
  function init() {
    initCursor();
    initCtaPulse();
    initAmbientParticles();
    initMicroParticles();
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
      initDeliversGrid();
      initPackages();
      initFaq();
      initRequest();
      initFinale();
      initMagneticButtons();
      initParallax();
      ScrollTrigger.refresh();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
