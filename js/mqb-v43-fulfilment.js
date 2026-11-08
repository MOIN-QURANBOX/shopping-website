/* MOIN QURAN BOX V43 — customer-authorized invoice lookup and tracking UI.
 * No payment or database writes. Only phone is mandatory. Optional order ID / India order date narrow records
 * already authorized by the current Firebase UID. Phone is NOT authentication.
 * Never enable database-wide phone/date searches in a public browser.
 */
(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const official='https://www.indiapost.gov.in/';
  const records=()=>typeof orders!=='undefined'&&Array.isArray(orders)?orders:[];
  const live=()=>window.mqbLive;
  const digits=v=>String(v||'').replace(/\D/g,'');
  function dateIST(value){
    if(!value)return '';
    if(typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value))return value;
    const dt=new Date(typeof value==='number'?value:(/^\d+$/.test(String(value))?Number(value):value));
    if(!Number.isFinite(dt.getTime()))return '';
    const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(dt);
    const p=type=>parts.find(x=>x.type===type)?.value||'';
    return p('year')+'-'+p('month')+'-'+p('day');
  }
  const error=(message)=>{
    const el=$('lookupError');if(!el)return;
    el.textContent=message;el.classList.remove('hidden');
  };
  function reset(){
    const errorNode=$('lookupError'),matches=$('mqb43InvoiceMatches');
    if(errorNode){errorNode.textContent='';errorNode.classList.add('hidden');}
    if(matches){matches.textContent='';matches.classList.add('hidden');}
  }
  function handleLookup(event){
    event?.preventDefault?.();reset();
    const uid=live()?.uid;
    if(!uid)return error('Sign in, or return using the original guest browser session that placed your order. Mobile number alone cannot grant access to private invoices.');
    const mobile=digits($('lookupPhone')?.value),date=$('lookupOrderDate')?.value||'',id=String($('lookupOrderId')?.value||'').trim().toUpperCase();
    if(mobile.length<10||mobile.length>13)return error('Enter the mobile number used when placing your order (10 Indian digits).');
    if(date && !/^\d{4}-\d{2}-\d{2}$/.test(date))return error('Please enter a valid date, or leave the optional date blank.');
    const normalized=mobile.slice(-10);
    const candidates=records().filter(o=>o?.__uid===uid&&!!o?.__key &&
      digits(o.customerPhone||'').slice(-10)===normalized && (!date || dateIST(o.date||o.createdAt)===date) &&
      (!id||String(o.orderId||o.__key||'').trim().toUpperCase()===id));
    if(!candidates.length)return error('No matching order was found in this authenticated account/session. Check the phone number or optional filters, or sign into the original account.');
    if(candidates.length===1)return window.downloadOrderInvoice?.(candidates[0].__uid,candidates[0].__key);
    const el=$('mqb43InvoiceMatches');if(!el)return error('Multiple orders match. Enter the optional Order ID to select one.');
    const sorted=candidates.slice().sort((a,b)=>String(b.date||b.createdAt||'').localeCompare(String(a.date||a.createdAt||'')));
    const h=document.createElement('p');h.className='font-bold text-sm';h.textContent=candidates.length+' orders match this mobile number'+(date?' and date':'')+'. Choose the correct invoice:';el.append(h);
    if(sorted.length>100){const note=document.createElement('p');note.textContent='Showing 100 most recent orders. Use the optional date or Order ID to find an earlier order.';el.append(note);}
    for(const o of sorted.slice(0,100)){
      const btn=document.createElement('button');btn.type='button';btn.className='mqb43-invoice-option';
      const left=document.createElement('span');left.textContent=String(o.orderId||o.__key)+' · '+(dateIST(o.date||o.createdAt)||'Date unavailable');
      const small=document.createElement('small');small.textContent=(Array.isArray(o.items)?o.items:[]).map(i=>i.title||'Item').slice(0,2).join(', ').slice(0,120);
      left.append(small);const right=document.createElement('span');right.textContent='Download PDF';
      btn.append(left,right);
      btn.addEventListener('click',()=>{if(live()?.uid===uid)window.downloadOrderInvoice?.(o.__uid,o.__key);});
      el.append(btn);
    }
    el.classList.remove('hidden');
  }
  function updateTracking(){
    for(const root of [$('custOrderList'),$('trackingResultBox')]){
      if(!root)continue;
      for(const link of root.querySelectorAll('a[href*="indiapost.gov.in"]')){
        // Official entry point remains valid even if India Post changes deep links.
        link.href=official;link.target='_blank';link.rel='noopener noreferrer';
        link.textContent='Open India Post Track & Trace';
        if(link.dataset.mqb43==='1')continue;
        link.dataset.mqb43='1';
        const section=link.closest('.bg-emerald-50');if(!section)continue;
        const line=[...section.querySelectorAll('p')].find(p=>p.textContent?.includes('AWB / Tracking:'));
        const number=line?.querySelector('strong')?.textContent?.trim()||'';
        if(!/^[A-Za-z0-9-]{8,50}$/.test(number))continue;
        if(section.querySelector('.mqb43-track-action'))continue;
        const button=document.createElement('button');button.type='button';button.className='mqb43-track-action';
        button.textContent='Copy AWB '+number;
        button.addEventListener('click',async()=>{
          try{await navigator.clipboard.writeText(number);button.textContent='AWB copied: '+number;}
          catch{window.prompt('Copy your India Post consignment number:',number);}
        });
        const hint=document.createElement('p');hint.className='text-xs text-neutral-600';
        hint.textContent='Copy this number, then paste it into India Post Track & Trace. India Post may ask for CAPTCHA.';
        section.append(button,hint);
      }
    }
  }
  function init(){
    window.handlePublicInvoiceLookup=handleLookup;
    const previous=window.renderCustProfileOrders;
    if(typeof previous==='function')window.renderCustProfileOrders=function(){const r=previous.apply(this,arguments);updateTracking();return r;};
    const prevTrack=window.trackOrderById;
    if(typeof prevTrack==='function')window.trackOrderById=function(){const r=prevTrack.apply(this,arguments);updateTracking();return r;};
    // Clears an earlier customer's selected invoice list when a new lookup begins.
    $('lookupPhone')?.addEventListener('input',reset);
    $('lookupOrderDate')?.addEventListener('change',reset);
    $('lookupOrderId')?.addEventListener('input',reset);
    updateTracking();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
