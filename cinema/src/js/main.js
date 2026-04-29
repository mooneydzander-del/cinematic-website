/* ============================================================
   Cinema — Main Site JS
   Handles: navigation (mobile toggle, scroll state),
            contact form (validation, API submission),
            localStorage used only as fallback when API fails.
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

  function getField(form, name) {
    var el = form.querySelector('[name="' + name + '"]');
    return el ? (el.value || '').trim() : '';
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

  /* ── localStorage fallback (only used when API fails) ───── */
  function storeContactFallback(payload) {
    var record = {
      id:        generateId(),
      timestamp: new Date().toISOString(),
      source:    window.location.href,
      status:    'api-failed',
      payload:   payload
    };
    try {
      var existing = JSON.parse(localStorage.getItem(CONTACT_KEY) || '[]');
      existing.push(record);
      localStorage.setItem(CONTACT_KEY, JSON.stringify(existing));
    } catch (e) {}
  }

  /* ── Contact Form ───────────────────────────────────────── */
  function initContactForm() {
    var form      = document.getElementById('contact-form');
    var successEl = document.getElementById('contact-success');
    var errorEl   = document.getElementById('contact-error');
    var submitBtn = document.getElementById('contact-submit');

    if (!form) return;

    function showError(msg) {
      if (!errorEl) return;
      errorEl.textContent = msg;
      errorEl.style.display = 'block';
    }

    function hideError() {
      if (!errorEl) return;
      errorEl.style.display = 'none';
      errorEl.textContent = '';
    }

    function setSubmitting(active) {
      if (!submitBtn) return;
      submitBtn.disabled = active;
      submitBtn.textContent = active
        ? 'Sending…'
        : 'Request My Landing Page Plan →';
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      hideError();

      /* ── Read fields using API-expected names ── */
      var full_name     = getField(form, 'full_name');
      var business_name = getField(form, 'business_name');
      var email         = getField(form, 'email');
      var phone         = getField(form, 'phone');
      var offer         = getField(form, 'offer');
      var goal          = getField(form, 'goal');

      /* ── Validate ── */
      if (!full_name) {
        showError('Please enter your full name.');
        return;
      }
      if (!business_name) {
        showError('Please enter your business name.');
        return;
      }
      if (!email) {
        showError('Please enter your email address.');
        return;
      }
      if (!isValidEmail(email)) {
        showError('Please enter a valid email address.');
        return;
      }
      if (!offer) {
        showError('Please tell us what you are advertising.');
        return;
      }

      /* ── Build payload matching API field names exactly ── */
      var payload = {
        full_name:       full_name,
        business_name:   business_name,
        email:           email,
        phone:           phone,
        business_type:   '',
        website_url:     '',
        offer:           offer,
        goal:            goal || 'not specified',
        ad_platform:     '',
        target_audience: '',
        project_price:   0,
        notes:           ''
      };

      setSubmitting(true);
      console.log('Submitting Cinema lead', payload);

      fetch('/api/cinema-lead', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload)
      })
        .then(function (res) {
          console.log('Cinema lead response status', res.status);
          return res.json().then(function (data) {
            return { status: res.status, data: data };
          });
        })
        .then(function (result) {
          console.log('Cinema lead response data', result.data);

          if (result.status >= 200 && result.status < 300) {
            /* Success */
            form.style.display = 'none';
            if (successEl) successEl.classList.add('is-visible');
          } else {
            /* API returned an error (4xx/5xx) */
            var msg = (result.data && result.data.error)
              ? result.data.error
              : 'Something went wrong. Please try again.';
            showError(msg);
            setSubmitting(false);
            storeContactFallback(payload);
          }
        })
        .catch(function (err) {
          /* Network failure — store locally and tell the user */
          console.error('Cinema lead fetch error', err);
          storeContactFallback(payload);
          showError('Could not send your request right now. Please email us directly or try again in a moment.');
          setSubmitting(false);
        });
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
