/* MOIN QURAN BOX V50 — additive UI ONLY. Never edits orders, payments, catalog, cart or invoices. */
(function () {
  'use strict';
  const GREETING_PATH = 'mqb50GreetingSettings';
  const STOCK_PATH = 'mqb50StockAlerts';
  const SESSION_KEY = 'mqb50_greeted_v1';
  const DEFAULT_DUA = 'May Allah grant you and your family peace, beneficial knowledge, good health, and barakah. May your visit bring khair. Ameen.';
  let greeting = { enabled:true, message:DEFAULT_DUA };
  let stockSettings = {};
  let activeProductId = '';
  let currentRole = 'customer';
  let priorFocus = null;
  let connected = false;
  const el = id => document.getElementById(id);
  const db = () => window.mqbLive?.db || null;
  const auth = () => window.mqbLive?.auth || null;
  const currentProducts = () => { try { return typeof products !== 'undefined' && Array.isArray(products) ? products : []; } catch { return []; } };
  const product = id => currentProducts().find(p=>String(p.id)===String(id));
  function greeted(){ try {return sessionStorage.getItem(SESSION_KEY)==='yes';} catch {return false;} }
  function markGreeted(){ try {sessionStorage.setItem(SESSION_KEY,'yes');} catch {} }
  function greetingVisible(){ return !!el('mqb50GreetingOverlay') && !el('mqb50GreetingOverlay').hidden; }
  function closeGreeting(){ const g=el('mqb50GreetingOverlay'); if(!g)return; g.hidden=true; document.body.classList.remove('mqb50-greeting-open');markGreeted();if(priorFocus?.isConnected)priorFocus.focus();priorFocus=null; }
  function showGreeting(force=false){
    if(!force && (greeting.enabled===false || greeted()))return;
    const g=el('mqb50GreetingOverlay'); if(!g)return;
    const m=el('mqb50GreetingMessage'); if(m)m.textContent=greeting.message||DEFAULT_DUA;
    priorFocus=document.activeElement;g.hidden=false;document.body.classList.add('mqb50-greeting-open');el('mqb50EnterStore')?.focus();
  }
  function note(id,text,good){const n=el(id);if(n){n.textContent=text;n.style.color=good===false?'#a72c27':'#27613b';}}
  function stockNumber(p){ const n=Number(p?.stock); return Number.isFinite(n)?Math.floor(n):NaN; }
  function lowStock(p){
    const stock=stockNumber(p),setting=stockSettings?.[p?.id];
    const threshold=Number(setting?.threshold);
    return setting?.enabled===true && Number.isInteger(stock) && stock>0 && Number.isInteger(threshold) && threshold>=1 && threshold<=50 && stock<=threshold;
  }
  function make(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;}
  function decorateProduct(id){
    const p=product(id),c=el('productDetailsContent'),modal=el('productDetailsModal');
    if(!p||!c||!modal||modal.classList.contains('hidden')||String(activeProductId)!==String(id))return;
    const layout=c.querySelector(':scope > .grid'),info=layout?.children?.[1];if(!info)return;
    // App and product-media-v35 already create the photo gallery and purchase buttons.
    // Decorate without replacing any existing HTML or handlers.
    let highlights=info.querySelector('.mqb50-benefits');
    if(!highlights){
      highlights=make('div','mqb50-benefits');highlights.setAttribute('aria-label','Store benefits');
      const lines=[
        [String(p.category||'').toLowerCase().match(/tarjuma|translation|roman|quran/) ? 'Product information for easy selection' : 'Explore this item and its details','▣'],
        ['All-India delivery included in listed price','✓'],
        ['Cash on Delivery where available at checkout','✓']
      ];
      lines.forEach(([message,icon])=>{const r=make('div','mqb50-benefit');r.append(make('span','mqb50-benefit-icon',icon),make('span','',message));highlights.append(r);});
      const price=info.querySelector('.flex.flex-wrap.gap-2.items-end');
      if(price)price.insertAdjacentElement('afterend',highlights);else info.insertBefore(highlights,info.firstChild);
    }
    let bar=info.querySelector('.mqb50-statusbar');
    if(!bar){bar=make('div','mqb50-statusbar');const heading=info.querySelector('h2');heading?.insertAdjacentElement('afterend',bar);}
    bar.replaceChildren();
    const oldPrice=Number(p.oldPrice),sale=Number(p.salePrice);
    if(Number.isFinite(oldPrice)&&Number.isFinite(sale)&&oldPrice>sale&&sale>0)bar.append(make('span','mqb50-sale-chip','Sale price'));
    if(lowStock(p))bar.append(make('span','mqb50-low-chip','Limited stock · '+stockNumber(p)+' left'));
    bar.hidden=bar.childElementCount===0;
  }
  function refreshOpenDetails(){if(activeProductId)decorateProduct(activeProductId);}
  function installProductHook(){
    if(typeof window.openProductDetails!=='function' || window.openProductDetails.__mqb50Wrapped)return;
    const old=window.openProductDetails;
    const wrapped=function(id){activeProductId=String(id??'');const result=old.apply(this,arguments);queueMicrotask(()=>decorateProduct(activeProductId));setTimeout(()=>decorateProduct(activeProductId),175);return result;};
    wrapped.__mqb50Wrapped=true;window.openProductDetails=wrapped;
  }
  function refreshProductSelect(){
    const select=el('mqb50StockProduct');if(!select)return;
    const selected=select.value;
    const entries=currentProducts().filter(p=>p&&p.id&&p.title).sort((a,b)=>String(a.title).localeCompare(String(b.title)));
    const key=entries.map(p=>p.id+':'+p.title).join('|');if(select.dataset.mqb50Key===key)return;
    select.dataset.mqb50Key=key;select.replaceChildren(new Option('Choose product…',''));
    entries.forEach(p=>select.add(new Option(String(p.title)+' (stock: '+stockNumber(p)+')',String(p.id))));
    select.value=entries.some(p=>String(p.id)===selected)?selected:'';
    displayStockSelection();
  }
  function displayStockSelection(){
    const id=el('mqb50StockProduct')?.value||'',setting=stockSettings?.[id],p=product(id);
    if(el('mqb50StockEnabled'))el('mqb50StockEnabled').checked=setting?.enabled===true;
    if(el('mqb50StockThreshold'))el('mqb50StockThreshold').value=String(setting?.threshold||5);
    const n=el('mqb50StockCurrent');if(n)n.textContent=p?`Actual catalog stock: ${stockNumber(p)}. Badge currently ${lowStock(p)?'visible':'hidden'} to customers.`:'Select a product to manage its alert.';
  }
  function showGreetingControls(){
    const panel=el('mqb50GreetingAdmin');if(!panel)return;
    panel.hidden=currentRole!=='admin';
    if(currentRole==='admin'){
      el('mqb50GreetingEnabled').checked=greeting.enabled!==false;
      el('mqb50GreetingText').value=greeting.message||DEFAULT_DUA;
    }
  }
  function showStockControls(){
    const panel=el('mqb50LowStockPanel');if(!panel)return;
    panel.hidden=!['admin','owner','manager'].includes(currentRole);
    if(!panel.hidden)refreshProductSelect();
  }
  async function verifyRole(){
    const u=auth()?.currentUser,d=db();
    if(!u||!d){currentRole='customer';showGreetingControls();showStockControls();return currentRole;}
    const uid=u.uid;
    // Never trust currentUser/localStorage to authorize controls.
    try{
      const admin=await d.ref('admins/'+uid).once('value');if(auth()?.currentUser?.uid!==uid)return 'customer';
      if(admin.val()===true){currentRole='admin';}
      else{
        const staff=await d.ref('staffRoles/'+uid).once('value');
        if(auth()?.currentUser?.uid!==uid)return 'customer';
        const r=staff.val();currentRole=r?.active===true&&['owner','manager'].includes(r.role)?r.role:'customer';
      }
    }catch{currentRole='customer';}
    showGreetingControls();showStockControls();return currentRole;
  }
  async function saveGreeting(){
    const button=el('mqb50GreetingSave');button.disabled=true;
    const message=String(el('mqb50GreetingText')?.value||'').trim();
    const enabled=!!el('mqb50GreetingEnabled')?.checked;
    try{
      if(await verifyRole()!=='admin')throw Error('Only the verified Super Admin can change the greeting.');
      if(message.length<10||message.length>320)throw Error('Enter a respectful greeting message between 10 and 320 characters.');
      await db().ref(GREETING_PATH).set({enabled,message,updatedAt:firebase.database.ServerValue.TIMESTAMP});
      note('mqb50GreetingStatus','✓ Greeting settings saved to Firebase.',true);
    }catch(e){note('mqb50GreetingStatus',e.message||'Unable to save greeting.',false);}finally{button.disabled=false;}
  }
  async function saveStock(){
    const button=el('mqb50StockSave');button.disabled=true;
    const id=String(el('mqb50StockProduct')?.value||'');
    const threshold=Number(el('mqb50StockThreshold')?.value);
    const enabled=!!el('mqb50StockEnabled')?.checked;
    try{
      if(!['admin','owner','manager'].includes(await verifyRole()))throw Error('Only authorized staff can change stock alerts.');
      if(!id||!product(id))throw Error('Choose a current catalog product.');
      if(!Number.isInteger(threshold)||threshold<1||threshold>50)throw Error('Threshold must be a whole number from 1 to 50.');
      await db().ref(STOCK_PATH+'/'+id).set({enabled,threshold,updatedAt:firebase.database.ServerValue.TIMESTAMP});
      note('mqb50StockStatus','✓ Product alert saved. Badge only displays when real stock matches threshold.',true);
    }catch(e){note('mqb50StockStatus',e.message||'Unable to save alert.',false);}finally{button.disabled=false;}
  }
  function connect(){
    if(connected||!db()||!auth())return;
    connected=true;
    db().ref(GREETING_PATH).on('value',s=>{
      const v=s.val();greeting={enabled:v?.enabled!==false,message:typeof v?.message==='string'&&v.message.trim()?v.message.trim():DEFAULT_DUA};
      showGreetingControls();if(greeting.enabled===false){if(greetingVisible())closeGreeting();}else showGreeting();
    },()=>{ /* Never block storefront if public setting cannot be retrieved. */ });
    db().ref(STOCK_PATH).on('value',s=>{stockSettings=s.val()||{};displayStockSelection();refreshOpenDetails();},()=>{});
    auth().onAuthStateChanged(()=>{currentRole='customer';showGreetingControls();showStockControls();verifyRole();});
    verifyRole();
  }
  function init(){
    el('mqb50EnterStore')?.addEventListener('click',closeGreeting);
    el('mqb50SkipGreeting')?.addEventListener('click',closeGreeting);
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&greetingVisible()){e.preventDefault();closeGreeting();}if(e.key==='Tab'&&greetingVisible()){const choices=[el('mqb50EnterStore'),el('mqb50SkipGreeting')];if(e.shiftKey&&document.activeElement===choices[0]){e.preventDefault();choices[1].focus();}else if(!e.shiftKey&&document.activeElement===choices[1]){e.preventDefault();choices[0].focus();}}});
    el('mqb50GreetingSave')?.addEventListener('click',saveGreeting);
    el('mqb50GreetingPreview')?.addEventListener('click',()=>showGreeting(true));
    el('mqb50StockSave')?.addEventListener('click',saveStock);
    el('mqb50StockProduct')?.addEventListener('change',displayStockSelection);
    installProductHook();
    if(typeof window.renderProducts==='function'){
      const old=window.renderProducts;window.renderProducts=function(){const res=old.apply(this,arguments);queueMicrotask(refreshProductSelect);refreshOpenDetails();return res;};
    }
    // Existing Firebase start is asynchronous; never overwrite its configuration or credentials.
    let attempts=0;const interval=setInterval(()=>{
      installProductHook();connect();if(connected||++attempts>=100)clearInterval(interval);
    },150);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
