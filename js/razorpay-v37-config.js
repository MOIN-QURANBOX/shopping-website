/* MOIN QURAN BOX V37 — public checkout feature switch.
 * The Razorpay TEST option is intentionally OFF for customers until a matching
 * production-identity-compatible TEST backend passes all server checks.
 * Never put Razorpay key_secret, Firebase Admin keys or webhook secrets here.
 * Do not point this production-auth storefront at the isolated V37 staging API:
 * its Firebase Authentication project is different, and that server has no
 * payment endpoints. A separate isolated test storefront requires its own config.
 */
window.MQB_RAZORPAY_V37 = Object.freeze({
  enabled: false,
  mode: 'test',
  backendUrl: '', // HTTPS address of future reviewed TEST-payment backend
  approvedBackendHost: '', // exact hostname, required when enabled
  expectedFirebaseProjectId: 'moin-quran-box'
});
