/* MOIN QURAN BOX V38 — production-ready storefront adapter (DISABLED by default).
 * Browser does not create Razorpay orders or verify payments itself.
 * COD and Manual UPI retain their existing Firebase request handler.
 * The isolated V37 staging payment endpoints are deliberately incompatible.
 */
(()=>{'use strict';
  const cfg=window.MQB_RAZORPAY_V37||{};
  const $=id=>document.getElementById(id);
  const form=$('checkoutModal')?.querySelector('form');
  const option=$('mqbV36PaymentOption');
  const pendingCard=$('mqbV37ComingSoon');
  if(!form || !option)return;
  const submit=form.querySelector('button[type="submit"]');
  const payHelp=$('mqb37PaymentPolicy');
  const payFootnote=$('mqb37CheckoutFootnote');
  const defaultSubmit=submit?.textContent||'Submit Order Request (No Payment)';
  const defaultFootnote=payFootnote?.textContent||'';
  const defaultPaymentHelp=payHelp?.textContent||'';
  const defaultDescription=$('mqbPaymentDescription')?.textContent||'';
  const safeText=(value,max=180)=>String(value==null?'':value).replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,max);
  const report=message=>{const p=$('mqbV36Feedback');if(p){p.textContent=message;p.classList.remove('hidden');}};
  let enabled=false,busy=false,alreadyAttempted=false,base='';
  const selected=()=>form.querySelector('input[name="chkPaymentMethod"]:checked')?.value==='Razorpay';
  const validConfig=()=>{
    if(cfg.enabled!==true || cfg.mode!=='live' || cfg.expectedFirebaseProjectId!=='moin-quran-box')return false;
    if(typeof cfg.approvedBackendHost!=='string'||!cfg.approvedBackendHost)return false;
    try {
      const url=new URL(cfg.backendUrl);
      if(url.protocol!=='https:'||url.username||url.password||url.port||url.pathname!=='/'||url.search||url.hash||!url.hostname)return false;
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
    if(submit)submit.textContent=selected()&&enabled?'Continue to secure Razorpay checkout':defaultSubmit;
    if(payFootnote)payFootnote.textContent=selected()&&enabled?
      'The server calculates your payable amount; delivery is included. Please wait for confirmed payment before treating your order as placed.':defaultFootnote;
    if(payHelp)payHelp.textContent=enabled?
      'Pay securely online with Razorpay, or choose COD / Manual UPI. A successful order requires server-confirmed capture.':defaultPaymentHelp;
    window.mqbUpdatePaymentDescription?.();
    const description=$('mqbPaymentDescription');
    if(selected()&&description)description.textContent=enabled?
      'Razorpay: the trusted payment server calculates the item total and verifies capture before confirming your order.':
      'Online payment is not active. Please choose COD or Manual UPI.';
    else if(!window.mqbUpdatePaymentDescription&&description)description.textContent=defaultDescription;
  };
  const getToken=async()=>{
    const auth=window.mqbLive?.auth;
    if(!auth || auth.app?.options?.projectId!==cfg.expectedFirebaseProjectId)throw Error('Secure customer login is not ready.');
    let user=auth.currentUser;
    if(!user){
      if(typeof auth.signInAnonymously!=='function')throw Error('Guest checkout is unavailable.');
      user=(await auth.signInAnonymously()).user;
    }
    if(!user?.getIdToken)throw Error('Secure authentication unavailable.');
    return user.getIdToken();
  };
  const request=async(path,payload,token,attemptKey)=>{
    const ctrl=new AbortController();const timer=setTimeout(()=>ctrl.abort(),20000);
    try{
      const headers={'Content-Type':'application/json','Authorization':'Bearer '+token};
      if(attemptKey)headers['Idempotency-Key']=attemptKey;
      const res=await fetch(base+path,{method:'POST',cache:'no-store',credentials:'omit',headers,
        body:JSON.stringify(payload),signal:ctrl.signal,redirect:'error'});
      let data={};try{data=await res.json();}catch{}
      if(!res.ok)throw Error('Payment server could not complete the request (HTTP '+res.status+').');
      return data;
    }finally{clearTimeout(timer);}
  };
  const customerDetails=()=>{
    const items=typeof cart!=='undefined'?cart:window.cart;
    if(!Array.isArray(items)||!items.length)throw Error('Your bag is empty.');
    const products=items.map(item=>({id:String(item.id||'').trim(),qty:Number(item.qty)}));
    if(products.some(i=>!i.id||!Number.isSafeInteger(i.qty)||i.qty<1||i.qty>50))throw Error('Review item quantities.');
    const val=id=>safeText($(id)?.value,500);
    const name=val('chkName'),phone=val('chkPhone'),house=val('mqb30HouseFlat'),street=val('chkAddress');
    const email=val('chkEmail'),postalCode=val('chkPostalCode');
    if(!name||!/^[\d+()\s-]{10,18}$/.test(phone)||!street||!/^[0-9]{6}$/.test(postalCode))throw Error('Check your name, phone, address and PIN.');
    if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw Error('Enter a valid email or leave it blank.');
    return {items:products,customerName:name,customerPhone:phone,customerEmail:email,
      address:safeText([house,street].filter(Boolean).join(', '),600),postalCode,
      deliveryChoice:val('chkDeliveryChoice'),deliveryNote:val('chkDeliveryNote')};
  };
  const checkoutSdk=()=>new Promise((resolve,reject)=>{
    if(typeof window.Razorpay==='function')return resolve();
    const script=document.createElement('script');script.src='https://checkout.razorpay.com/v1/checkout.js';script.async=true;
    script.onload=()=>typeof window.Razorpay==='function'?resolve():reject(Error('Payment checkout unavailable.'));
    script.onerror=()=>reject(Error('Unable to load Razorpay checkout.'));
    document.head.append(script);
  });
  const start=async()=>{
    if(busy)return;
    if(!enabled){report('Razorpay is not available yet. Choose COD or Manual UPI.');return;}
    if(alreadyAttempted){report('A payment attempt may already exist. Please check its status or contact support before retrying.');return;}
    busy=true;if(submit)submit.disabled=true;
    let opened=false;
    try{
      if(typeof form.reportValidity==='function'&&!form.reportValidity())throw Error('Please fill the required checkout fields.');
      const details=customerDetails();
      const token=await getToken();
      const attemptKey=window.crypto?.randomUUID?.();
      if(!attemptKey)throw Error('Your browser cannot safely start this payment.');
      // Once creation is attempted, never auto-create a second Razorpay order on
      // timeout or ambiguous failure. Reconcile using the server first.
      alreadyAttempted=true;
      report('Contacting our secure payment server. Please do not submit twice.');
      const session=await request('/api/razorpay/create',details,token,attemptKey);
      if(!session || !/^rzp_live_[A-Za-z0-9]+$/.test(session.keyId||'')||
        !/^order_[A-Za-z0-9]+$/.test(session.razorpayOrderId||'')||
        !Number.isSafeInteger(session.amountPaise)||session.amountPaise<100||
        typeof session.orderId!=='string'||!session.orderId||
        typeof session.orderKey!=='string'||!session.orderKey||
        session.additionalDeliveryPaise!==0)throw Error('Invalid payment session.');
      await checkoutSdk();
      let verifying=false;
      const rzp=new window.Razorpay({key:session.keyId,order_id:session.razorpayOrderId,
        amount:session.amountPaise,currency:'INR',name:'MOIN QURAN BOX',
        description:'Order '+safeText(session.orderId,65),
        prefill:{name:details.customerName,contact:details.customerPhone,email:details.customerEmail},
        handler:async outcome=>{
          if(verifying)return;verifying=true;
          report('Verifying payment and order directly with our server…');
          try{
            const verified=await request('/api/razorpay/verify',{
              orderKey:session.orderKey,razorpay_order_id:outcome.razorpay_order_id,
              razorpay_payment_id:outcome.razorpay_payment_id,
              razorpay_signature:outcome.razorpay_signature},token);
            if(verified?.confirmed===true && verified.paymentStatus==='captured' &&
              verified.orderPersisted===true && verified.orderId===session.orderId){
              // Do not create a second COD/Manual UPI request. The payment backend
              // alone persists the paid production order, then returns this receipt.
              // The server has already durably confirmed the paid order.
              // Only now clear the cart; never send a legacy order request.
              if(typeof cart!=='undefined')cart=[];
              try{window.mqbLive?.saveCart?.();}catch{/* Order is already confirmed server-side. */}
              window.updateCartUI?.();
              window.closeCheckoutModal?.();
              modal('Payment confirmed','Your payment and order '+safeText(session.orderId,65)+' are confirmed. Keep your order reference for tracking.');
            } else modal('Payment pending','A payment was attempted, but the order has not been confirmed. Do not pay again until it is checked.');
          }catch{modal('Verification pending','The payment may have succeeded. Please contact the store with your order reference before attempting another payment.');}
          finally{busy=false;if(submit)submit.disabled=false;}
        },
        modal:{ondismiss:()=>{if(verifying)return;busy=false;if(submit)submit.disabled=false;report('Checkout closed. Do not pay again until the previous attempt is checked.');}}
      });
      rzp.on('payment.failed',()=>{busy=false;if(submit)submit.disabled=false;report('The payment was not confirmed. Verify its status before retrying.');});
      rzp.open();opened=true;
    }catch(error){report('Online payment unavailable: '+safeText(error?.message||'Please contact support.',180)+(alreadyAttempted?' Do not retry automatically.':' See payment options above.'));}
    finally{if(!opened){busy=false;if(submit)submit.disabled=false;}}
  };
  form.addEventListener('submit',event=>{
    if(!selected())return;
    event.preventDefault();event.stopImmediatePropagation(); // prevents original Firebase request handler
    start();
  },true);
  form.addEventListener('change',event=>{if(event.target?.name==='chkPaymentMethod')reflect();});
  const readiness=async()=>{
    if(!validConfig())return;
    try {
      const auth=window.mqbLive?.auth;
      if(!auth||auth.app?.options?.projectId!==cfg.expectedFirebaseProjectId)return;
      const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),8000);
      let response;
      try{response=await fetch(base+'/api/razorpay/status',{cache:'no-store',credentials:'omit',mode:'cors',redirect:'error',signal:controller.signal});}
      finally{clearTimeout(timer);}
      if(!response.ok)return;
      const state=await response.json();
      if(!state || state.mode!=='live' || state.checkoutReady!==true ||
        state.paymentCreationEnabled!==true || state.autoConfirm!==true ||
        state.webhookReady!==true || state.livePaymentsEnabled!==true ||
        state.additionalDeliveryPaise!==0 || state.firebaseProjectId!==cfg.expectedFirebaseProjectId)return;
      enabled=true;option.hidden=false;option.classList.remove('hidden');
      if(pendingCard){pendingCard.hidden=true;pendingCard.classList.add('hidden');}
      reflect();
    }catch{/* fail closed, leave manual methods untouched */}
  };
  option.hidden=true;option.classList.add('hidden');
  reflect();
  // Firebase initializes after the existing storefront loads its catalog.
  // Only attempt readiness if explicitly enabled and a vetted backend is set.
  if(cfg.enabled===true){
    const retries=[0,600,1500,3500,7000,14000];
    retries.forEach(delay=>setTimeout(()=>{if(!enabled)readiness();},delay));
  }
})();
