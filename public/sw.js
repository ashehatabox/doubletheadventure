/* Play area offline: games a child has opened once keep working without internet
   (in the car, on a plane). Only Play pages, their scripts, styles and pictures are kept.
   Nothing about the child is stored. Bump VERSION when the game files change. */
var VERSION = 'play-v1';
var CORE = ['/play', '/fr/play', '/css/site.css', '/css/play.css', '/js/site.js', '/js/play/common.js', '/js/play/color.js', '/js/play/jigsaw.js', '/js/play/memory.js', '/images/brand/mark.png', '/images/brand/logo.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(CORE); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

function isPlayPage(url) { return /^(\/fr)?\/play(\/|$)/.test(url.pathname); }
function isAsset(url) { return /^\/(css|js|images)\//.test(url.pathname); }

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // Game pages: fresh from the network when online, the saved copy when offline.
  if (req.mode === 'navigate' && isPlayPage(url)) {
    e.respondWith(fetch(req).then(function (res) {
      var copy = res.clone();
      if (res.ok) caches.open(VERSION).then(function (c) { c.put(url.pathname, copy); });
      return res;
    }).catch(function () {
      return caches.match(url.pathname).then(function (hit) { return hit || caches.match(url.pathname.indexOf('/fr/') === 0 ? '/fr/play' : '/play'); });
    }));
    return;
  }

  // Scripts, styles and pictures: saved copy first, refreshed in the background.
  if (isAsset(url)) {
    e.respondWith(caches.open(VERSION).then(function (c) {
      return c.match(req).then(function (hit) {
        var net = fetch(req).then(function (res) { if (res.ok) c.put(req, res.clone()); return res; });
        if (hit) { net.catch(function () {}); return hit; }
        return net;
      });
    }));
  }
});
