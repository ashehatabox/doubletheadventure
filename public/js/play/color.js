/* Coloring game: tap an area to fill it, or paint with the brush. Undo, save, print.
   The page is black line art on white. Areas are found once when the page loads:
   dark pixels (and a 1px border round them, which closes small gaps) are "lines";
   every other connected group of pixels is one area. Line pixels are then shared out
   to the area next to them, so colour runs right under the lines with no white halo. */
(function () {
  'use strict';
  var P = window.Play;
  if (!P || P.cfg.game !== 'color') return;
  var cfg = P.cfg, T = P.T, el = P.el;

  var COLORS = [
    ['#E53935', 'red'], ['#FF8A1F', 'orange'], ['#FFD43B', 'yellow'], ['#A6D93B', 'lime'], ['#3DAE5A', 'green'], ['#0E7C7B', 'teal'],
    ['#7CCBF2', 'sky'], ['#2F6FD6', 'blue'], ['#24325F', 'navy'], ['#8E5BD8', 'purple'], ['#F06FB0', 'pink'], ['#FFB3B3', 'rose'],
    ['#FFC59E', 'peach'], ['#D9A86C', 'sand'], ['#8B5A3C', 'brown'], ['#9AA0A6', 'grey'], ['#2B2B2B', 'black'], ['#FFFFFF', 'white']
  ];

  var state = { color: COLORS[0][0], tool: 'fill', undo: [] };

  function start() {
    var pages = cfg.pages || [];
    if (cfg.start >= 0 || pages.length === 1) return openPage(Math.max(cfg.start, 0));
    pickPage();
  }

  function pickPage() {
    P.setQuery('p', null);
    P.choose(T.pickPage, cfg.pages.map(function (src, i) {
      return { img: src, lineart: true, label: T.page + ' ' + (i + 1), onPick: function () { openPage(i); } };
    }), true);
  }

  function openPage(index) {
    P.setQuery('p', index + 1);
    P.clear(P.stage); P.clear(P.tools); P.clear(P.actions);
    P.stage.appendChild(el('p', { class: 'play-loading', text: T.loading }));
    P.loadImage(cfg.pages[index]).then(function (img) { build(img, index); });
  }

  function build(img, index) {
    var W = img.naturalWidth, H = img.naturalHeight, N = W * H;

    // Line layer: dark pixels stay, white becomes see-through.
    var line = el('canvas', { class: 'pcolor-lines', width: W, height: H, 'aria-hidden': 'true' });
    var lctx = line.getContext('2d', { willReadFrequently: true });
    lctx.drawImage(img, 0, 0);
    var src = lctx.getImageData(0, 0, W, H), d = src.data;
    var mask = new Uint8Array(N);
    for (var i = 0, p = 0; i < N; i++, p += 4) {
      var lum = (d[p] * 299 + d[p + 1] * 587 + d[p + 2] * 114) / 1000;
      var a = 255 - lum;
      if (lum < 165) mask[i] = 1;
      d[p] = d[p + 1] = d[p + 2] = 34; d[p + 3] = a < 18 ? 0 : a;
    }
    lctx.putImageData(src, 0, 0);

    // Close small gaps: grow lines by 1px.
    var grown = mask.slice();
    for (var y = 1; y < H - 1; y++) for (var x = 1; x < W - 1; x++) {
      var k = y * W + x;
      if (!mask[k] && (mask[k - 1] || mask[k + 1] || mask[k - W] || mask[k + W])) grown[k] = 1;
    }

    // Label the areas (4-connected).
    var labels = new Int32Array(N), next = 1, stack = new Int32Array(N);
    for (var s = 0; s < N; s++) {
      if (grown[s] || labels[s]) continue;
      var top = 0; stack[top++] = s; labels[s] = next;
      while (top) {
        var q = stack[--top], qx = q % W;
        if (qx > 0 && !grown[q - 1] && !labels[q - 1]) { labels[q - 1] = next; stack[top++] = q - 1; }
        if (qx < W - 1 && !grown[q + 1] && !labels[q + 1]) { labels[q + 1] = next; stack[top++] = q + 1; }
        if (q >= W && !grown[q - W] && !labels[q - W]) { labels[q - W] = next; stack[top++] = q - W; }
        if (q < N - W && !grown[q + W] && !labels[q + W]) { labels[q + W] = next; stack[top++] = q + W; }
      }
      next++;
    }
    // Share line pixels out to the neighbouring area (3 passes).
    for (var pass = 0; pass < 3; pass++) {
      var prev = labels.slice();
      for (var j = 0; j < N; j++) {
        if (prev[j]) continue;
        var jx = j % W;
        labels[j] = (jx > 0 && prev[j - 1]) || (jx < W - 1 && prev[j + 1]) || (j >= W && prev[j - W]) || (j < N - W && prev[j + W]) || 0;
      }
    }
    // Bounding box of each area, so a fill only touches what it needs.
    var box = new Int32Array(next * 4);
    for (var b = 0; b < next; b++) { box[b * 4] = W; box[b * 4 + 1] = H; box[b * 4 + 2] = -1; box[b * 4 + 3] = -1; }
    for (var m = 0; m < N; m++) {
      var L = labels[m]; if (!L) continue;
      var mx = m % W, my = (m - mx) / W, o = L * 4;
      if (mx < box[o]) box[o] = mx; if (my < box[o + 1]) box[o + 1] = my;
      if (mx > box[o + 2]) box[o + 2] = mx; if (my > box[o + 3]) box[o + 3] = my;
    }

    var paint = el('canvas', { class: 'pcolor-paint', width: W, height: H });
    var pctx = paint.getContext('2d', { willReadFrequently: true });
    pctx.fillStyle = '#fff'; pctx.fillRect(0, 0, W, H);

    var frame = el('div', { class: 'pcolor-frame', style: 'aspect-ratio:' + W + '/' + H }, [paint, line]);
    var fit = el('div', { class: 'pcolor-fit' }, [frame]);
    P.clear(P.stage); P.stage.appendChild(fit);
    state.undo = [];

    function sizeFrame() {
      var r = fit.getBoundingClientRect();
      var scale = Math.min(r.width / W, r.height / H);
      frame.style.width = Math.floor(W * scale) + 'px';
      frame.style.height = Math.floor(H * scale) + 'px';
    }
    sizeFrame();
    window.addEventListener('resize', sizeFrame);

    function toCanvas(e) {
      var r = frame.getBoundingClientRect();
      return { x: Math.round((e.clientX - r.left) * W / r.width), y: Math.round((e.clientY - r.top) * H / r.height) };
    }

    function areaAt(x, y) {
      if (x < 0 || y < 0 || x >= W || y >= H) return 0;
      var L = labels[y * W + x];
      for (var rad = 1; !L && rad <= 10; rad++) {
        for (var dy = -rad; dy <= rad && !L; dy++) for (var dx = -rad; dx <= rad && !L; dx++) {
          var xx = x + dx, yy = y + dy;
          if (xx >= 0 && yy >= 0 && xx < W && yy < H) L = labels[yy * W + xx];
        }
      }
      return L;
    }

    function hex(c) { return [parseInt(c.substr(1, 2), 16), parseInt(c.substr(3, 2), 16), parseInt(c.substr(5, 2), 16)]; }

    function fill(L) {
      var o = L * 4, x0 = box[o], y0 = box[o + 1], w = box[o + 2] - x0 + 1, h = box[o + 3] - y0 + 1;
      if (w <= 0 || h <= 0) return;
      var before = pctx.getImageData(x0, y0, w, h);
      var after = pctx.getImageData(x0, y0, w, h), ad = after.data, rgb = hex(state.color), changed = false;
      for (var yy = 0; yy < h; yy++) {
        var row = (y0 + yy) * W + x0;
        for (var xx = 0; xx < w; xx++) {
          if (labels[row + xx] !== L) continue;
          var q = (yy * w + xx) * 4;
          if (ad[q] !== rgb[0] || ad[q + 1] !== rgb[1] || ad[q + 2] !== rgb[2]) changed = true;
          ad[q] = rgb[0]; ad[q + 1] = rgb[1]; ad[q + 2] = rgb[2]; ad[q + 3] = 255;
        }
      }
      if (!changed) return;
      pushUndo({ x: x0, y: y0, data: before });
      pctx.putImageData(after, x0, y0);
    }

    function pushUndo(entry) {
      state.undo.push(entry);
      if (state.undo.length > 30) state.undo.shift();
      undoBtn.disabled = false;
    }

    // Brush strokes.
    var stroke = null;
    var brushR = Math.round(Math.max(W, H) / 70);
    frame.addEventListener('pointerdown', function (e) {
      if (!e.isPrimary) return;
      e.preventDefault();
      var pt = toCanvas(e);
      if (state.tool === 'fill') { var L = areaAt(pt.x, pt.y); if (L) fill(L); return; }
      frame.setPointerCapture(e.pointerId);
      stroke = { snap: pctx.getImageData(0, 0, W, H), x0: pt.x, y0: pt.y, x1: pt.x, y1: pt.y, last: pt };
      pctx.fillStyle = state.color; pctx.beginPath(); pctx.arc(pt.x, pt.y, brushR, 0, Math.PI * 2); pctx.fill();
    });
    frame.addEventListener('pointermove', function (e) {
      if (!stroke || !e.isPrimary) return;
      var pts = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      pctx.strokeStyle = state.color; pctx.lineWidth = brushR * 2; pctx.lineCap = 'round'; pctx.lineJoin = 'round';
      pctx.beginPath(); pctx.moveTo(stroke.last.x, stroke.last.y);
      for (var i = 0; i < pts.length; i++) {
        var pt = toCanvas(pts[i]);
        pctx.lineTo(pt.x, pt.y); stroke.last = pt;
        stroke.x0 = Math.min(stroke.x0, pt.x); stroke.y0 = Math.min(stroke.y0, pt.y);
        stroke.x1 = Math.max(stroke.x1, pt.x); stroke.y1 = Math.max(stroke.y1, pt.y);
      }
      pctx.stroke();
    });
    function endStroke() {
      if (!stroke) return;
      var x0 = Math.max(0, stroke.x0 - brushR - 2), y0 = Math.max(0, stroke.y0 - brushR - 2);
      var x1 = Math.min(W - 1, stroke.x1 + brushR + 2), y1 = Math.min(H - 1, stroke.y1 + brushR + 2);
      var w = x1 - x0 + 1, h = y1 - y0 + 1;
      var tmp = el('canvas', { width: W, height: H }).getContext('2d');
      tmp.putImageData(stroke.snap, 0, 0);
      pushUndo({ x: x0, y: y0, data: tmp.getImageData(x0, y0, w, h) });
      stroke = null;
    }
    frame.addEventListener('pointerup', endStroke);
    frame.addEventListener('pointercancel', endStroke);

    // Tools: colours, fill/brush, undo, start over.
    var swatches = el('div', { class: 'pcolor-swatches', role: 'radiogroup', 'aria-label': T.colors });
    COLORS.forEach(function (c, i) {
      var sw = el('button', { type: 'button', class: 'pswatch', role: 'radio', 'aria-label': c[1], 'aria-checked': c[0] === state.color ? 'true' : 'false', style: 'background:' + c[0] });
      sw.addEventListener('click', function () {
        state.color = c[0];
        swatches.querySelectorAll('.pswatch').forEach(function (n) { n.setAttribute('aria-checked', 'false'); });
        sw.setAttribute('aria-checked', 'true');
      });
      swatches.appendChild(sw);
    });
    var fillBtn = P.button('fill', T.fill, function () { setTool('fill'); }, 'is-toggle');
    var brushBtn = P.button('brush', T.brush, function () { setTool('brush'); }, 'is-toggle');
    function setTool(t) {
      state.tool = t;
      fillBtn.setAttribute('aria-pressed', t === 'fill'); brushBtn.setAttribute('aria-pressed', t === 'brush');
      frame.classList.toggle('is-brush', t === 'brush');
    }
    setTool(state.tool);
    var undoBtn = P.button('undo', T.undo, function () {
      var u = state.undo.pop(); if (u) pctx.putImageData(u.data, u.x, u.y);
      undoBtn.disabled = !state.undo.length;
    });
    undoBtn.disabled = true;
    var clearBtn = P.button('clear', T.clear, function () {
      pushUndo({ x: 0, y: 0, data: pctx.getImageData(0, 0, W, H) });
      pctx.fillStyle = '#fff'; pctx.fillRect(0, 0, W, H);
    });
    P.tools.appendChild(el('div', { class: 'pcolor-toolrow' }, [fillBtn, brushBtn, undoBtn, clearBtn]));
    P.tools.appendChild(swatches);

    // Header actions.
    function picture() {
      var out = el('canvas', { width: W, height: H }), octx = out.getContext('2d');
      octx.drawImage(paint, 0, 0); octx.drawImage(line, 0, 0);
      return out;
    }
    var name = (cfg.pages[index].split('/').slice(-2, -1)[0] || 'coloring') + '-' + (index + 1) + '.png';
    function save() {
      var url = picture().toDataURL('image/png');
      var a = el('a', { href: url, download: name });
      document.body.appendChild(a); a.click(); a.remove();
    }
    function print() {
      var old = document.querySelector('.print-only'); if (old) old.remove();
      document.body.appendChild(el('img', { class: 'print-only', src: picture().toDataURL('image/png'), alt: '' }));
      setTimeout(function () { window.print(); }, 50);
    }
    if (cfg.pages.length > 1) P.actions.appendChild(P.button('pages', T.pickPage, pickPage, 'is-small'));
    P.actions.appendChild(P.button('save', T.save, save, 'is-small'));
    P.actions.appendChild(P.button('print', T.print, print, 'is-small hide-phone'));
    P.actions.appendChild(P.button('done', T.done, function () {
      var end = P.finish(T.colorWin, {
        image: picture().toDataURL('image/png'),
        buttons: [
          P.button('save', T.save, save),
          cfg.pages.length > 1 ? P.button('pages', T.anotherPage, function () { end.close(); pickPage(); }) : null,
          P.button('brush', T.keepColoring, function () { end.close(); })
        ].filter(Boolean)
      });
    }, 'is-small is-primary'));
  }

  start();
})();
