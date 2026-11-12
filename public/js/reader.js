// The book reader: page-curl flips, two-page spreads on wide screens, one page on phones held upright,
// "Read it myself" or "Read to me" (narration clip per spread, or the device's voice until the clip exists).
(function () {
  var root = document.getElementById('reader');
  if (!root) return;
  var cfg = JSON.parse(root.getAttribute('data-config'));
  var T = JSON.parse(root.getAttribute('data-text'));
  var stage = document.getElementById('rd-stage');
  var gateTpl = document.getElementById('rd-gate');
  var countEl = root.querySelector('[data-count]');
  var prevBtn = root.querySelector('[data-prev]');
  var nextBtn = root.querySelector('[data-next]');
  var voiceNote = root.querySelector('[data-voice-note]');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var ASPECT = 1000 / 1268; // page width / height
  var DURATION = 950;
  var KEY = 'a2read:' + cfg.slug + ':' + cfg.lang;

  function store(k, v) { try { if (v === undefined) return window.localStorage.getItem(k); window.localStorage.setItem(k, v); } catch (e) { return null; } }
  function session(k, v) { try { if (v === undefined) return window.sessionStorage.getItem(k); window.sessionStorage.setItem(k, v); } catch (e) { return null; } }

  // ---------- Pages ----------
  var pageNo = 0;
  var items = []; // every open page, in order
  cfg.spreads.forEach(function (sp, s) {
    sp.pages.forEach(function (p, pos) {
      pageNo += 1;
      items.push({ kind: 'img', src: p.src, text: p.text, spread: s, pos: pos, of: sp.pages.length, no: pageNo, key: p.src });
    });
  });
  var GATE = { kind: 'gate', key: 'gate' };
  var BLANK = { kind: 'blank', key: 'blank' };

  function spreadViews() {
    var v = cfg.spreads.map(function (sp, s) {
      var mine = items.filter(function (it) { return it.spread === s; });
      return mine.length === 1 ? { left: null, right: mine[0] } : { left: mine[0], right: mine[1] };
    });
    v.push({ left: BLANK, right: GATE });
    return v;
  }
  function singleViews() {
    return items.map(function (it) { return { page: it }; }).concat([{ page: GATE }]);
  }

  function content(item, live) {
    if (!item) return null;
    if (item.kind === 'img') {
      var img = new Image();
      img.src = item.src;
      img.alt = item.text || '';
      img.decoding = 'async';
      img.draggable = false;
      return img;
    }
    if (item.kind === 'gate' && live) return gateTpl.content.cloneNode(true);
    return null; // blank paper
  }

  // ---------- Layout ----------
  var mode = '';
  var views = [];
  var idx = 0;
  var book, left, right, single;

  function wantSpread() {
    var r = stage.getBoundingClientRect();
    return r.width >= 600 && r.width / Math.max(r.height, 1) >= 1.1;
  }

  function fill(el, item, live) {
    el.textContent = '';
    el.classList.toggle('empty', !item);
    el.classList.toggle('is-cover', !!(item && item.no === 1));
    var c = content(item, live);
    if (c) el.appendChild(c);
  }

  function build(keepKey) {
    mode = wantSpread() ? 'spread' : 'single';
    views = mode === 'spread' ? spreadViews() : singleViews();
    idx = 0;
    if (keepKey) {
      for (var i = 0; i < views.length; i++) {
        if (keysOf(views[i]).indexOf(keepKey) >= 0) { idx = i; break; }
      }
    }
    stage.textContent = '';
    book = document.createElement('div');
    book.className = 'rd-book ' + (mode === 'spread' ? 'is-spread' : 'is-single');
    if (mode === 'spread') {
      left = document.createElement('div'); left.className = 'rd-page left';
      right = document.createElement('div'); right.className = 'rd-page right';
      book.appendChild(left); book.appendChild(right);
    } else {
      single = document.createElement('div'); single.className = 'rd-page';
      book.appendChild(single);
    }
    stage.appendChild(book);
    size();
    show();
  }

  function size() {
    var r = stage.getBoundingClientRect();
    var w = r.width - 24, h = r.height - 16;
    var pw = mode === 'spread' ? Math.min(w / 2, h * ASPECT) : Math.min(w, h * ASPECT);
    pw = Math.max(120, Math.floor(pw));
    var ph = Math.floor(pw / ASPECT);
    book.style.width = (mode === 'spread' ? pw * 2 : pw) + 'px';
    book.style.height = ph + 'px';
    if (mode === 'spread') { left.style.width = pw + 'px'; right.style.width = pw + 'px'; }
  }

  function keysOf(v) {
    return mode === 'spread' ? [v.left && v.left.key, v.right && v.right.key] : [v.page.key];
  }

  function show() {
    var v = views[idx];
    if (mode === 'spread') {
      fill(left, v.left, true);
      fill(right, v.right, true);
      book.classList.toggle('is-single-cover', !v.left);
    } else {
      fill(single, v.page, true);
    }
    book.classList.toggle('is-cover-view', keysOf(v).indexOf(items[0] && items[0].key) >= 0 && (mode === 'single' || !v.left));
    status();
    preload();
    var seen = (mode === 'spread' ? [v.left, v.right] : [v.page]).filter(function (p) { return p && p.kind === 'img'; });
    if (seen.length) session(KEY, seen[0].key);
  }

  function status() {
    var v = views[idx];
    var pages = (mode === 'spread' ? [v.left, v.right] : [v.page]).filter(function (p) { return p && p.kind === 'img'; });
    countEl.textContent = pages.length ? T.pageOf.replace('{n}', pages[pages.length - 1].no).replace('{t}', cfg.totalPages) : '';
    prevBtn.disabled = idx === 0;
    nextBtn.disabled = idx >= views.length - 1;
  }

  function preload() {
    [idx + 1, idx + 2].forEach(function (i) {
      var v = views[i];
      if (!v) return;
      (mode === 'spread' ? [v.left, v.right] : [v.page]).forEach(function (p) { if (p && p.kind === 'img') { var im = new Image(); im.src = p.src; } });
    });
  }

  // ---------- Page sound: a soft paper swish made on the device ----------
  var soundOn = store('a2read:sound') !== '0';
  var soundBtn = root.querySelector('[data-sound]');
  soundBtn.setAttribute('aria-pressed', soundOn ? 'true' : 'false');
  soundBtn.addEventListener('click', function () {
    soundOn = !soundOn;
    store('a2read:sound', soundOn ? '1' : '0');
    soundBtn.setAttribute('aria-pressed', soundOn ? 'true' : 'false');
  });
  var actx = null;
  function swish() {
    if (!soundOn) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      var len = Math.floor(actx.sampleRate * 0.42);
      var buf = actx.createBuffer(1, len, actx.sampleRate);
      var d = buf.getChannelData(0);
      for (var i = 0; i < len; i++) { var t = i / len; d[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * t) * (1 - t * 0.6); }
      var src = actx.createBufferSource(); src.buffer = buf;
      var bp = actx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1800; bp.Q.value = 0.7;
      var g = actx.createGain(); g.gain.value = 0.07;
      src.connect(bp); bp.connect(g); g.connect(actx.destination);
      src.start();
    } catch (e) { /* no sound */ }
  }

  // ---------- Turning ----------
  var busy = false;
  var queued = 0;

  function face(cls, item) {
    var f = document.createElement('div');
    f.className = 'rd-face ' + cls + (item && item.no === 1 ? ' is-cover' : '');
    var c = content(item, false);
    if (c) f.appendChild(c);
    var curl = document.createElement('div');
    curl.className = 'rd-curl';
    f.appendChild(curl);
    return f;
  }

  function animate(el, frames, opts) {
    if (!el.animate) return Promise.resolve();
    return el.animate(frames, opts).finished.catch(function () {});
  }

  function go(dir, quiet) {
    var to = idx + dir;
    if (to < 0 || to >= views.length) return;
    if (busy) { queued = dir; return; }
    stopNarration();
    var from = views[idx], next = views[to];
    if (reduce || !book.animate) {
      idx = to;
      show();
      if (book.animate) animate(book, [{ opacity: 0.55 }, { opacity: 1 }], { duration: 220 });
      after();
      return;
    }
    busy = true;
    if (!quiet) swish();
    var leaf = document.createElement('div');
    var pw = mode === 'spread' ? book.offsetWidth / 2 : book.offsetWidth;
    leaf.style.width = pw + 'px';
    var spin;
    if (mode === 'spread') {
      if (dir > 0) {
        leaf.className = 'rd-leaf from-right';
        leaf.style.left = pw + 'px';
        leaf.style.transformOrigin = 'left center';
        leaf.appendChild(face('front', from.right));
        leaf.appendChild(face('back', next.left));
        fill(right, next.right, true);
        spin = ['rotateY(0deg)', 'rotateY(-180deg)'];
      } else {
        leaf.className = 'rd-leaf from-left';
        leaf.style.left = '0px';
        leaf.style.transformOrigin = 'right center';
        leaf.appendChild(face('front', from.left));
        leaf.appendChild(face('back', next.right));
        fill(left, next.left, true);
        book.classList.toggle('is-single-cover', !next.left);
        spin = ['rotateY(0deg)', 'rotateY(180deg)'];
      }
    } else {
      leaf.className = 'rd-leaf from-right';
      leaf.style.left = '0px';
      leaf.style.transformOrigin = 'left center';
      if (dir > 0) {
        leaf.appendChild(face('front', from.page));
        leaf.appendChild(face('back', BLANK));
        fill(single, next.page, true);
        spin = ['rotateY(0deg)', 'rotateY(-180deg)'];
      } else {
        leaf.appendChild(face('front', next.page));
        leaf.appendChild(face('back', BLANK));
        spin = ['rotateY(-180deg)', 'rotateY(0deg)'];
      }
    }
    book.appendChild(leaf);
    var ease = 'cubic-bezier(.45,.05,.3,1)';
    var mid = (parseFloat(spin[0].match(/-?\d+/)[0]) + parseFloat(spin[1].match(/-?\d+/)[0])) / 2;
    // No opacity on the leaf: it would flatten the 3D turn and show the page's back mirrored.
    var frames = [
      { transform: 'translateZ(1px) ' + spin[0] },
      { transform: 'translateZ(40px) rotateY(' + mid + 'deg)', offset: 0.5 },
      { transform: 'translateZ(1px) ' + spin[1] }
    ];
    var jobs = [animate(leaf, frames, { duration: DURATION, easing: ease, fill: 'forwards' })];
    leaf.querySelectorAll('.rd-curl').forEach(function (c) {
      jobs.push(animate(c, [{ opacity: 0 }, { opacity: 0.9, offset: 0.5 }, { opacity: 0 }], { duration: DURATION, easing: ease, fill: 'forwards' }));
    });
    Promise.all(jobs).then(function () {
      idx = to;
      show();
      leaf.remove();
      busy = false;
      after();
      if (queued) { var q = queued; queued = 0; go(q); }
    });
    status();
  }

  function after() {
    var v = views[idx];
    var atGate = mode === 'spread' ? v.right === GATE : v.page === GATE;
    if (atGate && auto) setMode('self');
    if (auto) narrate();
  }

  function jump(to) {
    stopNarration();
    idx = Math.max(0, Math.min(views.length - 1, to));
    show();
  }

  // ---------- Read to me ----------
  var auto = false;
  var audio = new Audio();
  audio.preload = 'auto';
  var timer = 0;
  var token = 0;
  var autoBtn = root.querySelector('[data-mode="auto"]');
  var selfBtn = root.querySelector('[data-mode="self"]');
  var autoLabel = root.querySelector('[data-auto-label]');
  var synth = window.speechSynthesis;

  function setMode(m) {
    auto = m === 'auto';
    selfBtn.classList.toggle('is-on', !auto);
    autoBtn.classList.toggle('is-on', auto);
    selfBtn.setAttribute('aria-pressed', String(!auto));
    autoBtn.setAttribute('aria-pressed', String(auto));
    autoLabel.textContent = auto ? T.pause : T.readToMe;
    if (!auto) { stopNarration(); audio.pause(); voiceNote.hidden = true; }
  }
  selfBtn.addEventListener('click', function () { setMode('self'); });
  autoBtn.addEventListener('click', function () {
    if (auto) return setMode('self');
    if (mode === 'spread' ? views[idx].right === GATE : views[idx].page === GATE) jump(0);
    setMode('auto');
    narrate();
  });

  function stopNarration() {
    token += 1;
    clearTimeout(timer);
    if (synth) synth.cancel();
  }

  function visible() {
    var v = views[idx];
    return (mode === 'spread' ? [v.left, v.right] : [v.page]).filter(function (p) { return p && p.kind === 'img'; });
  }

  function later(ms) { var my = token; timer = setTimeout(function () { if (my === token && auto) go(1); }, ms); }

  function narrate() {
    if (!auto) return;
    var my = ++token;
    var pages = visible();
    if (!pages.length) return;
    var s = pages[0].spread;
    var clip = cfg.spreads[s] && cfg.spreads[s].audio;
    if (clip) {
      voiceNote.hidden = true;
      if (synth) synth.cancel();
      var fresh = audio.getAttribute('src') !== clip;
      if (fresh) audio.src = clip;
      var split = function () {
        var sp = cfg.spreads[s].pages;
        if (sp.length < 2 || !audio.duration) return 0;
        var a = (sp[0].text || '').length, b = (sp[1].text || '').length;
        return audio.duration * (a / Math.max(a + b, 1));
      };
      if (mode === 'single') {
        var p = pages[0];
        if (fresh || audio.paused) { try { audio.currentTime = p.pos === 1 ? split() : 0; } catch (e) {} }
        else if (p.pos === 0 && audio.currentTime > split() + 0.5) audio.currentTime = 0;
        audio.ontimeupdate = function () {
          if (my !== token || !auto) return;
          if (p.pos === 0 && p.of === 2 && split() && audio.currentTime >= split()) { audio.ontimeupdate = null; go(1); }
        };
      } else {
        if (!fresh && audio.paused) audio.currentTime = 0;
        audio.ontimeupdate = null;
      }
      audio.onended = function () { if (my === token && auto) later(900); };
      var pr = audio.play();
      if (pr && pr.catch) pr.catch(function () { setMode('self'); });
      return;
    }
    audio.pause();
    var texts = pages.map(function (p) { return p.text; }).filter(Boolean);
    if (!texts.length || !synth || !window.SpeechSynthesisUtterance) { later(texts.length ? 6000 : 2600); return; }
    voiceNote.hidden = false;
    speak(texts, 0, my);
  }

  function pickVoice() {
    var list = synth.getVoices() || [];
    var mine = list.filter(function (v) { return (v.lang || '').toLowerCase().indexOf(cfg.lang) === 0; });
    var good = mine.filter(function (v) { return /natural|neural|google|samantha|enhanced|premium|aria|jenny|amélie|thomas/i.test(v.name); });
    return good[0] || mine[0] || null;
  }

  function speak(texts, i, my) {
    if (my !== token || !auto) return;
    if (i >= texts.length) { later(1000); return; }
    var u = new window.SpeechSynthesisUtterance(texts[i]);
    var v = pickVoice();
    if (v) u.voice = v;
    u.lang = v ? v.lang : cfg.lang;
    u.rate = 0.88;
    u.pitch = 1.05;
    // Some browsers never report the end of speech: move on after a generous guess either way.
    var done = false;
    var guess = setTimeout(function () { finish(); }, 3000 + texts[i].split(/\s+/).length * 550);
    function finish() {
      if (done) return;
      done = true;
      clearTimeout(guess);
      if (my === token) timer = setTimeout(function () { speak(texts, i + 1, my); }, 450);
    }
    u.onend = finish;
    u.onerror = finish;
    synth.speak(u);
  }
  if (synth && synth.addEventListener) synth.addEventListener('voiceschanged', function () {});

  // ---------- Controls ----------
  prevBtn.addEventListener('click', function () { go(-1); });
  nextBtn.addEventListener('click', function () { go(1); });

  document.addEventListener('keydown', function (e) {
    if (/input|textarea|select/i.test((e.target && e.target.tagName) || '')) return;
    if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); go(1); }
    if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); go(-1); }
  });

  // Swipe, or tap the right or left side of the book.
  var start = null;
  stage.addEventListener('pointerdown', function (e) {
    if (e.target.closest('.rd-gate')) return;
    start = { x: e.clientX, y: e.clientY, t: Date.now() };
  });
  stage.addEventListener('pointerup', function (e) {
    if (!start) return;
    var dx = e.clientX - start.x, dy = e.clientY - start.y;
    var s = start; start = null;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) { go(dx < 0 ? 1 : -1); return; }
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10 && Date.now() - s.t < 500 && book) {
      var r = book.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right) return;
      var cut = mode === 'spread' ? r.left + r.width / 2 : r.left + r.width * 0.4;
      go(e.clientX >= cut ? 1 : -1);
    }
  });
  stage.addEventListener('pointercancel', function () { start = null; });

  stage.addEventListener('click', function (e) {
    if (e.target.closest('[data-again]')) { setMode('self'); jump(0); }
  });

  // Full screen where the browser allows it (not on iPhone; the reader already fills the screen there).
  var fullBtn = root.querySelector('[data-full]');
  var canFull = !!(root.requestFullscreen || root.webkitRequestFullscreen) && (document.fullscreenEnabled || document.webkitFullscreenEnabled);
  if (canFull) {
    fullBtn.hidden = false;
    fullBtn.addEventListener('click', function () {
      var on = document.fullscreenElement || document.webkitFullscreenElement;
      if (on) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      else (root.requestFullscreen || root.webkitRequestFullscreen).call(root);
    });
    ['fullscreenchange', 'webkitfullscreenchange'].forEach(function (ev) {
      document.addEventListener(ev, function () {
        var on = !!(document.fullscreenElement || document.webkitFullscreenElement);
        fullBtn.setAttribute('aria-label', on ? T.exitFullscreen : T.fullscreen);
        fullBtn.title = on ? T.exitFullscreen : T.fullscreen;
      });
    });
  }

  var resizeTimer = 0;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      if (busy) return;
      var nowSpread = wantSpread();
      if ((mode === 'spread') !== nowSpread) { build(keysOf(views[idx]).filter(Boolean)[0]); if (auto) narrate(); }
      else size();
    }, 160);
  });

  // ---------- Start ----------
  // Pick up where this reader stopped (also after unlocking), or at the last page after a code error.
  var saved = session(KEY);
  build(saved || null);
  if (window.location.hash === '#gate') jump(views.length - 1);
})();
