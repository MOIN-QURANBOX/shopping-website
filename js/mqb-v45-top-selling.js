/* MOIN QURAN BOX V45 — staff-selected Top Selling pins.
 * Catalog/order/payment data are read-only. The ONLY write is a boolean at
 * publicSettings/topSellingPins/<existing product id> through Firebase rules.
 * A browser-side role check is UX only; RTDB rules must enforce permissions.
 */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const live = () => window.mqbLive;
  const visibleProducts = () => typeof products !== 'undefined' && Array.isArray(products) ? products : [];
  const staff = () => !!live()?.verifiedAdmin && typeof currentUser !== 'undefined' &&
    ['admin','owner','manager'].includes(currentUser?.role);
  const validId = id => /^[A-Za-z0-9_-]{1,100}$/.test(String(id || ''));
  const PIN_PATH = 'publicSettings/topSellingPins';
  let pins = Object.create(null);
  let ready = false;
  let subscribed = false;
  let saving = false;

  function isPinned(id) {return pins[String(id)] === true;}
  function status(message, error=false){
    const el=$('mqb45PinStatus'); if(el){el.textContent=message;el.classList.toggle('mqb45-error',error);}
  }
  function ordered(ids){ // Original product order remains stable among pinned and non-pinned items.
    const selected=ids.filter(id=>isPinned(id));
    const rest=ids.filter(id=>!isPinned(id));
    return selected.concat(rest);
  }
  function paint(){
    const grid=$('productGrid');
    if(!grid)return;
    const cards=[...grid.children];
    const byProduct=card=>{
      const code=card.getAttribute('onclick')||'';
      const match=code.match(/openProductDetails\('([^']+)'\)/);
      return match?.[1]||'';
    };
    const pinned=[],regular=[];
    for(const card of cards){
      const id=byProduct(card),flag=validId(id)&&isPinned(id);
      card.classList.toggle('mqb45-top-selling-card',!!flag);
      card.querySelector('.mqb45-top-selling-badge')?.remove();
      if(flag){
        const badge=document.createElement('span');
        badge.className='mqb45-top-selling-badge';
        badge.textContent='★ TOP SELLING';
        badge.title='Selected by the MOIN QURAN BOX team';
        const info=card.querySelector('.p-3');
        if(info)info.prepend(badge); else card.prepend(badge);
        pinned.push(card);
      }else regular.push(card);
    }
    // Only move existing nodes: no product cloning, duplicates, or cart changes.
    if(pinned.length){const frag=document.createDocumentFragment();
      for(const card of pinned.concat(regular))frag.appendChild(card);
      grid.appendChild(frag);
    }
  }
  function paintDetail(id){
    const root=$('productDetailsContent');if(!root)return;
    root.querySelector('.mqb45-detail-badge')?.remove();
    if(!isPinned(id))return;
    const title=root.querySelector('h2');if(!title)return;
    const badge=document.createElement('span');badge.className='mqb45-detail-badge';
    badge.textContent='★ TOP SELLING · Team selected';
    title.before(badge);
  }
  function drawAdmin(){
    const panel=$('mqb45TopSellingPanel');if(!panel)return;
    const allowed=staff();
    panel.hidden=!allowed;
    if(!allowed)return;
    const select=$('mqb45ProductSelect');if(!select)return;
    const saved=select.value;
    const items=visibleProducts().filter(p=>validId(p.id));
    const counts=new Map();
    for(const p of items){const title=String(p.title||'').trim().toLowerCase();counts.set(title,(counts.get(title)||0)+1);}
    const display=p=>String(p.title||p.id)+(counts.get(String(p.title||'').trim().toLowerCase())>1?' · ID '+p.id:'');
    select.replaceChildren();
    for(const product of items){
      const opt=document.createElement('option');opt.value=product.id;
      opt.textContent=(isPinned(product.id)?'★ ':'')+display(product);
      select.append(opt);
    }
    if(items.some(p=>p.id===saved))select.value=saved;
    const chosen=select.value;
    const pinBtn=$('mqb45PinBtn'),unpinBtn=$('mqb45UnpinBtn');
    if(pinBtn)pinBtn.disabled=!ready||saving||!chosen||isPinned(chosen);
    if(unpinBtn)unpinBtn.disabled=!ready||saving||!chosen||!isPinned(chosen);
    const list=$('mqb45PinnedList');if(list){
      list.replaceChildren();
      const pinned=items.filter(p=>isPinned(p.id));
      if(!pinned.length){const p=document.createElement('p');p.textContent='No pinned products. Select a product and choose Pin.';list.append(p);}
      for(const product of pinned){
        const row=document.createElement('div');row.className='mqb45-pinned-row';
        const name=document.createElement('span');name.textContent='★ '+display(product);
        const btn=document.createElement('button');btn.type='button';btn.textContent='Remove pin';
        btn.disabled=saving||!ready;
        btn.addEventListener('click',()=>save(product.id,false));
        row.append(name,btn);list.append(row);
      }
    }
  }
  async function save(id,flag){
    if(!staff()){status('Sign in as verified Admin, Owner or Manager.',true);return;}
    if(!ready||!live()?.db){status('Firebase pin settings are not ready. Please try again.',true);return;}
    if(!validId(id)||!visibleProducts().some(p=>p.id===id)){
      status('Select a visible, active product from the list.',true);return;
    }
    if(saving)return;
    saving=true;drawAdmin();status('Saving Top Selling selection…');
    try{
      // Atomic per-product change. No catalog overwrite, no payment/order writes.
      await live().db.ref(PIN_PATH+'/'+id).set(flag===true);
      status(flag?'Product pinned. It will appear first with a Top Selling badge.':'Pin removed. Normal storefront order restored.');
      // A successful write will also update all browsers via the Firebase listener.
    }catch(err){
      status('Not saved: '+String(err?.message||err).slice(0,170)+'. Firebase Rules may need a staff-only permission for topSellingPins.',true);
    }finally{saving=false;drawAdmin();}
  }
  function onPins(data){
    pins=Object.create(null);
    if(data && typeof data==='object' && !Array.isArray(data)){
      for(const [id,value] of Object.entries(data))if(validId(id)&&value===true)pins[id]=true;
    }
    ready=true;
    drawAdmin();
    // Redraw from the authenticated public catalog, without changing product records.
    if(typeof window.renderProducts==='function')window.renderProducts();else paint();
  }
  function subscribe(){
    if(subscribed||!live()?.db)return;
    subscribed=true;
    live().db.ref(PIN_PATH).on('value',snapshot=>onPins(snapshot.val()),err=>{
      ready=false;status('Top Selling pins unavailable: '+String(err?.message||err).slice(0,130),true);drawAdmin();
    });
  }
  function bind(){
    $('mqb45ProductSelect')?.addEventListener('change',drawAdmin);
    $('mqb45PinBtn')?.addEventListener('click',()=>save($('mqb45ProductSelect')?.value,true));
    $('mqb45UnpinBtn')?.addEventListener('click',()=>save($('mqb45ProductSelect')?.value,false));
    if(typeof window.renderProducts==='function'){
      const original=window.renderProducts;
      window.renderProducts=function(){const result=original.apply(this,arguments);paint();return result;};
    }
    if(typeof window.renderAdminInventory==='function'){
      const original=window.renderAdminInventory;
      window.renderAdminInventory=function(){const result=original.apply(this,arguments);drawAdmin();return result;};
    }
    if(typeof window.switchAdminTab==='function'){
      const original=window.switchAdminTab;
      window.switchAdminTab=function(){const result=original.apply(this,arguments);drawAdmin();return result;};
    }
    if(typeof window.openAdminDashboardModal==='function'){
      const original=window.openAdminDashboardModal;
      window.openAdminDashboardModal=function(){const result=original.apply(this,arguments);drawAdmin();return result;};
    }
    if(typeof window.openProductDetails==='function'){
      const original=window.openProductDetails;
      window.openProductDetails=function(id){const result=original.apply(this,arguments);paintDetail(id);return result;};
    }
    // Ensure listener attaches after Firebase initializes even with slow startup.
    if(live()&&typeof live().start==='function'){
      const original=live().start;
      live().start=function(){const result=original.apply(this,arguments);subscribe();return result;};
    }
    subscribe();drawAdmin();
  }
  // Bind once after other V43 UI modules have registered their wrappers.
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
  window.MQB45TopSelling={ordered,isPinned,paint,save};
})();
