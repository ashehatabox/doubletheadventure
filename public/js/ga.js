// Google Analytics 4, loaded only when the server has GA4_ID set, and never on the Play area or the reader.
// Sends the referral code (?ref=) with every page view as "ref_code", and a "generate_lead" event on form sends.
(function () {
  var el = document.currentScript;
  var id = el && el.getAttribute('data-ga4');
  if (!id) return;
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;
  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id);
  document.head.appendChild(s);
  var ref = '';
  try {
    var q = (new URLSearchParams(location.search).get('ref') || '').toLowerCase();
    var kept = JSON.parse(localStorage.getItem('a2ref') || 'null');
    ref = /^[a-z0-9][a-z0-9_.-]{0,59}$/.test(q) ? q : (kept && kept.code) || '';
  } catch (e) { /* ignore */ }
  gtag('js', new Date());
  gtag('config', id, ref ? { ref_code: ref, campaign_source: 'outreach', campaign_name: ref } : {});
  document.addEventListener('submit', function (e) {
    var f = e.target;
    if (!f || !f.action) return;
    var kind = (f.querySelector('input[name="kind"]') || {}).value || (f.querySelector('input[name="list"]') || {}).value || 'form';
    gtag('event', /checkout/.test(f.action) ? 'begin_checkout' : 'generate_lead', { form_kind: kind, ref_code: ref || '(none)' });
  }, true);
})();
