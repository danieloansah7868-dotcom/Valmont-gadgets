#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM, VirtualConsole } from 'jsdom';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const accountHtml = read('account.html');
const indexHtml = read('index.html');
const accountJs = read('assets/js/account.js');
const resetJs = read('assets/js/password-reset.js');
const appJs = read('app.js');
let assertions = 0;

function check(value, message) {
  assert.ok(value, message);
  assertions += 1;
}
function equal(actual, expected, message) {
  assert.equal(actual, expected, message);
  assertions += 1;
}
function response(data, ok = true) {
  return { ok, status: ok ? 200 : 401, json: async () => data };
}
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

function makeDom(html, url) {
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', (error) => {
    if (!/Not implemented: (navigation|HTMLFormElement\.prototype\.requestSubmit)/.test(error.message)) throw error;
  });
  return new JSDOM(html, { url, runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole });
}

async function loadAccount(url, fetchStub, seedStorage) {
  const dom = makeDom(accountHtml, url);
  const { window } = dom;
  if (seedStorage) seedStorage(window.localStorage);
  window.fetch = fetchStub;
  window.eval(resetJs);
  window.eval(accountJs);
  await tick();
  await tick();
  return dom;
}

// Static integration checks: both entry points load one shared reset helper,
// while only account.html owns the recovery password form.
check(indexHtml.includes('assets/js/password-reset.js'), 'storefront loads shared reset helper');
check(accountHtml.includes('assets/js/password-reset.js'), 'account page loads shared reset helper');
check(indexHtml.includes('id="passwordResetRequestView"'), 'storefront has an in-page request form');
check(accountHtml.includes('id="passwordResetRequestView"'), 'account page has an in-page request form');
check(accountHtml.includes('id="newPasswordForm"'), 'account page has a set-new-password form');
check(!/window\.prompt\s*\(|const email\s*=\s*prompt\s*\(/.test(appJs + accountJs), 'password reset no longer uses prompt');
check(/VALMONT_SUPABASE[\s\S]*function authRequest/.test(appJs), 'storefront keeps its existing auth helper');
check(/VALMONT_AUTH[\s\S]*function authRequest/.test(accountJs), 'account keeps its existing auth helper');
check(resetJs.includes("new URL('/account.html'"), 'shared callback targets account.html');
check(read('docs/AUTH_REDIRECTS.md').includes('https://valmontgadgets.com/account.html'), 'production callback is documented');

// Storefront entry point: drive the real index markup with the shared helper.
{
  const dom = makeDom(indexHtml, 'https://valmontgadgets.com/');
  const { window } = dom;
  const calls = [];
  window.authRequest = async (...args) => { calls.push(args); return {}; };
  window.eval(resetJs);
  window.document.getElementById('loginEmail').value = ' Shopper@Example.com ';
  window.handlePasswordReset();
  check(window.document.getElementById('passwordResetDefaultView').classList.contains('hidden'), 'storefront hides sign-in while requesting');
  check(!window.document.getElementById('passwordResetRequestView').classList.contains('hidden'), 'storefront shows reset request form');
  equal(window.document.getElementById('passwordResetEmail').value, 'Shopper@Example.com', 'storefront prefills typed email');

  window.document.getElementById('passwordResetEmail').value = 'bad-address';
  await window.handlePasswordResetRequest({ preventDefault() {}, currentTarget: window.document.getElementById('passwordResetRequestView') });
  equal(calls.length, 0, 'invalid storefront email sends no request');
  check(window.document.getElementById('passwordResetError').textContent.includes('valid email'), 'invalid storefront email is explained inline');

  window.document.getElementById('passwordResetEmail').value = ' Shopper@Example.com ';
  await window.handlePasswordResetRequest({ preventDefault() {}, currentTarget: window.document.getElementById('passwordResetRequestView') });
  equal(calls.length, 1, 'storefront submits one recovery request');
  check(calls[0][0].startsWith('recover?redirect_to='), 'storefront sends redirect_to to Supabase');
  equal(new URLSearchParams(calls[0][0].split('?')[1]).get('redirect_to'), 'https://valmontgadgets.com/account.html', 'storefront callback URL is exact');
  equal(calls[0][1].email, 'shopper@example.com', 'storefront normalizes email');
  check(/^If an account exists/.test(window.document.getElementById('passwordResetStatus').textContent), 'storefront preserves neutral confirmation');
  check(!window.document.getElementById('passwordResetStatus').textContent.includes('shopper@example.com'), 'neutral confirmation does not echo an account');
  window.cancelPasswordReset();
  check(!window.document.getElementById('passwordResetDefaultView').classList.contains('hidden'), 'storefront can return to sign-in');
  dom.window.close();
}

// Account entry point request: this uses account.js's real authRequest() and a
// stubbed Supabase HTTP endpoint, proving method, body, and redirect query.
{
  const calls = [];
  const dom = await loadAccount('https://valmontgadgets.com/account.html', async (url, options) => {
    calls.push({ url: String(url), options });
    return response({});
  });
  const { window } = dom;
  check(!window.document.getElementById('authScreen').classList.contains('hidden'), 'signed-out account starts on auth screen');
  window.document.getElementById('signInEmail').value = 'account@example.com';
  window.handlePasswordReset();
  equal(window.document.getElementById('passwordResetEmail').value, 'account@example.com', 'account reset form prefills sign-in email');
  window.document.getElementById('passwordResetEmail').value = ' Customer@Example.com ';
  await window.handlePasswordResetRequest({ preventDefault() {}, currentTarget: window.document.getElementById('passwordResetRequestView') });
  equal(calls.length, 1, 'account submits one recovery request');
  equal(calls[0].options.method, 'POST', 'account recovery uses POST');
  equal(JSON.parse(calls[0].options.body).email, 'customer@example.com', 'account recovery normalizes request body');
  equal(new URL(calls[0].url).searchParams.get('redirect_to'), 'https://valmontgadgets.com/account.html', 'account recovery carries exact redirect');
  check(/^If an account exists/.test(window.document.getElementById('passwordResetStatus').textContent), 'account preserves neutral confirmation');
  dom.window.close();
}

// Full recovery path: seed an old signed-in customer, arrive with a real-style
// recovery fragment, update the password, then sign in with that new password.
{
  const calls = [];
  const newPassword = 'new-secret-123';
  const user = { id: 'customer-1', email: 'customer@example.com', user_metadata: { full_name: 'Customer One', phone: '0241234567' } };
  const dom = await loadAccount(
    'https://valmontgadgets.com/account.html#access_token=recovery-token&refresh_token=refresh&type=recovery',
    async (url, options = {}) => {
      calls.push({ url: String(url), options });
      if (String(url).endsWith('/auth/v1/user') && options.method === 'PUT') return response(user);
      if (String(url).includes('/auth/v1/token?grant_type=password')) return response({ user, access_token: 'signed-in-token' });
      return response({ message: 'unexpected endpoint' }, false);
    },
    (storage) => {
      storage.setItem('valmont_access_token', 'stale-token');
      storage.setItem('valmont_user', JSON.stringify({ id: 'stale', email: 'old@example.com', name: 'Old User' }));
    }
  );
  const { window } = dom;
  check(!window.document.getElementById('authScreen').classList.contains('hidden'), 'recovery callback stays on auth screen');
  check(window.document.getElementById('accountScreen').classList.contains('hidden'), 'existing local session cannot show account during recovery');
  check(!window.document.getElementById('newPasswordForm').classList.contains('hidden'), 'recovery callback shows new-password form');
  equal(window.document.activeElement.id, 'recoveryNewPassword', 'recovery callback focuses the new-password field');
  check(window.document.getElementById('passwordResetDefaultView').classList.contains('hidden'), 'recovery callback suppresses normal sign-in view');
  equal(calls.length, 0, 'recovery is not misclassified as OAuth');

  const form = window.document.getElementById('newPasswordForm');
  window.document.getElementById('recoveryNewPassword').value = 'short';
  window.document.getElementById('recoveryConfirmPassword').value = 'short';
  await window.handleNewPassword({ preventDefault() {}, currentTarget: form });
  check(window.document.getElementById('newPasswordError').textContent.includes('at least 8'), 'short recovery password is rejected');
  equal(calls.length, 0, 'short password sends no update');

  window.document.getElementById('recoveryNewPassword').value = newPassword;
  window.document.getElementById('recoveryConfirmPassword').value = 'different-password';
  await window.handleNewPassword({ preventDefault() {}, currentTarget: form });
  check(window.document.getElementById('newPasswordError').textContent.includes('do not match'), 'mismatched passwords are rejected');
  equal(calls.length, 0, 'mismatch sends no update');

  window.document.getElementById('recoveryConfirmPassword').value = newPassword;
  await window.handleNewPassword({ preventDefault() {}, currentTarget: form });
  equal(calls.length, 1, 'valid recovery submits one update');
  equal(calls[0].options.method, 'PUT', 'password update uses Supabase updateUser method');
  equal(calls[0].options.headers.Authorization, 'Bearer recovery-token', 'password update authenticates with recovery token');
  equal(JSON.parse(calls[0].options.body).password, newPassword, 'password update sends chosen password');
  equal(window.location.hash, '', 'successful update clears sensitive fragment');
  equal(window.localStorage.getItem('valmont_access_token'), null, 'successful update clears stale access token');
  equal(window.localStorage.getItem('valmont_user'), null, 'successful update clears stale user');
  check(window.document.getElementById('newPasswordForm').classList.contains('hidden'), 'successful update hides recovery form');
  check(!window.document.getElementById('passwordResetDefaultView').classList.contains('hidden'), 'successful update returns to sign-in');
  equal(window.document.getElementById('signInEmail').value, 'customer@example.com', 'successful update prefills recovered account email');
  check(window.document.getElementById('toast').textContent.includes('Password updated'), 'successful update confirms next step');

  window.document.getElementById('signInPassword').value = newPassword;
  await window.handleSignIn({ preventDefault() {} });
  equal(calls.length, 2, 'sign-in follows password update');
  equal(JSON.parse(calls[1].options.body).password, newPassword, 'new password is accepted by sign-in endpoint');
  equal(window.localStorage.getItem('valmont_access_token'), 'signed-in-token', 'successful sign-in stores fresh session');
  check(!window.document.getElementById('accountScreen').classList.contains('hidden'), 'successful sign-in opens customer account');
  dom.window.close();
}

// Invalid/expired callbacks remain on the recovery surface and never update.
{
  const calls = [];
  const dom = await loadAccount(
    'https://valmontgadgets.com/account.html#type=recovery&error=access_denied&error_code=otp_expired',
    async (...args) => { calls.push(args); return response({}, false); }
  );
  const { window } = dom;
  check(!window.document.getElementById('newPasswordForm').classList.contains('hidden'), 'expired callback still shows recovery form');
  check(window.document.getElementById('newPasswordError').textContent.includes('expired or is invalid'), 'expired callback has clear error');
  window.document.getElementById('recoveryNewPassword').value = 'long-enough-password';
  window.document.getElementById('recoveryConfirmPassword').value = 'long-enough-password';
  await window.handleNewPassword({ preventDefault() {}, currentTarget: window.document.getElementById('newPasswordForm') });
  equal(calls.length, 0, 'expired callback never calls updateUser');
  dom.window.close();
}

console.log(`✅ customer password reset: ${assertions} assertions passed`);
