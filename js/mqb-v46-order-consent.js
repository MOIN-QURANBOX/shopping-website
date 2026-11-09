/* MQB V46 — optional order notification consent, additive to V45 checkout. */
(()=>{
 'use strict';
 const live=window.mqbLive;
 const modal=document.getElementById('checkoutModal');
 const form=modal?.querySelector('form');
 if(!live||typeof live.sendOrder!=='function'||!form||document.getElementById('mqb46OrderNotifications'))return;
 const group=document.createElement('fieldset');group.id='mqb46OrderNotifications';
 group.style.cssText='border:1px solid #d6e5db;border-radius:12px;background:#f5fbf7;padding:12px;margin:10px 0;font-size:13px;line-height:1.45;';
 const legend=document.createElement('legend');legend.textContent='Order updates (optional)';legend.style.fontWeight='700';group.appendChild(legend);
 for(const [id,label] of [
  ['mqb46WhatsAppConsent','Send order confirmations and delivery updates to my WhatsApp number'],
  ['mqb46EmailConsent','Send order confirmations and delivery updates to my email address']]){
  const row=document.createElement('label');row.style.cssText='display:flex;align-items:start;gap:9px;margin:8px 0;cursor:pointer';
  const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.id=id;checkbox.style.cssText='width:17px;height:17px;flex:none;margin-top:2px;';
  row.append(checkbox,document.createTextNode(label));group.append(row);
 }
 const note=document.createElement('p');note.textContent='Messages are transactional only. You can leave both unchecked and still place your order. Messages are sent only after the notification service is enabled.';
 note.style.cssText='color:#466050;font-size:11px;margin-top:5px';group.append(note);
 const submit=form.querySelector('button[type="submit"]');
 if(submit)submit.parentNode.insertBefore(group,submit);else form.append(group);
 const base=live.sendOrder;
 live.sendOrder=function(order){
  return base.call(this,{...order,orderUpdatesConsent:{whatsapp:!!document.getElementById('mqb46WhatsAppConsent')?.checked,email:!!document.getElementById('mqb46EmailConsent')?.checked}});
 };
})();
