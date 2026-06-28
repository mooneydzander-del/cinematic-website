/* ============================================================
   LPR — Main Site JS
   Handles: navigation (mobile toggle, scroll state),
            contact form (validation, API submission),
            localStorage used only as fallback when API fails.
   ============================================================ */

(function () {
  'use strict';

  var CONTACT_KEY = 'lpr_contact_submissions';

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
      var txt = document.getElementById('contact-submit-text');
      if (txt) txt.textContent = active ? 'Sending…' : 'Request My LPR Page';
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      hideError();

      var email = getField(form, 'email');
      var offer = getField(form, 'offer');

      /* ── Validate ── */
      if (!offer) {
        showError('Please select a package to continue.');
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

      /* ── Build payload ── */
      var payload = {
        full_name:       'Website Inquiry',
        business_name:   '',
        email:           email,
        phone:           '',
        business_type:   '',
        website_url:     '',
        offer:           offer,
        goal:            'landing page inquiry',
        ad_platform:     '',
        target_audience: '',
        project_price:   0,
        notes:           'Package selection via simplified form'
      };

      setSubmitting(true);
      console.log('Submitting LPR lead', payload);

      fetch('/api/lpr-lead', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload)
      })
        .then(function (res) {
          console.log('LPR lead response status', res.status);
          return res.json().then(function (data) {
            return { status: res.status, data: data };
          });
        })
        .then(function (result) {
          console.log('LPR lead response data', result.data);

          if (result.status >= 200 && result.status < 300) {
            /* Success */
            form.style.display = 'none';
            if (successEl) successEl.style.display = 'flex';
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
          console.error('LPR lead fetch error', err);
          storeContactFallback(payload);
          showError('Could not send your request right now. Please email us directly or try again in a moment.');
          setSubmitting(false);
        });
    });
  }

  /* ── Package card selector ─────────────────────────────── */
  function initPkgSelector() {
    var opts   = Array.from(document.querySelectorAll('.pkg-opt'));
    var hidden = document.getElementById('req-pkg-hidden');
    if (!opts.length || !hidden) return;

    opts.forEach(function (opt) {
      opt.addEventListener('click', function () {
        opts.forEach(function (o) { o.classList.remove('is-selected'); });
        opt.classList.add('is-selected');
        hidden.value = opt.getAttribute('data-value') || '';
      });
    });
  }

  /* ── Init ───────────────────────────────────────────────── */
  function init() {
    initNav();
    initPkgSelector();
    initContactForm();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
