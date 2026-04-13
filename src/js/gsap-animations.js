/* ============================================================
   Cinema — GSAP Cinematic Scroll Animations
   Requires: GSAP + ScrollTrigger (loaded via CDN in index.html)
   ============================================================ */

(function () {
  'use strict';

  function initGSAP() {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

    gsap.registerPlugin(ScrollTrigger);

    /* ── Hero parallax scrub ──────────────────────────────── */
    gsap.to('.hero__img-wrap', {
      yPercent: -20,
      ease: 'none',
      scrollTrigger: {
        trigger: '.hero',
        start: 'top top',
        end: 'bottom top',
        scrub: 1.4
      }
    });

    gsap.to('.hero__text', {
      opacity: 0,
      yPercent: -14,
      ease: 'none',
      scrollTrigger: {
        trigger: '.hero',
        start: '55% top',
        end: 'bottom top',
        scrub: true
      }
    });

    /* ── Showcase — pinned scroll-stop word reveal ─────────── */
    var words = gsap.utils.toArray('.sw');
    var tl = gsap.timeline({
      scrollTrigger: {
        trigger: '.showcase',
        start: 'top top',
        end: '+=250%',
        pin: true,
        scrub: 0.8,
        anticipatePin: 1
      }
    });

    // Label fades in first
    tl.to('.showcase__label', { opacity: 1, duration: 0.3 });

    // Each word lights up in sequence
    words.forEach(function (word) {
      tl.to(word, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }, '>-0.1');
    });

    // Sub-line fades in last
    tl.to('.showcase__sub', { opacity: 1, duration: 0.4 }, '>0.1');

    /* ── Services — staggered card reveal ─────────────────── */
    gsap.from('.card', {
      opacity: 0,
      y: 70,
      duration: 1,
      stagger: 0.2,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: '.cards',
        start: 'top 82%',
        toggleActions: 'play none none none'
      }
    });

    /* ── Why Us — pillars sweep in from left ─────────────── */
    gsap.from('.pillar', {
      opacity: 0,
      x: -50,
      duration: 0.9,
      stagger: 0.15,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: '.pillars',
        start: 'top 80%',
        toggleActions: 'play none none none'
      }
    });

    /* ── Process — sequential scale reveal ───────────────── */
    gsap.from('.step', {
      opacity: 0,
      y: 60,
      scale: 0.94,
      duration: 0.8,
      stagger: 0.18,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: '.steps',
        start: 'top 82%',
        toggleActions: 'play none none none'
      }
    });

    // Step numbers count up from 0
    document.querySelectorAll('.step__num').forEach(function (el) {
      var target = parseInt(el.textContent, 10);
      var obj = { val: 0 };
      gsap.to(obj, {
        val: target,
        duration: 1.4,
        ease: 'power2.out',
        snap: { val: 1 },
        onUpdate: function () { el.textContent = Math.round(obj.val); },
        scrollTrigger: {
          trigger: el,
          start: 'top 85%',
          toggleActions: 'play none none none'
        }
      });
    });

    /* ── Contact — split entrance ────────────────────────── */
    gsap.from('.contact__copy', {
      opacity: 0,
      x: -60,
      duration: 1.1,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: '.contact__inner',
        start: 'top 80%',
        toggleActions: 'play none none none'
      }
    });

    gsap.from('.contact__form-wrap', {
      opacity: 0,
      x: 60,
      duration: 1.1,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: '.contact__inner',
        start: 'top 80%',
        toggleActions: 'play none none none'
      }
    });

    /* ── CTA — cinematic scale reveal ────────────────────── */
    gsap.from('.cta__inner', {
      opacity: 0,
      scale: 0.92,
      y: 50,
      duration: 1.2,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: '.cta',
        start: 'top 82%',
        toggleActions: 'play none none none'
      }
    });
  }

  /* Wait for gate dismiss */
  document.addEventListener('cinema:site-visible', initGSAP);

  /* Fallback if gate already passed */
  if (document.getElementById('main-site') &&
      document.getElementById('main-site').classList.contains('site--visible')) {
    initGSAP();
  }

})();
