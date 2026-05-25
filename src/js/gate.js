/* ============================================================
   Cinema — Two-Step Lead Capture Popup
   Step 1: Landing page hook. "Get My Landing Page" / "See How
   It Works" both trigger cinematic GSAP morph to Step 2.
   Step 2: Name / Business Name / Email or Phone form.
   "No pressure..." dismisses without requiring submission.
   API submission is handled by cinema-lead-global.js.
   ============================================================ */

(function () {
  'use strict';

  /* ── Utilities ──────────────────────────────────────────── */
  function isValidEmail(e) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
  }
  function isValidPhone(p) {
    return /^[\d\s\-\+\(\)]{7,}$/.test(p.trim());
  }
  function isValidContact(c) {
    return isValidEmail(c) || isValidPhone(c);
  }

  /* ── Dismiss Modal ──────────────────────────────────────── */
  function dismissModal() {
    var gate = document.getElementById('entry-gate');
    if (!gate) return;
    if (typeof gsap !== 'undefined') {
      gsap.to(gate, {
        opacity: 0,
        duration: 0.55,
        ease: 'power2.inOut',
        onComplete: function () {
          if (gate.parentNode) gate.parentNode.removeChild(gate);
          document.body.classList.remove('modal-open');
        }
      });
    } else {
      gate.style.transition = 'opacity 0.55s ease';
      gate.style.opacity = '0';
      setTimeout(function () {
        if (gate.parentNode) gate.parentNode.removeChild(gate);
        document.body.classList.remove('modal-open');
      }, 580);
    }
  }

  /* ── Stagger in headline lines ──────────────────────────── */
  function animateHeadlineLines() {
    var lines = ['gate-line-1', 'gate-line-2', 'gate-line-3'];
    lines.forEach(function (id, i) {
      var el = document.getElementById(id);
      if (!el) return;
      gsap.fromTo(el,
        { opacity: 0, y: 14 },
        { opacity: 1, y: 0, duration: 0.44, ease: 'power2.out', delay: i * 0.1 }
      );
    });
  }

  /* ── Step 1 → Step 2 cinematic morph ───────────────────── */
  function showStep2() {
    var step1   = document.getElementById('gate-step-1');
    var step2   = document.getElementById('gate-step-2');
    var card    = document.getElementById('gate-card');
    var shimmer = document.getElementById('gate-shimmer');

    if (typeof gsap === 'undefined') {
      step1.style.display = 'none';
      step2.style.removeProperty('display');
      return;
    }

    var tl = gsap.timeline();

    /* 1. Step 1 collapses */
    tl.to(step1, {
      scale:    0.94,
      opacity:  0,
      filter:   'blur(5px)',
      duration: 0.32,
      ease:     'power2.in'
    })

    /* 2. Card gold pulse + shimmer */
    .call(function () {
      gsap.to(card, {
        boxShadow: '0 40px 120px rgba(0,0,0,0.8), 0 0 90px rgba(192,154,69,0.28), 0 0 0 1px rgba(192,154,69,0.35)',
        duration: 0.24,
        ease: 'power1.out',
        yoyo: true,
        repeat: 1
      });
      if (shimmer) {
        gsap.fromTo(shimmer,
          { left: '-70%', opacity: 1 },
          { left: '130%', opacity: 0.7, duration: 0.6, ease: 'power1.inOut',
            onComplete: function () { gsap.set(shimmer, { opacity: 0 }); }
          }
        );
      }
    }, null, '-=0.08')

    /* 3. Swap steps */
    .call(function () {
      step1.style.display = 'none';
      gsap.set(step2, { display: 'flex', opacity: 0, scale: 1.05, filter: 'blur(6px)', y: 0 });
    })

    /* 4. Step 2 materializes */
    .to(step2, {
      opacity:  1,
      scale:    1,
      filter:   'blur(0px)',
      duration: 0.48,
      ease:     'power2.out'
    }, '+=0.06')

    /* 5. Restore card shadow */
    .to(card, {
      boxShadow: '0 48px 130px rgba(0,0,0,0.78), 0 0 0 1px rgba(192,154,69,0.06), 0 0 70px rgba(192,154,69,0.05)',
      duration: 0.5,
      ease: 'power2.out'
    }, '-=0.42')

    /* 6. Stagger headline lines */
    .call(animateHeadlineLines, null, '-=0.22');
  }

  /* ── Validation ─────────────────────────────────────────── */
  function validateForm(name, business, contact) {
    var errors = {};
    if (!name.trim())                  errors.name     = 'Please enter your name.';
    if (!business.trim())              errors.business = 'Please enter your business name.';
    if (!contact.trim())               errors.contact  = 'Please enter your email or phone.';
    else if (!isValidContact(contact)) errors.contact  = 'Please enter a valid email or phone number.';
    return errors;
  }

  function applyErrors(errors) {
    ['name', 'business', 'contact'].forEach(function (field) {
      var input   = document.getElementById('gate-' + field);
      var errorEl = document.getElementById('error-' + field);
      if (!input || !errorEl) return;
      if (errors[field]) {
        input.classList.add('is-error');
        errorEl.textContent = errors[field];
      } else {
        input.classList.remove('is-error');
        errorEl.textContent = '';
      }
    });
  }

  /* ── Init ───────────────────────────────────────────────── */
  function init() {
    var gate   = document.getElementById('entry-gate');
    var form   = document.getElementById('gate-form');
    var next   = document.getElementById('gate-next');
    var seeHow = document.getElementById('gate-see-how');
    var skip   = document.getElementById('gate-skip');

    if (!gate) return;

    document.body.classList.add('modal-open');

    if (next)   next.addEventListener('click', showStep2);
    if (seeHow) seeHow.addEventListener('click', showStep2);
    if (skip)   skip.addEventListener('click', dismissModal);

    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var name     = document.getElementById('gate-name').value;
        var business = document.getElementById('gate-business').value;
        var contact  = document.getElementById('gate-contact').value;
        var errors   = validateForm(name, business, contact);
        if (Object.keys(errors).length > 0) {
          applyErrors(errors);
          return;
        }
        applyErrors({});
        /* API submission handled by cinema-lead-global.js */
        dismissModal();
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
