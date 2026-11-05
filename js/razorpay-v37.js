/* MOIN QURAN BOX V37 — fail-closed, TEST-mode Razorpay checkout adapter.
 * This static frontend NEVER creates payment orders or verifies signatures on
 * its own. All amounts, payment status and persistence require a trusted server.
 * The option stays hidden until an explicitly approved TEST backend is ready.
 * COD and Manual UPI follow the original Firebase order-request flow.
 */
(()=>{'use strict';
  const cfg=window.MQB_RAZORPAY_V37||{};
  const $=id=>document.getElementById(id);
  const form=$('checkoutModal')?.querySelector('form');
  const option=$('mqbV36PaymentOption');
  if(!form || !option)return;
  const submit=form.querySelector('button[type="submit"]');
  const paymentHelp=$('mqb37PaymentPolicy');
  const payFootnote=$('mqb37CheckoutFootnote');
  const defaultSubmit=submit?.textContent||'Submit Order Request (No Payment)';
  const defaultFootnote=payFootnote?.textContent||'';
  const defaultPaymentHelp=paymentHelp?.textContent||'';
  const $notice=()=> $('mqbV36Feedback');
  let enabled=false, busy=false, base='';
  const selected=()=>form.querySelector('input[name="chkPaymentMethod"]:checked')?.value==='Razorpay';
  const safeText=(value,max=160)=>String(value==null?'':value).replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,max);
  const report=message=>{const p=$notice();if(p){p.textContent=message;p.classList.remove('hidden');}};
  const testGuard=()=>{
    if(cfg.enabled!==true || cfg.mode!=='test')return false;
    if(!cfg.approvedBackendHost || !cfg.expectedFirebaseProjectId)return false;
    try{
      const url=new URL(cfg.backendUrl);
      if(url.protocol!=='https:' || url.username || url.password || url.port || url.pathname!=='/' || url.search || url.hash || !url.hostname)return false;
      if(url.hostname!==cfg.approvedBackendHost)return false;
      base=url.origin;
      return true;
    }catch{return false;}
  };
  const modal=(heading,message)=>{
    let wrapper=$('mqbV37PaymentResult');
    if(!wrapper){wrapper=document.createElement('div');wrapper.id='mqbV37PaymentResult';wrapper.style.cssText='position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;padding:16px';wrapper.setAttribute('role','dialog');wrapper.setAttribute('aria-modal','true');document.body.append(wrapper);}
    wrapper.replaceChildren();
    const card=document.createElement('div');card.style.cssText='max-width:470px;width:100%;border-radius:15px;background:white;color:#193f2e;padding:22px;font-family:system-ui;box-shadow:0 20px 42px #0004';
    const h=document.createElement('h2');h.textContent=heading;h.style.cssText='font-size:20px;font-weight:700;margin:0 0 10px';
    const p=document.createElement('p');p.textContent=message;p.style.cssText='font-size:14px;line-height:1.55;margin:0 0 20px';
    const close=document.createElement('button');close.type='button';close.textContent='Close';close.style.cssText='padding:11px 18px;background:#174634;color:white;border:0;border-radius:8px;cursor:pointer';
    close.addEventListener('click',()=>{wrapper.remove();submit?.focus();});
    card.append(h,p,close);wrapper.append(card);close.focus();
  };
  const reflect=()=>{
    if(submit)submit.textContent=selected()&&enabled?'Continue to Razorpay TEST Payment':defaultSubmit;
    if(payFootnote)payFootnote.textContent=selected()&&enabled?
      'Razorpay TEST only. The backend determines the total; ₹0 extra delivery fee. A test order is not a real customer sale.':defaultFootnote;
    if(paymentHelp)paymentHelp.textContent=enabled?
      'For Razorpay TEST, the payment screen opens only after secure server checks. COD and Manual UPI remain available. No real money is charged in TEST mode.':defaultPaymentHelp;
    if(selected()){
      $('mqbPaymentDescription').textContent=enabled?
        'Razorpay TEST — online checkout will use the server-calculated item total and ₹0 extra delivery fee. A draft is confirmed only when Razorpay reports a captured test payment.':
        'Online payment is not active. Please choose COD or Manual UPI.';
    }else window.mqbUpdatePaymentDescription?.();
  };
  const requireAuth=async()=>{
    const auth=window.mqbLive?.auth;
    if(!auth || auth.app?.options?.projectId!==cfg.expectedFirebaseProjectId)throw Error('Secure checkout configuration is not ready.');
    let user=auth.currentUser;
    if(!user){if(typeof auth.signInAnonymously!=='function')throw Error('Guest sign-in unavailable.');user=(await auth.signInAnonymously()).user;}
    if(!user?.getIdToken)throw Error('Secure login unavailable.');
    return user.getIdToken();
  };
  const call=async(path,payload,token)=>{
    const response=await fetch(base+path,{method:'POST',cache:'no-store',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
      body:JSON.stringify(payload)});
    let json={};try{json=await response.json();}catch{}
    if(!response.ok)throw Error('Payment server could not complete this step ('+response.status+').');
    return json;
  };
  const getDetails=()=>{
    const items=typeof cart!=='undefined'?cart:window.cart;
    if(!Array.isArray(items)||!items.length)throw Error('Your bag is empty.');
    const lineItems=items.map(item=>({id:String(item.id||'').trim(),qty:Number(item.qty)}));
    if(lineItems.some(item=>!item.id || !Number.isSafeInteger(item.qty)||item.qty<1||item.qty>50))throw Error('Please review item quantities.');
    const val=id=>safeText($(id)?.value,500);
    const customerName=val('chkName'),phone=val('chkPhone'),house=val('mqb30HouseFlat'),street=val('chkAddress'),email=val('chkEmail');
    const postalCode=val('chkPostalCode');
    if(!customerName||!/^[\d+()\s-]{10,18}$/.test(phone)||!street||!/^[0-9]{6}$/.test(postalCode))throw Error('Check your name, phone number, complete address and 6-digit PIN.');
    if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw Error('Please enter a valid email or leave it blank.');
    if($('mqb34EmailOptIn')?.checked&&!email&&!window.mqbLive?.auth?.currentUser?.email)throw Error('Please provide an email for email updates.');
    const address=safeText([house,street].filter(Boolean).join(', '),600);
    return {items:lineItems,customerName,customerPhone:phone,customerEmail:email,
      address,postalCode,deliveryChoice:val('chkDeliveryChoice'),deliveryNote:val('chkDeliveryNote'),
      orderUpdatesConsent:{whatsapp:!!$('mqb34WaOptIn')?.checked,email:!!$('mqb34EmailOptIn')?.checked,sms:!!$('mqb352SmsOptIn')?.checked}};
  };
  const checkoutSdk=()=>new Promise((resolve,reject)=>{
    if(typeof window.Razorpay==='function')return resolve();
    const script=document.createElement('script');script.src='https://checkout.razorpay.com/v1/checkout.js';script.async=true;
    script.onload=()=>typeof window.Razorpay==='function'?resolve():reject(Error('Payment checkout unavailable.'));
    script.onerror=()=>reject(Error('Could not load payment checkout.'));
    document.head.append(script);
  });
  const start=async()=>{
    if(busy)return;
    if(!enabled){report('Online payment remains disabled. Please choose COD or Manual UPI.');return;}
    busy=true;if(submit)submit.disabled=true;
    let checkoutOpened=false;
    try{
      if(typeof form.reportValidity==='function'&&!form.reportValidity())throw Error('Please complete the required checkout fields.');
      const details=getDetails();
      report('Preparing a Razorpay TEST payment. No real money will be collected.');
      const token=await requireAuth();
      const session=await call('/api/razorpay/create',details,token);
      if(!session || !/^rzp_test_[A-Za-z0-9]+$/.test(session.keyId||'') ||
        !/^order_[A-Za-z0-9]+$/.test(session.razorpayOrderId||'') ||
        !Number.isSafeInteger(session.amountPaise)||session.amountPaise<100||
        !session.orderKey || !session.orderId || session.additionalDeliveryPaise!==0){
        throw Error('Payment backend returned an invalid TEST checkout session.');
      }
      await checkoutSdk();
      let resultInProgress=false;
      const rzp=new window.Razorpay({key:session.keyId,order_id:session.razorpayOrderId,
        amount:session.amountPaise,currency:'INR',name:'MOIN QURAN BOX',
        description:'Razorpay TEST order '+safeText(session.orderId,80),
        prefill:{name:details.customerName,contact:details.customerPhone,email:details.customerEmail},
        handler:async outcome=>{
          if(resultInProgress)return;resultInProgress=true;
          report('Checking captured TEST payment directly with the server…');
          try{
            const verified=await call('/api/razorpay/verify',{
              orderKey:session.orderKey,
              razorpay_order_id:outcome.razorpay_order_id,
              razorpay_payment_id:outcome.razorpay_payment_id,
              razorpay_signature:outcome.razorpay_signature
            },token);
            if(verified?.confirmed===true && verified.paymentStatus==='captured' && verified.orderId===session.orderId){
              // TEST mode: never clear the real storefront cart or mark a production order confirmed.
              modal('Razorpay TEST payment verified','Test order '+safeText(session.orderId,80)+' was verified as captured by the server. No real funds were collected; your regular shopping bag remains unchanged.');
            }else{
              modal('Verification pending','TEST order '+safeText(session.orderId,80)+' is not confirmed as captured. Do not retry blindly. Check the payment in the test dashboard.');
            }
          }catch{
            modal('Verification pending','The payment may have been attempted, but the server has not confirmed capture. Check its status before trying again.');
          }finally{busy=false;if(submit)submit.disabled=false;}
        },
        modal:{ondismiss:()=>{if(resultInProgress)return;busy=false;if(submit)submit.disabled=false;report('TEST payment window closed. No payment has been confirmed.');}}
      });
      rzp.on('payment.failed',()=>{busy=false;if(submit)submit.disabled=false;report('TEST payment failed. No order has been confirmed.');});
      rzp.open();checkoutOpened=true;
    }catch(err){report('Online TEST payment unavailable: '+safeText(err?.message||'Please try again later.',180));}
    finally{if(!checkoutOpened){busy=false;if(submit)submit.disabled=false;}}
  };
  form.addEventListener('submit',e=>{
    if(!selected())return;
    e.preventDefault();e.stopImmediatePropagation(); // NEVER invoke the legacy Firebase order-request handler
    start();
  },true);
  form.addEventListener('change',e=>{if(e.target?.name==='chkPaymentMethod')reflect();});
  const readiness=async()=>{
    if(!testGuard())return;
    try{
      const response=await fetch(base+'/api/razorpay/status',{cache:'no-store',mode:'cors'});
      if(!response.ok)return;
      const state=await response.json();
      if(!state || state.mode!=='test' || state.checkoutReady!==true ||
        state.paymentCreationEnabled!==true || state.autoConfirm!==true || state.webhookReady!==true ||
        state.livePaymentsEnabled!==false || state.additionalDeliveryPaise!==0 ||
        state.firebaseProjectId!==cfg.expectedFirebaseProjectId)return;
      const app=window.mqbLive?.auth?.app;
      if(!app || app.options?.projectId!==cfg.expectedFirebaseProjectId)return;
      enabled=true;option.hidden=false;option.classList.remove('hidden');reflect();
    }catch{/* Fail closed; keep COD and Manual UPI intact. */}
  };
  reflect();readiness();
})();
