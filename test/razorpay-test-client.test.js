'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {createHmac}=require('node:crypto');
const {createRazorpayTestClient}=require('../lib/razorpay-test-client');
const KEY='rzp_test_testKey1234';
const SECRET='testSecret12345678';
const ORD='order_ABC123456';
const PAY='pay_ABC123456';
const response=(body,status=200)=>({ok:status>=200&&status<300,
  headers:{get:()=>null},text:async()=>JSON.stringify(body)});

const signature=()=>createHmac('sha256',SECRET).update(ORD+'|'+PAY).digest('hex');

test('rejects live key or missing credentials before network transport',()=>{
  assert.throws(()=>createRazorpayTestClient({keyId:'rzp_live_ABC12345678',keySecret:SECRET,fetchFn:()=>{throw Error('called');}}),/TEST credentials/);
  assert.throws(()=>createRazorpayTestClient({keyId:KEY,keySecret:'',fetchFn:()=>{}}),/TEST credentials/);
});

test('creates Razorpay TEST order with backend-calculated INR amount and no added fee',async()=>{
  let calls=0;
  const client=createRazorpayTestClient({keyId:KEY,keySecret:SECRET,
    fetchFn:async(url,init)=>{calls++;
      assert.equal(url,'https://api.razorpay.com/v1/orders');
      assert.equal(init.method,'POST');
      assert.equal(JSON.parse(init.body).amount,10000);
      assert.equal(JSON.parse(init.body).currency,'INR');
      assert.equal(JSON.parse(init.body).payment_capture,1);
      return response({id:ORD,amount:10000,currency:'INR',receipt:'MQBV37_0001',status:'created'});
    }});
  const order=await client.createOrder({amountPaise:10000,receipt:'MQBV37_0001'});
  assert.deepEqual(order,{razorpayOrderId:ORD,amountPaise:10000,currency:'INR',receipt:'MQBV37_0001',keyId:KEY});
  assert.equal(calls,1);
});

test('blocks invalid price and receipt without calling Razorpay',async()=>{
  let called=false;
  const c=createRazorpayTestClient({keyId:KEY,keySecret:SECRET,fetchFn:()=>{called=true;}});
  await assert.rejects(c.createOrder({amountPaise:0,receipt:'MQBV37_0001'}),/Invalid server/);
  await assert.rejects(c.createOrder({amountPaise:1000.5,receipt:'MQBV37_0001'}),/Invalid server/);
  await assert.rejects(c.createOrder({amountPaise:10000,receipt:'receipt with spaces'}),/receipt/);
  assert.equal(called,false);
});

test('rejects order API amount mismatch',async()=>{
  const c=createRazorpayTestClient({keyId:KEY,keySecret:SECRET,
    fetchFn:async()=>response({id:ORD,amount:100,currency:'INR',receipt:'MQBV37_0001',status:'created'})});
  await assert.rejects(c.createOrder({amountPaise:10000,receipt:'MQBV37_0001'}),/mismatched/);
});

test('verifies captured payment using stored order and Razorpay API fetch',async()=>{
  const c=createRazorpayTestClient({keyId:KEY,keySecret:SECRET,fetchFn:async(url)=>{
    assert.equal(url,`https://api.razorpay.com/v1/payments/${PAY}`);
    return response({id:PAY,order_id:ORD,status:'captured',captured:true,amount:10000,currency:'INR'});
  }});
  const result=await c.verifyCaptured({expected:{razorpayOrderId:ORD,amountPaise:10000},
    signedResponse:{razorpay_order_id:ORD,razorpay_payment_id:PAY,razorpay_signature:signature()}});
  assert.equal(result.verified,true);
  assert.equal(result.paymentStatus,'captured');
  assert.equal(result.amountPaise,10000);
});

test('blocks wrong order or tampered signature without fetching a payment',async()=>{
  let called=false;
  const c=createRazorpayTestClient({keyId:KEY,keySecret:SECRET,fetchFn:()=>{called=true;}});
  await assert.rejects(c.verifyCaptured({expected:{razorpayOrderId:ORD,amountPaise:10000},
    signedResponse:{razorpay_order_id:'order_WRONG0001',razorpay_payment_id:PAY,razorpay_signature:signature()}}),/signature/);
  await assert.rejects(c.verifyCaptured({expected:{razorpayOrderId:ORD,amountPaise:10000},
    signedResponse:{razorpay_order_id:ORD,razorpay_payment_id:PAY,razorpay_signature:'f'.repeat(64)}}),/signature/);
  assert.equal(called,false);
});

test('refuses authorized-but-not-captured payment even with genuine signature',async()=>{
  const c=createRazorpayTestClient({keyId:KEY,keySecret:SECRET,
    fetchFn:async()=>response({id:PAY,order_id:ORD,status:'authorized',captured:false,amount:10000,currency:'INR'})});
  await assert.rejects(c.verifyCaptured({expected:{razorpayOrderId:ORD,amountPaise:10000},
    signedResponse:{razorpay_order_id:ORD,razorpay_payment_id:PAY,razorpay_signature:signature()}}),/Captured payment/);
});

test('rejects captured mismatch in amount or currency',async()=>{
  for(const bad of [{amount:9999,currency:'INR'},{amount:10000,currency:'USD'}]){
    const c=createRazorpayTestClient({keyId:KEY,keySecret:SECRET,fetchFn:async()=>response({
      id:PAY,order_id:ORD,status:'captured',captured:true,...bad})});
    await assert.rejects(c.verifyCaptured({expected:{razorpayOrderId:ORD,amountPaise:10000},
      signedResponse:{razorpay_order_id:ORD,razorpay_payment_id:PAY,razorpay_signature:signature()}}),/Captured payment/);
  }
});

test('API failures suppress provider error text',async()=>{
  const c=createRazorpayTestClient({keyId:KEY,keySecret:SECRET,
    fetchFn:async()=>response({error:'secret remote text'},401)});
  await assert.rejects(c.createOrder({amountPaise:10000,receipt:'MQBV37_0001'}),e=>{
    assert.equal(e.message,'Razorpay TEST API operation failed.');return true;});
});

test('invalid payment ids rejected before network',async()=>{
  let called=false;
  const c=createRazorpayTestClient({keyId:KEY,keySecret:SECRET,fetchFn:()=>{called=true;}});
  await assert.rejects(c.fetchPayment('../orders'),/Invalid Razorpay payment/);
  assert.equal(called,false);
});
