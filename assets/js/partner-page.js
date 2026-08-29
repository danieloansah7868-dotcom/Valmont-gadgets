/**
 * Valmont Gadgets — "Bring your store online" partner program
 *
 * Applications are written through `apply_store_partner()`, which stores only
 * the fields it wants to keep: a hashed Ghana Card fingerprint, the last digits
 * for staff reference, and the plan the applicant selected. The price of a plan
 * is never taken from this page — it is decided in Postgres.
 */
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const esc = (value) => window.VG.escapeHtml(value);
  const value = (id) => String($(id) ? $(id).value : '').trim();
  const modal = (id, open) => { const el = $(id); if (el) el.classList[open ? 'add' : 'remove']('open'); };

  const state = { user: null, application: null, plan: 'pro' };

  let toastTimer = null;
  function toast(message) {
    const box = $('toast');
    const msg = $('toastMsg');
    if (!box || !msg) return;
    msg.textContent = message;
    box.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => box.classList.remove('show'), 3200);
  }

  function fail(id, error) {
    const el = $(id);
    if (el) el.textContent = (error && error.message) || 'Something went wrong.';
  }
  function clearError(id) { const el = $(id); if (el) el.textContent = ''; }

  // ── CTAs open the application modal with the right plan pre-selected ──
  document.querySelectorAll('[data-plan]').forEach((cta) => {
    cta.addEventListener('click', (event) => {
      event.preventDefault();
      openApply(cta.dataset.plan);
    });
  });

  /**
   * The application is stored against a Supabase Auth account (the database
   * derives the owner from the JWT, so it cannot be filed for somebody else).
   * Showing the note up front beats failing after someone typed the whole form.
   */
  function authNote(show) {
    const note = $('applyAuthNote');
    if (note) note.hidden = !show;
  }
  const signedIn = () => Boolean(window.VDB && window.VDB.hasSession && window.VDB.hasSession());

  function openApply(plan) {
    state.plan = ['starter', 'pro', 'enterprise'].indexOf(plan) !== -1 ? plan : 'starter';
    const select = $('aPlan');
    if (select) select.value = state.plan;
    clearError('applyErr');
    authNote(!signedIn());
    modal('applyModal', true);
    const first = $('aShopName');
    if (first) setTimeout(() => first.focus(), 60);
  }

  $('closeApplyModal').addEventListener('click', () => modal('applyModal', false));
  const successDone = $('successDoneBtn');
  if (successDone) successDone.addEventListener('click', () => modal('successModal', false));

  // ── build-your-own-website modal ──
  ['openBuildModalA', 'openBuildModalB'].forEach((id) => {
    const button = $(id);
    if (button) button.addEventListener('click', () => modal('buildWebsiteModal', true));
  });
  const closeBuild = $('closeBuildModal');
  if (closeBuild) closeBuild.addEventListener('click', () => modal('buildWebsiteModal', false));

  // ── FAQ accordion ──
  document.querySelectorAll('.faq-item').forEach((item) => {
    const question = item.querySelector('.faq-q');
    if (!question) return;
    const toggle = () => item.classList.toggle('open');
    question.addEventListener('click', toggle);
    question.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggle(); }
    });
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    ['applyModal', 'successModal', 'buildWebsiteModal'].forEach((id) => modal(id, false));
  });

  // ── application status for a signed-in shop ──
  async function refreshStatus() {
    const strip = $('applyStatus');
    try {
      state.user = await window.VDB.auth.current();
    } catch (e) {
      state.user = null;
    }
    if (!state.user) { strip.style.display = 'none'; return; }
    try {
      state.application = await window.VGA.partner.status();
    } catch (e) {
      state.application = null;
    }
    if (!state.application) { strip.style.display = 'none'; return; }
    const copy = {
      pending: 'Your application is with our partner team — we answer within 24 hours on WhatsApp.',
      approved: 'You are an approved Valmont partner. Your store page is being set up.',
      rejected: 'We could not approve this application. Reply to our WhatsApp message and we will tell you why.',
    };
    strip.style.display = '';
    strip.innerHTML = `<span class="badge">${esc(state.application.plan)} plan</span> ${esc(copy[state.application.status] || 'Application received.')}`;
  }

  // ── submit ──
  const submit = $('submitApplyBtn');
  if (submit) submit.addEventListener('click', async () => {
    clearError('applyErr');
    const input = {
      shopName: window.VG.cleanText(value('aShopName'), 90),
      contactName: window.VG.cleanText(value('aName'), 80),
      phone: value('aPhone'),
      email: value('aEmail').toLowerCase(),
      city: window.VG.cleanText(value('aCity'), 80),
      ghanaCard: value('aGhanaCard').toUpperCase(),
      plan: value('aPlan'),
      volume: value('aVolume'),
      about: window.VG.cleanText(value('aAbout'), 600),
    };

    const problems = [];
    if (input.shopName.length < 3) problems.push('Enter your shop or business name.');
    if (input.contactName.length < 3) problems.push('Enter your full name.');
    if (!window.VG.isValidGhanaPhone(input.phone)) problems.push('Enter a Ghana phone number, e.g. 0241234567.');
    if (input.email && !window.VG.isValidEmail(input.email)) problems.push('That email address looks incomplete.');
    if (input.city.length < 2) problems.push('Enter your city or area.');
    if (!window.VG.isValidGhanaCard(input.ghanaCard)) problems.push('Ghana Card format should be GHA-123456789-0.');
    const terms = $('aTerms');
    if (!terms || !terms.checked) problems.push('Please accept the partner terms.');
    if (problems.length) return fail('applyErr', { message: problems[0] });
    if (!window.VG.canPerform('partner_apply', 3, 3600000)) {
      return fail('applyErr', { message: 'Too many applications from this device. Please try again later.' });
    }
    if (!signedIn()) {
      authNote(true);
      return fail('applyErr', { message: 'Sign in or create a free account first — the note above opens it in a new tab.' });
    }

    submit.disabled = true;
    try {
      await window.VGA.partner.apply(input);
      modal('applyModal', false);
      ['aShopName', 'aName', 'aPhone', 'aEmail', 'aCity', 'aGhanaCard', 'aAbout'].forEach((id) => {
        const el = $(id);
        if (el) el.value = '';
      });
      if (terms) terms.checked = false;
      modal('successModal', true);
      refreshStatus();
    } catch (error) {
      // Unauthenticated is expected: the application needs an account so the
      // store can be managed later. Point at the existing account page.
      if (/sign in/i.test(error.message || '')) {
        // Session expired while the form was open: keep the page (and the typed
        // answers) and point at the note instead of navigating away.
        authNote(true);
        return fail('applyErr', { message: 'Your sign-in expired. Refresh the page after signing in, then send again.' });
      }
      fail('applyErr', error);
    } finally {
      submit.disabled = false;
    }
  });

  refreshStatus();
})();
