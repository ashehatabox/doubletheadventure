/* Memory match with the book covers: turn two cards, keep them if they're the same book. */
(function () {
  'use strict';
  var P = window.Play;
  if (!P || P.cfg.game !== 'memory') return;
  var cfg = P.cfg, T = P.T, el = P.el;
  try { if (!cfg.pairs) cfg.pairs = Number(new URLSearchParams(location.search).get('pairs')) || 0; } catch (e) { /* old browser */ }
  var ASPECT = 1440 / 900; // cover height / width

  function pickSize() {
    P.setQuery('pairs', null);
    P.choose(T.pickPairs, cfg.sizes.map(function (n) {
      return { label: n * 2 + ' ' + T.cards, sub: n === 3 ? '★' : n === 6 ? '★★' : '★★★', onPick: function () { play(n); } };
    }));
  }

  function play(n) {
    P.setQuery('pairs', n);
    P.clear(P.stage); P.clear(P.tools); P.clear(P.actions);
    var books = P.shuffle(cfg.cards.slice()).slice(0, n);
    var deck = P.shuffle(books.concat(books).map(function (b) { return b; }));
    var grid = el('div', { class: 'pmem' });
    var counter = el('span', { class: 'pmem-count', 'aria-live': 'polite' });
    P.actions.appendChild(counter);
    var turns = 0, open = [], found = 0, busy = false;
    function count() { counter.textContent = T.moves + ': ' + turns; }
    count();

    deck.forEach(function (b, i) {
      var card = el('button', { type: 'button', class: 'pmem-card', 'aria-label': (i + 1) + '' }, [
        el('span', { class: 'pmem-inner' }, [
          el('span', { class: 'pmem-back', 'aria-hidden': 'true' }, [el('img', { src: '/images/brand/mark.png', alt: '' })]),
          el('span', { class: 'pmem-front' }, [el('img', { src: b.cover, alt: '' })])
        ])
      ]);
      card._book = b; card._n = String(i + 1);
      card.addEventListener('click', function () {
        if (busy || card.classList.contains('is-open')) return;
        card.classList.add('is-open');
        card.setAttribute('aria-label', b.title);
        open.push(card);
        if (open.length < 2) return;
        turns++; count();
        var a = open[0], c = open[1]; open = [];
        if (a._book.slug === c._book.slug) {
          a.classList.add('is-matched'); c.classList.add('is-matched');
          a.disabled = c.disabled = true;
          found++;
          if (found === n) setTimeout(won, 600);
        } else {
          busy = true;
          setTimeout(function () {
            a.classList.remove('is-open'); c.classList.remove('is-open');
            a.setAttribute('aria-label', a._n); c.setAttribute('aria-label', c._n);
            busy = false;
          }, 1000);
        }
      });
      grid.appendChild(card);
    });
    P.stage.appendChild(grid);

    // Biggest cards that fit the screen.
    function fit() {
      var W = P.stage.clientWidth - 16, H = P.stage.clientHeight - 16, gap = 10, best = { w: 0, cols: 2 };
      for (var cols = 2; cols <= deck.length; cols++) {
        var rows = Math.ceil(deck.length / cols);
        var w = Math.min((W - gap * (cols - 1)) / cols, ((H - gap * (rows - 1)) / rows) / ASPECT);
        if (w > best.w) best = { w: w, cols: cols };
      }
      grid.style.gridTemplateColumns = 'repeat(' + best.cols + ',' + Math.floor(best.w) + 'px)';
    }
    fit();
    window.addEventListener('resize', fit);

    function won() {
      var end = P.finish(T.memoryWin + ' ' + T.moves + ': ' + turns, {
        books: books,
        buttons: [
          P.button('again', T.playAgain, function () { end.close(); play(n); }),
          P.button('pages', T.pickPairs, function () { end.close(); pickSize(); })
        ]
      });
    }
  }

  P.warm(cfg.cards.map(function (c) { return c.cover; }));
  if (cfg.sizes.indexOf(cfg.pairs) >= 0) play(cfg.pairs); else pickSize();
})();
