const SUPABASE_URL = 'https://eydsoqnpetqczaeqrscc.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV5ZHNvcW5wZXRxY3phZXFyc2NjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ4ODc1NjYsImV4cCI6MjEwMDQ2MzU2Nn0.ISD7IRYWwr_VMb8YutGlyJuWjBF9UWm1tijzMBAEBmc';
    const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    // Only this account may administer the store. Authoritative enforcement is
    // in Postgres RLS; this gate just keeps the UI honest.
    const ADMIN_ALLOWED_EMAILS = ['danieloansah7868@gmail.com'];
    const isAllowedAdminEmail = (email) =>
      ADMIN_ALLOWED_EMAILS.includes(String(email || '').trim().toLowerCase());

    // If already logged in AS THE ADMIN, redirect straight to admin.
    sb.auth.getSession().then(({ data }) => {
      if (data.session && isAllowedAdminEmail(data.session.user && data.session.user.email)) {
        window.location.replace('/admin.html');
      }
    });

    // Surface a clear reason when admin.html bounced a non-admin back here.
    if (new URLSearchParams(location.search).get('denied') === '1') {
      document.getElementById('error').textContent =
        'That account is not authorised to access the Valmont admin panel.';
    }

    document.getElementById('loginForm').addEventListener('submit', async function (event) {
      event.preventDefault();
      const email = document.getElementById('email').value.trim().toLowerCase();
      const password = document.getElementById('password').value;
      const error = document.getElementById('error');
      const btn = document.querySelector('button[type="submit"]');
      error.textContent = '';
      btn.disabled = true;
      btn.textContent = 'Signing in…';

      const { data, error: authError } = await sb.auth.signInWithPassword({ email, password });

      if (authError || !data.session) {
        error.textContent = authError?.message || 'Invalid email or password. Please try again.';
        document.getElementById('password').select();
        btn.disabled = false;
        btn.textContent = 'Sign In';
      } else if (!isAllowedAdminEmail(data.session.user && data.session.user.email)) {
        // Valid customer credentials, but not the admin account. Sign the
        // session straight back out so no admin surface is ever exposed.
        try { await sb.auth.signOut(); } catch (_) {}
        error.textContent = 'That account is not authorised to access the Valmont admin panel.';
        document.getElementById('password').value = '';
        btn.disabled = false;
        btn.textContent = 'Sign In';
      } else {
        window.location.replace('/admin.html');
      }
    });
