'use strict';
/* Offline frontend contract tests. No real payment, Firebase, or network requests. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const config=fs.readFileSync(path.join(root,'js/razorpay-v38-approved-config.js'),'utf8');
const source=fs.readFileSync(path.join(root,'js/razorpay-v38-approved-orders.js'),'utf8');
const liveJs=fs.readFileSync(path.join(root,'js/firebase-live.js'),'utf8');
const markup=fs.readFileSync(path.join(root,'index.html'),'utf8');
const uid='CustomerUID_12345',key='-NprodOrder_1234567';
const valid={__uid:uid,__key:key,orderId:'MQB-REQ-AUTO1',status:'Payment Pending',
 paymentMethod:'Razorpay',paymentStatus:'pending',items:[{id:'p1',qty:1}],total:180};
const ready={mode:'live',checkoutReady:true,paymentCreationEnabled:true,webhookReady:true,
 livePaymentsEnabled:true,autoConfirm:true,serverApprovedFinalAmountRequired:false,
 autoConfirmWithoutStaff:true,retryUsesSameProviderOrder:true,paymentModel:'customer-auto-confirm-v39',
 additionalDeliveryPaise:0,testPaymentsEnabled:false,firebaseProjectId:'moin-quran-box'};
function fixture({enabled=false,status=ready,role='customer',records=[valid],cards=[valid],
   proof=false,confirmed=true,trackingId=''}={}){
 const calls=[],notices=[],created=[],widgets=[];
 const makeCard=r=>({data:r,children:[],
  getAttribute(k){return k==='data-mqb38-uid'?r.__uid:k==='data-mqb38-key'?r.__key:null;},
  querySelector(selector){return this.children.find(x=>x.className.includes(selector.slice(1)))||null;},
  appendChild(x){this.children.push(x);}});
 const content=cards.map(makeCard),container={querySelectorAll(){return content;}};
 const option={hidden:true,classList:{remove(){}},querySelector(){return {disabled:true};}};
 const card={hidden:false};const nodes={mqbV37ComingSoon:card,mqbV36PaymentOption:option,
  mqb37PaymentPolicy:{},mqb37CheckoutFootnote:{}};
 const tracking={children:[],classList:{contains:()=>!trackingId},
  querySelector(){return this.children.find(x=>x.className.includes('mqb38-pay-track'))||null;},
  appendChild(c){this.children.push(c);}};
 const doc={readyState:'complete',head:{appendChild(){throw Error('SDK should already be present in tests');}},
  getElementById(id){return nodes[id]||(
    id==='adminOrdersContainer'&&['admin','owner','manager'].includes(role)?container:
    id==='custOrderList'&&role==='customer'?container:
    id==='trackingResultBox'?tracking:id==='trackInputId'?{value:trackingId}:null);},
  createElement(){const button={className:'',type:'',textContent:'',
    addEventListener(e,fn){this['on'+e]=fn;}};created.push(button);return button;}};
 const live={uid,verifiedAdmin:['admin','owner','manager'].includes(role),activeRole:role,
  auth:{app:{options:{projectId:'moin-quran-box'}},currentUser:{uid,getIdToken:async()=>'TOKEN'}},
  db:{ref(x){return {async once(){calls.push({url:'FIREBASE:'+x});return {exists:()=>proof}}};}}};
 const web={MQB_V38_APPROVED_PAYMENT:{enabled,expectedFirebaseProjectId:'moin-quran-box',
   backendUrl:'https://mqb-v38-payment-gateway.onrender.com/',approvedBackendHost:'mqb-v38-payment-gateway.onrender.com'},
  mqbLive:live,alert:t=>notices.push(t),confirm:()=>true};
 web.Razorpay=function Razorpay(options){const widget={options,events:{},on(name,fn){this.events[name]=fn;},open(){this.opened=true;}};widgets.push(widget);return widget;};
 const fetch=async(u,opts)=>{
  calls.push({url:u,opts});const isStatus=u.endsWith('/api/razorpay/status');
  const value=isStatus?status:u.endsWith('/api/razorpay/create')?
    {keyId:'rzp_live_demoabcdefgh',orderKey:key,orderId:valid.orderId,
     razorpayOrderId:'order_ABC1234567890',amountPaise:18000,currency:'INR',additionalDeliveryPaise:0}:
    {confirmed,orderPersisted:true,paymentStatus:'captured',orderStatus:'Confirmed',orderId:valid.orderId};
  return {ok:true,status:200,json:async()=>value};
 };
 vm.runInNewContext(source,{window:web,document:doc,fetch,orders:records,URL,AbortController,
  setTimeout,clearTimeout,MutationObserver:class{observe(){}},console});
 return {web,content,tracking,calls,notices,created,option,card,widgets,
  settle:()=>new Promise(resolve=>setImmediate(resolve))};
}
test('shipped configuration keeps production Razorpay disabled',()=>{
 assert.match(config,/enabled:\s*false/);
 assert.match(markup,/id="mqbV36PaymentOption" hidden/);
 assert.match(markup,/value="Razorpay"[^>]*disabled/);
 assert.doesNotMatch(markup,/<script defer src="js\/razorpay-v37\.js"/);
 assert.match(liveJs,/window\.mqb39RazorpayReady!==true/);
});
test('disabled feature makes no network call and no Razorpay button',async()=>{
 const h=fixture();await h.settle();assert.equal(h.calls.length,0);assert.equal(h.created.length,0);
});
test('backend in old staff-approval mode never activates checkout',async()=>{
 const h=fixture({enabled:true,status:{...ready,serverApprovedFinalAmountRequired:true}});await h.settle();
 assert.equal(h.option.hidden,true);assert.equal(h.created.length,0);
});
test('ready backend exposes Razorpay option with no staff approval',async()=>{
 const h=fixture({enabled:true});await h.settle();
 assert.equal(h.web.mqb39RazorpayReady,true);assert.equal(h.option.hidden,false);
 assert.equal(h.card.hidden,true);assert.equal(h.created.length,1);
 assert.match(h.content[0].children[0].textContent,/Pay \/ Retry/);
 assert.equal(h.calls.filter(x=>x.url.includes('/staff/approve')).length,0);
});
test('successful captured callback shows automatically confirmed order',async()=>{
 const h=fixture({enabled:true});await h.settle();
 await h.content[0].children[0].onclick();await h.settle();
 assert.equal(h.calls.filter(x=>x.url.endsWith('/api/razorpay/create')).length,1);
 assert.equal(h.widgets.length,1);
 await h.widgets[0].options.handler({razorpay_order_id:'order_ABC1234567890',
   razorpay_payment_id:'pay_ABC1234567890',razorpay_signature:'a'.repeat(64)});
 assert.match(h.notices.join(' '),/automatically confirmed/);
});
test('failed then dismissed checkout can retry on same order',async()=>{
 const h=fixture({enabled:true});await h.settle();
 await h.content[0].children[0].onclick();await h.settle();
 h.widgets[0].events['payment.failed']();h.widgets[0].options.modal.ondismiss();
 await h.content[0].children[0].onclick();await h.settle();
 assert.equal(h.widgets.length,2);
 assert.equal(h.calls.filter(x=>x.url.endsWith('/api/razorpay/create')).length,2);
 assert.match(h.notices.join(' '),/Payment Pending/);
});
test('manual payment proof is rejected by server, not a privileged browser database read',async()=>{
 const h=fixture({enabled:true,proof:true});await h.settle();
 await h.content[0].children[0].onclick();await h.settle();
 assert.equal(h.calls.filter(x=>x.url.startsWith('FIREBASE:')).length,0);
 assert.equal(h.calls.filter(x=>x.url.endsWith('/api/razorpay/create')).length,1);
});
test('other payment methods, cancelled and captured orders never show pay or retry',async()=>{
 const records=[{...valid,paymentMethod:'Manual UPI'},
  {...valid,__key:'-NcancelOrder_123456',status:'Cancelled'},
  {...valid,__key:'-NpaidOrder_12345678',paymentStatus:'verified'}];
 const h=fixture({enabled:true,records,cards:records});await h.settle();
 assert.equal(h.created.length,0);
});
test('staff has no owner approval button',async()=>{
 const h=fixture({enabled:true,role:'owner'});await h.settle();
 assert.equal(h.created.length,0);assert.equal(h.calls.filter(x=>x.url.includes('/staff/approve')).length,0);
});
test('private guest tracking exposes retry only on matching authenticated order',async()=>{
 const h=fixture({enabled:true,role:'guest',trackingId:valid.orderId});await h.settle();
 assert.equal(h.tracking.children.length,1);
 const miss=fixture({enabled:true,role:'guest',trackingId:'MQB-REQ-OTHER'});await miss.settle();
 assert.equal(miss.tracking.children.length,0);
});
