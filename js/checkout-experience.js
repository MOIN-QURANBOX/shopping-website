/* MOIN QURAN BOX V25.9 — mobile-first checkout presentation. No new payment processing. */
(() => {
 'use strict';
 const $ = id => document.getElementById(id);
 const rup = n => '₹' + (Number(n)||0).toLocaleString('en-IN',{maximumFractionDigits:2,minimumFractionDigits:0});
 const escapeHtml = s => String(s ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const quantity = () => (Array.isArray(window.cart)?window.cart:cart).reduce((n,i)=>n+Math.max(0,Number(i.qty)||0),0);
 function closeAdded() { $('mqbAddedModal')?.classList.add('hidden'); }
 window.mqbCloseAddedToCart=closeAdded;
 window.mqbAddedViewCart=()=>{ closeAdded(); if(typeof toggleCart==='function')toggleCart(true); };
 window.mqbAddedStartCheckout=()=>{ closeAdded(); if(typeof startCheckout==='function')startCheckout(); };
 function showAdded(p){
   const modal=$('mqbAddedModal'); if(!modal||!p)return;
   const img=$('mqbAddedImage');
   if(img){ try { const url=new URL(p.image, location.href); img.src = ['https:','http:'].includes(url.protocol)?url.href:''; } catch {img.removeAttribute('src');} img.alt=String(p.title||'Product'); }
   if($('mqbAddedName'))$('mqbAddedName').textContent=String(p.title||'Product added');
   if($('mqbAddedPrice'))$('mqbAddedPrice').textContent=rup(p.salePrice??p.price);
   if($('mqbAddedCount'))$('mqbAddedCount').textContent=String(quantity());
   if(typeof toggleCart==='function')toggleCart(false);
   modal.classList.remove('hidden');
   modal.querySelector('[aria-label="Close added to cart"]')?.focus();
 }
 function renderOrderSummary(){
   const items=Array.isArray(window.cart)?window.cart:cart;
   const count=items.reduce((n,i)=>n+Math.max(0,Number(i.qty)||0),0);
   const total=items.reduce((n,i)=>n+(Math.max(0,Number(i.salePrice)||0)*Math.max(0,Number(i.qty)||0)),0);
   if($('mqbCheckoutCount'))$('mqbCheckoutCount').textContent=String(count);
   if($('checkoutTotalAmount'))$('checkoutTotalAmount').textContent=rup(total);
   if($('mqbCheckoutFooterSubtotal'))$('mqbCheckoutFooterSubtotal').textContent=rup(total);
   if($('mqbCheckoutItems'))$('mqbCheckoutItems').innerHTML=items.map(i=>`<div class="flex items-start justify-between gap-3"><span class="flex-1 break-words">${escapeHtml(i.title)} <span class="text-brand-muted">× ${Math.max(1,Math.floor(Number(i.qty)||1))}</span></span><strong>${rup((Number(i.salePrice)||0)*(Number(i.qty)||0))}</strong></div>`).join('')||'<p>Your bag is empty.</p>';
 }
 window.mqbToggleCheckoutSummary=()=>{
   const e=$('mqbCheckoutItems'),b=$('mqbSummaryToggle');if(!e)return;
   const shouldOpen=e.classList.contains('hidden');e.classList.toggle('hidden',!shouldOpen);
   b?.setAttribute('aria-expanded',String(shouldOpen));if($('mqbSummaryChevron'))$('mqbSummaryChevron').textContent=shouldOpen?'⌃':'⌄';
 };
 window.mqbUpdatePaymentDescription=()=>{
   const sel=document.querySelector('input[name="chkPaymentMethod"]:checked')?.value||'Manual UPI';
   document.querySelectorAll('.mqb-pay-row').forEach(row=>{
     const active=row.querySelector('input[type="radio"]')?.checked;
     row.classList.toggle('border-brand-darkgreen',!!active);
     row.classList.toggle('bg-emerald-50',!!active);
     row.classList.toggle('border-brand-border',!active);
     row.classList.toggle('bg-white',!active);
   });
   if($('mqbPaymentDescription'))$('mqbPaymentDescription').textContent=sel==='COD'
     ?'Cash on Delivery: available only for eligible PIN codes. The store will confirm courier and total. No payment is taken now.'
     :'For UPI: submit your request now, then wait for confirmed product and shipping charges. Pay only to the verified business UPI ID after the store contacts you.';
 };
 const originalAdd=window.addToCart;
 if(typeof originalAdd==='function') window.addToCart=function(id){
   const before=quantity();
   const result=originalAdd.apply(this,arguments);
   if(quantity()>before){
     const product=(typeof products!=='undefined' ? products : []).find(p=>p.id===id);
     showAdded(product);
   }
   return result;
 };
 const originalStart=window.startCheckout;
 if(typeof originalStart==='function') window.startCheckout=function(){
   closeAdded();
   const result=originalStart.apply(this,arguments);
   if(!$('checkoutModal')?.classList.contains('hidden')){
      renderOrderSummary();window.mqbUpdatePaymentDescription();
   }
   return result;
 };
 const originalClose=window.closeCheckoutModal;
 if(typeof originalClose==='function')window.closeCheckoutModal=function(){return originalClose.apply(this,arguments);};
 document.addEventListener('keydown',e=>{if(e.key==='Escape')closeAdded();});
})();
