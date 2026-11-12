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
