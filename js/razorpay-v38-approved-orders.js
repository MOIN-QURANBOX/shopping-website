/* MOIN QURAN BOX V38.2 — owner-approved Razorpay checkout (NOT ACTIVATED).
 * The frontend NEVER creates its own provider order, computes a trusted price,
 * verifies capture locally, or writes paymentStatus=verified to Firebase.
 * This code can be activated only after server reconciliation, webhook, account,
 * and end-to-end payment checks have passed. COD and manual UPI are unchanged.
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
  const attempted = new Set();
  const liveState = () => window.mqbLive;
  const allOrders = () => typeof orders !== 'undefined' && Array.isArray(orders) ? orders : [];
  const staffAllowed = () => liveState()?.verifiedAdmin === true &&
    ['admin', 'owner'].includes(String(liveState()?.activeRole || ''));
  const payable = order => order && order.paymentMethod === 'Manual UPI' &&
    order.paymentStatus === 'unverified' && ['Requested','Confirmed'].includes(order.status) &&
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
  // A manual UPI proof may represent a payment that has not yet been bank-verified.
  // Fail closed if its status cannot be checked. A backend-side atomic exclusion
  // remains necessary before real payments can be enabled (Step 139).
  async function noManualPaymentProof(order) {
    const db = liveState()?.db;
    if (!db || typeof db.ref !== 'function')
      throw Error('Cannot check an existing UPI payment. Contact the store.');
    let snapshot;
    try {snapshot = await db.ref('paymentSubmissions/' + order.__uid + '/' + order.__key).once('value');}
    catch {throw Error('Cannot check an existing UPI payment. Contact the store.');}
    if (snapshot.exists()) throw Error('UPI payment details already submitted. Contact the store; do not pay twice.');
  }
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
    const key = selected.__uid + '/' + selected.__key;
    if (attempted.has(key)) return notice('This order has already had a payment attempt on this page. Verify its status with the store before trying again.');
    if (!window.confirm('Only pay after the store approves the final order amount. If you already paid by QR/manual UPI, cancel and contact the store. Continue?')) return;
    busy = true;
    let sdkOpened = false;
    try {
      const latest = currentOrder(selected);
      if (!payable(latest) || latest.orderId !== selected.orderId)
        throw Error('Order status changed. Refresh your order history.');
      await token();
      await noManualPaymentProof(latest);
      // After this point a provider order may exist, including after a timeout.
      // Never blindly send another create request from this page.
      attempted.add(key);
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
        description: 'Owner-approved order ' + String(session.orderId).slice(0,60),
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
                result.paymentStatus === 'captured' && result.orderId === session.orderId)
              notice('Payment securely verified for order ' + session.orderId + '. Thank you!');
            else notice('Payment outcome pending. Do not pay again; contact the store with your order ID.');
          } catch {
            notice('Payment may have succeeded, but order confirmation is pending. Do not pay again. Contact the store with your order ID.');
          } finally { busy = false; }
        },
        modal: {ondismiss: () => {
          if (!verifying) {busy = false; notice('Checkout closed. Before paying again, check the order status with the store.');}
        }}
      });
      widget.on('payment.failed', () => {
        // The provider may still show an in-checkout retry option; do not create a new order.
        notice('Payment was not confirmed. Check payment status before another attempt.');
      });
      widget.open();
      sdkOpened = true;
    } catch (error) {
      notice('Razorpay is unavailable: ' + String(error?.message || 'Please contact the store').slice(0,170) +
        (attempted.has(key) ? ' Do not initiate another payment until reviewed.' : ''));
    } finally { if (!sdkOpened) busy = false; }
  }
  async function approve(selected) {
    if (!active || busy || !staffAllowed() || !payable(selected)) return;
    const latest = currentOrder(selected);
    if (!payable(latest) || latest.orderId !== selected.orderId) return notice('Order details changed. Refresh orders.');
    const display = (Number(latest.total) || 0).toFixed(2);
    const entered = window.prompt('First verify stock, shipping, and the final item amount.\nEnter the exact INR amount (current estimate ₹' + display + ').');
    if (entered === null) return;
    const amount = Number(entered);
    const paise = Math.round(amount * 100);
    if (!Number.isSafeInteger(paise) || paise < 100 || !Number.isFinite(amount) ||
        Math.abs(amount*100 - paise) > 0.001)
      return notice('Enter a valid INR amount with at most two decimals.');
    if (!window.confirm('Approve exactly ₹' + amount.toFixed(2) + ' for Razorpay? The payment backend will also recalculate prices.')) return;
    busy = true;
    try {
      await token();
      await noManualPaymentProof(latest);
      const result = await api('/api/razorpay/staff/approve',{
        customerUid: latest.__uid, orderKey: latest.__key, expectedAmountPaise: paise
      });
      if (result?.approved === true && result?.orderKey === latest.__key && result?.amountPaise === paise)
        notice('Approved ₹' + (paise/100).toFixed(2) + ' for Razorpay. Customer may pay from order history after approval.');
      else notice('Approval response unexpected. Check with support before proceeding.');
    } catch (error) {notice('Approval not completed: ' + String(error?.message || 'Contact the store').slice(0,180));}
    finally {busy = false;}
  }
  function attach() {
    if (!active || !liveState()?.auth ||
        liveState()?.auth?.app?.options?.projectId !== cfg.expectedFirebaseProjectId) return;
    const staffNode = $('adminOrdersContainer');
    if (staffAllowed() && staffNode) {
      staffNode.querySelectorAll('article[data-mqb38-uid][data-mqb38-key]').forEach(card => {
        if (card.querySelector('.mqb38-approve')) return;
        const record = exactOrder(card);
        if (!payable(record)) return;
        const button = document.createElement('button');
        button.type = 'button';button.className = 'mqb38-approve border border-emerald-800 rounded-lg px-3 py-2 w-full font-bold';
        button.textContent = 'Approve final amount for Razorpay';
        button.addEventListener('click', () => approve(record));
        card.appendChild(button);
      });
    }
    const customerNode = $('custOrderList');
    if (customerNode && liveState()?.auth?.currentUser && !staffAllowed()) {
      customerNode.querySelectorAll('article[data-mqb38-uid][data-mqb38-key]').forEach(card => {
        if (card.querySelector('.mqb38-pay')) return;
        const record = exactOrder(card);
        if (!payable(record) || record.__uid !== liveState()?.uid) return;
        const button = document.createElement('button');
        button.type = 'button';button.className = 'mqb38-pay w-full bg-emerald-800 text-white rounded-lg px-3 py-2 font-bold';
        button.textContent = 'Razorpay — pay after store approval';
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
        button.textContent = 'Razorpay — pay after store approval';
        button.addEventListener('click', () => pay(matches[0]));
        tracking.appendChild(button);
      }
    }
  }
  async function ready() {
    try {
      const controller = new AbortController();const timer = setTimeout(() => controller.abort(), 8000);
      let response;
      try {response = await fetch(base + '/api/razorpay/status',{
        cache:'no-store',mode:'cors',credentials:'omit',redirect:'error',signal:controller.signal
      });} finally {clearTimeout(timer);}
      if (!response.ok) return;
      const data = await response.json();
      if (data?.mode !== 'live' || data.checkoutReady !== true ||
          data.paymentCreationEnabled !== true || data.webhookReady !== true ||
          data.livePaymentsEnabled !== true || data.autoConfirm !== true ||
          data.serverApprovedFinalAmountRequired !== true ||
          data.additionalDeliveryPaise !== 0 || data.testPaymentsEnabled !== false ||
          data.firebaseProjectId !== cfg.expectedFirebaseProjectId) return;
      active = true;
      const card = $('mqbV37ComingSoon');
      if (card) {
        const small = card.querySelector('small');
        if (small) small.textContent = 'Submit a Manual UPI order request first. After store approval, pay from order history. Do not also pay using the manual UPI QR.';
        const badge = $('mqb38AvailabilityBadge');
        if (badge) badge.textContent = 'After approval';
        const warning = card.querySelector('.mqb38-method-warning');
        if (warning) warning.textContent = 'Payment is collected only from an approved order in your order history — not in this checkout form.';
      }
      for (const id of ['adminOrdersContainer','custOrderList','trackingResultBox']) {
        const node = $(id);
        if (node) new MutationObserver(attach).observe(node,{childList:true,subtree:true});
      }
      attach();
    } catch { /* Fail closed — do not expose payment actions. */ }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',ready,{once:true});
  else ready();
})();
