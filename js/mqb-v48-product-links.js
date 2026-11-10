/* V48 — stable per-product share links for GitHub Pages; no Firebase writes. */
(()=>{
  'use strict';
  const PRODUCT=/^[A-Za-z0-9_-]{1,120}$/;
  const prefix='#product=';
  let lastOpened=null;
  const productList=()=>typeof products!=='undefined'&&Array.isArray(products)?products:[];
  const productById=id=>productList().find(p=>p.id===id)||null;
  const urlFor=id=>PRODUCT.test(id)?location.origin+location.pathname+prefix+encodeURIComponent(id):'';
  const hashId=()=>{try{if(!location.hash.startsWith(prefix))return '';const id=decodeURIComponent(location.hash.slice(prefix.length));return PRODUCT.test(id)?id:'';}catch{return '';}};
  const isOpen=()=>!document.getElementById('productDetailsModal')?.classList.contains('hidden');
  const notify=msg=>{let n=document.getElementById('mqb48ShareNotice');if(!n){n=document.createElement('div');n.id='mqb48ShareNotice';n.setAttribute('role','status');n.className='mqb48-share-notice';document.body.append(n);}n.textContent=msg;n.hidden=false;setTimeout(()=>n.hidden=true,3400);};
  async function share(id){const p=productById(id);if(!p)return notify('Product is unavailable.');const url=urlFor(id);if(!url)return;
    if(navigator.share){try{await navigator.share({title:p.title,text:'MOIN QURAN BOX — '+p.title,url});return;}catch(e){if(e.name==='AbortError')return;}}
    try{await navigator.clipboard.writeText(url);notify('Product link copied — share it anywhere.');}catch{window.prompt('Copy this product link:',url);}
  }
  function detailButton(id){const c=document.getElementById('productDetailsContent');if(!c||!PRODUCT.test(id))return;
    let b=document.getElementById('mqb48DetailShare');if(!b){b=document.createElement('button');b.id='mqb48DetailShare';b.type='button';b.className='mqb48-share-button';b.textContent='↗ Share this product';c.prepend(b);}b.onclick=()=>share(id);
  }
  function patchDetails(){if(typeof window.openProductDetails!=='function'||window.openProductDetails.__mqb48)return false;
    const orig=window.openProductDetails;
    const wrapped=function(id,...args){const result=orig.call(this,id,...args);if(PRODUCT.test(String(id||''))&&productById(id)){
      lastOpened=id;detailButton(id);if(!location.hash.startsWith(prefix)||hashId()!==id) history.replaceState(history.state,'',location.pathname+location.search+prefix+encodeURIComponent(id));
    }return result;};wrapped.__mqb48=true;window.openProductDetails=wrapped;
    if(typeof window.closeProductDetails==='function'){
      const close=window.closeProductDetails;window.closeProductDetails=function(...args){const result=close.apply(this,args);if(location.hash.startsWith(prefix))history.replaceState(history.state,'',location.pathname+location.search);lastOpened=null;return result;};
    }return true;
  }
  function addCardLinks(){const grid=document.getElementById('productGrid');if(!grid)return;
    for(const card of grid.children){if(card.querySelector('.mqb48-card-share'))continue;
      const button=[...card.querySelectorAll('button')].find(b=>b.getAttribute('onclick')?.includes('openProductDetails'));
      const id=button?.getAttribute('onclick')?.match(/openProductDetails\('([A-Za-z0-9_-]+)'\)/)?.[1];
      if(!PRODUCT.test(id||'')||!productById(id))continue;
      const action=document.createElement('button');action.type='button';action.className='mqb48-card-share';action.textContent='↗ Share Product';action.title='Copy/share direct link for this product';
      action.addEventListener('click',e=>{e.stopPropagation();share(id);});(card.querySelector('.p-3')||card).append(action);
    }
  }
  let deepLinked=false, attempts=0;
  function resolveDeepLink(){const id=hashId();if(!id)return;const p=productById(id);
    if(p&&window.mqbLive?.catalogPublished&&typeof window.openProductDetails==='function'){
      patchDetails();if(!isOpen()||lastOpened!==id)window.openProductDetails(id);deepLinked=true;
    }else if(window.mqbLive?.catalogPublished&&!p){if(!deepLinked){deepLinked=true;notify('This product is currently unavailable. Browse our latest catalog.');}}
  }
  document.addEventListener('DOMContentLoaded',()=>{
    patchDetails();addCardLinks();resolveDeepLink();
    const grid=document.getElementById('productGrid');if(grid){let busy=false;new MutationObserver(()=>{if(busy)return;busy=true;queueMicrotask(()=>{addCardLinks();resolveDeepLink();busy=false;});}).observe(grid,{childList:true});}
    const timer=setInterval(()=>{patchDetails();addCardLinks();resolveDeepLink();if(++attempts>=90||deepLinked)clearInterval(timer);},500);
    window.addEventListener('hashchange',()=>{deepLinked=false;resolveDeepLink();});
  });
  window.MQB48ProductLinks=Object.freeze({urlFor,share});
})();
