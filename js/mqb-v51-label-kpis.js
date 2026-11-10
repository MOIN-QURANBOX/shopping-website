/* MOIN QURAN BOX V51 — read-only order selection + secured label generation history.
 * Reuses V43 MQBShippingLabelPDF without changing orderRequests, payment status,
 * invoices, delivery state, Razorpay callbacks or catalog stock.
 * "Downloaded already" means the browser PDF download was initiated. The
 * browser cannot confirm that the user saved the file to their Downloads folder.
 */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const live=()=>window.mqbLive;
const role=()=>{try{return typeof currentUser==='undefined'?'':String(currentUser?.role||'');}catch{return '';}};
const permitted=()=>live()?.verifiedAdmin===true&&['admin','owner','manager'].includes(role())&&!!live()?.auth?.currentUser;
const allOrders=()=>{try{return typeof orders!=='undefined'&&Array.isArray(orders)?orders:[];}catch{return [];}};
const shop=()=>{try{return typeof config==='undefined'?{}:config;}catch{return {};}};
const nowLocal=()=>new Date().toLocaleString('en-IN',{timeZone:'Asia/Kolkata',dateStyle:'medium',timeStyle:'short'});
const safe=v=>String(v??'').trim().slice(0,160);
const exclude=new Set(['cancelled','canceled','returned','shipped','in transit','out for delivery','delivered']);
const pending=new Set(['requested','pending','payment pending']);
const confirmed=new Set(['confirmed','processing','packed']);
const keyFor=o=>o.__uid+'/'+o.__key;
const dateIST=o=>{
 const raw=o?.serverCreatedAtMs||o?.date||o?.createdAt||o?.placedAt;
 if(typeof raw==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(raw))return raw;
 if(!raw)return '';
 const d=new Date(typeof raw==='number'?raw:(/^\d{10,13}$/.test(String(raw))?Number(raw):raw));
 if(!Number.isFinite(d.getTime()))return '';
 const p=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(d);
 const get=t=>p.find(x=>x.type===t)?.value||'';return get('year')+'-'+get('month')+'-'+get('day');
};
let history={},selected='pending',historyReady=false,bound=null,authUid='',busy=false,lastRenderKey='';
const statuses={pending:'Pending',confirmed:'Confirmed',paid:'Online Paid',cod:'Cash on Delivery'};
function note(message,failed=false){const n=$('mqb51LabelStatus');if(n){n.textContent=message;n.style.color=failed?'#a82f28':'#2f6744';}}
function receipt(o){return history?.[o.__uid]?.[o.__key]||null;}
function isUnpaidOnline(o){return (o.paymentMethod==='Razorpay'||o.paymentMethod==='Manual UPI')&&o.paymentStatus!=='verified';}
function eligible(o){
 if(!o||!o.__uid||!o.__key||!o.orderId)return false;
 const status=safe(o.status).toLowerCase();return !exclude.has(status)&&(pending.has(status)||confirmed.has(status)||o.paymentStatus==='verified');
}
function groupMatch(o,group){
 const status=safe(o.status).toLowerCase();
 if(group==='pending')return pending.has(status);
 if(group==='confirmed')return confirmed.has(status);
 if(group==='paid')return o.paymentStatus==='verified'&&o.paymentMethod!=='COD';
 if(group==='cod')return o.paymentMethod==='COD';
 return false;
}
function selectedOrders(group){
 const from=$('mqb51LabelFrom')?.value||'',to=$('mqb51LabelTo')?.value||'';
 const allowUnpaid=$('mqb51AllowUnpaid')?.checked===true;
 const map=new Map();
 for(const o of allOrders()){
   if(!eligible(o)||!groupMatch(o,group))continue;
   if(!allowUnpaid&&isUnpaidOnline(o))continue;
   const date=dateIST(o);
   if((from||to)&&!date)continue;
   if(from&&date<from||to&&date>to)continue;
   const id=keyFor(o);if(!map.has(id))map.set(id,o);
 }
 return [...map.values()].sort((a,b)=>dateIST(a).localeCompare(dateIST(b))||safe(a.orderId).localeCompare(safe(b.orderId)));
}
function dataFor(o){return {order:o,shop:shop(),profile:live()?.profiles?.[o.__uid]||{}};}
function button(text,click,className='',disabled=false){const b=document.createElement('button');b.type='button';b.textContent=text;b.className=className;b.disabled=disabled;b.addEventListener('click',click);return b;}
function text(tag,value,className=''){const el=document.createElement(tag);el.textContent=String(value);if(className)el.className=className;return el;}
function dateFormat(ms){return ms?new Date(ms).toLocaleString('en-IN',{timeZone:'Asia/Kolkata',dateStyle:'medium',timeStyle:'short'}):'Not recorded';}
function render(){
 const panel=$('mqb51LabelPanel');if(!panel)return;
 const allowed=permitted();panel.hidden=!allowed;
 if(!allowed){$('mqb51LabelCards')?.replaceChildren();$('mqb51LabelRows')?.replaceChildren();return;}
 const lists=Object.fromEntries(Object.keys(statuses).map(k=>[k,selectedOrders(k)]));
 const sig=JSON.stringify({historyReady,selected,busy,filters:[ $('mqb51LabelFrom')?.value,$('mqb51LabelTo')?.value,$('mqb51AllowUnpaid')?.checked],counts:Object.keys(lists).map(k=>[k,lists[k].map(o=>keyFor(o)+':'+(receipt(o)?.generationCount||0)+':'+o.status)])});
 if(sig===lastRenderKey)return;lastRenderKey=sig;
 const root=$('mqb51LabelCards');root.replaceChildren();
 for(const [key,name] of Object.entries(statuses)){
   const list=lists[key],newOnes=list.filter(o=>!receipt(o));
   const card=document.createElement('section');card.className='mqb51-kpi'+(key===selected?' selected':'');
   card.append(text('div',name,'mqb51-kpi-name'),text('strong',list.length,'mqb51-kpi-amount'),text('small',newOnes.length+' new · '+(list.length-newOnes.length)+' downloaded already','mqb51-kpi-meta'));
   const actions=document.createElement('div');actions.className='mqb51-kpi-actions';
   actions.append(button('View orders',()=>{selected=key;lastRenderKey='';render();}));
   actions.append(button('↓ Download new',()=>downloadGroup(key,'new'),'mqb51-download',!historyReady||busy||newOnes.length===0));
   card.append(actions);root.append(card);
 }
 const title=$('mqb51LabelSelected');if(title)title.textContent=statuses[selected]+' orders';
 const table=$('mqb51LabelRows');table.replaceChildren();
 const list=lists[selected];if(!list.length){const tr=document.createElement('tr');const td=document.createElement('td');td.colSpan=5;td.textContent='No eligible orders match these filters.';tr.append(td);table.append(tr);}
 for(const o of list){
   const record=receipt(o),tr=document.createElement('tr');
   tr.append(text('td',safe(o.orderId)),text('td',safe(o.customerName||'Recipient not recorded')),
     text('td',(safe(o.paymentMethod)||'Not recorded')+' · '+(safe(o.status)||'Requested')));
   const state=document.createElement('td');state.append(text('span',record?'Downloaded already':'Not recorded','mqb51-badge'+(record?'':' mqb51-new')));
   if(record)state.append(text('div',dateFormat(record.lastGeneratedAt)+' · '+record.generationCount+' time(s)','mqb51-fine'));
   tr.append(state);
   const td=document.createElement('td');td.append(button(record?'Download again':'Download label',()=>downloadRecords([o],selected,record?'again':'new'),'',!historyReady||busy));tr.append(td);table.append(tr);
 }
 const regen=$('mqb51DownloadAgain');if(regen)regen.disabled=busy||!historyReady||!list.some(receipt);
 const total=$('mqb51SelectedCount');if(total)total.textContent=list.length+' eligible · '+list.filter(o=>!!receipt(o)).length+' previously generated';
}
async function markGenerated(o,group){
 const uid=live()?.auth?.currentUser?.uid;if(!uid)throw Error('Staff session ended.');
 const path='mqb51LabelHistory/'+o.__uid+'/'+o.__key;
 const ref=live().db.ref(path);
 const result=await ref.transaction(current=>({
   orderId:String(o.orderId).slice(0,100),generationCount:Math.max(0,Math.floor(Number(current?.generationCount)||0))+1,
   lastGeneratedAt:firebase.database.ServerValue.TIMESTAMP,
   generatedBy:uid,category:group
 }),undefined,false);
 if(!result.committed)throw Error('History update not committed for '+o.orderId);
}
async function downloadRecords(list,group,mode){
 if(!permitted()||busy)return note('Verified staff sign-in required.',true);
 if(!historyReady)return note('Download history permissions are not active. Publish the reviewed V51 rules first.',true);
 if(!window.MQBShippingLabelPDF?.downloadMany)return note('Shipping label PDF generator is unavailable. Refresh and retry.',true);
 if(!list.length)return note('No matching labels for this selection.',true);
 if(list.length>2000)return note('Select a narrower date range: one PDF supports at most 2,000 orders.',true);
 if(list.some(isUnpaidOnline)&&!confirm('Some orders have UNVERIFIED online payment. These labels are NOT proof of payment and must NOT be dispatched until payment is verified. Generate anyway?'))return;
 if(mode==='again'&&list.length>1&&!confirm('Re-download '+list.length+' previously generated labels in one PDF? This will not change order or delivery status.'))return;
 const errors=[];
 const seen=new Set();
 for(const o of list){const d=window.MQBShippingLabelPDF.fields(dataFor(o));
   if(!d.name||!d.phone||!d.address||!/^[0-9]{6}$/.test(d.pin))errors.push(d.order+': missing recipient details');
   if(seen.has(d.order))errors.push(d.order+': duplicate order ID');seen.add(d.order);
 }
 if(errors.length)return note('No PDF generated. Correct: '+errors.slice(0,5).join(' · ')+(errors.length>5?' (and more)':''),true);
 busy=true;lastRenderKey='';render();
 try{
   // Existing trusted V43 generator. Only start history writes after it returns.
   const result=window.MQBShippingLabelPDF.downloadMany(list.map(dataFor));
   note('PDF download initiated: '+result.count+' label(s). Recording staff download history…');
   let failures=0;
   for(let i=0;i<list.length;i+=6){const chunk=list.slice(i,i+6);
     const outcome=await Promise.allSettled(chunk.map(o=>markGenerated(o,group)));
     failures+=outcome.filter(x=>x.status==='rejected').length;
   }
   window.mqbLogStaffAction?.('shipping_label_download','V51 '+group+' batch: '+list.length+' label(s) · '+nowLocal());
   if(failures)note('PDF was initiated, but '+failures+' history record(s) could not be saved. Check Firebase rules/network before relying on Downloaded already badges.',true);
   else note('PDF download initiated for '+list.length+' order(s). History saved; downloaded labels can be generated again separately.');
 }catch(e){note('No PDF generated: '+safe(e.message),true);}
 finally{busy=false;lastRenderKey='';render();}
}
function downloadGroup(group,mode){
 const list=selectedOrders(group).filter(o=>mode==='again'?!!receipt(o):!receipt(o));
 if(!list.length){note(mode==='again'?'No previously generated labels in this group.':'All eligible labels have already been generated. Use Download again on the individual row.');return;}
 return downloadRecords(list,group,mode);
}
function hookExistingSingleLabelDownloads(){
 const pdf=window.MQBShippingLabelPDF;
 if(!pdf||typeof pdf.download!=='function'||pdf.download.__mqb51Tracked)return;
 const original=pdf.download;
 const wrapped=function(data){
   // Original download runs first; this wrapper never changes output or throws
   // on a history-write error after the PDF was initiated.
   const result=original.apply(this,arguments);
   const o=data?.order;
   if(permitted()&&historyReady&&o?.__uid&&o?.__key&&o?.orderId){
     const category=o.paymentMethod==='COD'?'cod':o.paymentStatus==='verified'?'paid':'pending';
     markGenerated(o,category).catch(e=>note('Individual PDF initiated, but download history did not save: '+safe(e.message),true));
   }
   return result;
 };
 wrapped.__mqb51Tracked=true;pdf.download=wrapped;
}
function connect(){
 hookExistingSingleLabelDownloads();
 const ready=permitted();const uid=live()?.auth?.currentUser?.uid||'';
 if(!ready){if(bound){bound.off();bound=null;}history={};historyReady=false;authUid='';lastRenderKey='';render();return;}
 if(bound&&authUid===uid){render();return;}
 if(bound)bound.off();authUid=uid;history={};historyReady=false;lastRenderKey='';render();
 bound=live().db.ref('mqb51LabelHistory');
 bound.on('value',snap=>{history=snap.val()||{};historyReady=true;lastRenderKey='';render();},err=>{
   historyReady=false;note('History tracking unavailable: '+safe(err.message)+' — downloads disabled to avoid untracked labels.',true);
   lastRenderKey='';render();
 });
}
function init(){
 if(!$('mqb51LabelPanel'))return;
 $('mqb51LabelFrom')?.addEventListener('change',()=>{lastRenderKey='';render();});
 $('mqb51LabelTo')?.addEventListener('change',()=>{lastRenderKey='';render();});
 $('mqb51AllowUnpaid')?.addEventListener('change',()=>{lastRenderKey='';render();});
 $('mqb51DownloadAgain')?.addEventListener('click',()=>downloadGroup(selected,'again'));
 $('mqb51ClearDates')?.addEventListener('click',()=>{ $('mqb51LabelFrom').value='';$('mqb51LabelTo').value='';lastRenderKey='';render();});
 setInterval(connect,3000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)connect();});
 connect();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
