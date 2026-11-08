/* MOIN QURAN BOX V39 — customer-initiated automatic confirmation (NOT ACTIVATED).
 * Razorpay and COD/Manual UPI remain separate choices. Payments are confirmed
 * exclusively by the backend after Razorpay reports a captured payment.
 * Retry always reuses the provider order and never creates a second order.
 * This frontend remains DISABLED until signed webhooks, Firebase rules,
 * account activation and end-to-end payment tests have been verified.
 */
(() => {
  'use strict';
  const cfg = window.MQB_V38_APPROVED_PAYMENT || {};
  // Two independent gates: an explicit deploy-time switch and a READY backend.
  if (cfg.enabled !== true || cfg.expectedFirebaseProjectId !== 'moin-quran-box') return;
  let base;
  try {
    const url = new URL(cfg.backendUrl);
    if (url.protocol !== 'https:' || url.username || url.password || url.port ||
        url.pathname !== '/' || url.search || url.hash ||
        !cfg.approvedBackendHost || url.hostname !== cfg.approvedBackendHost) return;
    base = url.origin;
  } catch { return; }

  const $ = id => document.getElementById(id);
  const KEY = /^[-A-Za-z0-9_]{8,128}$/;
  const ORDER = /^order_[A-Za-z0-9]{6,80}$/;
  const LIVE_KEY = /^rzp_live_[A-Za-z0-9]+$/;
  let active = false;
  let busy = false;
  const liveState = () => window.mqbLive;
  const allOrders = () => typeof orders !== 'undefined' && Array.isArray(orders) ? orders : [];
  const staffAllowed = () => liveState()?.verifiedAdmin === true &&
    ['admin', 'owner', 'manager'].includes(String(liveState()?.activeRole || ''));
  const payable = order => order && order.paymentMethod === 'Razorpay' &&
    ['unverified','pending'].includes(order.paymentStatus) && ['Requested','Payment Pending'].includes(order.status) &&
    Array.isArray(order.items) && KEY.test(order.__key || '');
  const notice = text => window.alert(String(text).slice(0,400));
  const exactOrder = card => {
    const uid = card?.getAttribute('data-mqb38-uid');
    const key = card?.getAttribute('data-mqb38-key');
    if (!uid || !KEY.test(key || '')) return null;
    const matches = allOrders().filter(o => o?.__uid === uid && o?.__key === key);
    return matches.length === 1 ? matches[0] : null;
  };
  const currentOrder = order => allOrders().find(o =>
    o?.__uid === order.__uid && o?.__key === order.__key) || null;

  async function token() {
    const auth = liveState()?.auth;
    if (!auth || auth.app?.options?.projectId !== cfg.expectedFirebaseProjectId ||
        !auth.currentUser || auth.currentUser.uid !== liveState()?.uid)
      throw Error('Please open your order from the account that placed it.');
    return auth.currentUser.getIdToken();
  }
  async function api(endpoint, body) {
    const jwt = await token();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 18000);
    try {
      const response = await fetch(base + endpoint, {
        method: 'POST', mode: 'cors', redirect: 'error', credentials: 'omit', cache: 'no-store',
        headers: {'Content-Type':'application/json', Authorization:'Bearer ' + jwt},
        body: JSON.stringify(body), signal: controller.signal
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const error = Error(String(data?.error || ('Payment server HTTP ' + response.status)).slice(0,140));
        error.status = response.status;
        throw error;
      }
      return data;
    } finally { clearTimeout(timer); }
  }
  // A manual UPI submission is checked by Firebase Admin SDK inside /create.
  // Browser-side access to paymentSubmissions is deliberately not required.
  const sdk = () => new Promise((resolve, reject) => {
    if (typeof window.Razorpay === 'function') return resolve();
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'; script.async = true;
    script.onload = () => typeof window.Razorpay === 'function' ? resolve() : reject(Error('Checkout could not load'));
    script.onerror = () => reject(Error('Checkout could not load'));
    document.head.appendChild(script);
  });

  async function pay(selected) {
    if (!active || busy || !payable(selected) || selected.__uid !== liveState()?.uid || staffAllowed()) return;
    if (!window.confirm('Pay this order securely using Razorpay? If you already see a debit in your bank account, do NOT pay again; contact the store instead.')) return;
    busy = true;
    let sdkOpened = false;
    try {
      // Brand-new orders may not yet have reached the Firebase history listener.
      // All trusted validations are repeated on the server.
      const latest = currentOrder(selected) || selected;
      if (!payable(latest) || latest.orderId !== selected.orderId)
        throw Error('Order details changed. Refresh your order history.');
      await token();
      const session = await api('/api/razorpay/create',{orderKey:latest.__key});
      if (!LIVE_KEY.test(session?.keyId || '') || !ORDER.test(session?.razorpayOrderId || '') ||
          session.orderKey !== latest.__key || session.orderId !== latest.orderId ||
          !Number.isSafeInteger(session.amountPaise) || session.amountPaise < 100 ||
          session.currency !== 'INR' || session.additionalDeliveryPaise !== 0)
        throw Error('Payment session mismatch. Contact the store before paying.');
      await sdk();
      let verifying = false;
      const widget = new window.Razorpay({
        key: session.keyId, order_id: session.razorpayOrderId,
        amount: session.amountPaise, currency: 'INR', name: 'MOIN QURAN BOX',
        description: 'Order ' + String(session.orderId).slice(0,60),
        prefill: {name: String(latest.customerName || '').slice(0,80),
          contact: String(latest.customerPhone || '').slice(0,18),
          email: String(latest.customerEmail || '').slice(0,120)},
        handler: async outcome => {
          if (verifying) return;
          verifying = true;
          try {
            const result = await api('/api/razorpay/verify',{
              orderKey: session.orderKey, razorpay_order_id: outcome.razorpay_order_id,
              razorpay_payment_id: outcome.razorpay_payment_id,
              razorpay_signature: outcome.razorpay_signature
            });
            if (result?.confirmed === true && result.orderPersisted === true &&
                result.paymentStatus === 'captured' && result.orderStatus === 'Confirmed' &&
                result.orderId === session.orderId)
              window.location.assign('payment-success.html?orderKey=' + encodeURIComponent(session.orderKey));
            else notice('Payment verification pending. If money was debited, do not retry; contact the store.');
          } catch {
            notice('Payment may have succeeded; the server has not confirmed the order yet. If money was debited, do not retry. Contact the store.');
          } finally { busy = false; }
        },
        modal: {ondismiss: () => {
          if (!verifying) {
            busy = false;
            $('orderSuccessModal')?.classList.remove('hidden');
            notice('Order ' + session.orderId + ' is Payment Pending. Retry from order history if no money was deducted. If debited, contact the store.');
          }
        }}
      });
      widget.on('payment.failed', () => {
        notice('Payment failed. Your order remains Payment Pending. Retry using Razorpay (same order) if no funds were debited.');
      });
      widget.open();
      sdkOpened = true;
    } catch (error) {
      notice('Razorpay: ' + String(error?.message || 'Please contact the store').slice(0,170) +
        ' If your bank shows a debit, do not retry. Contact support.');
    } finally { if (!sdkOpened) busy = false; }
  }
  // The existing checkout calls this once after an online order is saved.
  // A saved order means Payment Pending, never a successful charge.
  window.mqb39StartCheckout = order => pay(order);
  function attach() {
    if (!active || !liveState()?.auth ||
        liveState()?.auth?.app?.options?.projectId !== cfg.expectedFirebaseProjectId) return;
    const customerNode = $('custOrderList');
    if (customerNode && liveState()?.auth?.currentUser && !staffAllowed()) {
      customerNode.querySelectorAll('article[data-mqb38-uid][data-mqb38-key]').forEach(card => {
        if (card.querySelector('.mqb38-pay')) return;
        const record = exactOrder(card);
        if (!payable(record) || record.__uid !== liveState()?.uid) return;
        const button = document.createElement('button');
        button.type = 'button';button.className = 'mqb38-pay w-full bg-emerald-800 text-white rounded-lg px-3 py-2 font-bold';
        button.textContent = 'Payment Pending — Pay / Retry Razorpay';
        button.addEventListener('click', () => pay(record));
        card.appendChild(button);
      });
    }
    // Guest checkouts do not have the registered-customer profile/history panel.
    // Their private tracking view can offer payment for their OWN authenticated UID.
    const tracking = $('trackingResultBox');
    const trackingId = String($('trackInputId')?.value || '').trim().toUpperCase();
    if (tracking && trackingId && !staffAllowed() && liveState()?.auth?.currentUser &&
        !tracking.classList.contains('hidden') && !tracking.querySelector('.mqb38-pay-track')) {
      const matches = allOrders().filter(o => o?.__uid === liveState()?.uid &&
        String(o.orderId || '').toUpperCase() === trackingId);
      if (matches.length === 1 && payable(matches[0])) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'mqb38-pay-track w-full bg-emerald-800 text-white rounded-lg px-3 py-2 font-bold mt-2';
        button.textContent = 'Payment Pending — Pay / Retry Razorpay';
        button.addEventListener('click', () => pay(matches[0]));
        tracking.appendChild(button);
      }
    }
  }
  // V41.1 — Render Free can sleep while customers browse. Keep payment FAIL-CLOSED,
  // but do not leave an active LIVE integration labelled "Coming soon" forever.
  // Retry cold starts, recheck whenever checkout opens, and offer manual retry.
  let readinessAttempts = 0;
  let readinessInFlight = false;
  let nextAttempt = null;
  const MAX_STARTUP_CHECKS = 10;
  const READY_TIMEOUT_MS = 20000;
  const RETRY_DELAY_MS = 6500;
  const serverBadge = () => $('mqb38AvailabilityBadge');
  const serverCard = () => $('mqbV37ComingSoon');

  function presentConnectionState(state) {
    if (active) return;
    const badge = serverBadge();
    if (badge) badge.textContent = state === 'waiting' ? 'Connecting…' :
      state === 'offline' ? 'Try again' : 'Unavailable';
    const card = serverCard();
    const warning = card?.querySelector?.('.mqb38-method-warning');
    if (warning) warning.textContent = state === 'waiting'
      ? 'Connecting to the secure Razorpay payment server. This can take longer when the free hosting service wakes up. Do not retry a payment if funds were debited.'
      : 'Secure Razorpay checkout is temporarily unavailable. Please use Cash on Delivery if suitable, or tap Recheck connection. Never pay twice for the same order.';
    const policy = $('mqb37PaymentPolicy');
    if (policy) policy.textContent = state === 'waiting'
      ? 'Checking secure online payment availability…'
      : 'Secure online payment is currently unavailable. You can recheck the connection without creating an order.';
    const button = $('mqb41RazorpayRecheck');
    if (button) {
      button.disabled = readinessInFlight;
      button.textContent = readinessInFlight ? 'Checking connection…' : 'Recheck Razorpay connection';
    }
  }

  function setupRetryControl() {
    const card = serverCard();
    const target = card?.querySelector?.('.mqb38-method-copy');
    if (target && !$('mqb41RazorpayRecheck')) {
      const button = document.createElement('button');
      button.id = 'mqb41RazorpayRecheck';
      button.type = 'button';
      button.className = 'mt-3 border rounded-md px-3 py-2 text-xs font-bold bg-white text-emerald-900';
      button.textContent = 'Recheck Razorpay connection';
      button.addEventListener('click', () => manualRecheck());
      target.appendChild(button);
    }
    const modal = $('checkoutModal');
    if (modal && typeof MutationObserver === 'function') {
      new MutationObserver(() => {
        if (!modal.classList.contains('hidden') && !active) manualRecheck();
      }).observe(modal, {attributes:true, attributeFilter:['class']});
    }
  }

  function queueRetry() {
    if (active || nextAttempt !== null || readinessAttempts >= MAX_STARTUP_CHECKS) return;
    nextAttempt = setTimeout(() => {
      nextAttempt = null;
      ready();
    }, RETRY_DELAY_MS);
  }

  function manualRecheck() {
    if (active || readinessInFlight) return;
    if (nextAttempt !== null) { clearTimeout(nextAttempt); nextAttempt = null; }
    readinessAttempts = 0;
    ready();
  }
  window.mqb39RetryReadiness = manualRecheck;

  async function ready() {
    if (active || readinessInFlight) return;
    readinessInFlight = true;
    readinessAttempts += 1;
    presentConnectionState('waiting');
    let shouldRetry = true;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), READY_TIMEOUT_MS);
      let response;
      try {
        response = await fetch(base + '/api/razorpay/status', {
          cache:'no-store', mode:'cors', credentials:'omit', redirect:'error', signal:controller.signal
        });
      } finally { clearTimeout(timer); }
      if (!response.ok) {
        if (response.status < 500) shouldRetry = false;
        return;
      }
      const data = await response.json();
      if (data?.mode !== 'live' || data.checkoutReady !== true ||
          data.paymentCreationEnabled !== true || data.webhookReady !== true ||
          data.livePaymentsEnabled !== true || data.autoConfirm !== true ||
          data.serverApprovedFinalAmountRequired !== false ||
          data.autoConfirmWithoutStaff !== true || data.retryUsesSameProviderOrder !== true ||
          data.paymentModel !== 'customer-auto-confirm-v39' ||
          data.additionalDeliveryPaise !== 0 || data.testPaymentsEnabled !== false ||
          data.firebaseProjectId !== cfg.expectedFirebaseProjectId) {
        // Explicitly disabled or incompatible backend: NEVER show a payment option.
        shouldRetry = false;
        return;
      }
      active = true;
      window.mqb39RazorpayReady = true;
      if (nextAttempt !== null) {clearTimeout(nextAttempt);nextAttempt = null;}
      const option = $('mqbV36PaymentOption');
      if (option) {
        option.hidden = false;
        option.classList.remove('hidden');
        const radio = option.querySelector('input[name="chkPaymentMethod"]');
        if (radio) radio.disabled = false;
      }
      const card = serverCard();
      if (card) card.hidden = true;
      const message = $('mqb37PaymentPolicy');
      if (message) message.textContent = 'Choose Razorpay to pay online now. Your order will be confirmed automatically after the server verifies payment capture. Failed payments remain Payment Pending, with Retry available in order history.';
      window.mqbUpdatePaymentDescription?.();
      const footnote = $('mqb37CheckoutFootnote');
      if (footnote) footnote.textContent = 'For Razorpay, the server securely checks the current item total. When captured payment is verified, the order is confirmed automatically. No additional delivery fee.';
      for (const id of ['adminOrdersContainer','custOrderList','trackingResultBox']) {
        const node = $(id);
        if (node) new MutationObserver(attach).observe(node, {childList:true,subtree:true});
      }
      attach();
    } catch {
      // A missing connection must never bypass readiness or create a payment.
    } finally {
      readinessInFlight = false;
      if (!active) {
        presentConnectionState(shouldRetry && readinessAttempts < MAX_STARTUP_CHECKS ? 'waiting' : 'offline');
        if (shouldRetry) queueRetry();
      }
    }
  }
  function begin() {
    setupRetryControl();
    ready();
    if (typeof window.addEventListener === 'function') {
      window.addEventListener('online', manualRecheck);
      window.addEventListener('pageshow', () => {if (!active) manualRecheck();});
      window.addEventListener('focus', () => {
        if (!active && document.visibilityState !== 'hidden') manualRecheck();
      });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', begin, {once:true});
  else begin();
})();
