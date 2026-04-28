/* ============================================================
   Cinema — Main Site JS
   Handles: navigation (mobile toggle, scroll state),
            contact form (validation, storage),
            scroll reveal (IntersectionObserver)

   Contact submissions are stored as structured JSON in
   localStorage, ready to swap for an API call.
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

      links.querySelectorAll('a').forEach(function (link) {
        link.addEventListener('click', function () {
          links.classList.remove('is-open');
          toggle.setAttribute('aria-expanded', 'false');
        });
      });
    }

    if (nav) {
      window.addEventListener('scroll', function () {
        nav.style.background = window.scrollY > 60
          ? 'rgba(8, 8, 9, 0.98)'
          : 'rgba(8, 8, 9, 0.92)';
      }, { passive: true });
    }
  }

  /* ── Contact Form ───────────────────────────────────────── */
  function storeContactSubmission(data) {
    var submission = {
      id:           generateId(),
      timestamp:    new Date().toISOString(),
      source:       window.location.href,
      name:         data.name,
      businessName: data.businessName,
      email:        data.email.toLowerCase(),
      phone:        data.phone,
      offer:        data.offer,
      runningAds:   data.runningAds,
      status:       'new'
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

  function getField(form, name) {
    var el = form.querySelector('[name="' + name + '"]');
    return el ? (el.value || '').trim() : '';
  }

  function initContactForm() {
    var form      = document.getElementById('contact-form');
    var successEl = document.getElementById('contact-success');

    if (!form) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var name  = getField(form, 'name');
      var email = getField(form, 'email');

      if (!name || !email) {
        alert('Please enter your name and email address.');
        return;
      }

      if (!isValidEmail(email)) {
        alert('Please enter a valid email address.');
        return;
      }

      storeContactSubmission({
        name:         name,
        businessName: getField(form, 'businessName'),
        email:        email,
        phone:        getField(form, 'phone'),
        offer:        getField(form, 'offer'),
        runningAds:   getField(form, 'runningAds')
      });

      form.reset();
      form.style.display = 'none';
      if (successEl) successEl.classList.add('is-visible');
    });
  }

  /* ── Init ───────────────────────────────────────────────── */
  /* Scroll reveals are handled by cinematic.js (GSAP + ScrollTrigger) */
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
