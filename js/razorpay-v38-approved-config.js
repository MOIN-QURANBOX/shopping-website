/* V38.1: separate post-approval payment option. Keep OFF until staff approval flow,
   live account, production payment server, signatures and webhooks all verified. */
window.MQB_V38_APPROVED_PAYMENT=Object.freeze({
 enabled:false,
 backendUrl:'',
 approvedBackendHost:'',
 expectedFirebaseProjectId:'moin-quran-box'
});
