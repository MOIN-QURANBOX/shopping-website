/* MOIN QURAN BOX V52 — direct product links for social / Instagram in-app browsers.
 * Review replacement for js/mqb-v48-product-links.js (existing filename unchanged).
 * Public catalog READ ONLY. No writes, changes to payments, orders, cart or auth.
 * Both historic #product=ID and newer ?product=ID links are accepted.
 */
(()=>{
  'use strict';
  const PRODUCT = /^[A-Za-z0-9_-]{1,120}$/;
  const LEGACY_PREFIX = '#product=';
  const TIMEOUT_MS = 22000;
  let lastOpened = null;
  let detailReadyFor = '';
  let overlay = null;
  let startedQuickReadFor = '';
  let pendingRequestedId = '';
  let overlayTimeout = null;
  let poll = null;
  let greetingObserver = null;
  let gridObserver = null;
  const $ = id => document.getElementById(id);

  function currentProducts(){
    try { return typeof products!=='undefined' && Array.isArray(products) ? products : []; }
    catch { return []; }
  }
  const productById=id=>currentProducts().find(p=>String(p.id)===id) || null;
  const safeId=id=>PRODUCT.test(String(id||'')) ? String(id) : '';
  function queryId(){
    try { return safeId(new URL(location.href).searchParams.get('product')); }
    catch { return ''; }
  }
  function hashId(){
    try { if(!location.hash.startsWith(LEGACY_PREFIX))return '';
      return safeId(decodeURIComponent(location.hash.slice(LEGACY_PREFIX.length)));
    } catch {return '';}
  }
  function requestedId(){return queryId() || hashId();}
  function makeUrl(id){
    id=safeId(id);if(!id)return '';
    const url=new URL(location.origin+location.pathname); url.searchParams.set('product',id);
    return url.href;
  }
  function setUrl(id){
    id=safeId(id); if(!id)return;
    const url=new URL(location.href);
    if(url.searchParams.get('product')===id && !url.hash.startsWith(LEGACY_PREFIX))return;
    url.searchParams.set('product',id);
    if(url.hash.startsWith(LEGACY_PREFIX))url.hash='';
    history.replaceState(history.state,'',url.pathname+url.search+url.hash);
  }
  function clearUrl(){
    const url=new URL(location.href);
    const hadProduct=url.searchParams.has('product') || url.hash.startsWith(LEGACY_PREFIX);
    url.searchParams.delete('product');
    if(url.hash.startsWith(LEGACY_PREFIX))url.hash='';
    if(hadProduct)history.replaceState(history.state,'',url.pathname+url.search+url.hash);
  }
  const detailsOpen=()=>!!$('productDetailsModal') && !$('productDetailsModal').classList.contains('hidden');
  function notice(msg){
    let node=$('mqb48ShareNotice');
    if(!node){node=document.createElement('div');node.id='mqb48ShareNotice';node.className='mqb48-share-notice';node.setAttribute('role','status');document.body.append(node);}
    node.textContent=msg;node.hidden=false;
    setTimeout(()=>{node.hidden=true;},3400);
  }

  function css(){
    if($('mqb52ProductLinkStyles'))return;
    const s=document.createElement('style');s.id='mqb52ProductLinkStyles';
    s.textContent=`
#mqb52QuickProduct{position:fixed;inset:0;z-index:59;display:flex;align-items:center;justify-content:center;padding:15px;box-sizing:border-box;background:#f6f8f3;overflow:auto;font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#193d2d}
#mqb52QuickProduct[hidden]{display:none!important}
#mqb52QuickProduct .mqb52-shell{width:min(920px,100%);background:white;border:1px solid #e5eae3;border-radius:22px;box-shadow:0 24px 70px rgba(11,46,28,.16);overflow:hidden}
#mqb52QuickProduct .mqb52-top{display:flex;align-items:center;justify-content:space-between;gap:8px;background:#153b2b;color:white;padding:14px 19px;font-size:13px}
#mqb52QuickProduct .mqb52-brand{font-weight:800;letter-spacing:.04em}
#mqb52QuickProduct .mqb52-shop{font:inherit;font-size:12px;color:#153b2b;border:0;background:#f3e6b7;border-radius:9px;padding:9px 12px;cursor:pointer;font-weight:700}
#mqb52QuickProduct .mqb52-row{display:grid;grid-template-columns:minmax(0,42%) minmax(0,58%);min-height:300px}
#mqb52QuickProduct .mqb52-image{background:#f4f6f2;display:flex;align-items:center;justify-content:center;min-height:270px;overflow:hidden;padding:16px;box-sizing:border-box}
#mqb52QuickProduct img{max-width:100%;max-height:320px;width:100%;height:100%;object-fit:contain;display:block}
#mqb52QuickProduct .mqb52-photo-placeholder{font-size:46px;opacity:.35}
#mqb52QuickProduct .mqb52-info{padding:25px 25px 22px;display:flex;flex-direction:column;justify-content:center;gap:11px}
#mqb52QuickProduct .mqb52-status{font-size:11px;color:#326344;font-weight:800;letter-spacing:.04em;text-transform:uppercase}
#mqb52QuickProduct h1{font-size:clamp(21px,3vw,28px);line-height:1.28;margin:0;font-weight:800;color:#143827}
#mqb52QuickProduct .mqb52-price{font-size:26px;font-weight:800;color:#15482d}
#mqb52QuickProduct .mqb52-desc{font-size:13px;line-height:1.6;color:#4d5f54;margin:0}
#mqb52QuickProduct .mqb52-open{padding:13px 17px;background:#21583e;color:#fff;border:0;border-radius:11px;font-size:14px;font-weight:800;text-align:center}
#mqb52QuickProduct .mqb52-open[disabled]{opacity:.72;cursor:progress}
#mqb52QuickProduct .mqb52-note{font-size:11px;color:#657568;line-height:1.45;margin:0}
#mqb52QuickProduct .mqb52-load{height:4px;border-radius:4px;background:#e9efea;overflow:hidden}
#mqb52QuickProduct .mqb52-load:before{content:'';display:block;width:42%;height:100%;background:#d0a953;animation:mqb52progress 1.35s infinite ease-in-out}
@keyframes mqb52progress{0%{transform:translateX(-110%)}100%{transform:translateX(330%)}}
@media(max-width:600px){#mqb52QuickProduct{align-items:flex-start;padding:10px}#mqb52QuickProduct .mqb52-shell{border-radius:16px}#mqb52QuickProduct .mqb52-row{grid-template-columns:1fr}#mqb52QuickProduct .mqb52-image{min-height:200px;max-height:290px}#mqb52QuickProduct img{max-height:245px}#mqb52QuickProduct .mqb52-info{padding:20px;gap:10px}#mqb52QuickProduct h1{font-size:21px}#mqb52QuickProduct .mqb52-price{font-size:23px}}
`;
    document.head.append(s);
  }
  function ensureOverlay(){
    if(overlay)return overlay;
    css();
    const view=document.createElement('div'); view.id='mqb52QuickProduct'; view.setAttribute('role','region');view.setAttribute('aria-label','Loading product details');
    // Static markup only. Product fields are assigned through textContent, never HTML.
    view.innerHTML=`<div class="mqb52-shell"><div class="mqb52-top"><strong class="mqb52-brand">MOIN QURAN BOX</strong><button class="mqb52-shop" type="button" id="mqb52Browse">Browse store</button></div><div class="mqb52-load" id="mqb52Progress"></div><div class="mqb52-row"><div class="mqb52-image" id="mqb52Picture"><span class="mqb52-photo-placeholder" aria-hidden="true">▣</span></div><div class="mqb52-info"><span class="mqb52-status" id="mqb52Status">Opening your product…</span><h1 id="mqb52Name">Preparing your product details</h1><div class="mqb52-price" id="mqb52Price"></div><p class="mqb52-desc" id="mqb52Description">We're connecting to the latest product information.</p><button class="mqb52-open" type="button" id="mqb52Open" disabled>Loading secure product page…</button><p class="mqb52-note">Prices and availability are confirmed from the live store before checkout.</p></div></div></div>`;
    document.body.append(view);
    $('mqb52Browse').addEventListener('click',()=>{clearUrl();stopOverlay();});
    overlay=view;
    return view;
  }
  function stopOverlay(){
    if(overlay){overlay.remove();overlay=null;}
    if(overlayTimeout){clearTimeout(overlayTimeout);overlayTimeout=null;}
    pendingRequestedId='';
  }
  function validImage(src){
    if(typeof src!=='string')return '';
    if(/^https:\/\//i.test(src) && src.length<=1800)return src;
    if(/^data:image\/(?:jpeg|png|webp|gif);base64,[a-z0-9+/=]+$/i.test(src) && src.length<=90000)return src;
    return '';
  }
  function updatePreview(id,raw){
    if(requestedId()!==id || !overlay || !raw || raw.active===false || typeof raw.title!=='string')return;
    $('mqb52Name').textContent=raw.title.slice(0,140);
    const description=String(raw.desc??raw.description??'').trim().slice(0,220);
    $('mqb52Description').textContent=description || 'A carefully selected item from MOIN QURAN BOX.';
    const price=Number(raw.salePrice??raw.price);
    $('mqb52Price').textContent=Number.isFinite(price)&&price>0?'₹'+price.toLocaleString('en-IN',{maximumFractionDigits:2}):'';
    $('mqb52Status').textContent='Product found · Preparing shopping options';
    const picture=$('mqb52Picture');const url=validImage(raw.image);
    if(picture && url){
      const im=document.createElement('img'); im.src=url;im.alt=raw.title.slice(0,140);im.decoding='async';
      picture.replaceChildren(im);
    }
  }
  function onTimeout(id){
    if(requestedId()!==id || !overlay || detailsOpen())return;
    $('mqb52Status').textContent='The connection is taking longer than expected';
    $('mqb52Description').textContent='Please check your internet connection and refresh this page. You can also browse our store.';
    $('mqb52Open').textContent='Refresh to try again';
    $('mqb52Open').disabled=false;
    $('mqb52Open').style.cursor='pointer';
    $('mqb52Open').onclick=()=>location.reload();
    $('mqb52Progress').hidden=true;
  }
  function quickRead(id){
    if(startedQuickReadFor===id)return;
    const db=window.mqbLive?.db;
    if(!db?.ref)return;
    startedQuickReadFor=id;
    try{
      // One small, public, read-only catalog request. No writes, order reads or auth changes.
      db.ref('catalog/'+id).once('value').then(snapshot=>{
        if(requestedId()!==id)return;
        const raw=snapshot.val();
        if(raw?.active===false || !raw || typeof raw.title!=='string')return;
        updatePreview(id,raw);
      }).catch(()=>{});
    }catch{}
  }
  function skipGreeting(){
    const g=$('mqb50GreetingOverlay');
    if(g && !g.hidden && requestedId())$('mqb50SkipGreeting')?.click();
  }
  function keepGreetingOutOfWay(){
    skipGreeting();
    const g=$('mqb50GreetingOverlay');
    if(g && !greetingObserver){
      greetingObserver=new MutationObserver(skipGreeting);
      greetingObserver.observe(g,{attributes:true,attributeFilter:['hidden']});
    }
  }
  function announceLoading(id){
    if(!id)return;
    if(pendingRequestedId===id && overlay)return;
    pendingRequestedId=id;
    ensureOverlay();
    $('mqb52Name').textContent='Preparing your product details';
    $('mqb52Price').textContent='';
    $('mqb52Description').textContent='Fetching the latest product information for a safe checkout.';
    $('mqb52Status').textContent='Opening your product…';
    $('mqb52Open').textContent='Loading secure product page…';
    $('mqb52Open').disabled=true;
    $('mqb52Open').onclick=null;
    $('mqb52Open').style.cursor='default';
    $('mqb52Progress').hidden=false;
    clearTimeout(overlayTimeout);
    overlayTimeout=setTimeout(()=>onTimeout(id),TIMEOUT_MS);
    keepGreetingOutOfWay();
  }
  function detailButton(id){
    const root=$('productDetailsContent');if(!root||!safeId(id))return;
    let button=$('mqb48DetailShare');
    if(!button){button=document.createElement('button');button.id='mqb48DetailShare';button.type='button';button.className='mqb48-share-button';button.textContent='↗ Share this product';root.prepend(button);}
    button.onclick=()=>share(id);
  }
  function patchDetails(){
    if(typeof window.openProductDetails!=='function'||window.openProductDetails.__mqb52)return false;
    const original=window.openProductDetails;
    function wrapped(id,...args){
      const result=original.call(this,id,...args);
      if(safeId(id)&&productById(String(id))){
        lastOpened=String(id);detailButton(String(id));setUrl(String(id));
        if(detailsOpen()){detailReadyFor=String(id);stopOverlay();}
      }
      return result;
    }
    wrapped.__mqb52=true; wrapped.__mqb48=true; window.openProductDetails=wrapped;
    if(typeof window.closeProductDetails==='function' && !window.closeProductDetails.__mqb52){
      const close=window.closeProductDetails;
      const newClose=function(...args){const result=close.apply(this,args);clearUrl();lastOpened=null;detailReadyFor='';stopOverlay();return result;};
      newClose.__mqb52=true;window.closeProductDetails=newClose;
    }
    return true;
  }
  function addCardLinks(){
    const grid=$('productGrid');if(!grid)return;
    for(const card of grid.children){
      if(card.querySelector('.mqb48-card-share'))continue;
      const button=[...card.querySelectorAll('button')].find(b=>String(b.getAttribute('onclick')||'').includes('openProductDetails'));
      const id=button?.getAttribute('onclick')?.match(/openProductDetails\(['"]([A-Za-z0-9_-]+)['"]\)/)?.[1];
      if(!safeId(id)||!productById(id))continue;
      const action=document.createElement('button');action.type='button';action.className='mqb48-card-share';action.textContent='↗ Share Product';action.title='Share direct product link';
      action.addEventListener('click',e=>{e.stopPropagation();share(id);});
      (card.querySelector('.p-3')||card).append(action);
    }
  }
  async function share(id){
    id=safeId(id);const p=productById(id);if(!p)return notice('Product is unavailable.');
    const url=makeUrl(id);if(!url)return;
    if(navigator.share){
      try{await navigator.share({title:String(p.title),text:'MOIN QURAN BOX — '+p.title,url});return;}
      catch(error){if(error?.name==='AbortError')return;}
    }
    try{await navigator.clipboard.writeText(url);notice('Product link copied — ready for Instagram and WhatsApp.');}
    catch{window.prompt('Copy your product link:',url);}
  }
  function resolve(){
    const id=requestedId();
    if(!id){if(overlay)stopOverlay();return;}
    if(detailsOpen() && lastOpened===id){stopOverlay();return;}
    const p=productById(id);
    if(p && window.mqbLive?.catalogPublished && typeof window.openProductDetails==='function'){
      patchDetails();
      if(!detailsOpen() || lastOpened!==id){
        window.openProductDetails(id);
      }
      if(detailsOpen()){detailReadyFor=id;stopOverlay();}
      return;
    }
    announceLoading(id);
    quickRead(id);
    if(window.mqbLive?.catalogPublished && !p){
      $('mqb52Status').textContent='Product not available';
      $('mqb52Name').textContent='This product is currently unavailable';
      $('mqb52Description').textContent='You can browse our latest collection for other products.';
      $('mqb52Price').textContent='';
      $('mqb52Open').textContent='Browse the store using the button above';
      $('mqb52Progress').hidden=true;
      if(overlayTimeout)clearTimeout(overlayTimeout);
    }
  }
  function init(){
    patchDetails();addCardLinks();resolve();
    const grid=$('productGrid');
    if(grid){
      let pending=false;
      gridObserver=new MutationObserver(()=>{
        if(pending)return;pending=true;
        queueMicrotask(()=>{pending=false;patchDetails();addCardLinks();resolve();});
      });
      gridObserver.observe(grid,{childList:true});
    }
    const start=Date.now();
    poll=setInterval(()=>{
      patchDetails();
      // Product/catalog may arrive after Firebase SDK and authentication initialize.
      if(requestedId())resolve();
      // Keep checking for late-loaded product details function, then stop polling.
      if((!requestedId() && Date.now()-start>6000) || Date.now()-start>45000 || (detailReadyFor && detailsOpen())){clearInterval(poll);poll=null;}
    },180);
    window.addEventListener('hashchange',()=>{startedQuickReadFor='';lastOpened=null;resolve();});
    window.addEventListener('popstate',()=>{startedQuickReadFor='';lastOpened=null;resolve();});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
  window.MQB48ProductLinks=Object.freeze({urlFor:makeUrl,share});
})();
