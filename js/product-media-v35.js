/* MOIN QURAN BOX V35 — progressive product-media enhancement.
 * Reads only the existing catalog; no order/payment/role writes. Product changes
 * go through the original, authorized product editor and V34 Firebase rules.
 */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const motion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const reduced = () => !!motion?.matches;
  const productList = () => { try { return Array.isArray(products) ? products : []; } catch { return []; } };
  const getProduct = id => productList().find(p=>p.id===String(id));
  const node = (tag,cls,text) => { const e=document.createElement(tag); if(cls)e.className=cls;if(text!==undefined)e.textContent=String(text);return e;};
  function safeUrl(raw, gifOnly=false) {
    if(typeof raw!=='string'||!raw.trim()||raw.length>1200)return '';
    try { const url=new URL(raw);if(url.protocol!=='https:')return '';
      if(gifOnly && !/\.gif$/i.test(url.pathname))return '';
      return url.href;
    }catch{return '';}
  }
  function galleryMedia(p) {
    const out=[];const seen=new Set();
    for(const [s,label] of [[p?.image,'Front view'],[p?.image2,'Second view'],[p?.gifUrl,'Animated GIF']]) {
      const url=safeUrl(s,label==='Animated GIF');
      if(url&&!seen.has(url)){seen.add(url);out.push({url,label,gif:label==='Animated GIF'});}
    }
    return out;
  }
  function gallery({product, media, variant='details'}) {
    const wrap=node('section','mqb35-gallery mqb35-gallery-'+variant);
    wrap.dataset.mqb35Gallery='';wrap.dataset.index='0';
    wrap.setAttribute('aria-label',`${product.title} product media`);
    const stage=node('div','mqb35-gallery-stage');
    const img=node('img','mqb35-gallery-image');img.src=media[0].url;img.alt=product.title+' — '+media[0].label;
    img.loading=variant==='details'?'eager':'lazy';img.decoding='async';
    img.onerror=()=>{ const first=safeUrl(product.image);if(first&&img.src!==first)img.src=first;else img.style.opacity='.25';};
    stage.append(img);
    const caption=node('span','mqb35-gallery-caption',media[0].label);
    stage.append(caption);
    const controls=node('div','mqb35-gallery-controls');
    const prev=node('button','mqb35-gallery-arrow','‹');prev.type='button';prev.setAttribute('aria-label','Previous product view');
    const next=node('button','mqb35-gallery-arrow','›');next.type='button';next.setAttribute('aria-label','Next product view');
    const dots=node('div','mqb35-gallery-dots');
    const select=i=>{
      if(!media.length)return;
      const n=(i+media.length)%media.length;wrap.dataset.index=String(n);
      img.style.opacity='.35';img.src=media[n].url;img.alt=product.title+' — '+media[n].label;
      caption.textContent=media[n].label;
      [...dots.children].forEach((b,j)=>b.setAttribute('aria-current',String(n===j)));
      requestAnimationFrame(()=>{img.style.opacity='1';});
    };
    media.forEach((m,i)=>{const d=node('button','mqb35-gallery-dot');d.type='button';d.setAttribute('aria-label','Show '+m.label);d.setAttribute('aria-current',String(i===0));d.addEventListener('click',()=>select(i));dots.append(d);});
    prev.addEventListener('click',()=>select(Number(wrap.dataset.index)-1));
    next.addEventListener('click',()=>select(Number(wrap.dataset.index)+1));
    if(media.length>1){controls.append(prev,dots,next);wrap.append(stage,controls);}else wrap.append(stage);
    let down=null;
    stage.addEventListener('touchstart',e=>{if(e.touches.length===1)down={x:e.touches[0].clientX,y:e.touches[0].clientY};},{passive:true});
    stage.addEventListener('touchend',e=>{
      if(!down||e.changedTouches.length!==1)return;
      const dx=e.changedTouches[0].clientX-down.x,dy=e.changedTouches[0].clientY-down.y;down=null;
      if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.35)select(Number(wrap.dataset.index)+(dx<0?1:-1));
    },{passive:true});
    wrap.mqb35Next=()=>select(Number(wrap.dataset.index)+1);
    return wrap;
  }
  // Product-detail modal still uses the original app's description, reviews,
  // price, cart and buttons. Only its main photo is enhanced.
  let detailId='';
  function ensureProductDetails() {
    const content=$('productDetailsContent');const modal=$('productDetailsModal');
    if(!detailId||!content||!modal||modal.classList.contains('hidden'))return;
    const product=getProduct(detailId),media=galleryMedia(product);
    if(!product||media.length<=1||content.querySelector('[data-mqb35-gallery]'))return;
    const display=gallery({product,media});
    const original=[...content.querySelectorAll('img')].find(i=>safeUrl(i.getAttribute('src'))===safeUrl(product.image));
    if(original){original.replaceWith(display);}else content.prepend(display);
  }
  const editorIds=['editProductImage2','editProductGifUrl'];
  function populateEditor(){
    const edit=$('productEditModal');if(!edit||edit.classList.contains('hidden'))return;
    const p=getProduct($('editProductId')?.value);
    for(const key of editorIds){const field=$(key);if(field)field.value=p?.[({editProductImage2:'image2',editProductGifUrl:'gifUrl'}[key])]||'';}
    $('mqb35EditorMediaPreview')?.replaceChildren();
  }
  function previewEditor() {
    const el=$('mqb35EditorMediaPreview');if(!el)return;
    const p={title:$('editProductTitle')?.value.trim()||'Product',image:$('editProductImage')?.value,
      image2:$('editProductImage2')?.value,gifUrl:$('editProductGifUrl')?.value};
    const all=galleryMedia(p);el.replaceChildren();
    if(!all.length){el.append(node('p','','Add valid HTTPS media links to preview.'));return;}
    const stage=gallery({product:p,media:all,variant:'editor'});el.append(stage);
  }
  // A single timer drives visible product image galleries.
  const cardState=new Map();
  const observer=typeof IntersectionObserver!=='undefined'?new IntersectionObserver(entries=>{
    entries.forEach(e=>{const state=cardState.get(e.target);if(state)state.visible=e.isIntersecting;});
  },{rootMargin:'70px'}):null;
  function visibleProductsForGrid(){
    const all=productList();const cat=(()=>{try{return currentCategory;}catch{return 'All';}})();
    let list=cat==='All'?all.slice():all.filter(p=>p.category===cat);
    if($('filterInStockOnly')?.checked)list=list.filter(p=>p.stock>0);
    const sort=$('filterSortOrder')?.value||'featured';
    if(sort==='low-to-high')list.sort((a,b)=>a.salePrice-b.salePrice);
    if(sort==='high-to-low')list.sort((a,b)=>b.salePrice-a.salePrice);
    return list;
  }
  function trackCard(card,p){
    if(!card||!p)return;
    const media=galleryMedia(p);if(media.length<2)return;
    const img=card.querySelector('.mqb26-prodimage img')||card.querySelector('img');
    if(!img)return;
    img.dataset.mqb35ProductId=p.id;
    const badge=node('span','mqb35-card-count','1 / '+media.length);
    let host=img.closest('button')||img.parentElement;
    if(host&&!host.querySelector('.mqb35-card-count')){host.classList.add('mqb35-image-host');host.append(badge);}
    else if(host)host.querySelector('.mqb35-card-count').textContent='1 / '+media.length;
    cardState.set(card,{img,media,index:0,visible:!observer,host,p,failed:new Set()});
    observer?.observe(card);
  }
  function refreshCards(){
    for(const card of cardState.keys())observer?.unobserve(card);
    cardState.clear();
    const entries=visibleProductsForGrid();
    [...($('productGrid')?.children||[])].forEach((card,i)=>trackCard(card,entries[i]));
    const featured=productList().filter(p=>Number(p.stock)>0).slice(0,4);
    [...($('mqbV26Products')?.querySelectorAll('.mqb26-product')||[])].forEach((card,i)=>trackCard(card,featured[i]));
  }
  function tick(){
    if(document.hidden||reduced())return;
    const modal=$('productDetailsModal');
    if(modal&&!modal.classList.contains('hidden')){
      const g=modal.querySelector('[data-mqb35-gallery]');
      if(g&&!g.matches(':hover')&&!g.contains(document.activeElement))g.mqb35Next?.();
    }
    for(const [card,state] of cardState){
      if(!card.isConnected){observer?.unobserve(card);cardState.delete(card);continue;}
      if(!state.visible||card.matches(':hover')||card.contains(document.activeElement)||card.hidden)continue;
      const options=state.media.filter(m=>!state.failed.has(m.url));if(options.length<2)continue;
      state.index=(state.index+1)%options.length;
      const next=options[state.index];
      state.img.src=next.url;state.img.alt=state.p.title+' — '+next.label;
      const badge=state.host?.querySelector('.mqb35-card-count');if(badge)badge.textContent=(state.index+1)+' / '+options.length;
      state.img.onerror=()=>{state.failed.add(next.url);state.img.src=options[0].url;};
    }
  }
  function wire(){
    const prevDetails=window.openProductDetails;
    if(typeof prevDetails==='function')window.openProductDetails=function(id){detailId=String(id||'');const result=prevDetails.apply(this,arguments);ensureProductDetails();setTimeout(ensureProductDetails,120);return result;};
    const prevOpen=window.openProductEditModal;
    if(typeof prevOpen==='function')window.openProductEditModal=function(){const result=prevOpen.apply(this,arguments);setTimeout(populateEditor,0);return result;};
    $('mqb35PreviewMediaButton')?.addEventListener('click',previewEditor);
    const baseRender=window.renderProducts;
    if(typeof baseRender==='function')window.renderProducts=function(){const result=baseRender.apply(this,arguments);refreshCards();return result;};
    refreshCards();
    setInterval(tick,4600);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wire);else wire();
})();
