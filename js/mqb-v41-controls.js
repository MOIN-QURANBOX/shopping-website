/* MOIN QURAN BOX V41 — public payment visibility, staff product visibility,
   and explicit MANUAL WhatsApp order-status handoff. Never embeds API secrets. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const live = () => window.mqbLive;
  const role = () => typeof currentUser === 'undefined' ? '' : String(currentUser?.role || '');
  const staff = () => live()?.verifiedAdmin === true && ['admin','owner','manager'].includes(role());
  const superAdmin = () => staff() && role() === 'admin';
  const safeId = id => /^[-A-Za-z0-9_]{1,100}$/.test(String(id || ''));
  const manualEnabled = () => window.MQB41_PAYMENT_FLAGS?.manualUpiEnabled !== false;
  const el = (tag, text, cls) => {
    const node = document.createElement(tag); node.textContent = text;
    if (cls) node.className = cls; return node;
  };
  const btn = (text, fn, cls) => {
    const node = el('button',text,cls || 'border rounded-lg px-3 py-2 font-semibold text-xs');
    node.type='button'; node.addEventListener('click',fn); return node;
  };

  window.mqb41RenderPublicPaymentFlags = () => {
    const allowed = manualEnabled();
    const row = $('mqb41ManualUpiRow');
    if (row) {row.hidden = !allowed; row.style.display = allowed ? '' : 'none';}
    const option = row?.querySelector('input[value="Manual UPI"]');
    if (option) option.disabled = !allowed;
    if (!allowed && option?.checked) {
      const alternative = document.querySelector('input[name="chkPaymentMethod"][value="Razorpay"]:not(:disabled)') ||
        document.querySelector('input[name="chkPaymentMethod"][value="COD"]:not(:disabled)');
      option.checked = false;
      if (alternative) alternative.checked=true;
      window.mqbUpdatePaymentDescription?.();
    }
    const panel = $('mqb41ManualPaymentAdmin');
    if (panel) { panel.hidden = !superAdmin(); panel.style.display = superAdmin() ? '' : 'none'; }
    const toggle = $('mqb41ManualUPISwitch');
    if (toggle) { toggle.checked=allowed; toggle.disabled=!superAdmin(); }
  };
  window.mqb41SetManualUpiEnabled = async newValue => {
    if (!superAdmin() || !live()?.db) return alert('Only the verified Super Admin can change payment options.');
    const toggle=$('mqb41ManualUPISwitch'), msg=$('mqb41ManualUPIStatus');
    if (toggle) toggle.disabled=true;
    if (msg) msg.textContent='Saving payment visibility to Firebase…';
    try {
      await live().db.ref('publicSettings/manualUpiEnabled').set(newValue === true);
      if (msg) msg.textContent='Saved. Customer checkout will update on all connected devices.';
    } catch (error) {
      if (msg) msg.textContent='Not saved: '+String(error?.message || error).slice(0,150);
      if (toggle) toggle.checked=manualEnabled();
    } finally { if (toggle) toggle.disabled=false; }
  };

  window.mqb41ToggleProductActive = async (productId, shouldActivate) => {
    if (!staff() || !live()?.db || !safeId(productId)) return alert('Verified staff access is required.');
    const title = ((typeof products!=='undefined'?products:[]).find(x=>x.id===productId)?.title) ||
      (live()?.catalogArchived||[]).find(x=>x.id===productId)?.title || productId;
    if (!window.confirm((shouldActivate?'Show':'Hide')+' "'+String(title).slice(0,110)+'" '+(shouldActivate?'on':'from')+' the customer store?\nExisting orders, paid transactions and inventory history will be preserved.')) return;
    try {
      // Intentionally update ONLY the active flag. Manager requires a narrowly
      // scoped Firebase security-rule grant; cannot edit stock or prices.
      await live().db.ref('catalog/'+productId+'/active').set(shouldActivate===true);
    } catch (error) { alert('Visibility change not saved: '+String(error?.message||error).slice(0,180)); }
  };

  window.mqb41RenderInventory = () => {
    const hasAccess=staff();const tbody=$('adminInventoryTableBody');
    const records=typeof products!=='undefined'&&Array.isArray(products)?products:[];
    if (tbody && hasAccess) {
      const rows=tbody.querySelectorAll('tr');
      rows.forEach((row,index)=>{
        if (row.querySelector('.mqb41-visibility')) return;
        const item=records[index];if(!item||!safeId(item.id))return;
        const cell=row.querySelector('td:last-child');if(!cell)return;
        const button=btn('Hide / Inactive',()=>window.mqb41ToggleProductActive(item.id,false),'mqb41-visibility border rounded-md px-2 py-1 ml-2 text-xs font-semibold text-amber-900 bg-amber-50');
        cell.append(button);
      });
    }
    const panel=$('mqb41VisibilityPanel'), holder=$('mqb41HiddenProducts');
    if (panel) {panel.hidden=!hasAccess;panel.style.display=hasAccess?'':'none';}
    if (holder) {
      holder.replaceChildren();
      if (!hasAccess) return;
      const hidden=Array.isArray(live()?.catalogArchived)?live().catalogArchived:[];
      if (!hidden.length) return holder.append(el('p','No hidden products.','text-neutral-600'));
      for (const product of hidden) {
        const row=el('div','', 'flex flex-wrap gap-2 justify-between items-center border rounded-lg p-2');
        const name=el('span',String(product.title||product.id)+' · Inactive','font-semibold');
        const action=btn('Restore / Activate',()=>window.mqb41ToggleProductActive(product.id,true),'border border-emerald-700 text-emerald-900 bg-white px-3 py-1.5 rounded-lg font-semibold');
        row.append(name,action);holder.append(row);
      }
    }
  };

  // Staff-initiated, not automatic or sent by this website. Staff must press
  // Send inside WhatsApp. No third-party message credentials are in the browser.
  window.mqb41OfferWhatsAppStatus = order => {
    if(!staff() || !order) return;
    let box=$('mqb41StatusWhatsAppPrompt');
    const panel=$('adminTab-orders');if(!panel)return;
    if (!box) {
      box=el('div','', 'rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm space-y-2');
      box.id='mqb41StatusWhatsAppPrompt';box.setAttribute('role','status');
      panel.insertBefore(box,panel.firstChild);
    }
    box.replaceChildren();
    box.append(el('p','Order '+String(order.orderId||'').slice(0,85)+' was updated to '+String(order.status||'')+'. Send the customer an update on WhatsApp (not sent automatically).','font-semibold'));
    box.append(btn('💬 Open WhatsApp message — staff must press Send',()=>window.mqb34ComposeOrderUpdate?.(order,'whatsapp'),'border rounded-lg px-3 py-2 bg-emerald-800 text-white font-bold text-xs'));
    box.append(btn('Dismiss',()=>box.remove(),'text-xs underline px-3 py-2'));
  };

  function setup() {
    const former=window.renderAdminInventory;
    if(typeof former==='function') window.renderAdminInventory=function() {
      const result=former.apply(this,arguments);
      window.mqb41RenderInventory();return result;
    };
    const prevTab=window.switchAdminTab;
    if(typeof prevTab==='function') window.switchAdminTab=function() {
      const result=prevTab.apply(this,arguments);
      window.mqb41RenderPublicPaymentFlags();
      window.mqb41RenderInventory();return result;
    };
    window.mqb41RenderPublicPaymentFlags();
    window.mqb41RenderInventory();
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',setup,{once:true});
  else setup();
})();
