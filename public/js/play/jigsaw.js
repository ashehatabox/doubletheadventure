/* Jigsaw: a book cover cut into 6, 12 or 24 real jigsaw-shaped pieces.
   Drag a piece near its place and it clicks in. A faint picture on the board helps little ones. */
(function () {
  'use strict';
  var P = window.Play;
  if (!P || P.cfg.game !== 'jigsaw') return;
  var cfg = P.cfg, T = P.T, el = P.el;
  try { if (!cfg.pieces) cfg.pieces = Number(new URLSearchParams(location.search).get('pieces')) || 0; } catch (e) { /* old browser */ }
  var GRIDS = { 6: [2, 3], 12: [3, 4], 24: [4, 6] };

  function pickSize() {
    P.setQuery('pieces', null);
    P.choose(T.pickPieces, cfg.sizes.map(function (n) {
      return { label: n + ' ' + T.pieces, img: cfg.image, sub: n === 6 ? '★' : n === 12 ? '★★' : '★★★', onPick: function () { play(n); } };
    }));
  }

  function play(n) {
    P.setQuery('pieces', n);
    P.clear(P.stage); P.clear(P.tools); P.clear(P.actions);
    P.stage.appendChild(el('p', { class: 'play-loading', text: T.loading }));
    P.loadImage(cfg.image).then(function (img) { build(img, n); });
  }

  // One side of a piece, from (x0,y0) to (x1,y1), going clockwise. dir: 0 flat, 1 tab out, -1 tab in.
  function edge(ctx, x0, y0, x1, y1, dir, tab) {
    if (!dir) { ctx.lineTo(x1, y1); return; }
    var dx = x1 - x0, dy = y1 - y0, len = Math.sqrt(dx * dx + dy * dy), tx = dx / len, ty = dy / len;
    var nx = ty * dir * tab, ny = -tx * dir * tab;
    function p(u, v) { return [x0 + dx * u + nx * v, y0 + dy * u + ny * v]; }
    var a = p(0.36, 0), b1 = p(0.43, 0), b2 = p(0.30, 1.05), b = p(0.5, 1.05), c1 = p(0.70, 1.05), c2 = p(0.57, 0), c = p(0.64, 0);
    ctx.lineTo(a[0], a[1]);
    ctx.bezierCurveTo(b1[0], b1[1], b2[0], b2[1], b[0], b[1]);
    ctx.bezierCurveTo(c1[0], c1[1], c2[0], c2[1], c[0], c[1]);
    ctx.lineTo(x1, y1);
  }

  function build(img, n) {
    var cols = GRIDS[n][0], rows = GRIDS[n][1];
    var IW = img.naturalWidth, IH = img.naturalHeight, cw = IW / cols, ch = IH / rows;
    var tab = Math.min(cw, ch) * 0.22, m = Math.ceil(tab + 4);

    // Which way each inside edge bulges.
    var hEdge = [], vEdge = [];
    for (var r = 0; r < rows - 1; r++) { hEdge[r] = []; for (var c = 0; c < cols; c++) hEdge[r][c] = Math.random() < 0.5 ? 1 : -1; }
    for (r = 0; r < rows; r++) { vEdge[r] = []; for (c = 0; c < cols - 1; c++) vEdge[r][c] = Math.random() < 0.5 ? 1 : -1; }

    var area = el('div', { class: 'pjig' });
    var board = el('div', { class: 'pjig-board' }, [el('img', { src: cfg.image, alt: '' })]);
    area.appendChild(board);
    P.clear(P.stage); P.stage.appendChild(area);

    var pieces = [];
    for (r = 0; r < rows; r++) for (c = 0; c < cols; c++) {
      var top = r === 0 ? 0 : -hEdge[r - 1][c], bottom = r === rows - 1 ? 0 : hEdge[r][c];
      var left = c === 0 ? 0 : -vEdge[r][c - 1], right = c === cols - 1 ? 0 : vEdge[r][c];
      var cv = el('canvas', { class: 'pjig-piece', width: Math.ceil(cw + 2 * m), height: Math.ceil(ch + 2 * m) });
      var ctx = cv.getContext('2d', { willReadFrequently: true });
      ctx.beginPath();
      ctx.moveTo(m, m);
      edge(ctx, m, m, m + cw, m, top, tab);
      edge(ctx, m + cw, m, m + cw, m + ch, right, tab);
      edge(ctx, m + cw, m + ch, m, m + ch, bottom, tab);
      edge(ctx, m, m + ch, m, m, left, tab);
      ctx.closePath();
      ctx.save(); ctx.clip();
      ctx.drawImage(img, m - c * cw, m - r * ch);
      ctx.restore();
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.stroke();
      var piece = { el: cv, ctx: ctx, r: r, c: c, fx: 0, fy: 0, done: false };
      cv._piece = piece;
      pieces.push(piece);
      area.appendChild(cv);
    }

    var L = {}; // layout in px
    function layout() {
      var W = area.clientWidth, H = area.clientHeight;
      var landscape = W > H * 0.9;
      var s = landscape ? Math.min((H * 0.92) / IH, (W * 0.5) / IW) : Math.min((H * 0.58) / IH, (W * 0.8) / IW);
      var bw = IW * s, bh = IH * s;
      var bx = landscape ? Math.max(8, W * 0.04) : (W - bw) / 2, by = landscape ? (H - bh) / 2 : 8;
      L = { W: W, H: H, s: s, bx: bx, by: by, bw: bw, bh: bh, landscape: landscape };
      board.style.cssText = 'left:' + bx + 'px;top:' + by + 'px;width:' + bw + 'px;height:' + bh + 'px';
      var pw = (cw + 2 * m) * s, ph = (ch + 2 * m) * s;
      pieces.forEach(function (p) {
        p.el.style.width = pw + 'px'; p.el.style.height = ph + 'px';
        if (p.done) { p.x = homeX(p); p.y = homeY(p); } else { p.x = p.fx * Math.max(1, W - pw); p.y = p.fy * Math.max(1, H - ph); }
        place(p);
      });
    }
    function homeX(p) { return L.bx + (p.c * cw - m) * L.s; }
    function homeY(p) { return L.by + (p.r * ch - m) * L.s; }
    function place(p) { p.el.style.transform = 'translate(' + p.x + 'px,' + p.y + 'px)'; }

    // Scatter the pieces in the free space beside or under the board.
    function scatter() {
      layout();
      var pw = (cw + 2 * m) * L.s, ph = (ch + 2 * m) * L.s;
      P.shuffle(pieces.slice()).forEach(function (p, i) {
        var x, y;
        if (L.landscape) {
          var fx0 = L.bx + L.bw + 8, span = Math.max(0, L.W - fx0 - pw - 4);
          x = fx0 + Math.random() * span; y = 4 + Math.random() * Math.max(0, L.H - ph - 8);
        } else {
          var fy0 = L.by + L.bh + 4, spanY = Math.max(0, L.H - fy0 - ph - 4);
          x = 4 + Math.random() * Math.max(0, L.W - pw - 8); y = fy0 + Math.random() * spanY;
        }
        p.fx = x / Math.max(1, L.W - pw); p.fy = y / Math.max(1, L.H - ph);
        p.x = x; p.y = y; place(p);
      });
    }
    scatter();
    window.addEventListener('resize', layout);

    // Dragging.
    var z = 10, drag = null, left = pieces.length;
    function solidAt(p, clientX, clientY) {
      var r = p.el.getBoundingClientRect();
      var x = Math.floor((clientX - r.left) * p.el.width / r.width), y = Math.floor((clientY - r.top) * p.el.height / r.height);
      if (x < 0 || y < 0 || x >= p.el.width || y >= p.el.height) return false;
      return p.ctx.getImageData(x, y, 1, 1).data[3] > 20;
    }
    area.addEventListener('pointerdown', function (e) {
      if (!e.isPrimary || drag) return;
      var hit = null;
      var stack = document.elementsFromPoint ? document.elementsFromPoint(e.clientX, e.clientY) : [e.target];
      for (var i = 0; i < stack.length; i++) {
        var p = stack[i]._piece;
        if (p && !p.done && solidAt(p, e.clientX, e.clientY)) { hit = p; break; }
      }
      if (!hit) return;
      e.preventDefault();
      area.setPointerCapture(e.pointerId);
      hit.el.style.zIndex = ++z;
      hit.el.classList.add('is-dragging');
      drag = { p: hit, dx: e.clientX - hit.x, dy: e.clientY - hit.y, id: e.pointerId };
    });
    area.addEventListener('pointermove', function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      var p = drag.p, pw = p.el.offsetWidth, ph = p.el.offsetHeight;
      p.x = Math.min(Math.max(e.clientX - drag.dx, -pw * 0.3), L.W - pw * 0.7);
      p.y = Math.min(Math.max(e.clientY - drag.dy, -ph * 0.3), L.H - ph * 0.7);
      place(p);
    });
    function drop(e) {
      if (!drag || e.pointerId !== drag.id) return;
      var p = drag.p; drag = null;
      p.el.classList.remove('is-dragging');
      var hx = homeX(p), hy = homeY(p), snap = Math.max(22, cw * L.s * 0.28);
      if (Math.abs(p.x - hx) < snap && Math.abs(p.y - hy) < snap) {
        p.done = true; p.x = hx; p.y = hy; place(p);
        p.el.style.zIndex = 1;
        p.el.classList.add('is-done');
        left--;
        if (!left) setTimeout(won, 350);
      } else {
        var pw = p.el.offsetWidth, ph = p.el.offsetHeight;
        p.fx = p.x / Math.max(1, L.W - pw); p.fy = p.y / Math.max(1, L.H - ph);
      }
    }
    area.addEventListener('pointerup', drop);
    area.addEventListener('pointercancel', drop);

    function won() {
      board.classList.add('is-complete');
      var end = P.finish(T.jigsawWin, {
        buttons: [
          P.button('again', T.playAgain, function () { end.close(); play(n); }),
          P.button('pages', T.pickPieces, function () { end.close(); pickSize(); })
        ]
      });
    }

    var peek = P.button('eye', T.peek, function () {
      board.classList.add('is-peek');
      setTimeout(function () { board.classList.remove('is-peek'); }, 1800);
    }, 'is-small');
    P.actions.appendChild(P.button('pages', T.pickPieces, pickSize, 'is-small hide-phone'));
    P.actions.appendChild(peek);
  }

  P.warm([cfg.image]);
  if (GRIDS[cfg.pieces]) play(cfg.pieces); else pickSize();
})();
