/**
 * MOIN QURAN BOX V32 — official public contact display and one-time secure sync.
 * Does not modify orders, inventory, payment methods or Firebase Rules.
 * A real, signed-in Super Admin or Owner must explicitly save the new public contact details.
 */
(() => {
  'use strict';
  const OFFICIAL = Object.freeze({
    proprietor: 'Shaik Muneer Uddin',
    address: 'Madina Colony, Opposite Hafez Ustad Haleem, Falaknuma, Hyderabad 500053',
    phone1: '7337464501',
    phone2: '',
    whatsappPhone: '7337464501',
    ownerEmail: 'mquranbox@gmail.com'
  });
  const PHONE_URI = 'tel:+917337464501';
  const WA_URI = 'https://wa.me/917337464501';
  const EMAIL_URI = 'mailto:mquranbox@gmail.com';
  const byId = id => document.getElementById(id);
  const SETTING_KEYS = ['proprietor','address','phone1','phone2','whatsappPhone','ownerEmail'];

  function ensureOfficialConfig() {
    // `config` is the existing storefront's global setting object, initialized by js/app.js.
    if (typeof config === 'undefined' || !config || typeof config !== 'object' || !Object.keys(config).length) return false;
    for (const key of SETTING_KEYS) config[key] = OFFICIAL[key];
    // Keep historic branch records in Firebase intact; only normalize the visible head showroom in memory.
    if (Array.isArray(config.branches)) {
      config.branches = config.branches.map(branch => branch?.id === 'branch-1' ? {
        ...branch, address: OFFICIAL.address, phone: OFFICIAL.phone1,
        manager: OFFICIAL.proprietor
      } : branch);
    }
    return true;
  }
  function updateContactDisplay() {
    const textValues = {
      footerProprietor: OFFICIAL.proprietor,
      footerShowroomAddress: OFFICIAL.address,
      footerPhonesText: '+91 ' + OFFICIAL.phone1,
      footerEmailText: OFFICIAL.ownerEmail,
      messageWhatsAppChannelLabel: '💬 Send via WhatsApp (+91 ' + OFFICIAL.phone1 + ')'
    };
    Object.entries(textValues).forEach(([id,text])=>{ const el=byId(id);if(el)el.textContent=text; });
    [ 'storeContactCall','footerPhonesText','footerSocialCall','modalSocialCall','floatingCallLink','heroCallLink','drawerCallLink' ]
      .forEach(id=>{const el=byId(id);if(el)el.href=PHONE_URI;});
    [ 'storeContactWhatsApp','footerSocialWhatsApp','modalSocialWhatsApp','floatingWhatsAppLink','heroWhatsAppLink','drawerWhatsAppLink' ]
      .forEach(id=>{const el=byId(id);if(el){el.href=WA_URI;el.classList.remove('hidden');}});
    [ 'storeContactEmail','footerEmailText','modalSocialEmail' ]
      .forEach(id=>{const el=byId(id);if(el)el.href=EMAIL_URI;});
    for (const [id,value] of Object.entries({cmsPhone1:OFFICIAL.phone1,cmsPhone2:'',cmsProprietor:OFFICIAL.proprietor,cmsAddress:OFFICIAL.address,cmsOwnerEmail:OFFICIAL.ownerEmail,socialWhatsAppNumber:OFFICIAL.whatsappPhone})) {
      const input=byId(id);
      if(input && !input.matches(':focus')) input.value=value;
    }
  }
  function refresh() {ensureOfficialConfig();updateContactDisplay();}
  // The original helper is used after Firebase public/admin settings arrive. Patch around it
  // rather than copying or replacing the larger js/app.js application.
  const originalSync=window.syncLiveCmsUI;
  if(typeof originalSync==='function') {
    window.syncLiveCmsUI=function(...args){
      ensureOfficialConfig();
      try{return originalSync.apply(this,args);}finally{updateContactDisplay();}
    };
  }
  const originalMessage=window.handleSendMessageToOwner;
  if(typeof originalMessage==='function') {
    window.handleSendMessageToOwner=function(...args){ensureOfficialConfig();return originalMessage.apply(this,args);};
  }
  const originalBranches=window.renderBranchesInDashboard;
  if(typeof originalBranches==='function') {
    window.renderBranchesInDashboard=function(...args){ensureOfficialConfig();return originalBranches.apply(this,args);};
  }

  window.mqbV32PublishOfficialContact=async () => {
    const live=window.mqbLive;
    const status=byId('mqb32PublishContactStatus');
    const btn=byId('mqb32PublishContactBtn');
    const report=(s,bad=false)=>{if(status){status.textContent=s;status.style.color=bad?'#9f2222':'#185b37';}};
    if(!live?.db || !live?.auth?.currentUser || !live?.verifiedAdmin || !['admin','owner'].includes(live.activeRole)) {
      report('Sign in as an authorized Super Admin or Owner to publish store contact details.',true);return;
    }
    if(!confirm('Save the V32 official owner, address, email and only phone/WhatsApp number to Firebase? Existing products, orders, settings and QR payments are not changed.')) return;
    if(btn)btn.disabled=true;
    report('Saving official contacts to Firebase…');
    try{
      // Merge only the six contact fields; no setting subtrees or order data are replaced.
      await live.db.ref('adminData/settings/config').update(OFFICIAL);
      await live.db.ref('publicSettings').update(OFFICIAL);
      // Legacy branch metadata is also used by the private admin Branch tab. Preserve other branches/keys.
      const branchRef=live.db.ref('adminData/settings/config/branches');
      const snapshot=await branchRef.once('value');
      const data=snapshot.val();
      if(Array.isArray(data) && data.some(b=>b?.id==='branch-1')){
        const next=data.map(b=>b?.id==='branch-1'?{...b,phone:OFFICIAL.phone1,address:OFFICIAL.address,manager:OFFICIAL.proprietor}:b);
        await branchRef.set(next);
      }
      refresh();
      try{if(typeof config!=='undefined' && config) localStorage.setItem('mqb_v19_config',JSON.stringify(config));}catch{}
      report('✓ Official contacts saved. Customers will see one Call/WhatsApp number: +91 7337464501.');
    }catch(err){
      report('Firebase could not finish saving contacts: '+String(err?.message||err||'Unknown error').slice(0,150)+'. Do not assume settings have synced.',true);
    }finally{if(btn)btn.disabled=false;}
  };
  document.addEventListener('DOMContentLoaded',refresh);
})();
