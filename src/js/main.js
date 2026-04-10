/* ============================================================
   Cinema — Main Site JS
   Handles: navigation (mobile toggle, scroll state),
            contact form (validation, storage)

   Contact submissions are stored the same way as gate leads —
   structured JSON in localStorage, ready for a backend swap.
   ============================================================ */

(function () {
  'use strict';

  var CONTACT_KEY = 'cinema_contact_submissions';

  /* ── Utilities ──────────────────────────────────────────── */

  function generateId() {
    return 'contact_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  }

  /* ── Navigation ─────────────────────────────────────────── */
  function initNav() {
    var nav    = document.getElementById('nav');
    var toggle = document.getElementById('nav-toggle');
    var links  = document.getElementById('nav-links');

    if (toggle && links) {
      toggle.addEventListener('click', function () {
        var isOpen = links.classList.toggle('is-open');
        toggle.setAttribute('aria-expanded', String(isOpen));
      });

      // Close mobile menu when any link is clicked
      links.querySelectorAll('a').forEach(function (link) {
        link.addEventListener('click', function () {
          links.classList.remove('is-open');
          toggle.setAttribute('aria-expanded', 'false');
        });
      });
    }

    // Subtle background shift on scroll
    if (nav) {
      window.addEventListener('scroll', function () {
        nav.style.background = window.scrollY > 50
          ? 'rgba(10, 10, 10, 0.99)'
          : 'rgba(10, 10, 10, 0.96)';
      }, { passive: true });
    }
  }

  /* ── Contact Form ───────────────────────────────────────── */
  /*
   * Submission object shape:
   * {
   *   id:        string
   *   timestamp: string   — ISO 8601
   *   source:    string
   *   name:      string
   *   email:     string
   *   phone:     string
   *   details:   string
   *   status:    'new'
   * }
   */
  function storeContactSubmission(data) {
    var submission = {
      id:        generateId(),
      timestamp: new Date().toISOString(),
      source:    window.location.href,
      name:      data.name,
      email:     data.email.toLowerCase(),
      phone:     data.phone,
      details:   data.details,
      status:    'new'
    };

    // Replace with API call when backend is ready:
    // fetch('/api/contact', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(submission)
    // });
    try {
      var existing = JSON.parse(localStorage.getItem(CONTACT_KEY) || '[]');
      existing.push(submission);
      localStorage.setItem(CONTACT_KEY, JSON.stringify(existing));
    } catch (e) {
      // localStorage unavailable
    }

    return submission;
  }

  function initContactForm() {
    var form      = document.getElementById('contact-form');
    var successEl = document.getElementById('contact-success');

    if (!form) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var name    = (form.querySelector('[name="name"]').value    || '').trim();
      var email   = (form.querySelector('[name="email"]').value   || '').trim();
      var phone   = (form.querySelector('[name="phone"]').value   || '').trim();
      var details = (form.querySelector('[name="details"]').value || '').trim();

      if (!name || !email) {
        alert('Please enter your name and email address.');
        return;
      }

      if (!isValidEmail(email)) {
        alert('Please enter a valid email address.');
        return;
      }

      storeContactSubmission({ name: name, email: email, phone: phone, details: details });

      form.reset();
      form.style.display = 'none';
      if (successEl) successEl.classList.add('is-visible');
    });
  }

  /* ── Init ───────────────────────────────────────────────── */
  function init() {
    initNav();
    initContactForm();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
