// Small progressive enhancements. Every form and filter also works without JavaScript.
(function () {
  // Forms send in the background and show their thank-you line in place.
  document.querySelectorAll('form[data-ajax]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      if (!window.fetch || !window.URLSearchParams) return;
      e.preventDefault();
      var ok = form.querySelector('[data-ok]');
      var bad = form.querySelector('[data-bad]');
      var button = form.querySelector('button[type="submit"]');
      if (ok) ok.hidden = true;
      if (bad) bad.hidden = true;
      if (button) button.disabled = true;
      fetch(form.action, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(new FormData(form)).toString()
      })
        .then(function (res) { return res.json().catch(function () { return { ok: false }; }); })
        .then(function (data) {
          if (data.ok) {
            if (ok) ok.hidden = false;
            form.reset();
          } else if (bad) {
            bad.hidden = false;
          }
        })
        .catch(function () { if (bad) bad.hidden = false; })
        .then(function () { if (button) button.disabled = false; });
    });
  });

  // Catalog filter: switch moments without reloading the page.
  var filter = document.querySelector('[data-filter]');
  var grids = Array.prototype.slice.call(document.querySelectorAll('[data-books]'));
  if (filter && grids.length && window.history && history.replaceState) {
    var none = document.querySelector('[data-none]');
    var cards = [];
    grids.forEach(function (g) { cards = cards.concat(Array.prototype.slice.call(g.children)); });
    filter.addEventListener('click', function (e) {
      var pill = e.target.closest('[data-moment]');
      if (!pill) return;
      e.preventDefault();
      var moment = pill.getAttribute('data-moment');
      var shown = 0;
      cards.forEach(function (card) {
        var match = !moment || card.getAttribute('data-moments').split(' ').indexOf(moment) !== -1;
        card.hidden = !match;
        if (match) shown++;
      });
      filter.querySelectorAll('[data-moment]').forEach(function (p) { p.setAttribute('aria-current', p === pill ? 'true' : 'false'); });
      if (none) none.hidden = shown > 0;
      grids.forEach(function (g) {
        var group = g.closest('[data-group]');
        if (group) group.hidden = !Array.prototype.some.call(g.children, function (c) { return !c.hidden; });
      });
      history.replaceState(null, '', pill.getAttribute('href'));
    });
  }
})();

// Values map: tap a pin to show its culture and book.
(function () {
  var map = document.querySelector('[data-vmap]');
  if (!map) return;
  var pins = map.querySelectorAll('.vmap-pin'), panels = map.querySelectorAll('.vmap-panel');
  if (!pins.length) return;
  map.classList.add('is-js');
  function show(key) {
    pins.forEach(function (p) { p.setAttribute('aria-current', p.getAttribute('data-key') === key ? 'true' : 'false'); });
    panels.forEach(function (p) { p.classList.toggle('is-on', p.getAttribute('data-key') === key); });
  }
  pins.forEach(function (p) { p.addEventListener('click', function (e) { e.preventDefault(); show(p.getAttribute('data-key')); }); });
  show(pins[0].getAttribute('data-key'));
})();

