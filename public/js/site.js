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
  var grid = document.querySelector('[data-books]');
  if (filter && grid && window.history && history.replaceState) {
    var none = document.querySelector('[data-none]');
    var cards = Array.prototype.slice.call(grid.children);
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
