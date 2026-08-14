(function () {
      if (window.ValmontAnalytics && typeof window.ValmontAnalytics.initAnalytics === 'function') {
        try { window.ValmontAnalytics.initAnalytics(); } catch (e) {}
      }
      const $ = (id) => document.getElementById(id);
      const params = new URLSearchParams(window.location.search);
      const reference = params.get('reference') || params.get('ref') || '';
      const status = (params.get('status') || 'success').toLowerCase();

      // Handle failed / cancelled payments gracefully
      if (status && status !== 'success') {
        $('successIcon').classList.remove('bg-emerald-500');
        $('successIcon').classList.add('bg-rose-500');
        $('successIcon').innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
        $('statusHeading').textContent = 'Payment Not Completed';
        $('statusSub').textContent = 'Your payment was not completed. You can retry checkout or contact us for help.';
      }

      // Load pending order from localStorage
      let order = null;
      try {
        const raw = localStorage.getItem('valmont_pending_order');
        if (raw) order = JSON.parse(raw);
      } catch (e) { order = null; }

      const money = (n) => 'GH₵ ' + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const escapeHtml = (v) => String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

      // Payment-return screens NEVER claim "paid": the signed Valmont-Pay
      // webhook (POST /api/valmontpay/webhook) is the only path to Paid.
      if (status === 'success') {
        $('statusHeading').textContent = 'Order Received — Pending Confirmation';
        $('statusSub').innerHTML = 'Thank you! Valmont-Pay is confirming your payment. Your order is marked <b>Pending</b> and flips to <b>Paid</b> automatically the moment the gateway confirms it — usually within seconds. Keep your reference safe.';
      }
      const AUTH_URL = 'https://eydsoqnpetqczaeqrscc.supabase.co';
      const AUTH_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV5ZHNvcW5wZXRxY3phZXFyc2NjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ4ODc1NjYsImV4cCI6MjEwMDQ2MzU2Nn0.ISD7IRYWwr_VMb8YutGlyJuWjBF9UWm1tijzMBAEBmc';

      function setupAccountPrompt(pendingOrder) {
        const prompt = $('accountPrompt');
        if (status !== 'success' || !pendingOrder || localStorage.getItem('valmont_access_token')) return;
        const email = String(pendingOrder.email || pendingOrder.customer_email || '').trim().toLowerCase();
        if (!email || email === 'sales@valmontgadgets.com') return;

        $('accountPromptEmail').textContent = email;
        prompt.classList.remove('hidden');
        $('accountPromptSkip').addEventListener('click', function () { prompt.classList.add('hidden'); });
        $('accountPromptForm').addEventListener('submit', async function (event) {
          event.preventDefault();
          const password = $('accountPromptPassword').value;
          const submit = $('accountPromptSubmit');
          const message = $('accountPromptMessage');
          if (password.length < 6) {
            message.textContent = 'Use at least 6 characters for your password.';
            message.className = 'mt-3 text-sm font-semibold text-rose-600';
            return;
          }
          submit.disabled = true;
          submit.textContent = 'Creating…';
          try {
            const response = await fetch(`${AUTH_URL}/auth/v1/signup`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', apikey: AUTH_KEY },
              body: JSON.stringify({
                email,
                password,
                data: {
                  full_name: pendingOrder.customer_name || pendingOrder.name || '',
                  phone: pendingOrder.customer_phone || pendingOrder.phone || '',
                  role: 'customer'
                }
              })
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data.error_description || data.msg || data.message || 'Unable to create account.');

            if (data.user && data.session && data.session.access_token) {
              const metadata = data.user.user_metadata || {};
              const user = {
                id: data.user.id,
                name: metadata.full_name || metadata.name || pendingOrder.customer_name || email.split('@')[0],
                email: data.user.email || email,
                phone: metadata.phone || pendingOrder.customer_phone || pendingOrder.phone || ''
              };
              localStorage.setItem('valmont_user', JSON.stringify(user));
              localStorage.setItem('valmont_access_token', data.session.access_token);
              message.textContent = 'Account created. You are signed in and can now use Daily Drop.';
            } else {
              message.textContent = 'Account created. Check your email to confirm it, then sign in from Account.';
            }
            message.className = 'mt-3 text-sm font-semibold text-emerald-600';
            this.classList.add('hidden');
            $('accountPromptSkip').classList.add('hidden');
          } catch (error) {
            message.textContent = error.message || 'Unable to create account. Please try again.';
            message.className = 'mt-3 text-sm font-semibold text-rose-600';
            submit.disabled = false;
            submit.textContent = 'Create my account';
          }
        });
      }

      // Fill reference from URL (preferred) or from stored order
      const displayRef = reference || (order && (order.reference_code || order.reference)) || '—';
      $('refCode').textContent = displayRef;

      if (order) {
        const deliveryRegion = order.delivery_region || order.deliveryRegion || null;
        const feeSource = order.fee_source || null;
        $('custName').textContent  = order.customer_name  || order.name  || '—';
        $('custEmail').textContent = order.email || order.customer_email || 'sales@valmontgadgets.com';
        $('custPhone').textContent = order.customer_phone || order.phone || '—';
        // Mirror delivery_region from localStorage (authoritative server value)
        $('custArea').textContent  = deliveryRegion || order.customer_area  || order.area  || '—';
        $('custAddress').textContent = order.delivery_address || order.customer_street || 'To be confirmed via WhatsApp';

        const items = Array.isArray(order.items) ? order.items : [];
        const itemsSubtotal = items.reduce(function (s, i) {
          return s + (Number(i.price || 0) * Number(i.qty || 1));
        }, 0);
        const totalAmt = Number(order.total_amount != null ? order.total_amount : (order.total != null ? order.total : 0));
        const deliveryFee = Number(
          order.delivery_fee != null ? order.delivery_fee : Math.max(0, totalAmt - itemsSubtotal)
        );
        const subtotal = Number(order.subtotal != null ? order.subtotal : itemsSubtotal);
        $('subtotalAmount').textContent    = money(subtotal);
        // Task 2: Mirror the same delivery numbers on confirmation page from localStorage.
        // Show "Delivery (Region): GH₵X" when subtotal < free threshold, else "Delivery: FREE"
        const deliveryLabelEl = document.querySelector('#deliveryFeeAmount') ? document.querySelector('#deliveryFeeAmount').previousElementSibling : null;
        if (deliveryLabelEl) {
          if (deliveryRegion) deliveryLabelEl.textContent = `Delivery (${deliveryRegion})`;
          else deliveryLabelEl.textContent = 'Delivery Fee';
        }
        $('deliveryFeeAmount').textContent = deliveryFee > 0 ? money(deliveryFee) : 'FREE';
        if (feeSource) $('deliveryFeeAmount').title = `fee_source: ${feeSource}`;
        $('totalAmount').textContent       = money(totalAmt || (subtotal + deliveryFee));
        const list = $('itemsList');
        if (items.length === 0) {
          list.innerHTML = '<li class="p-3 text-xs text-slate-500">No items on record.</li>';
        } else {

          list.innerHTML = items.map(function (i) {
            const variants = [i.selected_color, i.selected_storage].filter(Boolean).join(' / ');
            const qty = Number(i.qty || 1);
            const price = Number(i.price || 0);
            return '<li class="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">' +
              '<div class="min-w-0"><div class="font-bold brand-navy truncate">' + escapeHtml(i.name || 'Item') + '</div>' +
              (variants ? '<div class="text-[11px] text-slate-500">' + escapeHtml(variants) + '</div>' : '') +
              '</div>' +
              '<div class="text-right shrink-0"><div class="text-[11px] text-slate-500">Qty ' + qty + '</div>' +
              '<div class="font-extrabold brand-navy">' + money(price * qty) + '</div></div>' +
              '</li>';
          }).join('');
        }

        // Build WhatsApp receipt
        const itemsText = items.map(function (i) {
          const variants = [i.selected_color, i.selected_storage].filter(Boolean).join('/');
          return '• ' + (i.name || 'Item') + (variants ? ' (' + variants + ')' : '') +
                 ' — Qty ' + Number(i.qty || 1) + ' — ' + money(Number(i.price || 0) * Number(i.qty || 1));
        }).join('\n');

        const receipt =
          '*VALMONT GADGETS — ORDER CONFIRMED*\n' +
          'Reference: *#' + displayRef + '*\n\n' +
          '*ITEMS:*\n' + (itemsText || '—') + '\n\n' +
          '*Subtotal:* ' + money(subtotal) + '\n' +
          '*Delivery' + (deliveryRegion ? ` (${deliveryRegion})` : '') + ':* ' + (deliveryFee > 0 ? money(deliveryFee) : 'FREE') + (feeSource ? ` (${feeSource})` : '') + '\n' +
          '*ORDER TOTAL:* ' + money(totalAmt || (subtotal + deliveryFee)) + '\n' +
          '*PAYMENT:* Pending signed confirmation from Valmont-Pay\n\n' +
          '*DELIVERY DETAILS:*\n' +
          'Recipient: ' + (order.customer_name || '—') + '\n' +
          'Phone: ' + (order.customer_phone || '—') + '\n' +
          'Email: ' + (order.email || order.customer_email || '—') + '\n' +
          'Region: ' + (deliveryRegion || order.customer_area || '—') + '\n' +
          'Address: ' + (order.delivery_address || order.customer_street || 'To be provided via chat') + '\n\n' +
          '_Thank you for choosing Valmont Gadgets Ghana. We are preparing your shipment!_';

        $('whatsappBtn').href = 'https://wa.me/233542451578?text=' + encodeURIComponent(receipt);
      } else {
        // No stored order — still show reference and a generic receipt
        $('itemsList').innerHTML = '<li class="p-3 text-xs text-slate-500">Order details not available on this device.</li>';
        const receipt = '*VALMONT GADGETS — ORDER RECEIVED*\nReference: *#' + displayRef + '*\n\nPayment pending confirmation via Valmont-Pay.';
        $('whatsappBtn').href = 'https://wa.me/233542451578?text=' + encodeURIComponent(receipt);
      }

      setupAccountPrompt(order);

      // Clear the pending order (and the cart) once the confirmation
      // page has successfully loaded and populated the receipt.
      // Also append the order to the local order log so the customer's
      // Account > Orders view reflects it immediately (as PENDING — only the
      // signed webhook may ever mark it Paid).
      if (status === 'success') {
        // NOTE: purchase analytics intentionally NOT fired here — payment is
        // only "pending confirmation" at return time. Purchase tracking belongs
        // to the confirmed-payment path (Valmont-Pay webhook → Paid).
        try {
          if (order) {
            const log = JSON.parse(localStorage.getItem('valmont_orders') || '[]');
            const alreadyLogged = log.some(function (o) {
              return String(o.reference_code || o.id || '') === String(displayRef);
            });
            if (!alreadyLogged) {
              log.unshift({
                reference_code: displayRef,
                customer_name:  order.customer_name  || order.name  || '',
                customer_phone: order.customer_phone || order.phone || '',
                customer_email: order.email || order.customer_email || '',
                total_amount:   Number(order.total_amount || 0),
                items:          Array.isArray(order.items) ? order.items : [],
                status:         'Pending confirmation',
                payment_method: 'Valmont-Pay',
                created_at:     new Date().toISOString()
              });
              localStorage.setItem('valmont_orders', JSON.stringify(log));
            }
          }
          localStorage.removeItem('valmont_pending_order');
          localStorage.removeItem('valmont_cart');
        } catch (e) {}
      }
    })();
