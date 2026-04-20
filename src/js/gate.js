/* ============================================================
   Cinema — Two-Step Lead Capture Popup
   Step 1: Hook (no form). "Start Here" triggers cinematic
   transition to Step 2. "Growing" flips to "Showing" via GSAP.
   "View Website" dismisses without requiring submission.
   ============================================================ */

(function () {
  'use strict';

  var STORAGE_KEY = 'cinema_leads';

  /* ── Utilities ──────────────────────────────────────────── */
  function generateId() {
    return 'lead_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
  }
  function isValidEmail(e) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
  }
  function isValidPhone(p) {
    return /^[\d\s\-\+\(\)]{7,}$/.test(p.trim());
  }

  /* ── Lead Storage ───────────────────────────────────────── */
  function storeLead(data) {
    var lead = {
      id:        generateId(),
      timestamp: new Date().toISOString(),
      source:    window.location.href,
      name:      data.name.trim(),
      email:     data.email.trim().toLowerCase(),
      phone:     data.phone.trim(),
      status:    'new'
    };
    // Replace with API call when backend is ready:
    // fetch('/api/leads', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(lead) });
    try {
      var existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      existing.push(lead);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    } catch (e) {}
    return lead;
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
      gate.classList.add('gate-modal--exit');
      gate.addEventListener('transitionend', function onEnd(e) {
        if (e.propertyName !== 'opacity') return;
        gate.removeEventListener('transitionend', onEnd);
        if (gate.parentNode) gate.parentNode.removeChild(gate);
        document.body.classList.remove('modal-open');
      });
    }
  }

  /* ── Word flip: "Growing" → "Showing" ──────────────────── */
  function triggerWordFlip() {
    var front = document.getElementById('gate-word-front');
    var back  = document.getElementById('gate-word-back');
    if (!front || !back || typeof gsap === 'undefined') {
      if (front) front.style.display = 'none';
      if (back)  back.style.display  = 'inline-block';
      return;
    }
    gsap.timeline()
      .to(front, {
        rotateX:         -90,
        opacity:         0,
        duration:        0.32,
        ease:            'power2.in',
        transformOrigin: '50% 100%'
      })
      .call(function () {
        front.style.display = 'none';
        gsap.set(back, { display: 'inline-block', rotateX: 90, opacity: 0, transformOrigin: '50% 0%' });
      })
      .to(back, {
        rotateX: 0,
        opacity: 1,
        duration: 0.52,
        ease:    'back.out(1.6)'
      });
  }

  /* ── Step 1 → Step 2 transition ────────────────────────── */
  function showStep2() {
    var step1   = document.getElementById('gate-step-1');
    var step2   = document.getElementById('gate-step-2');
    var card    = document.getElementById('gate-card');
    var shimmer = document.getElementById('gate-shimmer');

    if (typeof gsap === 'undefined') {
      step1.style.display = 'none';
      step2.style.removeProperty('display');
      step2.removeAttribute('aria-hidden');
      setTimeout(triggerWordFlip, 350);
      return;
    }

    var tl = gsap.timeline();

    // 1. Slide step 1 out upward
    tl.to(step1, {
      y:        -22,
      opacity:  0,
      duration: 0.38,
      ease:     'power2.in'
    })

    // 2. Shimmer sweep across card
    .call(function () {
      if (shimmer) {
        gsap.fromTo(shimmer,
          { left: '-70%', opacity: 1 },
          { left: '130%', opacity: 0.6, duration: 0.55, ease: 'power1.inOut',
            onComplete: function () { gsap.set(shimmer, { opacity: 0 }); }
          }
        );
      }
    }, null, '-=0.1')

    // 3. Brief card glow pulse
    .to(card, {
      boxShadow: '0 40px 120px rgba(0,0,0,0.75), 0 0 80px rgba(192,154,69,0.22)',
      duration:  0.22,
      ease:      'power1.out'
    }, '-=0.2')

    // 4. Hide step 1, prep step 2
    .call(function () {
      step1.style.display = 'none';
      step2.removeAttribute('aria-hidden');
      gsap.set(step2, { display: 'flex', opacity: 0, y: 28 });
    })

    // 5. Restore card shadow, reveal step 2
    .to(card, {
      boxShadow: '0 40px 120px rgba(0,0,0,0.7), 0 0 0 1px rgba(192,154,69,0.08), 0 0 60px rgba(192,154,69,0.06)',
      duration:  0.45,
      ease:      'power2.out'
    })
    .to(step2, {
      opacity:  1,
      y:        0,
      duration: 0.50,
      ease:     'power2.out'
    }, '-=0.38')

    // 6. Trigger word flip
    .call(triggerWordFlip, null, '+=0.18');
  }

  /* ── Validation ─────────────────────────────────────────── */
  function validateForm(name, email, phone) {
    var errors = {};
    if (!name.trim())              errors.name  = 'Please enter your full name.';
    if (!email.trim())             errors.email = 'Please enter your email address.';
    else if (!isValidEmail(email)) errors.email = 'Please enter a valid email address.';
    if (!phone.trim())             errors.phone = 'Please enter your phone number.';
    else if (!isValidPhone(phone)) errors.phone = 'Please enter a valid phone number.';
    return errors;
  }

  function applyErrors(errors) {
    ['name', 'email', 'phone'].forEach(function (field) {
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
    var gate = document.getElementById('entry-gate');
    var form = document.getElementById('gate-form');
    var next = document.getElementById('gate-next');
    var skip = document.getElementById('gate-skip');

    if (!gate) return;

    document.body.classList.add('modal-open');

    // "Start Here" → transition to step 2
    if (next) {
      next.addEventListener('click', showStep2);
    }

    // "View Website" → dismiss without capturing
    if (skip) {
      skip.addEventListener('click', dismissModal);
    }

    // Form submit → capture lead then dismiss
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var name  = document.getElementById('gate-name').value;
        var email = document.getElementById('gate-email').value;
        var phone = document.getElementById('gate-phone').value;
        var errors = validateForm(name, email, phone);
        if (Object.keys(errors).length > 0) {
          applyErrors(errors);
          return;
        }
        applyErrors({});
        storeLead({ name: name, email: email, phone: phone });
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
