'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
test('V42 replaces stale local product startup with cloud-only inventory',()=>{
  const js=read('js/app.js'),bridge=read('js/firebase-live.js');
  assert.match(js,/products = \[\];\s*\/\/ IMPORTANT:/);
  assert.match(bridge,/document\.documentElement\.classList\.add\('mqb42-catalog-ready'\)/);
  assert.match(read('css/mqb-v42-operations.css'),/html:not\(\.mqb42-catalog-ready\) #productGrid/);
});
test('V42 does not modify Razorpay mode scripts or purchase callbacks',()=>{
  const config=read('js/razorpay-v38-approved-config.js');
  assert.match(config,/enabled:\s*true/);assert.match(config,/onrender\.com/);
  const html=read('index.html');assert.match(html,/js\/razorpay-v38-approved-orders.js/);
  assert.match(html,/js\/mqb-v42-operations.js/);
});
test('COD is centrally toggled and fails closed for orders',()=>{
  assert.match(read('js/firebase-live.js'),/MQB42_COD_ENABLED=data\.codEnabled!==false/);
  assert.match(read('js/firebase-live.js'),/form\.paymentMethod==='COD' && window\.MQB42_COD_ENABLED!==true/);
  assert.match(read('index.html'),/id="mqb42CodSwitch"/);
});
test('Gift rules are limited to verified Razorpay orders',()=>{
  const js=read('js/mqb-v42-operations.js');
  assert.match(js,/10\\s\*books\\s\*combo/);
  assert.match(js,/o\?\.paymentMethod==='Razorpay' && o\.paymentStatus==='verified'/);
  for(const x of ['Miswaq','Finger counter digital tasbi','Seerat un Nabi kitab'])assert.ok(js.includes(x));
});
test('Outdated storefront manual UPI info notice was removed',()=>{
  const js=read('js/storefront-v26.js');assert.doesNotMatch(js,/id="mqbV26PaymentNotice"/);
});
test('Shipping labels deduplicate UID/key and create 4x6 multipage PDF',()=>{
  global.window={};require(path.join(root,'js/shipping-label-pdf.js'));
  const obj=(n)=>({order:{orderId:'REQ-'+n,customerName:'Buyer',customerPhone:'9000000000',address:'Example Street',city:'Hyderabad',postalCode:'500053',shipping:{carrier:'India Post'},items:[{qty:1}],paymentMethod:'COD'}});
  const fields=[window.MQBShippingLabelPDF.fields(obj(1)),window.MQBShippingLabelPDF.fields(obj(2))];
  const pdf=window.MQBShippingLabelPDF.buildMultiPdf(fields);
  assert.match(pdf,/\/Count 2/);assert.match(pdf,/\/MediaBox \[0 0 288 432\]/);
  assert.throws(()=>window.MQBShippingLabelPDF.buildMultiPdf([]));
  assert.match(read('js/mqb-v42-operations.js'),/const key=String\(o\.__uid\)\+'\/'\+String\(o\.__key\)/);
});
