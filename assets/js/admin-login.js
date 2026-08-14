const SUPABASE_URL = 'https://eydsoqnpetqczaeqrscc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV5ZHNvcW5wZXRxY3phZXFyc2NjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ4ODc1NjYsImV4cCI6MjEwMDQ2MzU2Nn0.ISD7IRYWwr_VMb8YutGlyJuWjBF9UWm1tijzMBAEBmc';
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// This browser gate improves the admin sign-in experience. PostgreSQL RLS and
// server-side authorization remain the authoritative access controls.
const ADMIN_ALLOWED_EMAILS = ['danieloansah7868@gmail.com'];
const isAllowedAdminEmail = (email) =>
  ADMIN_ALLOWED_EMAILS.includes(String(email || '').trim().toLowerCase());

const loginForm = document.getElementById('loginForm');
const resetForm = document.getElementById('resetForm');
const newPasswordForm = document.getElementById('newPasswordForm');
const forgotButton = document.getElementById('forgotBtn');
const statusElement = document.getElementById('status');
const hashParams = new URLSearchParams(String(location.hash || '').replace(/^#/, ''));
const searchParams = new URLSearchParams(String(location.search || '').replace(/^\?/, ''));
const recoveryError = hashParams.get('error_description') || searchParams.get('error_description') || '';
let inRecovery = hashParams.get('type') === 'recovery' || searchParams.get('type') === 'recovery' || Boolean(recoveryError);

function cleanRecoveryUrl() {
  const url = new URL(window.location.href);
  url.hash = '';
  ['access_token', 'refresh_token', 'token_type', 'expires_in', 'type', 'error', 'error_description', 'error_code'].forEach((key) => {
    url.searchParams.delete(key);
  });
  history.replaceState(null, '', `${url.pathname}${url.search}`);
}

function showRecoveryUI() {
  inRecovery = true;
  loginForm.hidden = true;
  forgotButton.hidden = true;
  resetForm.hidden = true;
  newPasswordForm.hidden = false;
  document.getElementById('newPasswordError').textContent = recoveryError
    ? 'This reset link has expired or is invalid. Request a new one.'
    : '';
  statusElement.textContent = recoveryError
    ? ''
    : 'Choose a new password for your admin account.';
  if (!recoveryError) document.getElementById('newPassword').focus();
}

if (inRecovery) showRecoveryUI();

// Supabase emits this after consuming a recovery token from the callback URL.
sb.auth.onAuthStateChange((event) => {
  if (event === 'PASSWORD_RECOVERY') showRecoveryUI();
});

// Skip the login form only when a verified session belongs to the one allowed
// admin account. Recovery always stays on this page until a password is set.
sb.auth.getSession().then(({ data }) => {
  if (inRecovery) return;
  if (data.session && isAllowedAdminEmail(data.session.user && data.session.user.email)) {
    window.location.replace('/admin.html');
  }
});

if (new URLSearchParams(location.search).get('denied') === '1') {
  document.getElementById('error').textContent =
    'That account is not authorised to access the Valmont admin panel.';
}

forgotButton.addEventListener('click', () => {
  loginForm.hidden = true;
  resetForm.hidden = false;
  forgotButton.hidden = true;
  statusElement.textContent = '';
  document.getElementById('resetError').textContent = '';
  const typedEmail = document.getElementById('email').value.trim();
  if (typedEmail) document.getElementById('resetEmail').value = typedEmail;
  document.getElementById('resetEmail').focus();
});

document.getElementById('cancelReset').addEventListener('click', () => {
  loginForm.hidden = false;
  resetForm.hidden = true;
  forgotButton.hidden = false;
  statusElement.textContent = '';
  document.getElementById('resetError').textContent = '';
});

resetForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const email = document.getElementById('resetEmail').value.trim().toLowerCase();
  const errorElement = document.getElementById('resetError');
  const button = resetForm.querySelector('button[type="submit"]');
  errorElement.textContent = '';
  statusElement.textContent = '';

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    errorElement.textContent = 'Enter a valid email address.';
    return;
  }

  button.disabled = true;
  button.textContent = 'Sending…';
  try {
    // Do not disclose whether an entered account exists or is authorized.
    if (isAllowedAdminEmail(email)) {
      const { error } = await sb.auth.resetPasswordForEmail(email, {
        redirectTo: new URL('/admin-login.html', window.location.origin).href,
      });
      if (error) throw error;
    }
    loginForm.hidden = true;
    resetForm.hidden = true;
    forgotButton.hidden = true;
    statusElement.textContent =
      'If that address belongs to a Valmont admin account, a reset link is on its way. Check your inbox and spam folder.';
  } catch (error) {
    errorElement.textContent = 'Could not send the reset link. Please try again.';
  } finally {
    button.disabled = false;
    button.textContent = 'Send reset link';
  }
});

newPasswordForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const password = document.getElementById('newPassword').value;
  const confirmation = document.getElementById('confirmPassword').value;
  const errorElement = document.getElementById('newPasswordError');
  const button = newPasswordForm.querySelector('button[type="submit"]');
  errorElement.textContent = '';

  if (recoveryError) {
    errorElement.textContent = 'This reset link has expired or is invalid. Request a new one.';
    return;
  }
  if (password.length < 8) {
    errorElement.textContent = 'Password must be at least 8 characters.';
    return;
  }
  if (password !== confirmation) {
    errorElement.textContent = 'Those passwords do not match.';
    return;
  }

  button.disabled = true;
  button.textContent = 'Updating…';
  try {
    const { data: sessionData } = await sb.auth.getSession();
    const session = sessionData && sessionData.session;
    if (!session) throw new Error('expired');
    if (!isAllowedAdminEmail(session.user && session.user.email)) {
      await sb.auth.signOut().catch(() => {});
      errorElement.textContent = 'That account is not authorised to access the Valmont admin panel.';
      return;
    }

    const { error } = await sb.auth.updateUser({ password });
    if (error) throw error;
    cleanRecoveryUrl();
    statusElement.textContent = 'Password updated. Taking you to the admin panel…';
    window.location.replace('/admin.html');
  } catch (error) {
    errorElement.textContent = /expired|session|token|jwt/i.test(String(error && error.message))
      ? 'This reset link has expired or is invalid. Request a new one.'
      : 'Could not update the password. Please try again.';
  } finally {
    button.disabled = false;
    button.textContent = 'Update password';
  }
});

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const email = document.getElementById('email').value.trim().toLowerCase();
  const password = document.getElementById('password').value;
  const errorElement = document.getElementById('error');
  const button = loginForm.querySelector('button[type="submit"]');
  errorElement.textContent = '';
  button.disabled = true;
  button.textContent = 'Signing in…';

  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    errorElement.textContent = (error && error.message) || 'Invalid email or password. Please try again.';
    document.getElementById('password').select();
    button.disabled = false;
    button.textContent = 'Sign In';
    return;
  }

  if (!isAllowedAdminEmail(data.session.user && data.session.user.email)) {
    await sb.auth.signOut().catch(() => {});
    errorElement.textContent = 'That account is not authorised to access the Valmont admin panel.';
    document.getElementById('password').value = '';
    button.disabled = false;
    button.textContent = 'Sign In';
    return;
  }

  window.location.replace('/admin.html');
});
