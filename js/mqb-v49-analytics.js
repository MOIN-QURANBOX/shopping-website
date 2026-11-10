/* MOIN QURAN BOX V49 — operational KPIs + anonymous visitor presence + safe admin archive.
 * Browser display code only. Firebase Rules are the authorization boundary.
 * No Razorpay, order/payment write, COD cancellation or Brevo code is changed.
 */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const live = () => window.mqbLive;
  const authorized = () => !!(live()?.verifiedAdmin && ['admin','owner','manager'].includes(live()?.activeRole));
  const superAdmin = () => authorized() && live().activeRole === 'admin';
  const timeNow = () => Date.now();
  const INR = new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0});
  const fmtDate = ms => Number.isFinite(ms) && ms > 0 ? new Date(ms).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Kolkata'}) : 'Unknown date';
  const number = n => Number.isFinite(Number(n)) ? Number(n) : 0;
  const clean = n => String(n ?? '').slice(0,600);
  const statusNorm = o => String(o?.status || 'Requested').trim().toLowerCase();
  const orderTime = o => { const t=number(o?.serverCreatedAtMs) || Date.parse(o?.date || ''); return Number.isFinite(t) && t > 0 ? t : 0; };
  const indianParts = ms => {
    const entries = new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'})
      .formatToParts(new Date(ms)).filter(x => x.type !== 'literal').map(x => [x.type,Number(x.value)]);
    const x=Object.fromEntries(entries);
    const dayIndex=Math.floor(Date.UTC(x.year,x.month-1,x.day)/86400000);
    return {year:x.year,month:x.month,day:x.day,dayIndex,weekday:new Date(dayIndex*86400000).getUTCDay()};
  };
  function inPeriod(ts,scope,now=timeNow()) {
    if(!ts || ts>now+60000)return false;
    const a=indianParts(ts),b=indianParts(now);
    if(scope==='day')return a.year===b.year && a.month===b.month && a.day===b.day;
    if(scope==='week')return a.dayIndex>=b.dayIndex-((b.weekday+6)%7) && a.dayIndex<=b.dayIndex;
    if(scope==='month')return a.year===b.year && a.month===b.month;
    return true;
  }
  function baseline() {
    const c=live()?.adminControls||{};
    return Math.max(number(c.salesResetAt),number(c.orderVisibleAfter));
  }
  function allOrders() {
    if(!authorized())return [];
    const a=Array.isArray(live()?.customerOrdersForAdmin)?live().customerOrdersForAdmin:[];
    const b=Array.isArray(live()?.posSales)?live().posSales:[];
    const seen=new Set();return [...a,...b].filter(o=>{
      if(!o || typeof o!=='object')return false;
      const key=String(o.__uid||o.channel||'')+'|'+String(o.__key||o.orderId||'');
      if(seen.has(key))return false;seen.add(key);return true;
    });
  }
  function eligibleOrders(scope) {const cutoff=baseline();return allOrders().filter(o=>orderTime(o)>=cutoff && inPeriod(orderTime(o),scope));}
  function paid(o) {
    // Never recognize an unverified COD request or unpaid manual-UPI claim as revenue.
    if(o?.paymentStatus==='verified')return true;
    return o?.channel==='Showroom POS' && o?.status==='Completed' && o?.paymentAttested===true;
  }
  function gross(o) {const v=Number(o?.total);return Number.isFinite(v) && v>=0 ? v : 0;}
  const categories={pending:o=>['requested','payment pending','pending','awaiting confirmation'].includes(statusNorm(o)),
    confirmed:o=>statusNorm(o)==='confirmed',processing:o=>['processing','packed'].includes(statusNorm(o)),
    shipping:o=>['shipped','in transit','out for delivery'].includes(statusNorm(o)),
    delivered:o=>statusNorm(o)==='delivered', cancelled:o=>statusNorm(o)==='cancelled',
    paid:o=>paid(o), all:()=>true};
  const cards = [
    ['sales-day','day','paid','Gross sales · Today',true],
    ['sales-week','week','paid','Gross sales · This week',true],
    ['sales-month','month','paid','Gross sales · This month',true],
    ['pending','selection','pending','Pending orders',false],
    ['confirmed','selection','confirmed','Confirmed orders',false],
    ['processing','selection','processing','Processing / packed',false],
    ['shipping','selection','shipping','Dispatched / in transit',false],
    ['delivered','selection','delivered','Delivered orders',false],
    ['cancelled','selection','cancelled','Cancelled orders',false],
    ['all','selection','all','All orders',false]
  ];
  let selectedScope='all';
  function updateCards() {
    const holder=$('mqb49Kpis');if(!holder)return;
    const isAllowed=authorized();
    holder.querySelectorAll('[data-mqb49-id]').forEach(el=>{
      const conf=cards.find(x=>x[0]===el.dataset.mqb49Id);if(!conf)return;
      const scope=conf[1]==='selection'?selectedScope:conf[1];
      const subset=eligibleOrders(scope).filter(categories[conf[2]]);
      const result=conf[4]?INR.format(subset.reduce((s,o)=>s+gross(o),0)):String(subset.length);
      const out=el.querySelector('[data-mqb49-number]');if(out)out.textContent=isAllowed?result:'—';
      el.disabled=!isAllowed;
    });
    const meta=$('mqb49SummaryNote');if(meta)meta.textContent=isAllowed
      ? `Showing ${selectedScope==='day'?'today':selectedScope==='week'?'this calendar week':selectedScope==='month'?'this calendar month':'all recorded history'} in India time. Gross sales are verified-paid orders; unverified COD requests are excluded. Archived history is omitted.`
      : 'Sign in as verified staff to see private sales data.';
    const showReset=$('mqb49ResetArea');if(showReset)showReset.hidden=!superAdmin();
    const enableVisits=$('mqb49EnableVisits');if(enableVisits)enableVisits.hidden=!superAdmin();
  }
  function addLine(parent,tag,content,cls='') {const el=document.createElement(tag);if(cls)el.className=cls;el.textContent=clean(content);parent.appendChild(el);return el;}
  function createDetailRow(host,o) {
    const row=document.createElement('details');row.className='mqb49-order-row';
    const top=document.createElement('summary');top.className='mqb49-order-top';
    addLine(top,'strong',o.orderId || o.__key || 'Order');
    addLine(top,'span',`${fmtDate(orderTime(o))} · ${INR.format(gross(o))} · ${o.status||'Unknown'}`);
    row.appendChild(top);
    const body=document.createElement('div');body.className='mqb49-order-detail';
    for(const [label,value] of [
      ['Customer',o.customerName||'Walk-in'],['Phone',o.customerPhone||'Not supplied'],
      ['Email',o.customerEmail||'Not supplied'],['Shipping address',o.address||'Not supplied'],
      ['Postal code',o.postalCode||'Not supplied'],['Order channel',o.channel||'Website request'],
      ['Payment method',o.paymentMethod||'Not supplied'],['Payment status',o.paymentStatus||'Not supplied'],
      ['Fulfilment status',o.status||'Unknown'],['Tracking / AWB',o.awb||o.shipping?.trackingNumber||'Not assigned'],
      ['Total',INR.format(gross(o))]
    ]){const p=document.createElement('p');addLine(p,'strong',label+': ');p.appendChild(document.createTextNode(clean(value)));body.appendChild(p);}
    const products=Array.isArray(o.items)?o.items:Object.values(o.items||{});
    if(products.length) {
      const ul=document.createElement('ul');
      for(const x of products.slice(0,70))addLine(ul,'li',`${x.title||x.name||x.id||'Item'} × ${x.qty||x.quantity||1} — ${INR.format(number(x.salePrice||x.price)*number(x.qty||x.quantity||1))}`);
      body.appendChild(addLine(document.createElement('div'),'strong','Items:'));
      body.appendChild(ul);
    }
    row.appendChild(body);host.appendChild(row);
  }
  function openDetail(id) {
    if(!authorized())return;
    const conf=cards.find(x=>x[0]===id);if(!conf)return;
    const scope=conf[1]==='selection'?selectedScope:conf[1];
    const subset=eligibleOrders(scope).filter(categories[conf[2]]).sort((a,b)=>orderTime(b)-orderTime(a));
    const modal=$('mqb49DetailsModal'),list=$('mqb49DetailsList');if(!modal||!list)return;
    $('mqb49DetailsTitle').textContent=conf[3]+' — '+(scope==='day'?'Today':scope==='week'?'This week':scope==='month'?'This month':'All history');
    $('mqb49DetailsCount').textContent=`${subset.length} matching orders · ${INR.format(subset.reduce((s,o)=>s+gross(o),0))} total order value`;
    list.replaceChildren();
    if(!subset.length)addLine(list,'p','No matching orders for this period.','mqb49-empty');
    else for(const order of subset.slice(0,500))createDetailRow(list,order);
    if(subset.length>500)addLine(list,'p',`Showing newest 500 of ${subset.length} results.`, 'mqb49-note');
    modal.hidden=false;
  }
  function closeDetail() {const el=$('mqb49DetailsModal');if(el)el.hidden=true;}
  function errorMessage(e){return String(e?.code||e?.message||'Permission denied').slice(0,160);}
  let visitorStarted=false, visitorsSubscription=null, visitorAuth=null;
  function visitorInit() {
    if(visitorStarted||!window.firebase?.apps?.length||!window.firebase?.database)return;
    visitorStarted=true;
    try{
      const base=firebase.app();
      const child=firebase.apps.find(x=>x.name==='mqb42-visitor') || firebase.apps.find(x=>x.name==='mqb49-presence')
        || firebase.initializeApp(base.options,'mqb49-presence');
      visitorAuth=child.auth();const db=child.database();let connectedListening=false;
      visitorAuth.onAuthStateChanged(async user=>{
        if(!user){try{await visitorAuth.signInAnonymously();}catch(e){console.warn('V49 anonymous presence unavailable',e?.code||'');}return;}
        if(connectedListening)return;connectedListening=true;
        const connected=db.ref('.info/connected');
        let activeRef=null,heartbeat=null;
        connected.on('value',async snap=>{
          if(snap.val()!==true){
            if(heartbeat){clearInterval(heartbeat);heartbeat=null;}
            activeRef=null;return;
          }
          const bytes=new Uint8Array(9);crypto.getRandomValues(bytes);
          const tabKey='t'+Array.from(bytes,n=>n.toString(16).padStart(2,'0')).join('');
          const ref=db.ref(`visitorInsights/sessions/${user.uid}/${tabKey}`);
          try {
            await ref.onDisconnect().remove();
            await ref.set({startedAt:firebase.database.ServerValue.TIMESTAMP,lastSeen:firebase.database.ServerValue.TIMESTAMP,
              page:location.pathname.slice(0,100)});
            activeRef=ref;
            if(heartbeat)clearInterval(heartbeat);
            heartbeat=setInterval(()=>{
              if(activeRef)activeRef.update({lastSeen:firebase.database.ServerValue.TIMESTAMP}).catch(e=>{
                console.warn('Presence heartbeat stopped',e?.code||'');clearInterval(heartbeat);heartbeat=null;
              });
            },45000);
          }catch(e){console.warn('V49 visitor permissions unavailable',e?.code||'');}
        });
      });
    }catch(e){console.warn('Visitor startup unavailable',e?.message||'');}
  }
  let present=[];
  function visitorsInitDashboard(){
    if(!authorized()||!live()?.db||visitorsSubscription)return;
    const ref=live().db.ref('visitorInsights/sessions');visitorsSubscription=ref;
    ref.on('value',snap=>{
      const raw=snap.val()||{};present=Object.entries(raw).flatMap(([uid,sessions])=>Object.entries(sessions||{}).map(([id,s])=>({...s,uid,sessionId:id})));
      updateVisitorPanel();
    },e=>{const n=$('mqb49VisitorNote');if(n)n.textContent='Visitor activity needs V49 Firebase permissions: '+errorMessage(e);});
    live().db.ref('visitorMetrics/pageViews').on('value',snap=>{
      const n=$('mqb49PageViews');if(n)n.textContent=Number(snap.val()||0).toLocaleString('en-IN');
    },e=>{if($('mqb49VisitorNote'))$('mqb49VisitorNote').textContent='Visit counter needs Firebase Rules: '+errorMessage(e);});
  }
  function updateVisitorPanel(){
    if(!authorized())return;
    const liveSessions=present.filter(x=>number(x.lastSeen) >= timeNow()-180000);
    const groups=new Map();for(const s of liveSessions){if(!groups.has(s.uid))groups.set(s.uid,[]);groups.get(s.uid).push(s);}
    if($('mqb49OnlineNow'))$('mqb49OnlineNow').textContent=String(groups.size);
    if($('mqb49OnlineTabs'))$('mqb49OnlineTabs').textContent=String(liveSessions.length);
    const list=$('mqb49VisitorList');if(!list)return;
    list.replaceChildren();
    const note=$('mqb49VisitorNote');if(note)note.textContent='Anonymous activity; no names, phone numbers, IP addresses or locations are collected. Live counts are approximate and clear after disconnection.';
    if(!groups.size){addLine(list,'p','No active visitor sessions detected.','mqb49-empty');return;}
    for(const [uid,items] of [...groups].slice(0,100)){
      const item=items.slice().sort((a,b)=>number(a.startedAt)-number(b.startedAt))[0];
      const row=document.createElement('div');row.className='mqb49-visitor-row';
      addLine(row,'strong','Anonymous visitor · '+uid.slice(0,6)+'…');
      addLine(row,'span',`${items.length} active tab(s) · Online since ${fmtDate(number(item.startedAt))} · Last seen ${fmtDate(Math.max(...items.map(s=>number(s.lastSeen))))}`);
      list.appendChild(row);
    }
  }
  function enableCounter() {
    if(!superAdmin()||!live()?.db)return;
    if(!confirm('Enable anonymous visit counts for the store? This does not collect names, emails or IP addresses. It may increase Firebase usage.'))return;
    live().db.ref('publicSettings/visitorAnalyticsEnabled').set(true).then(()=>{
      window.mqb42ConfigureVisitors?.();alert('Anonymous page-view counting is enabled. Refresh the storefront to test visitor totals.');
    }).catch(e=>alert('Cannot enable counting: '+errorMessage(e)));
  }
  function resetAdminForm(){const area=$('mqb49ResetConfirm');if(area)area.hidden=false;}
  async function resetDashboard(e){
    e.preventDefault();if(!superAdmin()||!live()?.db)return;
    const ack=$('mqb49ResetAck'),phrase=$('mqb49ResetPhrase'),submit=$('mqb49ResetSubmit');
    if(!ack?.checked || phrase?.value?.trim()!=='ARCHIVE OLD HISTORY')return alert('Check the acknowledgement and type ARCHIVE OLD HISTORY exactly.');
    if(!confirm('FINAL WARNING: Reset sales and order KPI baselines to ₹0 / 0? Previous orders remain in Firebase for customer access, payment audit and legal records. Staff operational views will archive older orders. Continue?'))return;
    if(submit)submit.disabled=true;
    try {
      const snap=await live().db.ref('admins/'+live().uid).once('value');
      if(snap.val()!==true)throw Error('Only the verified Super Admin can reset history.');
      await live().db.ref('adminControls').update({salesResetAt:firebase.database.ServerValue.TIMESTAMP,
        orderVisibleAfter:firebase.database.ServerValue.TIMESTAMP});
      live().adminControls={...(live().adminControls||{}),salesResetAt:Date.now(),orderVisibleAfter:Date.now()};
      await window.mqbLogStaffAction?.('sales_summary_reset','Super Admin archived older sales/order KPI history (records retained)');
      if($('mqb49ResetConfirm'))$('mqb49ResetConfirm').hidden=true;
      if(phrase)phrase.value='';if(ack)ack.checked=false;
      updateCards();alert('The sales/order KPI history baseline has been archived. Previous records are retained in Firebase.');
    }catch(e){alert('Reset not saved: '+errorMessage(e));}
    finally{if(submit)submit.disabled=false;}
  }
  function bind(){
    $('mqb49Period')?.addEventListener('change',e=>{selectedScope=e.target.value;updateCards();});
    $('mqb49Kpis')?.addEventListener('click',e=>{const el=e.target.closest('[data-mqb49-id]');if(el)openDetail(el.dataset.mqb49Id);});
    $('mqb49DetailsClose')?.addEventListener('click',closeDetail);
    $('mqb49DetailsModal')?.addEventListener('click',e=>{if(e.target.id==='mqb49DetailsModal')closeDetail();});
    $('mqb49EnableVisits')?.addEventListener('click',enableCounter);
    $('mqb49ResetStart')?.addEventListener('click',resetAdminForm);
    $('mqb49ResetForm')?.addEventListener('submit',resetDashboard);
    $('mqb49ResetCancel')?.addEventListener('click',()=>{if($('mqb49ResetConfirm'))$('mqb49ResetConfirm').hidden=true;});
    const prevUpdate=window.updateAnalytics;
    if(typeof prevUpdate==='function')window.updateAnalytics=function(){const out=prevUpdate.apply(this,arguments);updateCards();return out;};
    const prevSwitch=window.switchAdminTab;
    if(typeof prevSwitch==='function')window.switchAdminTab=function(tab){const out=prevSwitch.apply(this,arguments);
      if(tab==='analytics') {updateCards();visitorsInitDashboard();updateVisitorPanel();}return out;};
    visitorInit();updateCards();
    // Close private detail panels promptly when staff authentication changes.
    live()?.auth?.onAuthStateChanged?.(()=>{if(!authorized()){closeDetail();$('mqb49DetailsList')?.replaceChildren();}});
    const refresh=setInterval(()=>{if(document.visibilityState==='visible'){
      if(authorized()){updateCards();visitorsInitDashboard();updateVisitorPanel();}
      else {
        closeDetail();if($('mqb49DetailsList'))$('mqb49DetailsList').replaceChildren();
        if(visitorsSubscription){visitorsSubscription.off('value');visitorsSubscription=null;present=[];}
      }
    }},30000);
    window.addEventListener('pagehide',()=>clearInterval(refresh),{once:true});
  }
  window.MQB49Analytics={inPeriod,paid,orderTime}; // pure helpers for automated checks
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();
