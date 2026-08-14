#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM, VirtualConsole } from 'jsdom';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(ROOT, 'admin-login.html'), 'utf8');
const source = fs.readFileSync(path.join(ROOT, 'assets/js/admin-login.js'), 'utf8');
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
let assertions = 0;

function check(value, message) {
  assert.ok(value, message);
  assertions += 1;
}
function equal(actual, expected, message) {
  assert.equal(actual, expected, message);
  assertions += 1;
}

function createHarness(url, session = null) {
  const calls = { reset: [], update: [], signIn: [], signOut: 0 };
  let authCallback = null;
  const auth = {
    onAuthStateChange(callback) {
      authCallback = callback;
      return { data: { subscription: { unsubscribe() {} } } };
    },
    async getSession() { return { data: { session } }; },
    async resetPasswordForEmail(email, options) {
      calls.reset.push({ email, options });
      return { data: {}, error: null };
    },
    async updateUser(attributes) {
      calls.update.push(attributes);
      return { data: { user: session && session.user }, error: null };
    },
    async signInWithPassword(credentials) {
      calls.signIn.push(credentials);
      return { data: { session }, error: session ? null : { message: 'Invalid login' } };
    },
    async signOut() { calls.signOut += 1; return { error: null }; },
  };
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', (error) => {
    if (!/Not implemented: navigation/.test(error.message)) throw error;
  });
  const dom = new JSDOM(html, { url, runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole });
  dom.window.supabase = { createClient: () => ({ auth }) };
  dom.window.eval(source);
  return { dom, window: dom.window, calls, emit: (event) => authCallback && authCallback(event) };
}

// Static contracts: production uses the pinned local SDK and external logic.
check(html.includes('assets/js/vendor/supabase-2.112.1.min.js'), 'admin reset uses the pinned local Supabase SDK');
check(html.includes('assets/js/admin-login.js'), 'admin reset behavior is externalized');
check(!html.includes('cdn.jsdelivr.net'), 'admin login has no floating CDN dependency');
check(!/<script(?![^>]*\bsrc=)[^>]*>[\s\S]*?\S[\s\S]*?<\/script>/i.test(html), 'admin login has no executable inline script');
check(source.includes("new URL('/admin-login.html'"), 'admin recovery callback targets admin-login.html');
check(source.includes('ADMIN_ALLOWED_EMAILS'), 'admin reset is restricted to the configured admin identity');

// Request flow validates input, pre-fills the address, and remains neutral.
{
  const { dom, window, calls } = createHarness('https://valmontgadgets.com/admin-login.html');
  await tick();
  window.document.getElementById('email').value = ' Admin@Example.com ';
  window.document.getElementById('forgotBtn').click();
  equal(window.document.getElementById('resetEmail').value, 'Admin@Example.com', 'request form pre-fills the entered address');
  check(!window.document.getElementById('resetForm').hidden, 'forgot action opens the reset form');
  check(window.document.getElementById('loginForm').hidden, 'forgot action hides sign-in');

  const resetForm = window.document.getElementById('resetForm');
  window.document.getElementById('resetEmail').value = 'bad-address';
  resetForm.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  await tick();
  equal(calls.reset.length, 0, 'invalid admin email sends no request');
  check(window.document.getElementById('resetError').textContent.includes('valid email'), 'invalid admin email is explained');

  window.document.getElementById('resetEmail').value = 'not-admin@example.com';
  resetForm.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  await tick();
  equal(calls.reset.length, 0, 'non-admin address is not sent to the recovery endpoint');
  check(/^If that address belongs/.test(window.document.getElementById('status').textContent), 'non-admin receives a neutral response');
  check(!window.document.getElementById('status').textContent.includes('not-admin@example.com'), 'neutral response does not echo the address');
  dom.window.close();
}

// The authorized address is normalized and receives the exact production callback.
{
  const { dom, window, calls } = createHarness('https://valmontgadgets.com/admin-login.html');
  await tick();
  window.document.getElementById('forgotBtn').click();
  window.document.getElementById('resetEmail').value = ' DanielOansah7868@gmail.com ';
  window.document.getElementById('resetForm').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  await tick();
  equal(calls.reset.length, 1, 'authorized admin submits one recovery request');
  equal(calls.reset[0].email, 'danieloansah7868@gmail.com', 'authorized address is normalized');
  equal(calls.reset[0].options.redirectTo, 'https://valmontgadgets.com/admin-login.html', 'admin callback URL is exact');
  check(/^If that address belongs/.test(window.document.getElementById('status').textContent), 'authorized request also receives a neutral response');
  dom.window.close();
}

// Recovery requires an authorized live session and validates the new password.
{
  const adminSession = { user: { id: 'admin-1', email: 'danieloansah7868@gmail.com' } };
  const { dom, window, calls } = createHarness(
    'https://valmontgadgets.com/admin-login.html#access_token=recovery&type=recovery',
    adminSession,
  );
  await tick();
  check(!window.document.getElementById('newPasswordForm').hidden, 'recovery callback opens the new-password form');
  check(window.document.getElementById('loginForm').hidden, 'recovery callback cannot skip to ordinary sign-in');

  const form = window.document.getElementById('newPasswordForm');
  window.document.getElementById('newPassword').value = 'short';
  window.document.getElementById('confirmPassword').value = 'short';
  form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  await tick();
  equal(calls.update.length, 0, 'short admin password sends no update');
  check(window.document.getElementById('newPasswordError').textContent.includes('at least 8'), 'short password is explained');

  window.document.getElementById('newPassword').value = 'new-admin-secret';
  window.document.getElementById('confirmPassword').value = 'different-secret';
  form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  await tick();
  equal(calls.update.length, 0, 'mismatched admin password sends no update');
  check(window.document.getElementById('newPasswordError').textContent.includes('do not match'), 'mismatch is explained');

  window.document.getElementById('confirmPassword').value = 'new-admin-secret';
  form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  await tick();
  equal(calls.update.length, 1, 'valid authorized recovery updates once');
  equal(calls.update[0].password, 'new-admin-secret', 'admin update sends the selected password');
  equal(window.location.hash, '', 'successful admin recovery removes the token fragment');
  dom.window.close();
}

// A valid customer recovery session can never update a password on this page.
{
  const customerSession = { user: { id: 'customer-1', email: 'customer@example.com' } };
  const { dom, window, calls } = createHarness(
    'https://valmontgadgets.com/admin-login.html#access_token=recovery&type=recovery',
    customerSession,
  );
  await tick();
  window.document.getElementById('newPassword').value = 'customer-secret';
  window.document.getElementById('confirmPassword').value = 'customer-secret';
  window.document.getElementById('newPasswordForm').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  await tick();
  equal(calls.update.length, 0, 'non-admin recovery session cannot update a password');
  equal(calls.signOut, 1, 'non-admin recovery session is signed out');
  check(window.document.getElementById('newPasswordError').textContent.includes('not authorised'), 'non-admin recovery denial is explicit');
  dom.window.close();
}

console.log(`✅ admin password reset: ${assertions} assertions passed`);
