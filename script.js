/* Landing Page Rocket — pinned launch, scroll-driven depth, star layers, reel HUD, reveals, and the mailto intake. */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var vw = window.innerWidth;
  var vh = window.innerHeight;

  function clamp(n, lo, hi) { return n < lo ? lo : n > hi ? hi : n; }
  function mod(n, m) { return ((n % m) + m) % m; }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  /* ---------- Star layers (fixed canvases, wrapped vertically) ---------- */

  var starLayers = Array.prototype.map.call(document.querySelectorAll('.stars'), function (c) {
    return {
      canvas: c,
      factor: parseFloat(c.dataset.f) || 0,
      count: parseInt(c.dataset.n, 10) || 100,
      radius: parseFloat(c.dataset.r) || 1,
      seed: parseInt(c.dataset.seed, 10) || 1,
      tile: vh
    };
  });

  function seeded(seed) {
    var s = seed % 2147483647;
    if (s <= 0) s += 2147483646;
    return function () {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
  }

  function paintStars() {
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    var w = window.innerWidth;
    var h = window.innerHeight;
    var density = Math.min((w * h) / (1440 * 900), 1.6);

    starLayers.forEach(function (layer) {
      var c = layer.canvas;
      c.style.height = (h * 2) + 'px';
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * 2 * dpr);
      var ctx = c.getContext('2d');
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h * 2);

      var rand = seeded(layer.seed);
      var n = Math.round(layer.count * Math.max(density, .35));
      for (var i = 0; i < n; i++) {
        var x = rand() * w;
        var y = rand() * h;
        var r = (.35 + rand() * .65) * layer.radius;
        var a = .3 + rand() * .7;
        var tint = rand();
        var color = tint > .9 ? '255,200,150' : tint > .78 ? '170,190,255' : '255,255,255';

        // Draw each star twice (one tile below the other) so the layer can wrap seamlessly.
        for (var k = 0; k < 2; k++) {
          var yy = y + k * h;
          if (r > 1.3) {
            var g = ctx.createRadialGradient(x, yy, 0, x, yy, r * 5);
            g.addColorStop(0, 'rgba(' + color + ',' + (a * .35) + ')');
            g.addColorStop(1, 'rgba(' + color + ',0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(x, yy, r * 5, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.fillStyle = 'rgba(' + color + ',' + a + ')';
          ctx.beginPath();
          ctx.arc(x, yy, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      layer.tile = h;
    });
  }

  /* ---------- Scroll-driven scenes ---------- */

  var hero = document.querySelector('.hero');
  var scenes = Array.prototype.slice.call(document.querySelectorAll('.scene'));
  var visible = new Set();
  var heroVisible = true;

  var hudFill = document.querySelector('.hud-fill');
  var hudSc = document.querySelector('.hud-sc');
  var hudTc = document.querySelector('.hud-tc');
  var lastSc = '';
  var lastTc = '';
  var RUNTIME = 96;   // the whole page plays as a 1:36 reel
  var FPS = 24;

  if ('IntersectionObserver' in window) {
    var sceneObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.target === hero) heroVisible = e.isIntersecting;
        else if (e.isIntersecting) visible.add(e.target);
        else visible.delete(e.target);
      });
      requestFrame();
    }, { rootMargin: '30% 0px 30% 0px' });
    if (hero) sceneObserver.observe(hero);
    scenes.forEach(function (s) { sceneObserver.observe(s); });
  } else {
    scenes.forEach(function (s) { visible.add(s); });
  }

  var pending = false;
  function requestFrame() {
    if (!pending) {
      pending = true;
      window.requestAnimationFrame(frame);
    }
  }

  function frame() {
    pending = false;
    var still = reduceMotion.matches;
    var sy = window.scrollY || window.pageYOffset || 0;
    var max = document.documentElement.scrollHeight - vh;
    var mid = vh / 2;

    // Read phase: measure everything before writing any styles.
    var hp = 0;
    var travel = 0;
    var current = 1; // the hero is scene 01; the scene crossing the viewport centre overrides it
    if (hero) {
      var hr = hero.getBoundingClientRect();
      travel = hero.offsetHeight - vh;
      if (travel > 0) hp = clamp(-hr.top / travel, 0, 1);
    }

    var updates = [];
    visible.forEach(function (scene) {
      var r = scene.getBoundingClientRect();
      // p = 0 when the scene's centre sits at the viewport centre; ±1 per viewport height away.
      updates.push([scene, (mid - (r.top + r.height / 2)) / vh]);
      if (r.top <= mid && r.bottom > mid) current = scenes.indexOf(scene) + 2;
    });

    // Write phase.
    if (hero) hero.style.setProperty('--hp', still ? '0' : hp.toFixed(4));

    updates.forEach(function (u) {
      var p = still ? 0 : u[1];
      u[0].style.setProperty('--p', p.toFixed(4));
      u[0].style.setProperty('--y', (p * vh).toFixed(1));
    });

    // While the hero is pinned the camera climbs, so the stars sink with the ground.
    // Once the launch is over they resume drifting up behind the scrolling scenes.
    var pinned = still ? 0 : hp * Math.max(travel, 0);
    var starScroll = sy - 2 * pinned;
    starLayers.forEach(function (layer) {
      var offset = still ? 0 : mod(starScroll * layer.factor, layer.tile);
      layer.canvas.style.transform = 'translate3d(0,' + (-offset).toFixed(1) + 'px,0)';
    });

    var progress = max > 0 ? clamp(sy / max, 0, 1) : 0;
    if (hudFill) hudFill.style.transform = 'scaleY(' + progress.toFixed(4) + ')';

    if (hudSc) {
      var sc = 'SC ' + pad2(current);
      if (sc !== lastSc) { hudSc.textContent = sc; lastSc = sc; }
    }
    if (hudTc) {
      var f = Math.round(progress * RUNTIME * FPS);
      var tc = '00:' + pad2(Math.floor(f / (FPS * 60)) % 60) + ':' + pad2(Math.floor(f / FPS) % 60) + ':' + pad2(f % FPS);
      if (tc !== lastTc) { hudTc.textContent = tc; lastTc = tc; }
    }
  }

  window.addEventListener('scroll', requestFrame, { passive: true });

  var resizeTimer;
  window.addEventListener('resize', function () {
    var nw = window.innerWidth;
    var nh = window.innerHeight;
    var widthChanged = nw !== vw;
    // Mobile URL bars nudge the height while scrolling; only repaint stars on a real resize.
    var bigHeightChange = Math.abs(nh - vh) > 120;
    vw = nw;
    vh = nh;
    requestFrame();
    if (widthChanged || bigHeightChange) {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () { paintStars(); requestFrame(); }, 150);
    }
  });

  if (reduceMotion.addEventListener) reduceMotion.addEventListener('change', requestFrame);

  /* ---------- Pointer depth on the hero (fine pointers only) ---------- */

  if (hero && window.matchMedia('(pointer: fine)').matches) {
    var tx = 0, ty = 0, cx = 0, cy = 0, running = false;

    var tick = function () {
      cx += (tx - cx) * .07;
      cy += (ty - cy) * .07;
      hero.style.setProperty('--mx', cx.toFixed(4));
      hero.style.setProperty('--my', cy.toFixed(4));
      if (Math.abs(tx - cx) + Math.abs(ty - cy) > .0008) {
        window.requestAnimationFrame(tick);
      } else {
        running = false;
      }
    };

    window.addEventListener('pointermove', function (e) {
      if (reduceMotion.matches || !heroVisible) return;
      tx = (e.clientX / vw) * 2 - 1;
      ty = (e.clientY / vh) * 2 - 1;
      if (!running) {
        running = true;
        window.requestAnimationFrame(tick);
      }
    }, { passive: true });
  }

  /* ---------- Reveal on scroll ---------- */

  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion.matches) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          revealObserver.unobserve(e.target);
        }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: .15 });
    Array.prototype.forEach.call(reveals, function (el) { revealObserver.observe(el); });
  } else {
    Array.prototype.forEach.call(reveals, function (el) { el.classList.add('in'); });
  }

  /* ---------- Intake form → mailto (no backend, nothing stored) ---------- */

  var form = document.getElementById('intake-form');
  if (form) {
    var status = document.getElementById('intake-status');
    var spec = [
      ['name', 'Please add your name.'],
      ['email', 'Please add your email.'],
      ['business', 'Please add your business name.'],
      ['domain', 'Please add the domain you own, like yourbusiness.com.'],
      ['goal', 'Please say what the page should do.']
    ];
    var fields = spec.map(function (s) { return form.elements[s[0]]; });

    form.addEventListener('input', function (e) {
      var t = e.target;
      if (t && t.setCustomValidity) {
        t.setCustomValidity('');
        t.removeAttribute('aria-invalid');
      }
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (status) status.textContent = '';

      // "required" lets whitespace through, so check the trimmed values ourselves.
      fields.forEach(function (f, i) {
        var v = f.value.trim();
        var msg = v ? '' : spec[i][1];
        if (!msg && f.name === 'domain' && (v.indexOf('.') < 1 || /\s/.test(v))) {
          msg = 'That does not look like a domain. Try something like yourbusiness.com.';
        }
        f.setCustomValidity(msg);
        if (msg || !f.checkValidity()) f.setAttribute('aria-invalid', 'true');
        else f.removeAttribute('aria-invalid');
      });
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      var v = fields.map(function (f) { return f.value.trim(); });
      var subject = 'Landing page intake: ' + v[2] + ' (' + v[3] + ')';
      var body = [
        'Name: ' + v[0],
        'Email: ' + v[1],
        'Business: ' + v[2],
        'Domain they own: ' + v[3],
        '',
        'What the page should do:',
        v[4]
      ].join('\r\n');

      var href = 'mailto:mooneydzander@gmail.com' +
        '?subject=' + encodeURIComponent(subject) +
        '&body=' + encodeURIComponent(body);

      window.location.href = href;

      if (status) {
        status.textContent = 'Your email app should open now with a message to mooneydzander@gmail.com and your answers filled in. Press send there to reach us. Nothing is stored on this page. If nothing opened, email that address directly.';
      }
    });
  }

  /* ---------- Go ---------- */

  paintStars();
  frame();
})();
