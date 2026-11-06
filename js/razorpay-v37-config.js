/* MOIN QURAN BOX V38 storefront Razorpay integration — PREPARED, NOT LIVE.
 * This PUBLIC GitHub Pages site authenticates with production Firebase moin-quran-box.
 * The isolated V37 staging service (mqb-v37-isolated-test) is NOT compatible and
 * MUST NOT be placed in backendUrl. Do not use its TEST keys or staging access key.
 * Before switching enabled to true, deploy & audit a separate production-compatible
 * backend with /api/razorpay/status, /create and /verify as described in the guide.
 * The browser NEVER receives Razorpay key_secret, service accounts or webhook keys.
 */
window.MQB_RAZORPAY_V37 = Object.freeze({
  enabled: false, // intentionally OFF until production gateway has passed tests
  mode: 'live', // prospective production checkout; never send real customers to TEST
  backendUrl: '', // reviewed HTTPS production backend origin, e.g. https://example.com/
  approvedBackendHost: '', // exact approved hostname; must match backendUrl
  expectedFirebaseProjectId: 'moin-quran-box'
});
