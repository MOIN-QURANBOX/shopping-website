/* V48 cancellation UI. No browser writes to Firebase order/payment records.
 * Server must verify Firebase auth, order ownership, phone, 24-hour eligibility,
 * shipping state, captured payment, and refund idempotency before changing records.
 */
(()=>{
'use strict';
const ENDPOINT='https://mqb-v38-payment-gateway.onrender.com/api/orders/cancel';
const $=id=>document.getElementById(id);
let pending=false;
window.mqb48OpenCancel=()=>{const m=$('mqb48CancelModal');if(m){m.hidden=false;m.classList.remove('hidden');$('mqb48CancelOrderId')?.focus();}};
window.mqb48CloseCancel=()=>{const m=$('mqb48CancelModal');if(m){m.hidden=true;m.classList.add('hidden');}};
function say(msg,error=false){const n=$('mqb48CancelStatus');if(n){n.textContent=msg;n.setAttribute('data-error',String(error));}}
async function request(event){event.preventDefault();if(pending)return;
 const id=String($('mqb48CancelOrderId')?.value||'').trim().toUpperCase();
 const phone=String($('mqb48CancelPhone')?.value||'').replace(/\D/g,'');
 if(!/^MQB-REQ-[A-Z0-9-]{6,100}$/.test(id))return say('Enter your complete order ID.',true);
 if(!/^[6-9][0-9]{9}$/.test(phone))return say('Enter the 10-digit mobile number used at checkout.',true);
 const u=window.mqbLive?.auth?.currentUser;
 if(!u)return say('Please open the store in your original checkout browser, or sign in to the customer account used for this order.',true);
 pending=true;const button=$('mqb48CancelSubmit');if(button)button.disabled=true;say('Checking order ownership and cancellation eligibility…');
 try{
  const token=await u.getIdToken(true);
  const result=await fetch(ENDPOINT,{method:'POST',mode:'cors',cache:'no-store',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},body:JSON.stringify({orderId:id,phone})});
  const data=await result.json().catch(()=>({}));
  if(!result.ok)throw Error(typeof data.error==='string'?data.error:'Cancellation is not available yet. Contact the store.');
  const messages={cancelled:'Your unpaid order has been cancelled. No refund is due.',pending_refund:'Cancellation request received. Your original-method refund is pending verification; do not assume it is complete.',refund_initiated:'Cancellation accepted. Razorpay refund initiated to the original payment method. Bank processing may take several business days.',already_requested:'Your cancellation request was already received. Contact the store for updates.'};
  say(messages[data.state]||'Cancellation request received. Contact the store if you need an update.');
 }catch(e){say(String(e.message||'Cancellation failed').slice(0,190),true);}finally{pending=false;if(button)button.disabled=false;}
}
document.addEventListener('DOMContentLoaded',()=>{
 fetch('https://mqb-v38-payment-gateway.onrender.com/api/orders/cancellation-status',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(data=>{if(data?.enabled===true&&$('mqb48CancelNav'))$('mqb48CancelNav').hidden=false;}).catch(()=>{});
 $('mqb48CancelForm')?.addEventListener('submit',request);
 $('mqb48CancelModal')?.addEventListener('click',e=>{if(e.target===$('mqb48CancelModal'))window.mqb48CloseCancel();});});
})();
