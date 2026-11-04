/* V36 Razorpay TEST checkout adapter for the existing MOIN QURAN BOX checkout.
 * Fail-closed: the payment method stays hidden unless the verified backend reports
 * test mode, shipping configured, and server-side automatic confirmation enabled.
 * No secret is ever stored in browser JavaScript. Manual UPI and COD untouched. */
(()=>{'use strict';
 const config=window.MQB_RAZORPAY_V36||{enabled:false,backendUrl:''};
 const $=id=>document.getElementById(id);
 const form=$('checkoutModal')?.querySelector('form');
 const option=$('mqbV36PaymentOption');
 if(!form||!option)return;
 let working=false;
 const base=String(config.backendUrl||'').replace(/\/+$/,'');
 const report=(message)=>{
  const el=$('mqbV36Feedback');if(el){el.textContent=message;el.classList.remove('hidden');}
 };
 const notify=(heading,message)=>{
  let el=$('mqbV36Result');
  if(!el){el=document.createElement('div');el.id='mqbV36Result';el.style.cssText='position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:24px';document.body.appendChild(el);}
  el.replaceChildren();
  const card=document.createElement('div');card.style.cssText='max-width:470px;width:100%;border-radius:18px;background:white;color:#153d30;padding:24px;font-family:system-ui;box-shadow:0 18px 45px #0004';
  const h=document.createElement('h2');h.textContent=heading;h.style.cssText='font-size:21px;font-weight:700;margin:0 0 12px';
  const p=document.createElement('p');p.textContent=message;p.style.cssText='line-height:1.55;margin:0 0 18px';
  const close=document.createElement('button');close.type='button';close.textContent='Close';close.style.cssText='background:#174634;color:white;border:0;border-radius:9px;padding:10px 18px;cursor:pointer';close.addEventListener('click',()=>el.remove());
  card.append(h,p,close);el.append(card);
 };
 const selected=()=>form.querySelector('input[name="chkPaymentMethod"]:checked')?.value==='Razorpay';
 const getToken=async()=>{
  const auth=window.mqbLive?.auth;
  if(!auth)throw Error('Firebase not ready. Reload and try again.');
  let user=auth.currentUser;
  if(!user){ const result=await auth.signInAnonymously();user=result.user; }
  return user.getIdToken();
 };
 const api=async(route,body,token)=>{
  const response=await fetch(base+route,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},body:JSON.stringify(body)});
  let data={};try{data=await response.json();}catch{}
  if(!response.ok)throw Error(data.error||'Online payment unavailable.');
  return data;
 };
 const getBody=()=>{
  if(typeof cart==='undefined'||!Array.isArray(cart)||!cart.length)throw Error('Your bag is empty.');
  const v=id=>String($(id)?.value||'').trim();
  const house=v('mqb30HouseFlat'),street=v('chkAddress');
  return {items:cart.map(x=>({id:x.id,qty:Number(x.qty)||1})),
   customerName:v('chkName'),customerPhone:v('chkPhone'),customerEmail:v('chkEmail')||window.mqbLive?.auth?.currentUser?.email||'',
   address:(house ? house+', ':'')+street,postalCode:v('chkPostalCode'),deliveryNote:v('chkDeliveryNote'),
   orderUpdatesConsent:{whatsapp:!!$('mqb34WaOptIn')?.checked,email:!!$('mqb34EmailOptIn')?.checked,sms:!!$('mqb352SmsOptIn')?.checked}};
 };
 const loadRazorpay=()=>new Promise((resolve,reject)=>{
  if(window.Razorpay)return resolve();
  const script=document.createElement('script');script.src='https://checkout.razorpay.com/v1/checkout.js';script.async=true;
  script.onload=()=>window.Razorpay?resolve():reject(Error('Razorpay Checkout unavailable.'));
  script.onerror=()=>reject(Error('Could not load Razorpay Checkout.'));
  document.head.append(script);
 });
 const start=async()=>{
  if(working)return;working=true;let opened=false;
  try {
   report('Preparing a secure test payment. No real money will be charged.');
   const token=await getToken();
   const details=getBody();
   const session=await api('/api/razorpay/create',details,token);
   await loadRazorpay();
   const rzp=new window.Razorpay({key:session.keyId,order_id:session.razorpayOrderId,amount:session.amountPaise,currency:'INR',
    name:'MOIN QURAN BOX',description:'Test payment — '+session.orderId,
    prefill:{name:details.customerName,email:details.customerEmail,contact:details.customerPhone},
    notes:{orderId:session.orderId},
    handler:async(result)=>{
     working=false;report('Checking captured-payment status with Razorpay.');
     try {
      const verified=await api('/api/razorpay/verify',{
       orderKey:session.orderKey,razorpay_order_id:result.razorpay_order_id,
       razorpay_payment_id:result.razorpay_payment_id,razorpay_signature:result.razorpay_signature},token);
      if(verified.confirmed){
       // Clear the bag only after the server confirmed a captured payment.
       if(typeof cart!=='undefined')cart=[];
       const authUser=window.mqbLive?.auth?.currentUser;
       if(authUser){ if(authUser.isAnonymous)localStorage.removeItem('mqb_v20_guest_cart');else window.mqbLive.db.ref('customerCarts/'+authUser.uid).set([]).catch(()=>{}); }
       window.updateCartUI?.();window.closeCheckoutModal?.();
       notify('Test payment confirmed',`Order ${session.orderId} is confirmed by server-verified Razorpay test payment. No real funds were collected.`);
      }else notify('Payment being verified',`Order ${session.orderId}: payment is not yet verified as captured. Please do not pay again. Check order status later.`);
     }catch(e){notify('Verification pending',`Order ${session.orderId}: verification is not complete. Do not retry payment blindly. ${e.message}`);}
    },
    modal:{ondismiss:()=>{working=false;report('Payment window closed. An unpaid order is not confirmed.');}}
   });
   rzp.on('payment.failed',()=>{working=false;report('Test payment failed. The order has not been confirmed.');});
   rzp.open();opened=true;
  }catch(e){report('Online payment unavailable: '+String(e.message||e).slice(0,200));}
  finally{if(!opened)working=false;}
 };
 form.addEventListener('submit',event=>{
  if(!selected())return;
  event.preventDefault();event.stopImmediatePropagation(); // prevents legacy request-only checkout
  start();
 },true);
 const updateCheckoutInfo=()=>{
   const hint=$('mqbPaymentDescription');
   const text=$('mqbV36Feedback');
   if(!hint)return;
   if(selected()) {
    hint.textContent='Razorpay TEST only: the backend computes live catalog prices plus the configured shipping charge. You will see the exact total in Razorpay before authorizing payment. No real money is charged in test mode.';
    if(text)text.classList.add('hidden');
   } else window.mqbUpdatePaymentDescription?.();
 };
 form.addEventListener('change',event=>{if(event.target?.name==='chkPaymentMethod')updateCheckoutInfo();});
 const startWhenReady=async()=>{
  if(!config.enabled||!/^https:\/\/[^\s/]+/.test(base))return;
  try {
   const result=await fetch(base+'/api/razorpay/status',{cache:'no-store'});
   if(!result.ok)return;
   const state=await result.json();
   if(state.mode!=='test'||state.autoConfirm!==true||state.shippingConfigured!==true)return;
   option.classList.remove('hidden');option.hidden=false;
  }catch{ /* offline backend: keep option hidden, old payment methods remain */ }
 };
 startWhenReady();
})();
