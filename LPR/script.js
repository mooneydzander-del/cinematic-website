(function () {
  'use strict';

  var root = document.documentElement;
  var motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  root.classList.add('js');

  /* ---------- Copy rises into place as it enters ---------- */

  var reveals = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
  var revealer = null;

  function showAllCopy() {
    if (revealer) {
      revealer.disconnect();
      revealer = null;
    }
    reveals.forEach(function (el) { el.classList.add('in'); });
  }

  function watchCopy() {
    if (motionQuery.matches || !('IntersectionObserver' in window)) {
      showAllCopy();
      return;
    }
    revealer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          revealer.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    reveals.forEach(function (el) {
      if (!el.classList.contains('in')) revealer.observe(el);
    });
  }

  /* ---------- Parallax from ordinary window scroll ----------
     data-depth > 0 lags behind the scroll (far), < 0 runs ahead (near).
     data-anchor="top": offset grows from the top of the page.
     data-anchor="lift": the rocket, accelerating off the pad.
     data-anchor="end": settles to rest at the very bottom of the page.
     Default: offset grows with distance from the middle of the viewport. */

  var hero = document.querySelector('.hero');
  var layers = Array.prototype.slice.call(document.querySelectorAll('[data-depth]')).map(function (el) {
    return {
      el: el,
      depth: parseFloat(el.getAttribute('data-depth')) || 0,
      drift: parseFloat(el.getAttribute('data-drift')) || 0,
      anchor: el.getAttribute('data-anchor') || 'center',
      center: 0,
      last: ''
    };
  });

  var viewport = window.innerHeight;
  var maxScroll = 0;
  var running = false;
  var queued = false;
  var lastBurn = '';
  var resizeWatcher = null;

  function measure() {
    var y = window.pageYOffset;
    viewport = window.innerHeight;
    maxScroll = Math.max(0, document.documentElement.scrollHeight - viewport);
    layers.forEach(function (layer) {
      layer.el.style.transform = '';
      layer.last = '';
    });
    layers.forEach(function (layer) {
      var rect = layer.el.getBoundingClientRect();
      layer.center = rect.top + y + rect.height / 2;
    });
  }

  function render() {
    queued = false;
    if (!running) return;

    var y = window.pageYOffset;
    var middle = y + viewport / 2;

    for (var i = 0; i < layers.length; i++) {
      var layer = layers[i];
      var offset;

      if (layer.anchor === 'top') {
        offset = y * layer.depth;
      } else if (layer.anchor === 'lift') {
        offset = -(y * layer.depth + (y * y) / viewport * 0.5);
      } else if (layer.anchor === 'end') {
        offset = (y - maxScroll) * layer.depth;
      } else {
        offset = (middle - layer.center) * layer.depth;
      }

      var value = 'translate3d(' + (offset * layer.drift).toFixed(1) + 'px,' + offset.toFixed(1) + 'px,0)';
      if (value !== layer.last) {
        layer.el.style.transform = value;
        layer.last = value;
      }
    }

    // Ignition: the plume, smoke and pad light build over the first half-screen of scroll.
    if (hero && y < viewport * 2) {
      var t = Math.min(1, Math.max(0, y / (viewport * 0.45)));
      var burn = (0.22 + 0.78 * (1 - (1 - t) * (1 - t))).toFixed(3);
      if (burn !== lastBurn) {
        hero.style.setProperty('--burn', burn);
        lastBurn = burn;
      }
    }
  }

  function requestRender() {
    if (!queued) {
      queued = true;
      window.requestAnimationFrame(render);
    }
  }

  function refresh() {
    if (!running) return;
    measure();
    render();
  }

  function startParallax() {
    if (running) return;
    running = true;
    measure();
    render();
    window.addEventListener('scroll', requestRender, { passive: true });
    window.addEventListener('resize', refresh);
    window.addEventListener('load', refresh);
    if ('ResizeObserver' in window) {
      resizeWatcher = new ResizeObserver(refresh);
      resizeWatcher.observe(document.body);
    }
  }

  function stopParallax() {
    running = false;
    window.removeEventListener('scroll', requestRender);
    window.removeEventListener('resize', refresh);
    window.removeEventListener('load', refresh);
    if (resizeWatcher) {
      resizeWatcher.disconnect();
      resizeWatcher = null;
    }
    layers.forEach(function (layer) {
      layer.el.style.transform = '';
      layer.last = '';
    });
    if (hero) hero.style.removeProperty('--burn');
    lastBurn = '';
  }

  function applyMotionPreference() {
    if (motionQuery.matches) {
      stopParallax();
      showAllCopy();
    } else {
      startParallax();
      watchCopy();
    }
  }

  if (motionQuery.addEventListener) {
    motionQuery.addEventListener('change', applyMotionPreference);
  } else if (motionQuery.addListener) {
    motionQuery.addListener(applyMotionPreference);
  }

  applyMotionPreference();

  /* ---------- The brief: check it, then hand it to the mail app ---------- */

  var form = document.getElementById('brief-form');
  if (!form) return;

  var statusLine = document.getElementById('brief-status');

  form.noValidate = true;

  // One @, no spaces, something before it, and a host with a dot and an ending of two or more letters.
  function looksLikeEmail(value) {
    var at = value.indexOf('@');
    if (at < 1 || at !== value.lastIndexOf('@') || /\s/.test(value)) return false;
    var host = value.slice(at + 1);
    var dot = host.lastIndexOf('.');
    return dot > 0 && host.length - dot > 2;
  }

  var required = [
    { id: 'brief-name', label: 'Name', need: 'your name', empty: 'Add your name so we know who to write back to.' },
    { id: 'brief-email', label: 'Email', need: 'your email', empty: 'Add the email we should reply to.', invalid: 'That email doesn’t look complete. Check the @ and the ending.', needInvalid: 'a complete email address' },
    { id: 'brief-business', label: 'Business', need: 'the business name', empty: 'Add the name of the business.' },
    { id: 'brief-domain', label: 'Domain', need: 'the domain you own', empty: 'Add the domain you own, like yourbusiness.com.' },
    { id: 'brief-goal', label: 'What the page should do', need: 'what the page should do', empty: 'Tell us what the page should do.' }
  ];

  var optional = [
    { id: 'brief-offer', label: 'One-line offer' },
    { id: 'brief-audience', label: 'Who it’s for' },
    { id: 'brief-proof', label: 'Proof point' },
    { id: 'brief-leave', label: 'Leave off' },
    { id: 'brief-photos', label: 'Photos link' },
    { id: 'brief-video', label: 'Video link' },
    { id: 'brief-animation', label: 'Animation link' },
    { id: 'brief-brand', label: 'Logo or color' }
  ];

  function input(id) { return document.getElementById(id); }
  function valueOf(id) { return input(id).value.trim(); }

  function problemWith(item) {
    var value = valueOf(item.id);
    if (!value) return item.empty;
    if (item.invalid && !looksLikeEmail(value)) return item.invalid;
    return '';
  }

  function needFor(item) {
    return item.needInvalid && valueOf(item.id) ? item.needInvalid : item.need;
  }

  function mark(item, message) {
    var field = input(item.id);
    var error = document.getElementById(item.id + '-error');
    if (message) {
      field.setAttribute('aria-invalid', 'true');
      error.textContent = message;
    } else {
      field.removeAttribute('aria-invalid');
      error.textContent = '';
    }
  }

  function joinNeeds(items) {
    var parts = items.map(needFor);
    if (parts.length < 2) return parts.join('');
    return parts.slice(0, -1).join(', ') + ' and ' + parts[parts.length - 1];
  }

  function stillNeeded(items) {
    return items.length ? 'Before your email app opens, we still need ' + joinNeeds(items) + '.' : '';
  }

  required.forEach(function (item) {
    input(item.id).addEventListener('input', function () {
      if (input(item.id).getAttribute('aria-invalid') !== 'true' || problemWith(item)) return;
      mark(item, '');
      var open = required.filter(function (other) {
        return input(other.id).getAttribute('aria-invalid') === 'true';
      });
      statusLine.textContent = stillNeeded(open);
    });
  });

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    var problems = [];
    required.forEach(function (item) {
      var message = problemWith(item);
      mark(item, message);
      if (message) problems.push(item);
    });

    if (problems.length) {
      statusLine.textContent = stillNeeded(problems);
      input(problems[0].id).focus();
      return;
    }

    statusLine.textContent = '';

    var lines = ['A new brief from the landing page.', ''];
    required.concat(optional).forEach(function (item) {
      var value = valueOf(item.id);
      if (value) lines.push(item.label + ': ' + value, '');
    });

    var subject = 'Landing page brief: ' + valueOf('brief-business') +
      ' (' + valueOf('brief-domain') + ') from ' + valueOf('brief-name');

    window.location.href = 'mailto:mooneydzander@gmail.com' +
      '?subject=' + encodeURIComponent(subject) +
      '&body=' + encodeURIComponent(lines.join('\r\n').trim());
  });
})();
