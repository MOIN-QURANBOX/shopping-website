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
    if(typeof raw!=='string'||!raw.trim())return '';
    if(!gifOnly && raw.length<=70000 && /^data:image\/(?:jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(raw))return raw;
    if(raw.length>1200)return '';
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
    for(const key of editorIds){const field=$(key);if(field){const val=p?.[({editProductImage2:'image2',editProductGifUrl:'gifUrl'}[key])]||'';field.value=val.startsWith('data:')?'':val;}}
    $('mqb35EditorMediaPreview')?.replaceChildren();
  }
  function previewEditor() {
    const el=$('mqb35EditorMediaPreview');if(!el)return;
    const p={title:$('editProductTitle')?.value.trim()||'Product',
      image:window.MQBLocalProductMedia?.resolve('image',$('editProductImage')?.value||'',getProduct($('editProductId')?.value)?.image),
      image2:window.MQBLocalProductMedia?.resolve('image2',$('editProductImage2')?.value||'',getProduct($('editProductId')?.value)?.image2),
      gifUrl:$('editProductGifUrl')?.value};
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
    if(typeof prevOpen==='function')window.openProductEditModal=function(){const result=prevOpen.apply(this,arguments);setTimeout(()=>{populateEditor();window.MQBLocalProductMedia?.reset();},0);return result;};
    $('mqb35PreviewMediaButton')?.addEventListener('click',previewEditor);
    const baseRender=window.renderProducts;
    if(typeof baseRender==='function')window.renderProducts=function(){const result=baseRender.apply(this,arguments);refreshCards();return result;};
    refreshCards();
    setInterval(tick,4600);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wire);else wire();
})();

/* V35.3 — compact, local product-photo uploads backed by Realtime Database.
 * No Firebase Storage, external upload API, or credential access is involved.
 * Image data are saved only through the existing authorized product editor.
 */
