'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),read=x=>fs.readFileSync(path.join(root,x),'utf8');
function pdfContext(){const context={window:{mqb42OfferGiftsForOrder:()=>[]}};vm.createContext(context);vm.runInContext(read('js/shipping-label-pdf.js'),context);vm.runInContext(read('js/order-invoice-pdf.js'),context);return context.window;}
const data=(n,paid=false)=>({order:{orderId:'MQB-REQ-TEST-'+n,customerName:'Test Customer '+n,customerPhone:'9876543210',address:'Flat 24, A Block, Hospital Road, Hyderabad, Telangana',postalCode:'500053',deliveryNote:'Near School Gate',date:'2026-11-09T09:00:00+05:30',paymentMethod:paid?'Razorpay':'COD',paymentStatus:paid?'verified':'unverified',paymentVerification:paid?{razorpayPaymentId:'pay_Q1234567',verifiedAmount:999}:undefined,items:[{title:'Quran Box',qty:1,salePrice:999}],total:999},shop:{brandName:'MOIN QURAN BOX',address:'Madina Colony, Opposite Hafez Ustad Haleem, Falaknuma, Hyderabad 500053',phone1:'+91 7337464501'},profile:{}});
test('V43 exposes status and date filters for admin/staff bulk PDF',()=>{const html=read('index.html'),code=read('js/mqb-v42-operations.js');for(const id of ['mqb43LabelStatus','mqb43LabelFrom','mqb43LabelTo','mqb42BulkDownload'])assert.ok(html.includes('id="'+id+'"'));
 assert.match(code,/mode==='confirmed'&&!paid/);assert.match(code,/orderDateIST\(o\)/);assert.match(code,/mode==='pending'&&!pending/);assert.match(code,/seen\.has\(key\)/);assert.match(code,/verifiedAdmin===true/);});
test('V43 4x6 label prints customer first, followed by seller and courier sticker area',()=>{
 const app=pdfContext(),d=app.MQBShippingLabelPDF.fields(data(1,true)),pdf=app.MQBShippingLabelPDF.buildPdf(d);
 assert.match(pdf,/\/MediaBox \[0 0 288 432\]/);assert.match(pdf,/DELIVER TO - CUSTOMER ADDRESS/);
 assert.match(pdf,/LANDMARK: Near School Gate/);assert.match(pdf,/PIN: 500053/);
 assert.match(pdf,/SPACE FOR INDIA POST COURIER STICKER/);assert.ok(pdf.indexOf('(DELIVER TO')<pdf.indexOf('(FROM \/ RETURN TO)'));
 assert.match(pdf,/PHONE: \+91 7337464501/);assert.match(pdf,/MOBILE: 9876543210/);
});
test('V43 multi order PDF has one 4x6 page per order',()=>{const app=pdfContext();const pdf=app.MQBShippingLabelPDF.buildMultiPdf([1,2,3].map(i=>app.MQBShippingLabelPDF.fields(data(i))));assert.match(pdf,/\/Count 3/);assert.equal((pdf.match(/\/MediaBox \[0 0 288 432\]/g)||[]).length,3);});
test('V43 refuses incomplete shipping addresses and oversized text rather than clipping silently',()=>{
 const app=pdfContext(),x=data(1);delete x.order.postalCode;assert.throws(()=>app.MQBShippingLabelPDF.buildPdf(app.MQBShippingLabelPDF.fields(x)),/6-digit PIN/);
 const y=data(2);y.order.address='Long road address '.repeat(40);assert.throws(()=>app.MQBShippingLabelPDF.buildPdf(app.MQBShippingLabelPDF.fields(y)),/too long/);
});
test('V43 invoice clearly distinguishes server verified payment from unpaid order',()=>{const app=pdfContext();const paid=app.MQBInvoicePDF.buildPdf(app.MQBInvoicePDF.invoiceFields(data(1,true)));
 const unpaid=app.MQBInvoicePDF.buildPdf(app.MQBInvoicePDF.invoiceFields(data(2,false)));
 assert.match(paid,/PAID ORDER RECEIPT/);assert.match(paid,/Razorpay received/);assert.match(paid,/server verified/);assert.match(paid,/pay_Q1234567/);
 assert.match(unpaid,/ORDER STATEMENT/);assert.doesNotMatch(unpaid,/Razorpay received/);assert.match(unpaid,/not a payment receipt/i);
 assert.match(paid,/ORDER PLACED/);assert.match(paid,/Phone: 9876543210/);
});
test('V43 invoice lookup order ID optional, requires mobile/date, and never does public database search',()=>{const html=read('index.html'),code=read('js/mqb-v43-fulfilment.js');assert.match(html,/id="lookupOrderDate" required/);assert.match(html,/id="lookupOrderId" maxlength/);assert.doesNotMatch(html,/id="lookupOrderId" required/);
 assert.match(code,/o\?\.__uid===uid/);assert.match(code,/dateIST\(o\.date\|\|o\.createdAt\)===date/);assert.match(code,/!id\|\|String\(o\.orderId/);
 assert.doesNotMatch(code,/\.ref\(['"]orderRequests/);});
test('V43 customer invoice lookup uses same Firebase UID with mobile and India date',()=>{
 const nodes={},listeners=[];
 function elt(id){return nodes[id]??(nodes[id]={value:'',classList:{add(){},remove(){}},addEventListener(){},append(){},textContent:'',querySelectorAll(){return []}});}
 const document={readyState:'loading',getElementById:elt,addEventListener(name,fn){if(name==='DOMContentLoaded')listeners.push(fn);},createElement(tag){return {tagName:tag,textContent:'',className:'',append(){},addEventListener(){}};}};
 const downloaded=[],window={mqbLive:{uid:'user-abc'},downloadOrderInvoice:(u,k)=>downloaded.push([u,k])};
 const context={window,document,orders:[{...data(1).order,__uid:'user-abc',__key:'ORDER_KEY_1'}, {...data(2).order,__uid:'another-user',__key:'OTHER_KEY'}],Intl,Date};vm.createContext(context);
 vm.runInContext(read('js/mqb-v43-fulfilment.js'),context);listeners.forEach(f=>f());
 nodes.lookupPhone.value='9876543210';nodes.lookupOrderDate.value='2026-11-09';nodes.lookupOrderId.value='';
 window.handlePublicInvoiceLookup({preventDefault(){}});
 assert.deepEqual(downloaded,[['user-abc','ORDER_KEY_1']]);
});
test('V43 link points only to the official India Post domain and never claims AWB pre-fill',()=>{
 const code=read('js/mqb-v43-fulfilment.js'),ops=read('js/mqb-v42-operations.js');assert.match(code,/https:\/\/www\.indiapost\.gov\.in\//);assert.match(code,/CAPTCHA/);assert.match(ops,/MQB42_INDIA_POST_URL=officialUrl/);});
test('V43 does not change Razorpay scripts, database rules or backend payment flow',()=>{
 const html=read('index.html');assert.match(html,/js\/razorpay-v38-approved-orders\.js/);assert.match(html,/js\/mqb-v43-fulfilment\.js/);
 for(const x of ['js/mqb-v43-fulfilment.js','js/shipping-label-pdf.js','js/order-invoice-pdf.js'])assert.doesNotMatch(read(x),/paymentSubmissions\/|razorpay-v38-approved-config.*=/);
});
