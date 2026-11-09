/* MOIN QURAN BOX V47 — homepage feature banner (presentation-only).
 * Reads the existing published product catalog and V42 gift-offer settings.
 * The ONLY write is to publicSettings/homePromoV47; never touches product,
 * payment, order, checkout, stock, shipping, Firebase rules, or Razorpay.
 * Server-side Firebase Rules must enforce staff write permissions.
 */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const live = () => window.mqbLive;
  const catalog = () => typeof products !== 'undefined' && Array.isArray(products) ? products : [];
  const canManage = () => !!live()?.verifiedAdmin && typeof currentUser !== 'undefined' &&
    ['admin','owner','manager'].includes(currentUser?.role);
  const validId = id => /^[A-Za-z0-9_-]{1,100}$/.test(String(id||''));
  const PROMO_PATH = 'publicSettings/homePromoV47';
  const DEFAULT_GIFTS = ['Miswaq', 'Digital finger tasbih counter', 'Seerat un Nabi kitab'];
  const comboMatch = title => /^10\s*books\s*combo\s*[-–—]?\s*roman\s*english$/i.test(String(title||'').trim());
  const money = n => '₹' + Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:0});
  let cfg = null, ready = false, subscribed = false, saving = false;
  const bound = new Set();

  function defaultProduct() {
    const eligible = catalog().filter(p => validId(p.id) && comboMatch(p.title));
    if(!eligible.length)return null;
    return eligible.find(p => window.MQB45TopSelling?.isPinned?.(p.id)) || eligible[0];
  }
  function chosenProduct() {
    if(!ready || cfg?.enabled===false)return null;
    if(cfg?.productId) return catalog().find(p => p.id===cfg.productId) || null;
    return defaultProduct();
  }
  function giftsFor(product) {
    if(!product)return [];
    const fromDb = window.MQB42_GIFT_OFFERS;
    const record = fromDb && typeof fromDb==='object' ? fromDb[product.id] : null;
    if(record && typeof record==='object') {
      return record.enabled === true && Array.isArray(record.gifts)
        ? record.gifts.filter(v=>typeof v==='string').map(v=>v.trim().slice(0,75)).filter(Boolean).slice(0,8)
        : [];
    }
    return comboMatch(product.title) ? DEFAULT_GIFTS : [];
  }
  function setText(id,value) {const el=$(id);if(el)el.textContent=String(value??'');}
  function safeImage(src) {
    if(typeof src!=='string')return '';
    const s=src.trim();
    if(s.length <= 400000 && /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(s))return s;
    try {const url = new URL(s);return url.protocol==='https:' && !url.username && !url.password ? url.href : '';} catch {return '';}
  }
  function child(parent,tag,cls,text) {
    const e=document.createElement(tag);
    if(cls)e.className=cls;
    if(text!==undefined)e.textContent=text;
    parent.appendChild(e);
    return e;
  }
  function showHero() {
    const section=$('mqb47HomePromo');if(!section)return;
    const p=chosenProduct();
    if(!p || Number(p.stock)<=0){section.hidden=true;promoteCard();return;}
    section.hidden=false;
    setText('mqb47Title',p.title);
    setText('mqb47Category',p.category || 'Featured collection');
    setText('mqb47Price',money(p.salePrice));
    const regular=$('mqb47OldPrice');if(regular){
      const discounted=Number(p.oldPrice)>Number(p.salePrice)&&Number(p.salePrice)>0;
      regular.hidden=!discounted;regular.textContent=discounted?money(p.oldPrice):'';
      setText('mqb47Discount',discounted?'SAVE '+Math.round((Number(p.oldPrice)-Number(p.salePrice))/Number(p.oldPrice)*100)+'%':'');
      const discount=$('mqb47Discount');if(discount)discount.hidden=!discounted;
    }
    setText('mqb47Eyebrow','★ TOP SELLING · FEATURED PICK');
    setText('mqb47Subtitle',cfg?.subtitle?.trim() || 'A thoughtful collection for your home and loved ones.');
    const img=$('mqb47ProductImage');const image=safeImage(p.image);
    if(img){img.src=image || '';img.alt=p.title;img.hidden=!image;}
    const empty=$('mqb47ImageFallback');if(empty)empty.hidden=!!image;
    const gifts=giftsFor(p);
    const panel=$('mqb47GiftPanel');if(panel){
      panel.hidden=!gifts.length;
      const list=$('mqb47GiftList');if(list){list.replaceChildren();for(const gift of gifts){
        const li=child(list,'li','mqb47-gift');
        child(li,'span','mqb47-gift-check','✓');child(li,'span','',gift);
      }}
    }
    const note=$('mqb47GiftCondition');if(note)note.hidden=!gifts.length;
    const action=$('mqb47ShopBtn');if(action){action.disabled=false;action.textContent=gifts.length?'Explore combo & gifts':'View featured product';}
    const view=$('mqb47ViewBtn');if(view)view.disabled=false;
    const discountNote=$('mqb47ExtraNote');if(discountNote){discountNote.textContent=gifts.length?'Three gifts at no extra cost after verified Razorpay payment. Offer applies only to this product.':'Current price shown from our live catalog. Shipping is included in the item price.';}
    promoteCard();
  }
  function openFeatured() {
    const p=chosenProduct();if(!p)return;
    // Existing details modal performs the actual Add to Cart / Buy Now actions.
    if(typeof window.openProductDetails==='function')window.openProductDetails(p.id);
  }
  function promoteCard() {
    const grid=$('productGrid');if(!grid)return;
    for(const card of [...grid.children]){
      card.classList.remove('mqb47-promo-product-card');
      card.querySelector('.mqb47-promo-product-tag')?.remove();
    }
    const p=chosenProduct();if(!p || Number(p.stock)<=0)return;
    // Only rearrange existing rendered cards; never duplicate a product.
    for(const card of [...grid.children]){
      const action=card.querySelector('button[onclick*="openProductDetails"]');
      const match=action?.getAttribute('onclick')?.match(/openProductDetails\('([^']+)'\)/);
      if(match?.[1]!==p.id)continue;
      card.classList.add('mqb47-promo-product-card');
      if(!card.querySelector('.mqb45-top-selling-badge')){
        const info=card.querySelector('.p-3')||card;
        const tag=document.createElement('span');tag.className='mqb47-promo-product-tag';tag.textContent='★ TOP SELLING';
        info.prepend(tag);
      }
      grid.prepend(card);
      break;
    }
  }
  function status(message,isError=false) {
    const el=$('mqb47AdminStatus');if(el){el.textContent=message;el.classList.toggle('mqb47-error',!!isError);}
  }
  function drawAdmin() {
    const panel=$('mqb47AdminPanel');if(!panel)return;
    panel.hidden=!canManage();if(!canManage())return;
    const select=$('mqb47AdminSelect');if(!select)return;
    const previous=select.value;
    select.replaceChildren();
    const items=catalog().filter(p=>validId(p.id));
    const labels=new Map();for(const p of items){const k=String(p.title||'').trim().toLowerCase();labels.set(k,(labels.get(k)||0)+1);}
    for(const p of items){
      const option=document.createElement('option');option.value=p.id;
      const suffix=labels.get(String(p.title||'').trim().toLowerCase())>1?' (ID: '+p.id+')':'';
      option.textContent=p.title+suffix+(Number(p.stock)<=0?' — out of stock':'');
      option.disabled=Number(p.stock)<=0;
      select.append(option);
    }
    const proposed=cfg?.productId || defaultProduct()?.id;
    if(items.some(p=>p.id===previous))select.value=previous;
    else if(items.some(p=>p.id===proposed))select.value=proposed;
    const subtitle=$('mqb47AdminSubtitle');if(subtitle && document.activeElement!==subtitle)subtitle.value=cfg?.subtitle||'';
    const btn=$('mqb47AdminSave');if(btn)btn.disabled=saving||!ready||!items.length;
    const disable=$('mqb47AdminDisable');if(disable)disable.disabled=saving||!ready||cfg?.enabled===false;
    const current=$('mqb47AdminCurrent');if(current){
      const p=chosenProduct();current.textContent=cfg?.enabled===false?'Banner disabled':p?'Currently featured: '+p.title:'No active product available for the banner';
    }
  }
  async function save(enabled) {
    if(!canManage())return status('Sign in as verified Admin, Owner or Manager to change the promotion.',true);
    if(!ready||!live()?.db)return status('Catalog/Firebase settings not ready. Please try again.',true);
    const id=$('mqb47AdminSelect')?.value;
    if(enabled && (!validId(id)||!catalog().some(p=>p.id===id && Number(p.stock)>0)))
      return status('Select an active product that is in stock.',true);
    const selected=enabled?id:(cfg?.productId||defaultProduct()?.id||'');
    const subtitle=String($('mqb47AdminSubtitle')?.value||'').trim().slice(0,110);
    const data={enabled:enabled===true,productId:selected,subtitle};
    saving=true;drawAdmin();status('Saving homepage banner setting…');
    try{
      await live().db.ref(PROMO_PATH).set(data);
      status(enabled?'Homepage feature saved. All customers will see the selected product.':'Homepage promotional banner disabled.');
    }catch(e){status('Not saved: '+String(e?.message||e).slice(0,120)+'. A narrowly scoped Firebase permission may be needed for homePromoV47.',true);}
    finally{saving=false;drawAdmin();}
  }
  function applyRemote(value) {
    cfg=value&&typeof value==='object' && !Array.isArray(value) ? {
      enabled:value.enabled!==false,
      productId:validId(value.productId)?String(value.productId):'',
      subtitle:typeof value.subtitle==='string'?value.subtitle.slice(0,110):''
    }:null;
    ready=true;showHero();drawAdmin();
  }
  function subscribe() {
    if(subscribed || !live()?.db)return;
    subscribed=true;
    live().db.ref(PROMO_PATH).on('value',snapshot=>applyRemote(snapshot.val()),e=>{
      // Use default promo when the standalone read fails; do not attempt a write.
      subscribed=false;cfg=null;ready=true;showHero();drawAdmin();
      status('Banner settings read unavailable: '+String(e?.code||e).slice(0,85),true);
    });
  }
  function bind() {
    $('mqb47ShopBtn')?.addEventListener('click',openFeatured);
    $('mqb47ViewBtn')?.addEventListener('click',openFeatured);
    $('mqb47AdminSave')?.addEventListener('click',()=>save(true));
    $('mqb47AdminDisable')?.addEventListener('click',()=>save(false));
    const origRender=window.renderProducts;
    if(typeof origRender==='function')window.renderProducts=function(){const result=origRender.apply(this,arguments);showHero();return result;};
    const origInventory=window.renderAdminInventory;
    if(typeof origInventory==='function')window.renderAdminInventory=function(){const result=origInventory.apply(this,arguments);drawAdmin();return result;};
    const origTab=window.switchAdminTab;
    if(typeof origTab==='function')window.switchAdminTab=function(){const result=origTab.apply(this,arguments);drawAdmin();return result;};
    const origModal=window.openAdminDashboardModal;
    if(typeof origModal==='function')window.openAdminDashboardModal=function(){const result=origModal.apply(this,arguments);drawAdmin();return result;};
    if(live()&&typeof live().start==='function'){
      const origStart=live().start;
      live().start=function(){const result=origStart.apply(this,arguments);subscribe();return result;};
    }
    subscribe();showHero();drawAdmin();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
  window.MQB47HomePromo={chosenProduct,giftsFor,save,applyRemote,showHero};
})();