(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const maxChars=69000;       // each stored JPEG < 70 KB as a data URL
  const maxFileBytes=10*1024*1024;
  const current={image:null,image2:null};
  const cleared={image:false,image2:false};
  const versions={image:0,image2:0};
  const busy={image:0,image2:0};
  const isInline=v=>typeof v==='string' && v.length<=70000 && /^data:image\/(?:jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(v);
  const ids={image:{input:'mqb353MainImageFile',url:'editProductImage',status:'mqb353MainStatus',img:'photoUploadPreview',clear:'mqb353ClearMain'},image2:{input:'mqb353SecondImageFile',url:'editProductImage2',status:'mqb353SecondStatus',img:'mqb353SecondPreview',clear:'mqb353ClearSecond'}};
  const title={image:'Main product photo',image2:'Second product photo'};
  function status(slot,message,error=false){const e=$(ids[slot].status);if(e){e.textContent=message;e.classList.toggle('mqb353-error',error);}}
  function preview(slot,src){const e=$(ids[slot].img);if(!e)return;e.src=src||'';e.classList.toggle('hidden',!src);}
  function updateSave(){const button=$('productEditModal')?.querySelector('button[type="submit"]');if(button){const isBusy=!!(busy.image||busy.image2);button.disabled=isBusy;button.textContent=isBusy?'Compressing product photo…':'Save Product';}}
  function existing(slot){const id=$('editProductId')?.value;try{const p=Array.isArray(products)?products.find(p=>p.id===id):null;return p?.[slot]||'';}catch{return '';}}
  function reset(){
    for(const slot of Object.keys(ids)){
      versions[slot]++;current[slot]=null;cleared[slot]=false;
      const input=$(ids[slot].input);if(input)input.value='';
      const url=$(ids[slot].url),old=existing(slot);
      if(url && isInline(url.value))url.value='';
      if(url && isInline(old))url.value='';
      preview(slot,old);
      status(slot,old?'Existing photo retained. Choose another photo to replace it.':'Select a photo from your computer, or paste an HTTPS link.');
    }
    // In-flight conversions have no effect on the next product editor session.
    busy.image=0;busy.image2=0;updateSave();
  }
  function resolve(slot,typed,old){
    if(!ids[slot])return typed||'';
    if(cleared[slot])return '';
    if(current[slot])return current[slot];
    const clean=String(typed||'').trim();
    if(clean)return clean;
    return isInline(old)?old:'';
  }
  function createPreview(file){
    return new Promise((resolve,reject)=>{
      const url=URL.createObjectURL(file),image=new Image();
      image.onload=()=>{URL.revokeObjectURL(url);resolve(image);};
      image.onerror=()=>{URL.revokeObjectURL(url);reject(Error('The image cannot be opened. Try another JPG, PNG or WebP file.'));};
      image.src=url;
    });
  }
  async function compress(file){
    if(!file||!['image/jpeg','image/png','image/webp'].includes(file.type))throw Error('Only JPG, PNG and WebP photos are supported. GIF files still require HTTPS links.');
    if(file.size>maxFileBytes)throw Error('Choose a photo smaller than 10 MB.');
    const im=await createPreview(file);
    if(im.naturalWidth*im.naturalHeight>32000000)throw Error('Image resolution is too large. Resize it on your device and try again.');
    const c=document.createElement('canvas');const ctx=c.getContext('2d');
    if(!ctx)throw Error('Photo compression is not supported in this browser.');
    // Decode the original locally; only a compressed JPEG is written to Firebase.
    for(const dimension of [800,700,600,500,420,340]){
      const scale=Math.min(1,dimension/Math.max(im.naturalWidth,im.naturalHeight));
      c.width=Math.max(1,Math.round(im.naturalWidth*scale));c.height=Math.max(1,Math.round(im.naturalHeight*scale));
      ctx.fillStyle='#ffffff';ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(im,0,0,c.width,c.height);
      for(const quality of [.79,.69,.59,.49,.39]){
        const data=c.toDataURL('image/jpeg',quality);
        if(data.length<=maxChars)return data;
      }
    }
    throw Error('This photo is too detailed to store safely on the Spark Free database. Resize/crop it or use an HTTPS image link.');
  }
  async function select(event,slot){
    if(!ids[slot])return;
    const file=event?.target?.files?.[0];if(!file)return;
    const run=++versions[slot];cleared[slot]=false;busy[slot]=run;updateSave();
    status(slot,'Compressing '+title[slot].toLowerCase()+'…');
    try{
      const data=await compress(file);
      if(run!==versions[slot])return;
      current[slot]=data;preview(slot,data);
      const typed=$(ids[slot].url);if(typed)typed.value='';
      status(slot,`${title[slot]} ready — ${Math.round(data.length/1024)} KB stored with the product when you click Save Product.`);
    }catch(e){if(run===versions[slot]){current[slot]=null;status(slot,e.message,true);alert(e.message);}}
    finally{if(busy[slot]===run)busy[slot]=0;updateSave();}
  }
  function clear(slot){
    if(!ids[slot])return;
    ++versions[slot];current[slot]=null;cleared[slot]=true;busy[slot]=0;updateSave();
    const input=$(ids[slot].input),url=$(ids[slot].url);
    if(input)input.value='';if(url)url.value='';
    preview(slot,'');status(slot,`${title[slot]} removed from the draft. Click Save Product to apply.`);
  }
  function listen(){
    for(const slot of Object.keys(ids)){
      $(ids[slot].input)?.addEventListener('change',event=>{if(slot!=='image')select(event,slot);});
      $(ids[slot].clear)?.addEventListener('click',()=>clear(slot));
      $(ids[slot].url)?.addEventListener('input',()=>{
        const url=$(ids[slot].url)?.value?.trim()||'';
        if(url){++versions[slot];busy[slot]=0;updateSave();current[slot]=null;cleared[slot]=false;preview(slot,url);status(slot,'HTTPS image URL selected; click Save Product to apply.');}
      });
    }
  }
  window.MQBLocalProductMedia={select,reset,resolve,previewSource:(slot,raw)=>resolve(slot,raw,existing(slot))};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',listen);else listen();
})();
