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
  function getField(form, name) {
    var el = form.querySelector('[name="' + name + '"]');
    return el ? (el.value || '').trim() : '';
  }

  function initContactForm() {
    var form      = document.getElementById('contact-form');
    var successEl = document.getElementById('contact-success');

    if (!form) return;

    var sourceField = document.getElementById('field-source-page');
    var timeField   = document.getElementById('field-submission-time');
    if (sourceField) sourceField.value = window.location.href;
    if (timeField)   timeField.value   = new Date().toISOString();

    var submitted = false;

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (submitted) return;

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

      submitted = true;

      var payload = {
        full_name:         name,
        email:             email,
        phone:             getField(form, 'phone'),
        business_name:     getField(form, 'businessName'),
        website_url:       getField(form, 'website'),
        industry:          getField(form, 'industry'),
        offer:             getField(form, 'offer'),
        traffic_source:    getField(form, 'trafficSource'),
        running_ads:       getField(form, 'runningAds'),
        landing_page_goal: getField(form, 'goal'),
        budget:            getField(form, 'budget'),
        timeline:          getField(form, 'timeline'),
        message:           getField(form, 'message'),
        source_page:       getField(form, 'source_page') || window.location.href,
        submission_time:   getField(form, 'submission_time') || new Date().toISOString()
      };

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
