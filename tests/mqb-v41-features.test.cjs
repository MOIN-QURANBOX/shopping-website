'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const html=read('index.html'), controls=read('js/mqb-v41-controls.js'), bridge=read('js/firebase-live.js'), payments=read('js/razorpay-v38-approved-orders.js');
test('V41 provides all-staff inventory hide/restore without destroying order history',()=>{
 assert.match(html,/id="editProductActive"/);assert.match(html,/id="mqb41HiddenProducts"/);
 assert.match(bridge,/active:product\.active!==false/);
 assert.match(bridge,/p\.active===false/);
 assert.match(controls,/catalog\/'\+productId\+'\/active/);
 assert.doesNotMatch(controls,/\.db\.ref\(.*\.remove\(\)/);
});
test('Manual UPI public toggle is server-backed; Razorpay and COD unchanged',()=>{
 assert.match(html,/id="mqb41ManualUpiRow"/);
 assert.match(html,/id="mqb41ManualPaymentAdmin"/);
 assert.match(controls,/publicSettings\/manualUpiEnabled/);
 assert.match(bridge,/manualUpiEnabled===false/);
 assert.match(html,/value="COD"/);assert.match(html,/value="Razorpay"/);
});
test('Standalone feedback entries removed without erasing genuine reviews',()=>{
 for(const id of ['mqb33DrawerFeedback','adminTabBtn-reviews','mqb33FeedbackModal']) assert.doesNotMatch(html,new RegExp('id="'+id+'"'));
 assert.match(html,/product-feedback-v33\.js/);
});
test('Razorpay captured server-confirmed callback goes to private receipt, not public-ID lookup',()=>{
 assert.match(payments,/result\.paymentStatus === 'captured'/);
 assert.match(payments,/result\.orderPersisted === true/);
 assert.match(payments,/window\.location\.assign\('payment-success\.html\?orderKey='/);
 const page=read('payment-success.html'),src=read('js/mqb-v41-receipt.js');
 assert.match(page,/noindex,nofollow/);
 assert.match(src,/orderRequests\/'\+user\.uid\+'\/'\+key/);
 assert.match(src,/o\.paymentStatus!=='verified'/);
 assert.doesNotMatch(src,/\.innerHTML\s*=/);
});
test('WhatsApp status is staff-initiated with explicit send; not falsely automated',()=>{
 assert.match(bridge,/Send order details \/ status via WhatsApp/);
 assert.match(bridge,/mqb41OfferWhatsAppStatus/);
 assert.match(controls,/not sent automatically/);
 assert.match(read('js/customer-experience-v34.js'),/wa\.me/);
});
test('Manager can write only active through proposed rule, while admin-only public settings remain',()=>{
 const rules=JSON.parse(fs.readFileSync(path.join(root,'..','V41_Firebase_Rules_PROPOSAL_DO_NOT_PUBLISH.json'),'utf8')).rules;
 assert.match(rules.catalog.$productId.active['.write'],/role'\)\.val\(\) === 'manager'/);
 assert.match(rules.catalog.$productId.active['.validate'],/newData\.isBoolean/);
 assert.match(rules.orderRequests.$uid.$orderId['.write'],/manualUpiEnabled/);
 assert.equal(rules.razorpayServerOnly['.write'],false);
});
