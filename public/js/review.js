// Reviewer area: tapping a sentence picks it for the comment form without reloading the page.
// Without JavaScript every sentence is a link that reloads the page with that sentence picked.
(function () {
  var form = document.querySelector('.rv-form');
  if (form) {
    var list = [];
    try { list = JSON.parse(form.getAttribute('data-sentences') || '[]'); } catch (e) { list = []; }
    var sel = form.querySelector('[data-sel]');
    var quote = form.querySelector('[data-quote]');
    var proposed = form.querySelector('[data-proposed]');
    var panel = document.getElementById('panel');
    var narrow = window.matchMedia('(max-width: 1000px)');
    document.querySelectorAll('.rv-s').forEach(function (a) {
      a.addEventListener('click', function (ev) {
        var i = parseInt(a.getAttribute('data-s'), 10);
        if (isNaN(i) || !list[i]) return;
        ev.preventDefault();
        document.querySelectorAll('.rv-s').forEach(function (b) { b.classList.remove('is-sel'); b.removeAttribute('aria-current'); });
        a.classList.add('is-sel');
        a.setAttribute('aria-current', 'true');
        sel.value = String(i);
        quote.textContent = list[i];
        proposed.value = list[i];
        var ok = form.querySelector('.rv-ok');
        if (ok) ok.remove();
        try { history.replaceState(null, '', a.getAttribute('href')); } catch (e) { /* ignore */ }
        if (narrow.matches && panel) panel.scrollIntoView({ block: 'start' });
        proposed.focus({ preventScroll: narrow.matches });
      });
    });
  }
  // Admin: the invite link selects itself, ready to copy.
  var link = document.querySelector('[data-select]');
  if (link) link.addEventListener('focus', function () { link.select(); });
})();
