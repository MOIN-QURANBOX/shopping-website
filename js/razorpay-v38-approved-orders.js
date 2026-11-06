/* MOIN QURAN BOX V38.1 — pay after owner-confirmed final amount.
   Does not alter existing checkout, COD or Manual UPI.
   DISABLED until secure production backend is reviewed and activated. */
(()=>{'use strict';
 const cfg=window.MQB_V38_APPROVED_PAYMENT||{};
 if(cfg.enabled!==true)return;
 let base='';try{
  const url=new URL(cfg.backendUrl);
  if(url.protocol!=='https:'||url.username||url.password||url.port||url.pathname!=='/'||url.search||url.hash||
     url.hostname!==cfg.approvedBackendHost||cfg.expectedFirebaseProjectId!=='moin-quran-box')return;
  base=url.origin;
 }catch{return;}
 const $=id=>document.getElementById(id);
 let active=false,attempted=new Set(),busy=false;
 const ordersAvailable=()=>typeof orders!=='undefined'&&Array.isArray(orders)?orders:[];
 async function token(){
  const auth=window.mqbLive?.auth;if(!auth||auth.app?.options?.projectId!=='moin-quran-box'||!auth.currentUser)
    throw Error('Sign in to your existing account first.');
  return auth.currentUser.getIdToken();
 }
 async function api(endpoint,data){
  const jwt=await token();const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),18000);
  try{const r=await fetch(base+endpoint,{method:'POST',mode:'cors',redirect:'error',credentials:'omit',cache:'no-store',
    headers:{'Content-Type':'application/json',Authorization:'Bearer '+jwt},body:JSON.stringify(data),signal:controller.signal});
    const payload=await r.json().catch(()=>({}));
    if(!r.ok)throw Error(String(payload?.error||('Payment server HTTP '+r.status)).slice(0,135));return payload;
  }finally{clearTimeout(timer);}
 }
 const loadSdk=()=>new Promise((resolve,reject)=>{
  if(typeof window.Razorpay==='function')return resolve();
  const script=document.createElement('script');script.src='https://checkout.razorpay.com/v1/checkout.js';script.async=true;
  script.onload=()=>window.Razorpay?resolve():reject(Error('Checkout unavailable'));
  script.onerror=()=>reject(Error('Checkout unavailable'));document.head.append(script);
 });
 const message=t=>alert(String(t).slice(0,320));
 async function pay(order){
  if(busy)return;const key=order.__uid+'/'+order.__key;
  if(attempted.has(key))return message('This order was already attempted in this session. Do not pay again until the store reviews it.');
  if(!confirm('Proceed to Razorpay only if the store has approved the final amount. Do not pay a second time after an uncertain response.'))return;
  busy=true;attempted.add(key);
  try{
    const s=await api('/api/razorpay/create',{orderKey:order.__key});
    if(!/^rzp_live_[A-Za-z0-9]+$/.test(s.keyId||'')||!/^[a-zA-Z0-9_-]{8,128}$/.test(s.orderKey||'')||
       !/^order_[A-Za-z0-9]+$/.test(s.razorpayOrderId||'')||!Number.isSafeInteger(s.amountPaise)||s.amountPaise<100||
       s.orderId!==order.orderId||s.additionalDeliveryPaise!==0)throw Error('Payment session mismatch. Contact store.');
    await loadSdk();
    const rzp=new window.Razorpay({key:s.keyId,order_id:s.razorpayOrderId,amount:s.amountPaise,
      currency:'INR',name:'MOIN QURAN BOX',description:'Approved order '+s.orderId,
      handler:async out=>{
        try{const result=await api('/api/razorpay/verify',{orderKey:s.orderKey,
          razorpay_order_id:out.razorpay_order_id,razorpay_payment_id:out.razorpay_payment_id,
          razorpay_signature:out.razorpay_signature});
          message(result.confirmed&&result.orderPersisted&&result.paymentStatus==='captured'? 
            'Payment verified for '+result.orderId+'. Thank you.':
            'Payment outcome is pending. Do not pay again; contact store with order ID.');
        }catch{message('Payment might be successful, but confirmation is pending. Do not retry; contact store.');}
      },modal:{ondismiss:()=>message('Checkout closed. Please verify payment status before trying again.')}});
    rzp.open();
  }catch(e){message('Razorpay unavailable: '+String(e.message||'Contact store').slice(0,150)+' Do not retry until checked.');}
  finally{busy=false;}
 }
 async function approve(order){
  if(busy)return;
  const display=(Number(order.total)||0).toFixed(2);
  const entered=prompt('Approve this order for Razorpay AFTER checking stock, address and delivery.\nEnter the exact final INR item amount (current estimate ₹'+display+').');
  if(entered===null)return;
  const amount=Number(entered);if(!Number.isSafeInteger(Math.round(amount*100))||Math.abs(Math.round(amount*100)-amount*100)>0.001||amount<1)
    return message('Enter a valid amount using up to 2 decimals.');
  if(!confirm('Approve ₹'+amount.toFixed(2)+' as FINAL payable amount? This cannot be silently changed later.'))return;
  busy=true;
  try{const result=await api('/api/razorpay/staff/approve',{customerUid:order.__uid,orderKey:order.__key,
    expectedAmountPaise:Math.round(amount*100)});
    message('Approved ₹'+(result.amountPaise/100).toFixed(2)+' for this order. Customer can use Pay Online in order history.');
  }catch(e){message(String(e.message||'Approval failed'));}finally{busy=false;}
 }
 const findByCard=(card)=>{
  const list=ordersAvailable().filter(x=>x.__uid&&x.__key&&x.orderId&&card.textContent?.includes(x.orderId));
  return list.length===1?list[0]:null;
 };
 function attach(){
  const live=window.mqbLive;
  if(!live?.auth||live.auth.app?.options?.projectId!=='moin-quran-box')return;
  const isOwner=live.verifiedAdmin===true&&['admin','owner'].includes(String(live.activeRole||''));
  const staffNode=$('adminOrdersContainer');
  if(isOwner&&staffNode){
    for(const card of staffNode.querySelectorAll('article')){
      if(card.querySelector('.mqb38-approve'))continue;
      const rec=findByCard(card);if(!rec||rec.paymentMethod!=='Manual UPI'||rec.paymentStatus==='verified'||
        !['Requested','Confirmed'].includes(rec.status))continue;
      const button=document.createElement('button');button.type='button';button.className='mqb38-approve border border-emerald-800 rounded-lg px-3 py-2 w-full font-bold';
      button.textContent='Approve final amount for Razorpay';button.addEventListener('click',()=>approve(rec));card.append(button);
    }
  }
  const node=$('custOrderList');if(node&&live.auth.currentUser){
    const myOrders=ordersAvailable().filter(x=>x.__uid===live.uid);
    Array.from(node.children).forEach((card,index)=>{
      if(card.querySelector('.mqb38-pay'))return;
      const rec=myOrders[index];if(!rec||rec.paymentMethod!=='Manual UPI'||rec.paymentStatus==='verified'||
        !['Requested','Confirmed'].includes(rec.status))return;
      const button=document.createElement('button');button.type='button';button.className='mqb38-pay w-full bg-emerald-800 text-white rounded-lg px-3 py-2 font-bold';
      button.textContent='Pay securely with Razorpay (after approval)';button.addEventListener('click',()=>pay(rec));card.append(button);
    });
  }
 }
 async function ready(){
  try{const c=new AbortController();const timer=setTimeout(()=>c.abort(),8000);
    let r;try{r=await fetch(base+'/api/razorpay/status',{cache:'no-store',mode:'cors',redirect:'error',signal:c.signal});}finally{clearTimeout(timer);}
    const data=await r.json();if(!r.ok||data.mode!=='live'||data.checkoutReady!==true||
       data.paymentCreationEnabled!==true||data.webhookReady!==true||data.livePaymentsEnabled!==true||
       data.serverApprovedFinalAmountRequired!==true||data.firebaseProjectId!=='moin-quran-box')return;
    active=true;
    const card=$('mqbV37ComingSoon');if(card){
      const small=card.querySelector('small');if(small)small.textContent='After submitting a Manual UPI order request, you can pay securely from your order history when the store approves the amount.';
      const tag=card.querySelector('span:last-child');if(tag)tag.textContent='After approval';
    }
    new MutationObserver(()=>{if(active)attach();}).observe(document.body,{childList:true,subtree:true});
    attach();
  }catch{/* fail closed */}
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();
