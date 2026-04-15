/* ============================================================
   Cinema — Entry Gate
   Handles: form validation, lead storage, gate-to-site transition

   Lead data is stored in localStorage as structured JSON objects,
   ready to be sent to a backend, CRM, or email automation later.

   To connect to a backend:
     1. Replace or supplement the storeLead() localStorage call
        with a fetch() POST to your API endpoint.
     2. The `lead` object shape matches what most CRMs expect.
   ============================================================ */

(function () {
  'use strict';

  var STORAGE_KEY = 'cinema_leads';

  /* ── Utilities ──────────────────────────────────────────── */

  function generateId() {
    return 'lead_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  }

  function isValidPhone(phone) {
    return /^[\d\s\-\+\(\)]{7,}$/.test(phone.trim());
  }

  /* ── Lead Storage ───────────────────────────────────────── */
  /*
   * Lead object shape (keep stable for backend compatibility):
   * {
   *   id:        string   — unique identifier
   *   timestamp: string   — ISO 8601
   *   source:    string   — page URL at time of capture
   *   name:      string
   *   email:     string   — normalized to lowercase
   *   phone:     string
   *   status:    string   — 'new' | 'contacted' | 'converted'
   * }
   */
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

    // Save to localStorage — replace with API call when backend is ready:
    // fetch('/api/leads', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(lead)
    // });
    try {
      var existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      existing.push(lead);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    } catch (e) {
      // localStorage unavailable — continue without failing
    }

    return lead;
  }

  /* ── Gate → Site Transition ─────────────────────────────── */
  function enterSite() {
    var gate = document.getElementById('entry-gate');
    var site = document.getElementById('main-site');

    // Start gate fade-out
    gate.classList.add('gate--exit');

    // Reveal and prepare site
    site.removeAttribute('aria-hidden');
    site.classList.remove('site--hidden');

    // Fade site in after one frame (ensures transition fires)
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        site.classList.add('site--visible');
      });
    });

    // Remove gate from DOM after fade completes
    gate.addEventListener('transitionend', function onEnd(e) {
      if (e.propertyName !== 'opacity') return;
      gate.removeEventListener('transitionend', onEnd);
      if (gate.parentNode) gate.parentNode.removeChild(gate);
    });
  }

  /* ── Validation ─────────────────────────────────────────── */
  function validateForm(name, email, phone) {
    var errors = {};

    if (!name.trim()) {
      errors.name = 'Please enter your full name.';
    }

    if (!email.trim()) {
      errors.email = 'Please enter your email address.';
    } else if (!isValidEmail(email)) {
      errors.email = 'Please enter a valid email address.';
    }

    if (!phone.trim()) {
      errors.phone = 'Please enter your phone number.';
    } else if (!isValidPhone(phone)) {
      errors.phone = 'Please enter a valid phone number.';
    }

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
    var site = document.getElementById('main-site');
    var form = document.getElementById('gate-form');

    if (!gate || !form || !site) return;

    // Hide site while gate is displayed
    site.classList.add('site--hidden');

    // ── Uncomment to skip gate for returning visitors: ──────
    // var leads = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    // if (leads.length > 0) { enterSite(); return; }
    // ────────────────────────────────────────────────────────

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
      enterSite();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
