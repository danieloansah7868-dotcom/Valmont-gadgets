/* Valmont Gadgets — SMS Marketing Lead Collection Popup (homepage only)
 *
 * Automatically appears 10s after landing on the homepage. Collects a Ghana
 * mobile number with instant prefix / format validation and live network
 * detection (MTN / Telecel / AirtelTigo), POSTs it to /api/account/optin, and
 * writes `valmont_sms_opted_in = "1"` to localStorage so it never shows again
 * for that visitor. Styled as a solid, vibrant Datamart-style card in the
 * store's brand colours (orange #ff8c00 on deep navy #071126).
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'valmont_sms_opted_in';
  var POPUP_DELAY_MS = 10000;
  var ENDPOINT = '/api/account/optin';

  var VALID_PREFIXES = ['020', '023', '024', '025', '026', '027', '028', '050', '053', '054', '055', '056', '057', '059'];
  var NETWORKS = {
    MTN: ['024', '025', '026', '054', '055', '056', '059'],
    Telecel: ['020', '050', '053'],
    AirtelTigo: ['023', '027', '028', '057']
  };

  function isHomepage() {
    var p = (window.location.pathname || '/').replace(/\/+$/, '') || '/';
    return p === '/' || p === '/index.html';
  }

  function hasOptedIn() {
    try { return localStorage.getItem(STORAGE_KEY) === '1'; }
    catch (e) { return false; }
  }

  function setOptedIn() {
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch (e) { /* private mode */ }
  }

  function normalizePhone(value) {
    var digits = String(value == null ? '' : value).replace(/\D/g, '');
    if (/^233\d{9}$/.test(digits)) digits = '0' + digits.slice(3);
    if (!/^0\d{9}$/.test(digits)) return '';
    return VALID_PREFIXES.some(function (p) { return digits.indexOf(p) === 0; }) ? digits : '';
  }

  function detectNetwork(phone) {
    for (var net in NETWORKS) {
      if (Object.prototype.hasOwnProperty.call(NETWORKS, net) &&
          NETWORKS[net].some(function (p) { return phone.indexOf(p) === 0; })) {
        return net;
      }
    }
    return '';
  }

  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ── Build + mount the popup ────────────────────────────────────────────────
  var wrapper = document.createElement('div');
  wrapper.id = 'valmont-sms-popup';

  wrapper.innerHTML =
    '<style>' +
    '  #valmont-sms-popup{position:fixed;inset:0;z-index:99990;display:flex;align-items:flex-end;justify-content:center;padding:18px;box-sizing:border-box;pointer-events:none;font-family:Inter,system-ui,sans-serif}' +
    '  #valmont-sms-popup .vmsm-backdrop{position:absolute;inset:0;background:rgba(7,17,38,.45);opacity:0;transition:opacity .3s ease;pointer-events:auto}' +
    '  #valmont-sms-popup .vmsm-card{position:relative;width:100%;max-width:400px;pointer-events:auto;border-radius:20px;padding:24px;color:#fff;' +
    '     background:linear-gradient(135deg,#ff8c00 0%,#f97316 55%,#ea580c 100%);box-shadow:0 24px 60px rgba(7,17,38,.5),0 8px 24px rgba(234,88,12,.35);' +
    '     transform:translateY(24px);opacity:0;transition:transform .32s cubic-bezier(.2,.9,.3,1.2),opacity .3s ease;box-sizing:border-box}' +
    '  #valmont-sms-popup.vmsm-open .vmsm-backdrop{opacity:1}' +
    '  #valmont-sms-popup.vmsm-open .vmsm-card{transform:translateY(0);opacity:1}' +
    '  .vmsm-close{position:absolute;top:10px;right:12px;background:rgba(255,255,255,.22);border:none;color:#fff;width:30px;height:30px;border-radius:50%;font-size:16px;line-height:1;cursor:pointer}' +
    '  .vmsm-close:hover{background:rgba(255,255,255,.34)}' +
    '  .vmsm-badge{display:inline-block;background:rgba(7,17,38,.16);border:1px solid rgba(255,255,255,.4);font-size:10px;font-weight:900;letter-spacing:.16em;text-transform:uppercase;padding:4px 10px;border-radius:999px}' +
    '  .vmsm-title{font-size:21px;font-weight:900;line-height:1.15;margin:12px 0 6px}' +
    '  .vmsm-sub{font-size:13.5px;font-weight:600;line-height:1.5;opacity:.95;margin:0 0 16px}' +
    '  .vmsm-input-wrap{position:relative;margin-bottom:10px}' +
    '  .vmsm-input{width:100%;box-sizing:border-box;border:none;border-radius:12px;padding:13px 14px;font-size:15px;font-weight:700;color:#071126;background:#fff;outline:none}' +
    '  .vmsm-input:focus{box-shadow:0 0 0 3px rgba(255,255,255,.6)}' +
    '  .vmsm-hint{font-size:11.5px;font-weight:800;min-height:16px;margin:2px 2px 10px;opacity:.95}' +
    '  .vmsm-hint.vmsm-ok{color:#fff}' +
    '  .vmsm-hint.vmsm-err{color:#fff;background:rgba(127,29,29,.35);padding:3px 8px;border-radius:8px}' +
    '  .vmsm-btn{width:100%;box-sizing:border-box;border:none;border-radius:12px;padding:14px;font-size:13px;font-weight:900;letter-spacing:.1em;text-transform:uppercase;background:#071126;color:#ff8c00;cursor:pointer;transition:filter .15s ease}' +
    '  .vmsm-btn:hover{filter:brightness(1.15)}' +
    '  .vmsm-btn:disabled{opacity:.6;cursor:not-allowed}' +
    '  .vmsm-foot{font-size:10.5px;font-weight:700;opacity:.85;margin-top:12px;text-align:center;line-height:1.5}' +
    '  .vmsm-thanks{display:none;text-align:center;padding:6px 0}' +
    '  .vmsm-thanks .vmsm-check{width:52px;height:52px;border-radius:50%;background:rgba(255,255,255,.22);color:#fff;font-size:26px;display:flex;align-items:center;justify-content:center;margin:0 auto 12px}' +
    '  .vmsm-thanks h3{font-size:19px;font-weight:900;margin:0 0 6px}' +
    '  .vmsm-thanks p{font-size:13.5px;font-weight:600;opacity:.95;margin:0 0 14px}' +
    '  #valmont-sms-popup.vmsm-success .vmsm-form{display:none}' +
    '  #valmont-sms-popup.vmsm-success .vmsm-thanks{display:block}' +
    '  @media(min-width:640px){#valmont-sms-popup{padding:24px}#valmont-sms-popup .vmsm-card{border-radius:22px;padding:26px}}' +
    '</style>' +
    '<div class="vmsm-backdrop"></div>' +
    '<div class="vmsm-card" role="dialog" aria-modal="true" aria-label="Join SMS deals">' +
    '  <button type="button" class="vmsm-close" aria-label="Close">&#10005;</button>' +
    '  <div class="vmsm-form">' +
    '    <span class="vmsm-badge">SMS Deals</span>' +
    '    <h2 class="vmsm-title">Get exclusive deals straight to your phone.</h2>' +
    '    <p class="vmsm-sub">Join our SMS list for limited-time offers, restocks and member-only prices. No spam — unsubscribe anytime.</p>' +
    '    <div class="vmsm-input-wrap"><input class="vmsm-input" type="tel" inputmode="numeric" autocomplete="tel" placeholder="0XXXXXXXXX" maxlength="10" aria-label="Mobile number"></div>' +
    '    <div class="vmsm-hint"></div>' +
    '    <button type="button" class="vmsm-btn">Subscribe to SMS Deals</button>' +
    '    <p class="vmsm-foot">By subscribing you agree to receive SMS marketing. Msg &amp; data rates may apply.</p>' +
    '  </div>' +
    '  <div class="vmsm-thanks">' +
    '    <div class="vmsm-check">&#10003;</div>' +
    '    <h3>You&rsquo;re on the list!</h3>' +
    '    <p>Watch your inbox for exclusive offers. Closing this popup.</p>' +
    '  </div>' +
    '</div>';

  document.body.appendChild(wrapper);

  var card = wrapper.querySelector('.vmsm-card');
  var input = wrapper.querySelector('.vmsm-input');
  var hint = wrapper.querySelector('.vmsm-hint');
  var submitBtn = wrapper.querySelector('.vmsm-btn');
  var closeBtn = wrapper.querySelector('.vmsm-close');
  var backdrop = wrapper.querySelector('.vmsm-backdrop');
  var saving = false;

  function setHint(text, ok) {
    hint.textContent = text;
    hint.className = 'vmsm-hint ' + (ok ? 'vmsm-ok' : text ? 'vmsm-err' : '');
  }

  function validateLive() {
    var raw = input.value.replace(/\D/g, '').slice(0, 10);
    if (raw === '') { setHint(''); return false; }
    if (!/^0\d{9}$/.test(raw)) { setHint('Enter a valid 10-digit number starting with 0.'); return false; }
    if (VALID_PREFIXES.indexOf(raw.slice(0, 3)) === -1) { setHint('That looks like a landline — use a mobile (020–029, 050–059).'); return false; }
    var net = detectNetwork(raw);
    var label = net === 'MTN' ? 'MTN' : net === 'Telecel' ? 'Telecel' : net === 'AirtelTigo' ? 'AirtelTigo' : '';
    setHint((label ? label + ' number detected. ' : '') + 'Looks good!', true);
    return true;
  }

  input.addEventListener('input', function () {
    input.value = input.value.replace(/\D/g, '').slice(0, 10);
    validateLive();
  });

  async function submit() {
    var phone = normalizePhone(input.value);
    if (!phone) {
      validateLive();
      input.focus();
      return;
    }
    if (saving) return;
    saving = true;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving…';
    try {
      var res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone, source: 'storefront' })
      });
      var data = null;
      try { data = await res.json(); } catch (e) { data = null; }
      if (res.ok && data && data.ok) {
        setOptedIn(); // never show again for this visitor
        wrapper.classList.add('vmsm-success');
        setTimeout(function () { closePopup(true); }, 1800);
      } else {
        setHint('Something went wrong. Please try again.');
        saving = false;
        submitBtn.disabled = false;
        submitBtn.textContent = 'Subscribe to SMS Deals';
      }
    } catch (e) {
      setHint('Network error — please try again.');
      saving = false;
      submitBtn.disabled = false;
      submitBtn.textContent = 'Subscribe to SMS Deals';
    }
  }

  submitBtn.addEventListener('click', submit);
  input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); submit(); } });

  function closePopup(permanent) {
    wrapper.classList.remove('vmsm-open');
    wrapper.classList.add('vmsm-success');
    setTimeout(function () { if (wrapper.parentNode) wrapper.parentNode.removeChild(wrapper); }, 320);
  }
  closeBtn.addEventListener('click', function () { closePopup(false); });
  backdrop.addEventListener('click', function () { closePopup(false); });
  card.addEventListener('click', function (e) { e.stopPropagation(); });

  // ── Show only on homepage, after a 10s dwell, unless already opted in ────
  function maybeShow() {
    if (!isHomepage()) return;
    if (hasOptedIn()) return;
    wrapper.classList.add('vmsm-open');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      setTimeout(maybeShow, POPUP_DELAY_MS);
    });
  } else {
    setTimeout(maybeShow, POPUP_DELAY_MS);
  }
})();
