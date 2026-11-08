/* MOIN QURAN BOX V42 — additive operations. Never modifies Razorpay captures,
 * payment creation, verified totals, stock reservation or server callbacks.
 * Firebase Database Rules remain the authorization boundary.
 */
(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const live=()=>window.mqbLive;
  const allOrders=()=>typeof orders!=='undefined' && Array.isArray(orders)?orders:[];
  const allProducts=()=>typeof products!=='undefined' && Array.isArray(products)?products:[];
  const role=()=>typeof currentUser==='undefined'?'':String(currentUser?.role||'');
  const staff=()=>live()?.verifiedAdmin===true && ['admin','owner','manager'].includes(role());
  const admin=()=>staff() && role()==='admin';
  const clean=s=>String(s??'').trim().slice(0,240);
  const button=(title,cb)=>{const el=document.createElement('button');el.type='button';el.className='mqb42-outline';el.textContent=title;el.addEventListener('click',cb);return el;};
  const text=(tag,value)=>{const el=document.createElement(tag);el.textContent=value;return el;};
  const officialUrl='https://www.indiapost.gov.in/'; // verified official Track & Trace entry, no undocumented AWB query
  window.MQB42_INDIA_POST_URL=officialUrl;
  window.MQB42_COD_ENABLED=null; // fail closed until Firebase publicSettings is read

  function dateAfterConfirmation(o){
    const raw=o?.paymentVerification?.verifiedAt || o?.paymentVerification?.capturedAt || o?.confirmedAt ||
      (['Confirmed','Processing','Packed','Shipped','In Transit','Out for Delivery','Delivered'].includes(o?.status)?o?.date:'');
    if(!raw)return '';
    const d=new Date(typeof raw==='number'?raw:raw);
    if(!Number.isFinite(d.getTime()))return '';
    d.setUTCHours(12,0,0,0);d.setUTCDate(d.getUTCDate()+7);
    return d.toISOString().slice(0,10);
  }
  window.mqb42DefaultEta=dateAfterConfirmation;

  // COD: administrative visibility and rejection at the normal request writer.
  function renderCod(){
    const ready=typeof window.MQB42_COD_ENABLED==='boolean';
    const enabled=window.MQB42_COD_ENABLED===true;
    const row=$('mqb42CodRow');const radio=row?.querySelector('input[value="COD"]');
    if(row){row.hidden=!enabled||!ready;row.style.display=enabled&&ready?'flex':'none';}
    if(radio)radio.disabled=!enabled;
    if(!enabled&&radio?.checked){radio.checked=false;
      const alternative=document.querySelector('input[name="chkPaymentMethod"][value="Razorpay"]:not(:disabled)') ||
        document.querySelector('input[name="chkPaymentMethod"][value="Manual UPI"]:not(:disabled)');
      if(alternative)alternative.checked=true;window.mqbUpdatePaymentDescription?.();}
    const panel=$('mqb42CodControl');if(panel){panel.hidden=!admin();panel.style.display=admin()?'':'none';}
    const toggle=$('mqb42CodSwitch');if(toggle){toggle.checked=enabled;toggle.disabled=!admin();}
  }
  window.mqb42RenderPaymentFlags=renderCod;
  async function saveCod(checked){
    if(!admin()||!live()?.db)return;
    const label=$('mqb42CodMessage'),toggle=$('mqb42CodSwitch');if(toggle)toggle.disabled=true;
    if(label)label.textContent='Saving…';
    try{await live().db.ref('publicSettings/codEnabled').set(checked===true);
      if(label)label.textContent='Saved. The new COD setting applies to upcoming customer checkouts.';}
    catch(e){if(label)label.textContent='Could not save: '+clean(e.message);}
    finally{if(toggle)toggle.disabled=false;renderCod();}
  }

  // PDF: deduplicate by actual Firebase UID/order key, NOT similar customer names.
  // V43: all bulk labels come from authenticated Firebase orders only.
  // One key => one label, regardless of repeated render/listener snapshots.
  const orderDateIST=o=>{
    const source=o?.date||o?.createdAt||o?.placedAt||'';
    if(!source)return '';
    if(typeof source==='string' && /^\d{4}-\d{2}-\d{2}$/.test(source))return source;
    const d=new Date(typeof source==='number'?source:(/^\d+$/.test(String(source))?Number(source):source));
    if(!Number.isFinite(d.getTime()))return '';
    const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kolkata',day:'2-digit',month:'2-digit',year:'numeric'}).formatToParts(d);
    const part=t=>parts.find(x=>x.type===t)?.value||'';
    return part('year')+'-'+part('month')+'-'+part('day');
  };
  const pendingStatus=new Set(['requested','pending','payment pending']);
  const confirmedStatus=new Set(['confirmed','processing','packed']);
  const rejectedStatus=new Set(['cancelled','canceled','returned','shipped','in transit','out for delivery','delivered']);
  function labelCandidates(){
    const mode=$('mqb43LabelStatus')?.value||'all';
    const from=$('mqb43LabelFrom')?.value||'',to=$('mqb43LabelTo')?.value||'';
    const includeUnpaid=$('mqb42IncludeUnpaid')?.checked===true;
    const seen=new Set(),result=[];
    for(const o of allOrders()){
      if(!o?.__uid||!o?.__key)continue;
      const key=String(o.__uid)+'/'+String(o.__key);
      if(seen.has(key))continue;seen.add(key);
      const state=clean(o.status).toLowerCase();
      if(rejectedStatus.has(state))continue;
      const paid=o.paymentStatus==='verified';
      const pending=pendingStatus.has(state) && !paid;
      const confirmed=confirmedStatus.has(state)||paid;
      if(!(pending||confirmed))continue;
      if(mode==='pending'&&!pending)continue;
      if(mode==='confirmed'&&!paid)continue; // truly verified payment, not just a status label
      if(!includeUnpaid && o.paymentMethod==='Razorpay' && !paid)continue;
      const date=orderDateIST(o);
      if((from||to)&&!date)continue; // cannot claim matching date without a stored order date
      if(from && date<from)continue;
      if(to && date>to)continue;
      const profile=live()?.profiles?.[o.__uid]||{};
      result.push({order:o,shop:typeof config==='undefined'?{}:config,profile,orderDate:date});
    }
    return result.sort((a,b)=>a.orderDate.localeCompare(b.orderDate)||
      String(a.order.orderId||a.order.__key).localeCompare(String(b.order.orderId||b.order.__key)));
  }
  function renderLabels(){
    const panel=$('mqb42BulkLabels');if(panel){panel.hidden=!staff();panel.style.display=staff()?'':'none';}
    const list=labelCandidates();const el=$('mqb42BulkCount');if(el)el.textContent=list.length+' unique eligible label(s) match the selected filters';
    const action=$('mqb42BulkDownload');if(action)action.disabled=!staff()||list.length===0;
  }
  function downloadLabels(){
    if(!staff())return alert('Verified staff access is required.');
    if(!window.MQBShippingLabelPDF?.downloadMany)return alert('Bulk label script not loaded.');
    const from=$('mqb43LabelFrom')?.value||'',to=$('mqb43LabelTo')?.value||'';
    if(from&&to&&from>to)return alert('From date cannot be after To date.');
    const list=labelCandidates();if(!list.length)return alert('There are no eligible orders for this status/date selection.');
    if(list.length>2000)return alert('Please print labels in batches of at most 2,000.');
    const valid=[],errors=[];
    for(const o of list){const d=window.MQBShippingLabelPDF.fields(o);
      if(!d.name||!d.phone||!d.address||!/^[0-9]{6}$/.test(d.pin))errors.push(d.order);
      else valid.push(o);
    }
    if(errors.length)return alert('Fix recipient address/name/phone/PIN on these orders before bulk printing (nothing downloaded):\n'+errors.slice(0,12).join('\n'));
    try{const result=window.MQBShippingLabelPDF.downloadMany(valid);const el=$('mqb42BulkCount');
      if(el)el.textContent=result.count+' distinct 4×6 shipping labels saved in one PDF.';}
    catch(e){alert('Bulk label PDF failed: '+clean(e.message));}
  }

  // Free gifts: each offer is tied to an existing catalog product ID; default
  // 10-book offer can be turned off in Firebase. No gift can mark a payment paid.
  const defaultGifts=['Miswaq','Finger counter digital tasbi','Seerat un Nabi kitab'];
  const comboTitle=/^10\s*books\s*combo\s*[-–—]?\s*roman\s*english$/i;
  const offerKey=id=>String(id).replace(/[^A-Za-z0-9_-]/g,'');
  const catalogProducts=()=>[...allProducts(),...(Array.isArray(live()?.catalogArchived)?live().catalogArchived:[])];
  const normalizedOffers=()=>{
    const out=new Map();
    const combo=catalogProducts().find(p=>comboTitle.test(String(p.title||'').trim()));
    if(combo)out.set(combo.id,{productId:combo.id,gifts:defaultGifts,enabled:true,builtIn:true});
    const raw=window.MQB42_GIFT_OFFERS;
    if(raw && typeof raw==='object')for(const [key,r] of Object.entries(raw)){
      if(!r||typeof r!=='object')continue;
      const id=clean(r.productId||key);if(!id||!catalogProducts().some(p=>p.id===id))continue;
      const gifts=Array.isArray(r.gifts)?r.gifts.map(clean).filter(Boolean).slice(0,8):[];
      out.set(id,{productId:id,gifts,enabled:r.enabled===true});
    }
    return out;
  };
  const isOfferEligible=(o)=>o?.paymentMethod==='Razorpay' && o.paymentStatus==='verified' &&
    Array.isArray(o.items) && o.items.some(item=>{
      const offer=normalizedOffers().get(item.id);
      return offer?.enabled && offer.gifts?.length && Number(item.qty)>0;
    });
  function offerItems(o){const result=[];const seen=new Set();
    for(const item of o.items||[]){const offer=normalizedOffers().get(item.id);if(offer?.enabled&&Number(item.qty)>0){
      for(const gift of offer.gifts){const normalized=gift.toLowerCase();if(!seen.has(normalized)){seen.add(normalized);result.push(gift);}}
    }}
    return result;
  }
  window.mqb42OfferGiftsForOrder=o=>isOfferEligible(o)?offerItems(o):[];
  function renderOfferBadges(){
    const offers=normalizedOffers();const grid=$('productGrid');if(!grid)return;
    const catalog=allProducts();
    for(const card of grid.children){
      card.querySelector('.mqb42-gift-badge')?.remove();
      const action=card.querySelector('button[onclick*="openProductDetails"]');
      const match=action?.getAttribute('onclick')?.match(/openProductDetails\('([^']+)'\)/);
      const id=match?.[1];const offer=id?offers.get(id):null;
      if(!offer?.enabled||!catalog.some(p=>p.id===id))continue;
      const badge=text('div','🎁 '+offer.gifts.join(' + ')+' FREE with verified Razorpay payment');
      badge.className='mqb42-gift-badge';badge.setAttribute('aria-label','Free gifts with online payment');
      card.querySelector('.p-3')?.append(badge);
    }
  }
  function renderCheckoutGift(){
    const box=$('mqb42CheckoutGifts');if(!box)return;
    const chosen=document.querySelector('input[name="chkPaymentMethod"]:checked')?.value;
    const items=typeof cart!=='undefined'&&Array.isArray(cart)?cart:[];
    const gifts=[];const seen=new Set();
    for(const item of items){const offer=normalizedOffers().get(item.id);
      if(offer?.enabled)for(const name of offer.gifts)if(!seen.has(name)){seen.add(name);gifts.push(name);}
    }
    box.hidden=chosen!=='Razorpay'||!gifts.length;
    box.textContent=box.hidden?'':'Complimentary gifts after successful verified Razorpay payment: '+gifts.join(', ')+'. Free gifts are packed with this order.';
  }
  function renderGiftAdmin(){
    const panel=$('mqb42GiftsAdmin');if(panel){panel.hidden=!staff();panel.style.display=staff()?'':'none';}
    if(!staff())return;
    const list=$('mqb42GiftsList'),select=$('mqb42GiftProduct');if(!list||!select)return;
    const selected=select.value;
    select.replaceChildren();for(const p of allProducts()){
      const option=document.createElement('option');option.value=p.id;option.textContent=p.title;select.append(option);
    }if(selected && allProducts().some(p=>p.id===selected))select.value=selected;
    const offers=[...normalizedOffers().values()];list.replaceChildren();
    for(const offer of offers){
      const p=allProducts().find(p=>p.id===offer.productId);
      const card=document.createElement('div');card.className='mqb42-offer-row';
      const label=text('span',(p?.title||offer.productId)+' — '+offer.gifts.join(', ')+' · '+(offer.enabled?'Enabled':'Disabled'));
      card.append(label,button(offer.enabled?'Disable':'Enable',()=>persistOffer({...offer,enabled:!offer.enabled})));
      list.append(card);
    }
    if(!offers.length)list.append(text('p','No active product gift campaigns yet.'));
  }
  async function persistOffer(offer){
    if(!staff()||!live()?.db)return alert('Verified staff access is required.');
    const productId=offerKey(offer.productId);
    if(!productId||!allProducts().some(p=>p.id===productId))return alert('Select a published product.');
    const gifts=(offer.gifts||[]).map(clean).filter(Boolean).slice(0,8);
    if(!gifts.length)return alert('Please enter at least one gift.');
    const msg=$('mqb42GiftStatus');if(msg)msg.textContent='Saving offer to Firebase…';
    try{
      // Set only one offer node; never overwrite other offers or any payment/order data.
      await live().db.ref('publicSettings/giftOffers/'+productId).set({productId,gifts,enabled:offer.enabled===true});
      if(msg)msg.textContent='Saved. The offer will appear on customer devices shortly.';
    }catch(e){if(msg)msg.textContent='Not saved: '+clean(e.message)+' (Firebase Rules may require staff offer-write permission).';}
  }
  function saveGift(e){e.preventDefault();const id=$('mqb42GiftProduct')?.value;
    const names=($('mqb42GiftNames')?.value||'').split(',').map(clean).filter(Boolean);
    if(!names.length)return alert('Enter the gift names separated by commas.');
    persistOffer({productId:id,gifts:names,enabled:$('mqb42GiftEnabled')?.checked===true});
  }
  function renderOrderGifts(){
    const root=$('adminOrdersContainer');if(!root||!staff())return;
    for(const card of root.querySelectorAll('article')){
      card.querySelector('.mqb42-pack-gifts')?.remove();
      const id=card.querySelector('strong')?.textContent?.trim();
      const o=allOrders().find(x=>x.orderId===id);
      if(!o||!isOfferEligible(o))continue;
      const note=text('p','🎁 Pack complimentary gifts: '+offerItems(o).join(', '));
      note.className='mqb42-pack-gifts';card.append(note);
    }
  }
  window.mqb42RenderOffers=()=>{renderOfferBadges();renderGiftAdmin();renderCheckoutGift();renderOrderGifts();};

  // India Post: official tracking page does not provide a documented pre-filled query
  // URL. Display and copy the tracking number; don't fabricate one.
  function renderTrackingLinks(){
    for(const root of [$('custOrderList'),$('trackingResultBox')]){
      if(!root)return;
      const links=root.querySelectorAll('a[href*="indiapost.gov.in"]');
      for(const link of links){if(link.dataset.mqb42)return;link.dataset.mqb42='1';link.href=officialUrl;
        link.textContent='Track on official India Post website';}
      for(const card of root.querySelectorAll('.bg-emerald-50')){
        if(card.querySelector('.mqb42-track-hint'))continue;
        const textContent=card.textContent||'';
        const match=textContent.match(/(?:AWB\s*\/\s*Tracking:|AWB:)\s*([A-Z]{2}\d{9}IN)/i);
        if(!match)continue;
        const p=text('p','India Post consignment: '+match[1]+'. Copy the number, then use Track N Trace on India Post.');p.className='mqb42-track-hint';
        p.append(button('Copy tracking number',async()=>{
          try{await navigator.clipboard.writeText(match[1]);alert('Tracking number copied.');}
          catch{prompt('Copy the India Post tracking number:',match[1]);}
        }));card.append(p);
      }
    }
  }

  // Optional first-party Firebase metrics. A separate anonymous Firebase app
  // prevents automatic visitor sign-in from changing customer/staff sessions.
  // Requires scoped V42 analytics rules; NO fallback to misleading local counts.
  let analyticsInit=false;
  function initVisitors(){
    if(analyticsInit || window.MQB42_ANALYTICS_ENABLED!==true || !window.firebase?.auth || !live()?.db)return;analyticsInit=true;
    const note=$('mqb42VisitorsNote');
    try{
      const primary=firebase.app();
      const secondary=firebase.apps.find(a=>a.name==='mqb42-visitor') || firebase.initializeApp(primary.options,'mqb42-visitor');
      const auth=secondary.auth();const db=secondary.database();
      auth.onAuthStateChanged(async user=>{
        if(!user){try{await auth.signInAnonymously();}catch(e){if(note&&staff())note.textContent='Visitor analytics authentication unavailable: '+clean(e.code||e.message); }return;}
        // Count a page view on every actual page load; never store names or IPs.
        try{
          const connected=db.ref('.info/connected');
          connected.on('value',async snap=>{
            if(snap.val()!==true)return;
            const presence=db.ref('visitorMetrics/online/'+user.uid);
            try{await presence.onDisconnect().remove();await presence.set(firebase.database.ServerValue.TIMESTAMP);}
            catch(e){if(note&&staff())note.textContent='Visitor presence permission required.';}
          });
          await db.ref('visitorMetrics/pageViews').transaction(v=>(Number(v)||0)+1,undefined,false);
        }catch(e){if(note&&staff())note.textContent='Visitor analytics needs the scoped Firebase Rules extension.';}
      });
    }catch(e){if(note&&staff())note.textContent='Visitor analytics unavailable: '+clean(e.message);}
  }
  window.mqb42ConfigureVisitors=()=>{initVisitors();showVisitorKpis();};
  let visitorSubscribed=false;
  function showVisitorKpis(){
    const panel=$('mqb42Visitors');if(panel){panel.hidden=!staff();panel.style.display=staff()?'':'none';}
    if(!staff()||visitorSubscribed||!live()?.db || window.MQB42_ANALYTICS_ENABLED!==true)return;
    visitorSubscribed=true;
    const err=e=>{if($('mqb42VisitorsNote'))$('mqb42VisitorsNote').textContent='Analytics read permission needed: '+clean(e.code||e.message);};
    live().db.ref('visitorMetrics/online').on('value',snap=>{
      if($('mqb42OnlineVisits'))$('mqb42OnlineVisits').textContent=String(Object.keys(snap.val()||{}).length);
      if($('mqb42VisitorsNote'))$('mqb42VisitorsNote').textContent='Live presence is approximate; disconnects can take time to clear.';
    },err);
    live().db.ref('visitorMetrics/pageViews').on('value',snap=>{
      if($('mqb42TotalVisits'))$('mqb42TotalVisits').textContent=Number(snap.val()||0).toLocaleString('en-IN');
    },err);
  }
  function render(){renderCod();renderLabels();window.mqb42RenderOffers();showVisitorKpis();}
  function init(){
    $('mqb42CodSwitch')?.addEventListener('change',e=>saveCod(e.target.checked));
    $('mqb42BulkDownload')?.addEventListener('click',downloadLabels);
    $('mqb42IncludeUnpaid')?.addEventListener('change',renderLabels);
    for(const id of ['mqb43LabelStatus','mqb43LabelFrom','mqb43LabelTo'])$(id)?.addEventListener('change',renderLabels);
    $('mqb42GiftForm')?.addEventListener('submit',saveGift);
    const el=$('mqb42CheckoutGifts');if(!el){const payment=$('mqbV36PaymentOption');if(payment){const box=document.createElement('div');box.id='mqb42CheckoutGifts';box.className='mqb42-gift-checkout';box.hidden=true;payment.parentNode.insertBefore(box,payment.nextSibling);}}
    document.querySelectorAll('input[name="chkPaymentMethod"]').forEach(x=>x.addEventListener('change',renderCheckoutGift));
    const originalRenderProducts=window.renderProducts;
    if(typeof originalRenderProducts==='function')window.renderProducts=function(){const result=originalRenderProducts.apply(this,arguments);renderOfferBadges();return result;};
    const originalOrders=window.renderAdminOrders;
    if(typeof originalOrders==='function')window.renderAdminOrders=function(){const result=originalOrders.apply(this,arguments);renderOrderGifts();renderLabels();return result;};
    const originalCust=window.renderCustProfileOrders;
    if(typeof originalCust==='function')window.renderCustProfileOrders=function(){const result=originalCust.apply(this,arguments);renderTrackingLinks();return result;};
    const originalTrack=window.trackOrderById;
    if(typeof originalTrack==='function')window.trackOrderById=function(){const result=originalTrack.apply(this,arguments);renderTrackingLinks();return result;};
    const originalTab=window.switchAdminTab;
    if(typeof originalTab==='function')window.switchAdminTab=function(){const result=originalTab.apply(this,arguments);render();return result;};
    const originalCheckout=window.startCheckout;
    if(typeof originalCheckout==='function')window.startCheckout=function(){const result=originalCheckout.apply(this,arguments);renderCheckoutGift();return result;};
    // Staff session may be restored after DOMContentLoaded.
    initVisitors();render();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
