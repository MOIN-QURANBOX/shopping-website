/* Offline website-contract tests. No Firebase, Razorpay or external network calls. */
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const config=fs.readFileSync(path.join(root,'js/razorpay-v38-approved-config.js'),'utf8');
const source=fs.readFileSync(path.join(root,'js/razorpay-v38-approved-orders.js'),'utf8');
const markup=fs.readFileSync(path.join(root,'index.html'),'utf8');
const uid='CustomerUID_12345',key='-NprodOrder_1234567';
const valid={__uid:uid,__key:key,orderId:'MQB-REQ-1',status:'Requested',paymentMethod:'Manual UPI',paymentStatus:'unverified',items:[{id:'p1',qty:1}],total:180};
const ready={mode:'live',checkoutReady:true,paymentCreationEnabled:true,webhookReady:true,
  livePaymentsEnabled:true,autoConfirm:true,serverApprovedFinalAmountRequired:true,
  additionalDeliveryPaise:0,testPaymentsEnabled:false,firebaseProjectId:'moin-quran-box'};
function fixture({enabled=false,status=ready,role='customer',records=[valid],cards=[valid],proof=false,confirmResponse=false,trackingId='',apiResponses={}}={}){
 const calls=[];const notices=[];const created=[];
 const makeCard=r=>({data:r,children:[],getAttribute(k){return k==='data-mqb38-uid'?r.__uid:k==='data-mqb38-key'?r.__key:null},
   querySelector(selector){return this.children.find(x=>selector.startsWith('.')&&x.className.includes(selector.slice(1)))||null},
   appendChild(x){this.children.push(x);}});
 const content=cards.map(makeCard);
 const container={querySelectorAll(){return content;}};
 const statusCard={querySelector(){return {set textContent(_v) {}};}};
 const tracking={children:[],classList:{contains:()=>!trackingId},querySelector:()=>tracking.children.find(c=>c.className.includes('mqb38-pay-track'))||null,appendChild(c){this.children.push(c);}};
 const badge={};const warning={};
 const doc={readyState:'complete',head:{appendChild(){throw Error('SDK should not load in this test')}},
   getElementById(id){return id==='adminOrdersContainer'&&['admin','owner','manager'].includes(role)?container:
     id==='custOrderList'&&role==='customer'?container:
     id==='trackingResultBox'?tracking:id==='trackInputId'?{value:trackingId}:
     id==='mqbV37ComingSoon'?statusCard:id==='mqb38AvailabilityBadge'?badge:null;},
   createElement(){const b={className:'',type:'',textContent:'',addEventListener(event,fn){this['on'+event]=fn;}};created.push(b);return b;}};
 const live={uid,verifiedAdmin:['admin','owner','manager'].includes(role),activeRole:role,
   auth:{app:{options:{projectId:'moin-quran-box'}},currentUser:{uid,getIdToken:async()=>'TOKEN'}},
   db:{ref(x){return {async once(){calls.push({url:'FIREBASE:'+x});return {exists:()=>proof}}};}}};
 const web={MQB_V38_APPROVED_PAYMENT:{enabled,expectedFirebaseProjectId:'moin-quran-box',
   backendUrl:'https://mqb-v38-payment-gateway.onrender.com/',approvedBackendHost:'mqb-v38-payment-gateway.onrender.com'},
   mqbLive:live,alert:t=>notices.push(t),confirm:()=>confirmResponse,prompt:()=>'180.00'};
 const fetch=async(u,opts)=>{
   calls.push({url:u,opts});
   const isStatus=u.endsWith('/api/razorpay/status');
   return {ok:isStatus?true:true,status:200,json:async()=>isStatus?status:(apiResponses[u.split('/').pop()]||{approved:true,orderKey:key,amountPaise:18000})};
 };
 vm.runInNewContext(source,{window:web,document:doc,fetch,orders:records,URL,AbortController,
  setTimeout,clearTimeout,MutationObserver:class{observe(){}},console});
 return {content,tracking,calls,notices,created,settle:()=>new Promise(resolve=>setImmediate(resolve))};
}
test('production payment gating is OFF in the distributed website',()=>{
 assert.match(config,/enabled:\s*false/);
 assert.match(markup,/id="mqbV37ComingSoon"/);
 assert.match(markup,/id="mqbV36PaymentOption" hidden/);
 assert.doesNotMatch(markup,/<script defer src="js\/razorpay-v37\.js"/);
 assert.match(markup,/js\/razorpay-v38-approved-orders\.js/);
});
test('with feature disabled, no network call, no payment button',async()=>{
 const h=fixture({enabled:false});await h.settle();
 assert.equal(h.calls.length,0);assert.equal(h.created.length,0);
});
test('backend not ready: fail closed, even if someone enables the frontend switch',async()=>{
 const h=fixture({enabled:true,status:{...ready,livePaymentsEnabled:false}});await h.settle();
 assert.equal(h.content[0].children.length,0);
 assert.deepEqual(h.calls.filter(x=>x.url.includes('/create')),[]);
});
test('owner approval button maps by exact Firebase UID+key, not order-card index or substring',async()=>{
 const wrong={...valid,__key:'-NotSameOrder123456',orderId:'MQB-REQ-10'};
 const h=fixture({enabled:true,role:'owner',records:[valid,wrong],cards:[wrong,valid],confirmResponse:true});
 await h.settle();
 assert.equal(h.content[0].children.length,1);
 assert.equal(h.content[1].children.length,1);
 await h.content[1].children[0].onclick();
 assert.equal(h.calls.filter(x=>x.url.endsWith('/api/razorpay/staff/approve')).length,1);
 const request=h.calls.find(x=>x.url.endsWith('/api/razorpay/staff/approve'));
 assert.deepEqual(JSON.parse(request.opts.body),{customerUid:uid,orderKey:key,expectedAmountPaise:18000});
});
test('customer with prior manual UPI payment proof cannot create Razorpay session',async()=>{
 const h=fixture({enabled:true,records:[valid],proof:true,confirmResponse:true});await h.settle();
 assert.equal(h.content[0].children.length,1);
 await h.content[0].children[0].onclick();
 assert.equal(h.calls.filter(x=>x.url.endsWith('/api/razorpay/create')).length,0);
 assert.match(h.notices.join(' '),/UPI payment details already submitted/);
});
test('verified and cancelled orders do not gain Razorpay buttons',async()=>{
 const records=[{...valid,paymentStatus:'verified'}, {...valid,__key:'-CancelledOrder12345',status:'Cancelled'}];
 const h=fixture({enabled:true,role:'owner',records,cards:records});await h.settle();
 assert.equal(h.created.length,0);
});

test('guest can only see a payment button on their authenticated private order tracker',async()=>{
 const h=fixture({enabled:true,role:'guest',records:[valid],trackingId:'MQB-REQ-1'});await h.settle();
 assert.equal(h.tracking.children.length,1);
 assert.equal(h.tracking.children[0].textContent,'Razorpay — pay after store approval');
 const wrong=fixture({enabled:true,role:'guest',records:[valid],trackingId:'MQB-REQ-SOMEONE-ELSE'});
 await wrong.settle();assert.equal(wrong.tracking.children.length,0);
});
