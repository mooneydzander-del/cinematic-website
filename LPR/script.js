(function () {
  'use strict';

  var root = document.documentElement;
  var still = window.matchMedia('(prefers-reduced-motion: reduce)');
  root.classList.add('js');

  /* Reveal: fade copy in as each screen arrives. */
  var reveals = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -10% 0px' });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('in'); });
  }

  /* Parallax: layers drift against normal document scroll. Nothing is pinned. */
  var layers = Array.prototype.map.call(document.querySelectorAll('[data-depth]'), function (el) {
    return { el: el, screen: el.closest('.screen'), depth: parseFloat(el.getAttribute('data-depth')) || 0 };
  });
  var queued = false;

  function paint() {
    queued = false;
    var vh = window.innerHeight;
    layers.forEach(function (l) {
      var box = l.screen.getBoundingClientRect();
      if (box.bottom < -vh || box.top > vh * 2) return;
      var offset = (box.top + box.height / 2 - vh / 2) * -l.depth;
      l.el.style.transform = 'translate3d(0,' + offset.toFixed(1) + 'px,0)';
    });
  }

  function queue() {
    if (!queued) {
      queued = true;
      window.requestAnimationFrame(paint);
    }
  }

  function motion() {
    if (still.matches) {
      window.removeEventListener('scroll', queue);
      window.removeEventListener('resize', queue);
      layers.forEach(function (l) { l.el.style.transform = ''; });
    } else {
      window.addEventListener('scroll', queue, { passive: true });
      window.addEventListener('resize', queue);
      queue();
    }
  }

  motion();
  if (still.addEventListener) still.addEventListener('change', motion);

  /* The brief: check required fields in the page, then open mailto. */
  var form = document.getElementById('brief-form');
  var status = document.getElementById('brief-status');
  var fields = Array.prototype.slice.call(form.querySelectorAll('input, textarea'));
  form.noValidate = true;

  function problem(el) {
    var v = el.value.trim();
    if (el.required && !v) return 'Required.';
    if (v && el.type === 'email' && !el.validity.valid) return 'That doesn’t look like an email address.';
    return '';
  }

  function mark(el, msg) {
    var id = el.id + '-err';
    var err = document.getElementById(id);
    if (!err) {
      err = document.createElement('span');
      err.className = 'err';
      err.id = id;
      el.parentNode.appendChild(err);
      el.setAttribute('aria-describedby', id);
    }
    err.textContent = msg;
    if (msg) el.setAttribute('aria-invalid', 'true');
    else el.removeAttribute('aria-invalid');
  }

  form.addEventListener('input', function (e) {
    var el = e.target;
    if (el.getAttribute('aria-invalid') && !problem(el)) mark(el, '');
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var bad = fields.filter(function (el) {
      var msg = problem(el);
      mark(el, msg);
      return msg;
    });

    if (bad.length) {
      status.textContent = 'Still needed: ' + bad.map(function (el) { return el.getAttribute('data-label'); }).join(', ') + '.';
      bad[0].focus();
      return;
    }
    status.textContent = '';

    var value = function (name) { return form.elements[name].value.trim(); };
    var body = fields.filter(function (el) { return el.value.trim(); }).map(function (el) {
      return el.getAttribute('data-label') + ':\r\n' + el.value.trim();
    }).join('\r\n\r\n');
    var subject = 'Brief: ' + value('business') + ' (' + value('domain') + ')';

    window.location.href = 'mailto:mooneydzander@gmail.com' +
      '?subject=' + encodeURIComponent(subject) +
      '&body=' + encodeURIComponent(body + '\r\n');
  });
})();
