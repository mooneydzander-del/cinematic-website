/* ============================================================
   Cinema — Lead Capture Popup
   Floats over the visible website. Form submits store a lead
   and dismiss the modal. "View Website" dismisses without capture.

   To connect to a backend replace the localStorage block in
   storeLead() with a fetch() POST to your API endpoint.
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
    // fetch('/api/leads', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(lead)
    // });
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

    gate.classList.add('gate-modal--exit');

    gate.addEventListener('transitionend', function onEnd(e) {
      if (e.propertyName !== 'opacity') return;
      gate.removeEventListener('transitionend', onEnd);
      if (gate.parentNode) gate.parentNode.removeChild(gate);
      document.body.classList.remove('modal-open');
    });
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
    var skip = document.getElementById('gate-skip');

    if (!gate || !form) return;

    // Lock scroll while modal is open
    document.body.classList.add('modal-open');

    // Form submit — capture lead then dismiss
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

    // "View Website" — dismiss without requiring form
    if (skip) {
      skip.addEventListener('click', dismissModal);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
