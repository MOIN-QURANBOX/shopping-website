'use strict';
/**
 * MOIN QURAN BOX V37 — Razorpay TEST-only API operations.
 * This is a pure opt-in library. No HTTP route calls it, no credentials are
 * bundled, and it does not persist, confirm, fulfil or create a storefront order.
 * Order persistence and authenticated request gates must exist before wiring.
 */
const { verifyCheckoutSignature, assertCapturedPaymentMatches } = require('./razorpay-security');
const TEST_KEY = /^rzp_test_[A-Za-z0-9]{8,100}$/;
const RZP_ORDER = /^order_[A-Za-z0-9]{6,80}$/;
const RZP_PAYMENT = /^pay_[A-Za-z0-9]{6,80}$/;
const API = 'https://api.razorpay.com';
const MAX_PAYABLE_PAISE = 100_000_000;
const API_BODY_LIMIT = 32768;

function validateTestCredentials(keyId, keySecret) {
  if (typeof keyId !== 'string' || !TEST_KEY.test(keyId) ||
      typeof keySecret !== 'string' || !/^[A-Za-z0-9_-]{8,256}$/.test(keySecret)) {
    throw Error('Razorpay TEST credentials are unavailable. Live credentials are forbidden.');
  }
}

function assertAmount(amountPaise) {
  if (!Number.isSafeInteger(amountPaise) || amountPaise < 100 ||
      amountPaise > MAX_PAYABLE_PAISE) throw Error('Invalid server-calculated INR amount.');
}

function assertReceipt(receipt) {
  if (typeof receipt !== 'string' || !/^[A-Za-z0-9_-]{8,40}$/.test(receipt)) {
    throw Error('Invalid server-generated order receipt.');
  }
}

async function parseJsonResponse(response) {
  if (!response || typeof response.ok !== 'boolean') throw Error('Invalid Razorpay API response.');
  const len = Number(response.headers?.get?.('content-length') || 0);
  if (len > API_BODY_LIMIT) throw Error('Razorpay API response too large.');
  const body = await response.text();
  if (Buffer.byteLength(body, 'utf8') > API_BODY_LIMIT) throw Error('Razorpay API response too large.');
  if (!response.ok) throw Error('Razorpay TEST API operation failed.');
  try { return JSON.parse(body); } catch { throw Error('Invalid JSON from Razorpay API.'); }
}

function createRazorpayTestClient({keyId, keySecret, fetchFn = globalThis.fetch} = {}) {
  validateTestCredentials(keyId, keySecret);
  if (typeof fetchFn !== 'function') throw Error('HTTP transport missing.');
  const basic = 'Basic ' + Buffer.from(`${keyId}:${keySecret}`, 'utf8').toString('base64');

  async function call(method, path, payload) {
    // Only fixed paths are accepted by internal callers. No caller-controlled URL.
    const init = {method, headers: {Authorization:basic, Accept:'application/json'},
      redirect:'error', cache:'no-store', signal:AbortSignal.timeout(8000)};
    if (payload !== undefined) {
      init.headers['Content-Type']='application/json';
      init.body=JSON.stringify(payload);
    }
    try {return await parseJsonResponse(await fetchFn(API + path, init));}
    catch (err) {
      // Never expose Razorpay error bodies, authorization headers or secrets.
      if (/^(Razorpay TEST API operation failed|Razorpay API response too large|Invalid JSON from Razorpay API)/.test(err?.message || '')) throw err;
      throw Error('Razorpay TEST API is unavailable.');
    }
  }

  async function createOrder({amountPaise, receipt} = {}) {
    assertAmount(amountPaise); assertReceipt(receipt);
    const order = await call('POST', '/v1/orders', {
      amount:amountPaise, currency:'INR', receipt, payment_capture:1,
      notes:{source:'MQB_V37_TEST_ONLY'},
    });
    if (!order || !RZP_ORDER.test(order.id || '') || order.amount !== amountPaise ||
        order.currency !== 'INR' || order.receipt !== receipt ||
        !['created','attempted','paid'].includes(order.status)) {
      throw Error('Razorpay returned a mismatched TEST order.');
    }
    // Durable pending-order persistence is the caller's responsibility.
    return {razorpayOrderId:order.id, amountPaise, currency:'INR', receipt, keyId};
  }

  async function fetchPayment(paymentId) {
    if (typeof paymentId !== 'string' || !RZP_PAYMENT.test(paymentId)) {
      throw Error('Invalid Razorpay payment identifier.');
    }
    const payment = await call('GET', `/v1/payments/${paymentId}`);
    if (!payment || payment.id !== paymentId || typeof payment !== 'object') {
      throw Error('Razorpay returned a mismatched payment.');
    }
    return payment;
  }

  /**
   * signedResponse: actual checkout callback fields.
   * expected: trusted pending record loaded by server, including orderId and amount.
   * This NEVER marks any order paid and does not persist changes.
   */
  async function verifyCaptured({expected, signedResponse} = {}) {
    const storedId=expected?.razorpayOrderId;
    const amount=expected?.amountPaise;
    assertAmount(amount);
    if (!RZP_ORDER.test(storedId || '') ||
        signedResponse?.razorpay_order_id !== storedId ||
        !verifyCheckoutSignature({
          storedRazorpayOrderId:storedId,
          paymentId:signedResponse?.razorpay_payment_id,
          signature:signedResponse?.razorpay_signature,
        },keySecret)) {
      throw Error('Checkout signature does not match the stored order.');
    }
    const fetched=await fetchPayment(signedResponse.razorpay_payment_id);
    const captured=assertCapturedPaymentMatches(fetched, {
      razorpayOrderId:storedId,
      amountPaise:amount,
    });
    return {verified:true,paymentStatus:'captured',...captured};
  }

  return Object.freeze({createOrder,fetchPayment,verifyCaptured});
}

module.exports={createRazorpayTestClient,validateTestCredentials};
