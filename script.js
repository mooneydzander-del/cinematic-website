/* Landing Page Rocket — scroll-driven depth, star layers, reveals, and the mailto intake. */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var vw = window.innerWidth;
  var vh = window.innerHeight;

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

  /* ---------- Scene parallax ---------- */

  var scenes = Array.prototype.slice.call(document.querySelectorAll('.scene'));
  var visible = new Set();
  var altFill = document.querySelector('.alt-fill');

  if ('IntersectionObserver' in window) {
    var sceneObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) visible.add(e.target);
        else visible.delete(e.target);
      });
      requestFrame();
    }, { rootMargin: '30% 0px 30% 0px' });
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

    // Read phase: measure every visible scene before writing any styles.
    var updates = [];
    visible.forEach(function (scene) {
      var r = scene.getBoundingClientRect();
      // p = 0 when the scene's centre sits at the viewport centre; ±1 per viewport height away.
      var p = (vh / 2 - (r.top + r.height / 2)) / vh;
      if (scene.classList.contains('hero')) p = -r.top / vh; // hero starts at rest at the top
      updates.push([scene, p]);
    });
    var max = document.documentElement.scrollHeight - vh;

    // Write phase.
    updates.forEach(function (u) {
      var p = still ? 0 : u[1];
      u[0].style.setProperty('--p', p.toFixed(4));
      u[0].style.setProperty('--y', (p * vh).toFixed(1));
    });

    starLayers.forEach(function (layer) {
      var offset = still ? 0 : (sy * layer.factor) % layer.tile;
      layer.canvas.style.transform = 'translate3d(0,' + (-offset).toFixed(1) + 'px,0)';
    });

    if (altFill) {
      altFill.style.transform = 'scaleY(' + (max > 0 ? Math.min(sy / max, 1) : 0).toFixed(4) + ')';
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

  var hero = document.querySelector('.hero');
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
      if (reduceMotion.matches) return;
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
    }, { rootMargin: '0px 0px -12% 0px', threshold: .15 });
    Array.prototype.forEach.call(reveals, function (el) { revealObserver.observe(el); });
  } else {
    Array.prototype.forEach.call(reveals, function (el) { el.classList.add('in'); });
  }

  /* ---------- Intake form → mailto ---------- */

  var form = document.getElementById('intake-form');
  if (form) {
    var status = document.getElementById('intake-status');
    var fields = ['name', 'email', 'business', 'domain', 'goal'].map(function (n) {
      return form.elements[n];
    });

    form.addEventListener('input', function (e) {
      if (e.target && e.target.setCustomValidity) e.target.setCustomValidity('');
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      // `required` lets whitespace through; treat blank-after-trim as empty.
      fields.forEach(function (f) {
        f.setCustomValidity(f.value.trim() ? '' : 'Please fill this in.');
      });
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      var v = fields.map(function (f) { return f.value.trim(); });
      var subject = 'Landing page intake: ' + v[2];
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
        status.textContent = 'Your email app should open now with a message to mooneydzander@gmail.com and your answers filled in. Give it a look and press send. If nothing opened, you can email that address directly.';
      }
    });
  }

  /* ---------- Go ---------- */

  paintStars();
  frame();
})();
