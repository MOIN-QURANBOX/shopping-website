/* MOIN QURAN BOX V34 — transparent offers, live site notices and assisted order messages.
 * No fake customer ratings, automatic WhatsApp/email claims, payment verification changes,
 * or exposed API secrets. Firebase rules are the authorization boundary. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const live = () => window.mqbLive;
  const role = () => { try { return currentUser?.role || ''; } catch { return ''; } };
  const isStaff = () => !!live()?.verifiedAdmin && ['admin','owner','manager'].includes(role());
  const fmt = n => '₹' + Math.max(0,Number(n)||0).toLocaleString('en-IN',{maximumFractionDigits:2});
  const elem=(tag,cls='',value)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(value!==undefined)el.textContent=String(value);return el;};
  const getProducts=()=>{try{return Array.isArray(products)?products:[];}catch{return []}};
  const state={notices:[],firstLoad:false,lastNewest:0,unread:0,ready:false};
  const seenKey='mqb34_last_seen_notice';
  const getSeen=()=>{try{return Number(localStorage.getItem(seenKey)||0)}catch{return 0}};
  const putSeen=ts=>{try{localStorage.setItem(seenKey,String(ts))}catch{}};
  const readableType={offer:'Special offer',sale:'Sale alert',deal:'Limited-time deal',notice:'Store update'};
  function currentNotices(){const now=Date.now();return state.notices.filter(n=>Number(n.expiresAt)>now && n.message && n.title).sort((a,b)=>b.createdAt-a.createdAt);}
  function visibleSaleProducts(){return getProducts().filter(p=>Number(p.oldPrice)>Number(p.salePrice) && Number(p.salePrice)>0 && p.stock>0);}
  function renderAlertStrip(){
    const strip=$('mqb34AlertStrip');if(!strip)return;
    strip.replaceChildren();const recent=currentNotices();const sales=visibleSaleProducts();
    if(!recent.length&&!sales.length){strip.hidden=true;return;}
    strip.hidden=false;
    const inner=elem('div','mqb34-alert-content');strip.append(inner);
    if(sales.length){
      const strongest=Math.max(...sales.map(p=>Math.round((1-Number(p.salePrice)/Number(p.oldPrice))*100)));
      const sale=elem('button','mqb34-alert-chip',`🏷️ Sale on ${sales.length} item${sales.length===1?'':'s'} · Up to ${strongest}% below previous listed price`);
      sale.type='button';sale.addEventListener('click',()=>document.getElementById('productGrid')?.scrollIntoView({behavior:'smooth',block:'start'}));inner.append(sale);
    }
    if(recent.length){
      const notice=recent[0];const chip=elem('button','mqb34-alert-chip mqb34-alert-special',`${notice.type==='deal'?'🔥':notice.type==='offer'?'🎁':'📢'} ${notice.title} — ${notice.message}`);
      chip.type='button';chip.addEventListener('click',()=>{if(notice.productId&&getProducts().some(p=>p.id===notice.productId))window.openProductDetails?.(notice.productId);else window.mqb34ToggleAlerts(true);});inner.append(chip);
    }
  }
  function renderNotices(){
    const area=$('mqb34NoticeList');if(!area)return;
    area.replaceChildren();const recent=currentNotices();
    if(!recent.length)area.append(elem('p','mqb34-no-notices','No active messages from the store yet.'));
    for(const n of recent){
      const article=elem('article','mqb34-notice-row');const top=elem('div','mqb34-notice-row-head');
      top.append(elem('strong','',n.title),elem('span','',readableType[n.type]||'Store update'));
      article.append(top,elem('p','',n.message));
      const footer=elem('small','',new Date(n.createdAt).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'}));article.append(footer);
      if(n.productId && getProducts().some(p=>p.id===n.productId)){
        const link=elem('button','mqb34-view-product','View related product →');link.type='button';link.addEventListener('click',()=>{window.mqb34ToggleAlerts(false);window.openProductDetails?.(n.productId);});article.append(link);
      }
      area.append(article);
    }
    const latest=recent.length?recent[0].createdAt:0;state.unread=recent.filter(n=>n.createdAt>getSeen()).length;
    const b=$('mqb34Unread');if(b){b.textContent=String(Math.min(state.unread,99));b.hidden=!state.unread;}
  }
  window.mqb34ToggleAlerts=(open)=>{
    const panel=$('mqb34NoticePanel');if(!panel)return;
    const shouldOpen=typeof open==='boolean'?open:panel.hidden;
    panel.hidden=!shouldOpen;$('mqb34Bell')?.setAttribute('aria-expanded',String(shouldOpen));
    if(shouldOpen){const latest=currentNotices()[0]?.createdAt||0;putSeen(latest);renderNotices();}
  };
  function handleNotices(data){
    const oldMax=state.lastNewest;const list=Object.entries(data||{}).filter(([,v])=>v&&typeof v==='object').map(([id,v])=>({...v,id,createdAt:Number(v.createdAt)||0}));
    state.notices=list;const newest=Math.max(0,...list.map(x=>x.createdAt));state.lastNewest=newest;
    renderNotices();renderAlertStrip();
    if(state.firstLoad && newest>oldMax){
      const item=list.find(n=>n.createdAt===newest && n.expiresAt>Date.now());
      if(item){const toast=$('mqb34LiveToast');if(toast){toast.textContent='🔔 '+item.title+': '+item.message;toast.hidden=false;toast.onclick=()=>{window.mqb34ToggleAlerts(true);toast.hidden=true;};}}
    }
    state.firstLoad=true;
  }
  function start(){
    const fb=live();if(!fb?.db)return false;
    if(state.ready)return true;state.ready=true;
    const query=fb.db.ref('storeAnnouncements/recent').orderByChild('createdAt').limitToLast(25);
    query.on('value',snapshot=>handleNotices(snapshot.val()),error=>{
      const strip=$('mqb34AlertStrip');if(strip)strip.dataset.error=String(error?.code||'read-error');
    });
    // Scores are public catalog metadata; the catalog listener already drives the original product cards.
    return true;
  }
  function staffProducts(){
    for(const selectId of ['mqb34NoticeProduct','mqb34ScoreProduct']){
      const select=$(selectId);if(!select)return;const previous=select.value;select.replaceChildren();
      if(selectId==='mqb34NoticeProduct'){const option=elem('option','', 'Entire store');option.value='';select.append(option);}
      for(const p of getProducts()){
        const opt=elem('option','',p.title);opt.value=p.id;select.append(opt);
      }
      if([...select.options].some(o=>o.value===previous))select.value=previous;
    }
    const sel=$('mqb34ScoreProduct');if(sel)sel.onchange=()=>{
      const p=getProducts().find(p=>p.id===sel.value);const s=$('mqb34ScoreValue');if(s)s.value=p?.staffScore?String(p.staffScore):'';
    };
  }
  window.mqb34PublishAnnouncement=async event=>{
    event.preventDefault();if(!isStaff()||!live()?.db)return alert('Only verified staff may publish store messages.');
    const type=$('mqb34NoticeType')?.value,title=$('mqb34NoticeTitle')?.value.trim(),message=$('mqb34NoticeMessage')?.value.trim(), productId=$('mqb34NoticeProduct')?.value||'',duration=Number($('mqb34NoticeDuration')?.value||7);
    const status=$('mqb34NoticeStatus');
    if(!['notice','offer','sale','deal'].includes(type)||title.length<3||title.length>70||message.length<10||message.length>240||![1,3,7,14].includes(duration)){
      if(status)status.textContent='Enter a valid title (3–70 characters) and message (10–240 characters).';return;
    }
    if(productId&&!getProducts().some(p=>p.id===productId)){if(status)status.textContent='Select an active catalog product.';return;}
    if(!confirm('Publish this in-store message to all visitors using the website? This is NOT a WhatsApp, email, or background push broadcast.'))return;
    const button=event.target.querySelector('button[type=submit]');if(button)button.disabled=true;
    if(status)status.textContent='Publishing…';
    try{
      await live().db.ref('storeAnnouncements/recent').push({type,title,message,productId,byUid:live().uid,createdAt:firebase.database.ServerValue.TIMESTAMP,expiresAt:Date.now()+duration*86400000});
      if(status)status.textContent='✓ Message published for customers currently visiting the website. It expires automatically.';
      event.target.reset();
    }catch(e){if(status)status.textContent='Message not saved: '+String(e?.code||e?.message||e).slice(0,150);}
    finally{if(button)button.disabled=false;}
  };
  window.mqb34SaveStaffScore=async()=>{
    const status=$('mqb34ScoreStatus');if(!isStaff()||!live()?.db)return alert('Only verified staff may save product assessments.');
    const id=$('mqb34ScoreProduct')?.value,raw=$('mqb34ScoreValue')?.value;
    if(!id||!getProducts().some(p=>p.id===id)){if(status)status.textContent='Select a valid active product.';return;}
    if(raw && ![1,2,3,4,5].includes(Number(raw))){if(status)status.textContent='Choose a whole number from 1–5.';return;}
    if(!confirm((raw?'Publish store team assessment '+raw+'/5':'Clear store team assessment')+' for this product? This will be clearly labelled and not counted as a customer review.'))return;
    try{
      await live().db.ref('catalog/'+id+'/staffScore').set(raw?Number(raw):null);
      if(status)status.textContent='✓ Separate store team assessment updated. Genuine customer review averages are unchanged.';
    }catch(e){if(status)status.textContent='Assessment not saved: '+String(e?.code||e?.message||e).slice(0,140);}
  };
  // Product savings/score labels are separate from V33 genuine customer star averages.
  function decorateProductCards(){
    const src=getProducts();if(!src.length)return;
    const grid=$('productGrid');
    if(grid){
      const inStock=$('filterInStockOnly')?.checked,sort=$('filterSortOrder')?.value||'featured';
      let list=typeof currentCategory==='undefined'||currentCategory==='All'?[...src]:src.filter(p=>p.category===currentCategory);
      if(inStock)list=list.filter(p=>p.stock>0);
      if(sort==='low-to-high')list.sort((a,b)=>a.salePrice-b.salePrice);
      if(sort==='high-to-low')list.sort((a,b)=>b.salePrice-a.salePrice);
      [...grid.children].forEach((card,index)=>decorateOne(card,list[index]));
    }
    const featured=$('mqbV26Products');if(featured){
      const list=src.filter(p=>Number(p.stock)>0).slice(0,4);
      featured.querySelectorAll('.mqb26-product').forEach((card,i)=>decorateOne(card,list[i]));
    }
    renderAlertStrip();
  }
  function decorateOne(card,p){
    if(!p||!card)return;
    card.querySelectorAll('.mqb34-product-badges').forEach(x=>x.remove());
    const label=elem('div','mqb34-product-badges');
    if(p.oldPrice>p.salePrice&&p.salePrice>0){
      const pct=Math.round((1-p.salePrice/p.oldPrice)*100);
      if(pct>0&&pct<100){label.append(elem('span','mqb34-sale-badge',`SALE · ${pct}% OFF`));}
    }
    if(p.staffScore){label.append(elem('span','mqb34-staff-score',`★ ${p.staffScore}/5 · Store team score`));}
    if(label.childElementCount){const body=card.querySelector('.mqb26-productbody')||card.querySelector('.p-3')||card;body.append(label);}
  }
  function decorateStock(){
    const body=$('adminInventoryTableBody');if(!body||!isStaff())return;
    const items=getProducts();[...body.querySelectorAll('tr')].forEach((row,i)=>{
      const p=items[i];if(!p||row.querySelector('.mqb34-stock-score'))return;
      const action=row.lastElementChild;if(!action)return;
      const b=elem('button','mqb34-stock-score mqb33-review-action',p.staffScore?`Staff score ${p.staffScore}/5 · Edit`:'Set store score');
      b.type='button';b.addEventListener('click',()=>{window.switchAdminTab?.('promotions');staffProducts();const sel=$('mqb34ScoreProduct');if(sel){sel.value=p.id;sel.dispatchEvent(new Event('change'));}});
      action.append(b);
    });
  }
  // The outer dashboard tab wrapper adds only one new role-gated tab; original tabs remain untouched.
  function wireAdminTab(){
    const prev=window.switchAdminTab;if(typeof prev!=='function')return;
    window.switchAdminTab=function(tab){
      const panel=$('adminTab-promotions'),button=$('adminTabBtn-promotions');
      if(tab==='promotions'){
        if(!isStaff())return alert('Verified staff login required.');
        prev('reviews');$('adminTab-reviews')?.classList.add('hidden');panel?.classList.remove('hidden');
        if(button)button.className='px-4 py-3 border-b-2 font-bold whitespace-nowrap border-brand-charcoal text-brand-charcoal bg-white';
        staffProducts();return;
      }
      panel?.classList.add('hidden');if(button)button.className='px-4 py-3 border-b-2 border-transparent text-neutral-500 hover:text-black whitespace-nowrap';
      return prev.apply(this,arguments);
    };
  }
  // Order information comes from the authorized staff order list, not a public ID lookup.
  const orderMessage=o=>{
    const items=(Array.isArray(o.items)?o.items:[]).slice(0,15).map(x=>`• ${String(x.title||'Item').slice(0,90)} × ${Math.max(1,Number(x.qty)||1)} — ${fmt((Number(x.salePrice)||0)*(Number(x.qty)||1))}`).join('\n');
    return `Assalamu Alaikum, ${String(o.customerName||'Customer').slice(0,80)}.\nMOIN QURAN BOX order update\nOrder: ${String(o.orderId||'').slice(0,80)}\nStatus: ${String(o.status||'Requested').slice(0,50)}\n${items}\nRecorded estimate: ${fmt(o.total)}\nPayment: ${o.paymentStatus==='verified'?'Verified by store':'Not verified'}\nShipping/final total confirmed separately.\nPlease contact +91 7337464501 for assistance.`;
  };
  window.mqb34ComposeOrderUpdate=(order,channel)=>{
    if(!isStaff()||!order)return alert('Staff access required.');
    const text=orderMessage(order);let url='';
    if(channel==='whatsapp'){
      let digits=String(order.customerPhone||'').replace(/\D/g,'');if(digits.length===10)digits='91'+digits;
      if(!/^91[6-9]\d{9}$/.test(digits))return alert('The customer phone is missing or invalid. Contact the customer by a verified channel.');
      url='https://wa.me/'+digits+'?text='+encodeURIComponent(text);
    } else if(channel==='email'){
      const mail=String(order.customerEmail||'').trim();if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail))return alert('This order does not contain a valid customer email.');
      url='mailto:'+encodeURIComponent(mail)+'?subject='+encodeURIComponent('MOIN QURAN BOX · '+order.orderId)+'&body='+encodeURIComponent(text);
    }else return;
    if(!confirm('Open a prefilled '+(channel==='whatsapp'?'WhatsApp':'email')+' message? You must review and press Send yourself. No automatic message will be delivered.'))return;
    const link=document.createElement('a');link.href=url;link.target=channel==='whatsapp'?'_blank':'_self';link.rel='noopener noreferrer';document.body.append(link);link.click();link.remove();
  };
  window.mqb34OnOrderCreated=o=>{
    const holder=$('mqb34OrderSummary');if(!holder||!o)return;
    holder.replaceChildren();holder.append(elem('strong','',`Order request: ${o.orderId}`));
    const list=elem('ul','');for(const item of (o.items||[]))list.append(elem('li','',`${item.title} × ${item.qty} · ${fmt(Number(item.qty)*Number(item.salePrice))}`));holder.append(list);
    holder.append(elem('p','',`Recorded estimate ${fmt(o.total)} · ${o.paymentMethod}. Shipping and final payment are subject to owner confirmation.`));
    const email=$('mqb34EmailOrderBtn');if(email){
      if(o.customerEmail){email.href='mailto:'+encodeURIComponent(o.customerEmail)+'?subject='+encodeURIComponent('My MOIN QURAN BOX order '+o.orderId)+'&body='+encodeURIComponent(orderMessage(o));email.hidden=false;}
      else email.hidden=true;
    }
  };
  function wire(){
    wireAdminTab();
    const baseRender=window.renderProducts;if(typeof baseRender==='function')window.renderProducts=function(){const result=baseRender.apply(this,arguments);decorateProductCards();return result;};
    const baseStock=window.renderAdminInventory;if(typeof baseStock==='function')window.renderAdminInventory=function(){const result=baseStock.apply(this,arguments);decorateStock();staffProducts();return result;};
    const select=$('mqb34ScoreProduct');if(select)select.addEventListener('change',()=>{
      const p=getProducts().find(p=>p.id===select.value);if($('mqb34ScoreValue'))$('mqb34ScoreValue').value=p?.staffScore?String(p.staffScore):'';
    });
    decorateProductCards();staffProducts();
    const timer=setInterval(()=>{if(start())clearInterval(timer);},400);setTimeout(()=>clearInterval(timer),20000);
    document.addEventListener('keydown',e=>{if(e.key==='Escape')window.mqb34ToggleAlerts(false);});
    document.addEventListener('click',e=>{const panel=$('mqb34NoticePanel');if(!panel?.hidden&&!panel?.contains(e.target)&&!$('mqb34Bell')?.contains(e.target))window.mqb34ToggleAlerts(false);});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wire);else wire();
})();
