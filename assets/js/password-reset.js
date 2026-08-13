// Shared customer password-reset request plumbing for the storefront and account page.
// It deliberately reuses each page's existing authRequest() helper instead of
// creating another Supabase client or copying the project URL/key again.
(function (global) {
  'use strict';

  const byId = (id) => document.getElementById(id);
  const setHidden = (element, hidden) => {
    if (element) element.classList.toggle('hidden', hidden);
  };

  function callbackParams() {
    const hash = new URLSearchParams(String(global.location.hash || '').replace(/^#/, ''));
    const search = new URLSearchParams(String(global.location.search || '').replace(/^\?/, ''));
    const get = (key) => hash.get(key) || search.get(key);
    return {
      active: get('type') === 'recovery',
      accessToken: get('access_token') || '',
      error: get('error') || get('error_code') || '',
      errorDescription: get('error_description') || ''
    };
  }

  function recoveryUrl() {
    return new URL('/account.html', global.location.origin).href;
  }

  function auth() {
    if (typeof global.authRequest !== 'function') throw new Error('Authentication is not ready');
    return {
      resetPasswordForEmail(email, options) {
        const redirectTo = options && options.redirectTo;
        return global.authRequest(`recover?redirect_to=${encodeURIComponent(redirectTo)}`, { email });
      },
      updateUser(attributes, accessToken) {
        return global.authRequest('user', attributes, { method: 'PUT', accessToken });
      }
    };
  }

  function openRequestForm() {
    setHidden(byId('passwordResetDefaultView'), true);
    setHidden(byId('passwordResetRequestView'), false);
    byId('passwordResetError').textContent = '';
    byId('passwordResetStatus').textContent = '';
    const source = byId('passwordResetRequestView').dataset.emailSource;
    const typed = source && byId(source) ? byId(source).value.trim() : '';
    if (typed) byId('passwordResetEmail').value = typed;
    byId('passwordResetEmail').focus();
  }

  function cancelRequestForm() {
    setHidden(byId('passwordResetRequestView'), true);
    setHidden(byId('passwordResetDefaultView'), false);
    byId('passwordResetError').textContent = '';
    byId('passwordResetStatus').textContent = '';
  }

  async function submitRequestForm(event) {
    event.preventDefault();
    const email = byId('passwordResetEmail').value.trim().toLowerCase();
    const errorEl = byId('passwordResetError');
    const statusEl = byId('passwordResetStatus');
    const button = event.currentTarget.querySelector('button[type="submit"]');
    errorEl.textContent = '';
    statusEl.textContent = '';

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      errorEl.textContent = 'Enter a valid email address.';
      return;
    }

    button.disabled = true;
    button.textContent = 'Sending…';
    try {
      await auth().resetPasswordForEmail(email, { redirectTo: recoveryUrl() });
      statusEl.textContent = 'If an account exists, a password reset email has been sent. Check your inbox and spam folder.';
    } catch (error) {
      errorEl.textContent = 'Unable to send the reset email. Please try again.';
    } finally {
      button.disabled = false;
      button.textContent = 'Send reset link';
    }
  }

  function cleanCallbackUrl() {
    const url = new URL(global.location.href);
    url.hash = '';
    ['access_token', 'refresh_token', 'token_type', 'expires_in', 'type', 'error', 'error_description', 'error_code'].forEach((key) => url.searchParams.delete(key));
    const search = url.searchParams.toString();
    global.history.replaceState(null, '', `${url.pathname}${search ? `?${search}` : ''}`);
  }

  global.ValmontPasswordReset = { auth, callbackParams, cleanCallbackUrl, recoveryUrl };
  global.handlePasswordReset = openRequestForm;
  global.cancelPasswordReset = cancelRequestForm;
  global.handlePasswordResetRequest = submitRequestForm;
})(window);