// Values map, full screen: every book as a pin; scroll or pinch to zoom, drag to pan, tap a pin for its book.
(function () {
  var dlg = document.querySelector('[data-fmap]');
  var openers = document.querySelectorAll('[data-fmap-open]');
  if (!dlg || typeof dlg.showModal !== 'function') return;
  var view = dlg.querySelector('[data-fmap-view]'), stage = dlg.querySelector('[data-fmap-stage]');
  var card = dlg.querySelector('[data-fmap-card]'), pins = dlg.querySelectorAll('.fpin'), gos = dlg.querySelectorAll('[data-go]');
  var W0 = 1000, H0 = W0 / (parseFloat(stage.style.aspectRatio) || 2.2552);
  var st = { s: 1, x: 0, y: 0 }, minS = 0.2, maxS = 14, sized = false;
  var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // The map is resized, not stretched, so its coastlines stay thin and the pins keep their size.
  function dims() { var r = view.getBoundingClientRect(); return { w: r.width, h: r.height, W: W0, H: H0 }; }
  function clamp() {
    var d = dims(), sw = d.W * st.s, sh = d.H * st.s;
    st.x = sw <= d.w ? (d.w - sw) / 2 : Math.min(0, Math.max(d.w - sw, st.x));
    st.y = sh <= d.h ? (d.h - sh) / 2 : Math.min(0, Math.max(d.h - sh, st.y));
  }
  function apply() { clamp(); stage.style.width = (W0 * st.s) + 'px'; stage.style.transform = 'translate(' + st.x + 'px,' + st.y + 'px)'; }
  function fit() { fitCalc(); apply(); }
  function fitCalc() {
    var d = dims(); minS = Math.min(d.w / d.W, d.h / d.H);
    st.s = d.w / d.h > 1.2 ? minS : Math.max(minS, Math.min(d.h / d.H, minS * 2.4)); st.x = (d.w - d.W * st.s) / 2; st.y = (d.h - d.H * st.s) / 2;
  }
  function zoomAt(f, cx, cy) {
    var ns = Math.max(minS, Math.min(maxS, st.s * f)); if (ns === st.s) return;
    st.x = cx - (cx - st.x) * ns / st.s; st.y = cy - (cy - st.y) * ns / st.s; st.s = ns; if (!noApply) apply();
  }
  var noApply = false;
  function fly(fn) {
    var from = { s: st.s, x: st.x, y: st.y }; fn(); clamp();
    var to = { s: st.s, x: st.x, y: st.y };
    if (still) return apply();
    var t0 = null;
    function step(t) {
      if (!t0) t0 = t; var k = Math.min(1, (t - t0) / 450), e = 1 - Math.pow(1 - k, 3);
      st.s = from.s + (to.s - from.s) * e; st.x = from.x + (to.x - from.x) * e; st.y = from.y + (to.y - from.y) * e; apply();
      if (k < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  function select(i, move) {
    pins.forEach(function (p) { p.setAttribute('aria-current', p.getAttribute('data-i') === String(i) ? 'true' : 'false'); });
    gos.forEach(function (g) { g.setAttribute('aria-current', g.getAttribute('data-go') === String(i) ? 'true' : 'false'); });
    var tpl = dlg.querySelector('template[data-card="' + i + '"]');
    if (tpl) { card.innerHTML = ''; card.appendChild(tpl.content.cloneNode(true)); }
    if (move) {
      var p = dlg.querySelector('.fpin[data-i="' + i + '"]'), d = dims();
      var px = parseFloat(p.style.left) / 100 * d.W, py = parseFloat(p.style.top) / 100 * d.H; // in unscaled map px
      fly(function () { st.s = Math.max(st.s, Math.min(maxS, minS * 5)); st.x = d.w / 2 - px * st.s; st.y = d.h / 2 - py * st.s; });
    }
  }
  function open(e) {
    if (e) e.preventDefault();
    dlg.showModal(); if (!sized) { fit(); sized = true; }
    if (location.hash !== '#explore') history.replaceState(null, '', '#explore');
  }
  openers.forEach(function (o) { o.addEventListener('click', open); });
  dlg.querySelector('[data-fmap-close]').addEventListener('click', function () { dlg.close(); });
  dlg.addEventListener('close', function () { if (location.hash === '#explore') history.replaceState(null, '', location.pathname + location.search); });
  window.addEventListener('resize', function () { if (dlg.open) fit(); });
  pins.forEach(function (p) { p.addEventListener('click', function () { if (!moved) select(p.getAttribute('data-i'), false); }); });
  gos.forEach(function (g) { g.addEventListener('click', function () { select(g.getAttribute('data-go'), true); }); });
  dlg.querySelectorAll('[data-z]').forEach(function (b) {
    b.addEventListener('click', function () {
      var d = dims(), z = b.getAttribute('data-z');
      fly(function () { noApply = true; if (z === 'reset') fitCalc(); else zoomAt(z === 'in' ? 1.6 : 1 / 1.6, d.w / 2, d.h / 2); noApply = false; });
    });
  });
  view.addEventListener('wheel', function (e) {
    e.preventDefault(); var r = view.getBoundingClientRect();
    zoomAt(Math.exp(-e.deltaY * 0.0015), e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });
  var pts = {}, last = null, moved = false;
  view.addEventListener('pointerdown', function (e) {
    pts[e.pointerId] = { x: e.clientX, y: e.clientY }; moved = false; last = null;
    view.setPointerCapture(e.pointerId); view.classList.add('is-dragging');
  });
  view.addEventListener('pointermove', function (e) {
    if (!pts[e.pointerId]) return;
    var prev = pts[e.pointerId]; pts[e.pointerId] = { x: e.clientX, y: e.clientY };
    var ids = Object.keys(pts), r = view.getBoundingClientRect();
    if (ids.length === 1) {
      var dx = e.clientX - prev.x, dy = e.clientY - prev.y;
      if (Math.abs(dx) + Math.abs(dy) > 1) moved = true;
      st.x += dx; st.y += dy; apply();
    } else if (ids.length === 2) {
      var a = pts[ids[0]], b = pts[ids[1]], dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (last) { zoomAt(dist / last, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top); moved = true; }
      last = dist;
    }
  });
  function up(e) { delete pts[e.pointerId]; last = null; if (!Object.keys(pts).length) view.classList.remove('is-dragging'); }
  view.addEventListener('pointerup', up); view.addEventListener('pointercancel', up);
  dlg.addEventListener('keydown', function (e) {
    var d = dims(), k = e.key;
    if (k === '+' || k === '=') zoomAt(1.4, d.w / 2, d.h / 2);
    else if (k === '-') zoomAt(1 / 1.4, d.w / 2, d.h / 2);
    else if (/^Arrow/.test(k) && e.target === dlg) { st.x += k === 'ArrowLeft' ? 60 : k === 'ArrowRight' ? -60 : 0; st.y += k === 'ArrowUp' ? 60 : k === 'ArrowDown' ? -60 : 0; apply(); }
  });
  if (location.hash === '#explore') open();
})();

// Article contents: open beside the text on wide screens, folded on phones.
(function () {
  var toc = document.querySelector('[data-toc]');
  if (toc && window.matchMedia('(min-width: 901px)').matches) toc.open = true;
})();

// Play area: let the games work offline once opened. Only registered on Play pages.
(function () {
  if (!('serviceWorker' in navigator) || !/^(\/fr)?\/play(\/|$)/.test(location.pathname)) return;
  window.addEventListener('load', function () { navigator.serviceWorker.register('/sw.js').catch(function () {}); });
})();

// Print buttons (teacher guides)
document.querySelectorAll('[data-print]').forEach(function (b) { b.addEventListener('click', function () { window.print(); }); });

// Read-aloud player: nothing loads from YouTube until a visitor presses play.
document.querySelectorAll('[data-ra]').forEach(function (box) {
  var stage = box.querySelector('[data-ra-stage]');
  var langs = box.querySelectorAll('[data-ra-lang]');
  function current() { return box.querySelector('[data-ra-lang].is-on') || langs[0]; }
  function load(btn, autoplay) {
    var yt = btn.getAttribute('data-youtube'), file = btn.getAttribute('data-file');
    stage.innerHTML = '';
    if (yt) {
      var f = document.createElement('iframe');
      f.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(yt) + '?rel=0&playsinline=1' + (autoplay ? '&autoplay=1' : '');
      f.title = 'Read-aloud video';
      f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      f.allowFullscreen = true;
      f.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
      stage.appendChild(f);
    } else if (file) {
      var v = document.createElement('video');
      v.src = file; v.controls = true; v.playsInline = true; v.preload = 'metadata';
      stage.appendChild(v);
      if (autoplay) v.play().catch(function () {});
    }
  }
  var play = box.querySelector('[data-ra-play]');
  if (play) play.addEventListener('click', function () { load(current(), true); });
  langs.forEach(function (btn) {
    if (btn.hidden) return;
    btn.addEventListener('click', function () {
      langs.forEach(function (b) { b.classList.remove('is-on'); b.setAttribute('aria-pressed', 'false'); });
      btn.classList.add('is-on'); btn.setAttribute('aria-pressed', 'true');
      if (!stage.querySelector('[data-ra-play]')) load(btn, true);
    });
  });
});
