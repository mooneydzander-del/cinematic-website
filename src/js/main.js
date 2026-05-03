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

  /* ── Lead Intake Form ──────────────────────────────────── */
  function initLeadForm() {
    var telegramCb = document.getElementById('lf-notif-telegram');
    var slackCb    = document.getElementById('lf-notif-slack');

    if (telegramCb) {
      telegramCb.addEventListener('change', function () {
        document.getElementById('lf-telegram-field').classList.toggle('lf-hidden', !this.checked);
      });
    }
    if (slackCb) {
      slackCb.addEventListener('change', function () {
        document.getElementById('lf-slack-field').classList.toggle('lf-hidden', !this.checked);
      });
    }
  }

  /* ── Init ───────────────────────────────────────────────── */
  /* Scroll reveals are handled by cinematic.js (GSAP + ScrollTrigger) */
  function init() {
    initNav();
    initLeadForm();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
