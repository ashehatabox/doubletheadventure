/* Shared bits for the Play area games: config, buttons, the choose screen and the "well done" screen.
   No tracking, no storage of anything about the child. */
(function () {
  'use strict';
  var root = document.getElementById('game');
  if (!root) return;
  var cfg = JSON.parse(root.getAttribute('data-config') || '{}');
  var T = cfg.text || {};

  var ICONS = {
    fill: '<path d="M5 13l7-7 7 7-7 7z" fill="currentColor" opacity=".25"/><path d="M5 13l7-7 7 7-7 7zM19 15s2 2.3 2 3.5a2 2 0 0 1-4 0c0-1.2 2-3.5 2-3.5z"/>',
    brush: '<path d="M18 3l3 3-9 9-3-3zM9 12c-3 0-4 2-4 4s-1 3-2 3c3 1 7 0 8-3"/>',
    undo: '<path d="M9 7L4 12l5 5M4 12h11a5 5 0 0 1 0 10h-3"/>',
    clear: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    save: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
    print: '<path d="M7 9V4h10v5M7 17H5a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-2M7 14h10v6H7z"/>',
    done: '<path d="M5 12l5 5 9-10"/>',
    eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    again: '<path d="M4 12a8 8 0 1 0 3-6.2M4 4v5h5"/>',
    book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 21V5M8 7h7"/>',
    pages: '<rect x="4" y="3" width="12" height="16" rx="2"/><path d="M8 21h10a2 2 0 0 0 2-2V7"/>'
  };

  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'text') n.textContent = attrs[k];
      else if (k === 'html') n.innerHTML = attrs[k];
      else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2), attrs[k]);
      else n.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return n;
  }

  function icon(name) {
    return '<svg aria-hidden="true" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' + (ICONS[name] || '') + '</svg>';
  }

  // A big tool button with an icon and a short label.
  function button(name, label, onClick, cls) {
    return el('button', { type: 'button', class: 'pbtn ' + (cls || ''), 'aria-label': label, onclick: onClick, html: icon(name) + '<span>' + esc(label) + '</span>' });
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }

  var stage = document.getElementById('play-stage');
  var tools = document.getElementById('play-tools');
  var actions = document.getElementById('play-actions');

  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }

  // A screen of big choices (pieces, pages, number of cards). Each option: { label, sub, img, onPick }.
  function choose(title, options, wide) {
    clear(stage); clear(tools); clear(actions);
    var list = el('div', { class: 'pchoose-list' + (wide ? ' is-wide' : '') });
    options.forEach(function (o) {
      list.appendChild(el('button', { type: 'button', class: 'pchoose-item', onclick: o.onPick }, [
        o.img ? el('span', { class: 'pchoose-img' + (o.lineart ? ' is-lineart' : '') }, [el('img', { src: o.img, alt: '' })]) : null,
        el('span', { class: 'pchoose-label', text: o.label }),
        o.sub ? el('span', { class: 'pchoose-sub', text: o.sub }) : null
      ]));
    });
    stage.appendChild(el('div', { class: 'pchoose' }, [el('h1', { class: 'pchoose-title', text: title }), list]));
  }

  // The end of every game: praise, the book, and what to do next.
  function finish(message, extra) {
    extra = extra || {};
    confetti();
    var b = cfg.book;
    var box = el('div', { class: 'pend-card', role: 'dialog', 'aria-modal': 'true', 'aria-label': T.wellDone });
    box.appendChild(el('p', { class: 'pend-title', text: T.wellDone }));
    box.appendChild(el('p', { class: 'pend-msg', text: message }));
    if (extra.image) box.appendChild(el('img', { class: 'pend-picture', src: extra.image, alt: '' }));
    if (b) {
      box.appendChild(el('a', { class: 'pend-book', href: b.href }, [
        b.cover ? el('img', { src: b.cover, alt: '' }) : null,
        el('span', {}, [el('strong', { text: b.title }), el('span', { class: 'pend-book-cta', html: icon('book') + esc(T.readBook) })])
      ]));
    }
    if (extra.books) {
      box.appendChild(el('p', { class: 'pend-sub', text: T.matched }));
      var row = el('div', { class: 'pend-books' });
      extra.books.forEach(function (c) { row.appendChild(el('a', { href: c.href, title: c.title }, [el('img', { src: c.cover, alt: c.title })])); });
      box.appendChild(row);
    }
    var nav = el('div', { class: 'pend-actions' });
    (extra.buttons || []).forEach(function (x) { nav.appendChild(x); });
    nav.appendChild(el('a', { class: 'pbtn is-ghost', href: cfg.playHref, html: icon('pages') + '<span>' + esc(T.otherGames) + '</span>' }));
    box.appendChild(nav);
    var overlay = el('div', { class: 'pend' }, [box]);
    root.appendChild(overlay);
    var first = box.querySelector('a,button');
    if (first) first.focus();
    return { close: function () { overlay.remove(); } };
  }

  function confetti() {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var c = el('canvas', { class: 'pconfetti', 'aria-hidden': 'true' });
    root.appendChild(c);
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = c.width = innerWidth * dpr, h = c.height = innerHeight * dpr;
    var ctx = c.getContext('2d');
    var colors = ['#D9381E', '#FFC93C', '#0E7C7B', '#9FD3F0', '#A8DDA8', '#FFB3B3', '#CDB8F2'];
    var bits = [];
    for (var i = 0; i < 120; i++) bits.push({ x: Math.random() * w, y: -Math.random() * h * 0.5, vx: (Math.random() - 0.5) * 4 * dpr, vy: (2 + Math.random() * 4) * dpr, s: (6 + Math.random() * 8) * dpr, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3, c: colors[i % colors.length] });
    var t0 = performance.now();
    (function frame(t) {
      ctx.clearRect(0, 0, w, h);
      bits.forEach(function (b) {
        b.x += b.vx; b.y += b.vy; b.vy += 0.05 * dpr; b.r += b.vr;
        ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.r); ctx.fillStyle = b.c; ctx.fillRect(-b.s / 2, -b.s / 4, b.s, b.s / 2); ctx.restore();
      });
      if (t - t0 < 3500) requestAnimationFrame(frame); else c.remove();
    })(t0);
  }

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var x = a[i]; a[i] = a[j]; a[j] = x; }
    return a;
  }

  function loadImage(src) {
    return new Promise(function (ok, fail) { var i = new Image(); i.onload = function () { ok(i); }; i.onerror = fail; i.src = src; });
  }

  // Keeps the URL in step with the choice so "back" and sharing work, without reloading.
  function setQuery(key, value) {
    try {
      var u = new URL(location.href);
      if (value == null) u.searchParams.delete(key); else u.searchParams.set(key, value);
      history.replaceState(null, '', u.pathname + u.search);
    } catch (e) { /* old browser: fine */ }
  }

  // Fetch pictures in the background so the whole game works offline later.
  function warm(urls) {
    if (!('serviceWorker' in navigator) || !window.fetch) return;
    setTimeout(function () { urls.forEach(function (u) { fetch(u).catch(function () {}); }); }, 1500);
  }

  window.Play = { warm: warm, cfg: cfg, T: T, el: el, icon: icon, button: button, choose: choose, finish: finish, shuffle: shuffle, loadImage: loadImage, clear: clear, setQuery: setQuery, stage: stage, tools: tools, actions: actions, root: root };
})();
