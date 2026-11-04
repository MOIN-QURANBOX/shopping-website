/* V36 public-only settings. Keep false until the secure TEST backend is deployed and validated.
 * Key secrets, webhook secrets and Firebase service-account keys must NEVER appear here. */
window.MQB_RAZORPAY_V36 = Object.freeze({
  enabled: false,
  backendUrl: '' // HTTPS URL of your private Razorpay TEST backend (not GitHub Pages).
});
