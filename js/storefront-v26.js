/* MOIN QURAN BOX V26: branded editorial collections built only from the store's real catalog. */
(() => {
  'use strict';
  const byId = id => document.getElementById(id);
  const money = amount => '₹' + Number(amount||0).toLocaleString('en-IN', {maximumFractionDigits:2});
  const dictionary = {
    en: { collections:'Explore collections', goods:'Browse by what you are looking for', all:'View all products', picks:'Featured from our store', pickSub:'A selection from our current catalog', browse:'See the full collection', details:'View product details', trust1:'Shop with guidance', trust1s:'Product information before you order', trust2:'Guest order requests',trust2s:'No account or password needed',trust3:'Nationwide enquiries',trust3s:'Delivery quotation confirmed by PIN code',trust4:'Order support',trust4s:'Talk directly with our store', notice:'How payment works',noticeText:'Choose Cash on Delivery or Manual UPI at checkout. We confirm products, shipping and the final total before you pay. Card, net banking and wallet payments are not active yet.' },
    hi: {collections:'हमारी श्रेणियाँ',goods:'अपनी पसंद का सामान देखें',all:'सभी सामान देखें',picks:'हमारे स्टोर से चुनिंदा सामान',pickSub:'हमारे उपलब्ध संग्रह से',browse:'पूरा संग्रह देखें',details:'उत्पाद की जानकारी',trust1:'खरीदारी में मदद',trust1s:'ऑर्डर से पहले सामान की जानकारी',trust2:'बिना अकाउंट ऑर्डर',trust2s:'अकाउंट या पासवर्ड ज़रूरी नहीं',trust3:'पूरे भारत में डिलीवरी',trust3s:'पिन कोड के अनुसार शुल्क की पुष्टि',trust4:'ऑर्डर सहायता',trust4s:'सीधे दुकान से बात करें',notice:'भुगतान कैसे होगा',noticeText:'चेकआउट पर COD या मैनुअल UPI चुनें। हम भुगतान से पहले सामान, डिलीवरी और अंतिम राशि की पुष्टि करेंगे। कार्ड, नेट बैंकिंग और वॉलेट अभी उपलब्ध नहीं हैं।'},
    te: {collections:'మా విభాగాలు',goods:'మీకు కావలసిన వస్తువులు చూడండి',all:'అన్ని వస్తువులు',picks:'మా స్టోర్ ప్రత్యేక ఎంపికలు',pickSub:'ప్రస్తుతం మా కలెక్షన్ నుండి',browse:'పూర్తి కలెక్షన్ చూడండి',details:'వస్తువు వివరాలు',trust1:'కొనుగోలు సహాయం',trust1s:'ఆర్డర్ ముందు వస్తువు వివరాలు',trust2:'అకౌంట్ లేకుండా ఆర్డర్',trust2s:'పాస్‌వర్డ్ అవసరం లేదు',trust3:'భారతదేశం అంతటా',trust3s:'పిన్ కోడ్‌ను బట్టి చార్జీ నిర్ధారణ',trust4:'ఆర్డర్ సహాయం',trust4s:'నేరుగా మా షాపుతో మాట్లాడండి',notice:'చెల్లింపు విధానం',noticeText:'చెకౌట్‌లో COD లేదా మాన్యువల్ UPI ఎంచుకోండి. చెల్లింపుకు ముందు వస్తువులు, డెలివరీ చార్జీలు, మొత్తం నిర్ధారిస్తాము. కార్డు, నెట్ బ్యాంకింగ్, వాలెట్లు ఇంకా అందుబాటులో లేవు.'},
    roman: {collections:'Hamari Collections',goods:'Apni pasand ka saman dekhein',all:'Saare products dekhein',picks:'Hamare store se khaas items',pickSub:'Hamare maujooda catalog se',browse:'Poori collection dekhein',details:'Product ki tafseel',trust1:'Shopping mein madad',trust1s:'Order se pehle poori maloomat',trust2:'Bina account order',trust2s:'Password ki zaroorat nahin',trust3:'Poore India mein delivery',trust3s:'PIN ke mutabiq charges confirm honge',trust4:'Order mein madad',trust4s:'Seedha dukaan se baat karein',notice:'Payment ka tareeqa',noticeText:'Checkout mein COD ya Manual UPI chunein. Payment se pehle hum products, delivery aur final amount confirm karenge. Cards, net banking aur wallets abhi available nahin.'}
  };
  const shoppingText = {
    en:{find:'Find products',search:'Search Quran, prayer mats, gift boxes…',clear:'Clear',bag:'Bag',checkout:'Checkout',add:'Add to bag',out:'Out of stock',results:'matching products',nothing:'No matching products. Try another keyword.',browseAll:'Browse all'},
    hi:{find:'सामान खोजें',search:'कुरान, जानमाज़, गिफ्ट बॉक्स खोजें…',clear:'हटाएँ',bag:'बैग',checkout:'चेकआउट',add:'बैग में डालें',out:'उपलब्ध नहीं',results:'सामान मिले',nothing:'कोई सामान नहीं मिला। दूसरा शब्द आज़माएँ।',browseAll:'सभी देखें'},
    te:{find:'వస్తువులు వెతకండి',search:'ఖురాన్, నమాజ్ మ్యాట్, గిఫ్ట్ బాక్స్…',clear:'తొలగించు',bag:'బ్యాగ్',checkout:'చెకౌట్',add:'బ్యాగ్‌లో పెట్టండి',out:'స్టాక్ లేదు',results:'వస్తువులు దొరికాయి',nothing:'వస్తువులు దొరకలేదు. మరో పదం ప్రయత్నించండి.',browseAll:'అన్నీ చూడండి'},
    roman:{find:'Saman dhoondein',search:'Quran, janamaz, gift box dhoondein…',clear:'Saaf',bag:'Bag',checkout:'Checkout',add:'Bag mein daalein',out:'Stock nahin',results:'products mile',nothing:'Koi product nahin mila. Doosra lafz likhein.',browseAll:'Sab dekhein'}
  };
  const icon = category => /quran|tarjuma|book/i.test(category) ? '📖' : /kid|learn|qaida/i.test(category) ? '✏️' : /hajj|umrah/i.test(category) ? '🕋' : /janamaz|prayer/i.test(category) ? '🕌' : /box|gift|rehal/i.test(category) ? '🎁' : /tasbih|cap/i.test(category) ? '📿' : '✦';
  const productsList=()=> {
    if(!window.mqbLive?.catalogPublished)return []; // Never present demo JSON as live inventory.
    return (typeof products !== 'undefined' && Array.isArray(products) ? products : []).filter(p=>p && p.id && p.title && Number(p.salePrice)>0);
  };
  const str = (tag,cls,txt) => { const el=document.createElement(tag); if(cls)el.className=cls; if(txt!==undefined)el.textContent=String(txt); return el; };
  const currentLang=()=> { try{return window.MQBLang?.get?.()||localStorage.getItem('mqb_customer_language')||'en';}catch{return 'en';}};
  function labels(){const lang=currentLang();return {...dictionary.en,...(dictionary[lang]||{}),...(shoppingText[lang]||shoppingText.en)};}
  function openCategory(category) {
    const input=byId('mqbV28Search');if(input && input.value.trim()){input.value='';applySearch();}
    if (typeof filterCategory==='function') filterCategory(category);
    const anchor=byId('catalogTopAnchor'); if(anchor)anchor.scrollIntoView({behavior:'smooth',block:'start'});
  }
  function buildLayout(){
    const services=byId('welcomeGreetingBanner')?.parentElement;
    const main=document.querySelector('main');
    const catalogAnchor=byId('catalogTopAnchor');
    if(!main||!catalogAnchor)return;
    if(!byId('mqbV26Highlights')){
      const block=str('div','',undefined);block.id='mqbV26Highlights';
      block.innerHTML='<section id="mqbV28ShopBar" class="mqb28-shopbar" aria-label="Quick shopping tools"><div class="mqb28-searcharea"><label id="mqbV28SearchLabel" for="mqbV28Search" class="mqb28-label"></label><div class="mqb28-inputrow"><span aria-hidden="true">⌕</span><input type="search" id="mqbV28Search" autocomplete="off" enterkeyhint="search" aria-describedby="mqbV28Results"><button type="button" id="mqbV28Clear" class="mqb28-clear" hidden></button></div><p id="mqbV28Results" class="mqb28-searchresults" aria-live="polite"></p></div><div class="mqb28-shopactions"><button type="button" id="mqbV28Bag" class="mqb28-bagbtn"></button><button type="button" id="mqbV28Checkout" class="mqb28-checkoutbtn" disabled></button></div></section><section class="mqb26-featured" aria-label="Featured products"><div class="mqb26-intro"><div><div class="mqb26-eyebrow">OUR COLLECTION</div><h2 id="mqbV26FeaturedTitle" class="mqb26-title"></h2><p class="mqb26-subtitle" id="mqbV26FeaturedSub"></p></div><button type="button" id="mqbV26Explore" class="mqb26-textlink"></button></div><div id="mqbV26Products" class="mqb26-featuredgrid"></div></section><div id="mqbV26PaymentNotice" class="mqb26-notice"></div>';
      main.insertBefore(block,catalogAnchor);
      byId('mqbV28Search')?.addEventListener('input',applySearch);
      byId('mqbV28Search')?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();byId('catalogTopAnchor')?.scrollIntoView({behavior:'smooth',block:'start'});}});
      byId('mqbV28Clear')?.addEventListener('click',()=>{byId('mqbV28Search').value='';applySearch();byId('mqbV28Search')?.focus();});
      byId('mqbV28Bag')?.addEventListener('click',()=>{if(typeof window.toggleCart==='function')window.toggleCart(true);});
      byId('mqbV28Checkout')?.addEventListener('click',()=>{if(cartQuantity()>0&&typeof window.startCheckout==='function')window.startCheckout();});
      byId('mqbV26ShopAll')?.addEventListener('click',()=>openCategory('All'));
      byId('mqbV26Explore')?.addEventListener('click',()=>openCategory('All'));
    }
  }
  const cartQuantity = () => {
    try{return (typeof cart!=='undefined'&&Array.isArray(cart)?cart:[]).reduce((n,p)=>n+Math.max(0,Number(p.qty)||0),0);}catch{return 0;}
  };
  function updateBag(){
    const qty=cartQuantity();const t=labels();
    const bag=byId('mqbV28Bag');if(bag)bag.textContent='🛍 '+t.bag+' ('+qty+')';
    const checkout=byId('mqbV28Checkout');if(checkout){checkout.textContent=t.checkout+' →';checkout.disabled=qty===0;}
  }
  function applySearch(){
    const inp=byId('mqbV28Search'),grid=byId('productGrid'),info=byId('mqbV28Results');if(!grid||!inp)return;
    const term=inp.value.trim().toLocaleLowerCase();let count=0;
    for(const card of Array.from(grid.children)){
      const matching=!term||card.textContent.toLocaleLowerCase().includes(term);
      card.hidden=!matching;if(matching)count++;
    }
    const clear=byId('mqbV28Clear');if(clear)clear.hidden=!term;
    if(info)info.textContent=term?(count?count+' '+labels().results:labels().nothing):'';
  }
  const oldPrice = p => (Number(p.oldPrice)>Number(p.salePrice)?Number(p.oldPrice):null);
  function paint(){
    buildLayout();
    const t=labels();
    const entries=productsList();
    const set=(id,value)=>{const e=byId(id);if(e)e.textContent=value;};
    set('mqbV26FeaturedTitle',t.picks);set('mqbV26FeaturedSub',t.pickSub);set('mqbV26Explore',t.browse+' ↗');
    set('mqbV28SearchLabel',t.find);
    const input=byId('mqbV28Search');if(input)input.placeholder=t.search;
    set('mqbV28Clear',t.clear);updateBag();
    const featured=byId('mqbV26Products');
    if(featured){featured.replaceChildren();entries.filter(p=>Number(p.stock)>0).slice(0,4).forEach(p=>{
      const card=str('article','mqb26-product');const photo=str('button','mqb26-prodimage');photo.type='button';photo.setAttribute('aria-label','View '+p.title);
      try{const url=new URL(p.image);if(url.protocol==='https:'){const img=document.createElement('img');img.src=url.href;img.alt=p.title;img.loading='lazy';photo.appendChild(img);}}catch{}
      photo.addEventListener('click',()=>window.openProductDetails?.(p.id));
      const body=str('div','mqb26-productbody');body.appendChild(str('div','mqb26-prodcat',p.category||'Collection'));
      const name=str('button','mqb26-prodname',p.title);name.type='button';name.addEventListener('click',()=>window.openProductDetails?.(p.id));body.appendChild(name);
      const pr=str('div','mqb26-prodprice',money(p.salePrice));if(oldPrice(p))pr.appendChild(str('span','mqb26-prodold',money(oldPrice(p))));body.appendChild(pr);
      const actions=str('div','mqb28-feature-actions');
      const detail=str('button','mqb26-prodaction',t.details+' →');detail.type='button';detail.addEventListener('click',()=>window.openProductDetails?.(p.id));
      const add=str('button','mqb28-addbtn',t.add+' +');add.type='button';add.addEventListener('click',()=>{window.addToCart?.(p.id);queueMicrotask(updateBag);});
      actions.append(detail,add);body.appendChild(actions);
      card.append(photo,body);featured.appendChild(card);
    });}
    const notice=byId('mqbV26PaymentNotice');if(notice){notice.replaceChildren(str('strong','',t.notice+' · '),document.createTextNode(t.noticeText));}
    const whole=byId('mqbV26Highlights');if(whole)whole.hidden=entries.length===0;
    applySearch();
  }
  function init(){
    buildLayout();paint();
    // Re-render only when the existing authenticated storefront redraws from Firebase.
    if(typeof window.renderProducts==='function'){
      const old=window.renderProducts;
      window.renderProducts=function(){const result=old.apply(this,arguments);paint();return result;};
    }
    byId('mqbLanguageSelect')?.addEventListener('change',()=>queueMicrotask(paint));
    const badge=byId('cartCountBadge');if(badge&&typeof MutationObserver!=='undefined')new MutationObserver(updateBag).observe(badge,{childList:true,characterData:true,subtree:true});
    updateBag();
    // Do not write or import ANY product or settings data; visual presentation only.
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
