/* MOIN QURAN BOX V33: reversible product removal and genuine customer feedback.
 * Customer submissions remain private pending explicit staff moderation.
 * Published star scores are calculated from approved reviews only.
 * Do not write Firebase rules here; authorization is server-enforced.
 */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const live = () => window.mqbLive;
  const role = () => (typeof currentUser !== 'undefined' && currentUser?.role) || '';
  const staff = () => !!live()?.verifiedAdmin && ['admin','owner','manager'].includes(role());
  const editor = () => !!live()?.verifiedAdmin && ['admin','owner'].includes(role());
  const val = v => String(v == null ? '' : v);
  const textEl = (tag, cls='', text='') => {
    const node=document.createElement(tag);if(cls)node.className=cls;node.textContent=text;return node;
  };
  const btn = (label, cls, action) => {
    const node=textEl('button',cls,label);node.type='button';
    node.addEventListener('click',action);return node;
  };
  const status=(id,message,isError=false)=>{
    const el=$(id);if(!el)return;
    el.textContent=message;el.style.color=isError?'#a03232':'#14663e';
  };
  const state={published:{},replies:{},pending:{},listening:false,adminFilter:''};
  const reviewList = productId => Object.entries(state.published?.[productId]||{})
    .filter(([uid,r])=>r&&Number.isInteger(Number(r.rating))&&Number(r.rating)>=1&&Number(r.rating)<=5)
    .map(([uid,r])=>({uid,...r})).sort((a,b)=>Number(b.approvedAt||0)-Number(a.approvedAt||0));
  const summary = id => {
    const list=reviewList(id), count=list.length;
    const avg=count?list.reduce((s,r)=>s+Number(r.rating),0)/count:0;
    return {count,avg,label:count?`★ ${avg.toFixed(1)} / 5 · ${count} review${count===1?'':'s'}`:'☆☆☆☆☆ No customer ratings yet'};
  };
  function decorateCards(){
    if(typeof products==='undefined')return;
    const grid=$('productGrid');
    if(grid){
      const inStock=$('filterInStockOnly')?.checked;
      const sort=$('filterSortOrder')?.value||'featured';
      let list=typeof currentCategory==='undefined'||currentCategory==='All'?[...products]:products.filter(p=>p.category===currentCategory);
      if(inStock)list=list.filter(p=>p.stock>0);
      if(sort==='low-to-high')list.sort((a,b)=>a.salePrice-b.salePrice);
      if(sort==='high-to-low')list.sort((a,b)=>b.salePrice-a.salePrice);
      [...grid.children].forEach((card,index)=>{
        const p=list[index];if(!p)return;
        let el=card.querySelector('.mqb33-card-rating');
        if(!el){el=textEl('div','mqb33-card-rating');(card.querySelector('.p-3')||card).appendChild(el);}
        el.textContent=summary(p.id).label;el.title='Approved customer feedback only';
      });
    }
    const featured=$('mqbV26Products');
    if(featured){
      const cards=featured.querySelectorAll('.mqb26-product');
      const list=products.filter(p=>Number(p.stock)>0).slice(0,4);
      cards.forEach((card,i)=>{
        const p=list[i];if(!p)return;
        let el=card.querySelector('.mqb33-card-rating');
        if(!el){el=textEl('div','mqb33-card-rating');(card.querySelector('.mqb26-productbody')||card).appendChild(el);}
        el.textContent=summary(p.id).label;
      });
    }
  }
  function fillProductOptions(selectedId){
    const select=$('mqb33FeedbackProduct');if(!select||typeof products==='undefined')return;
    const previous=selectedId||select.value;
    select.replaceChildren();
    for(const p of products){
      const opt=document.createElement('option');opt.value=p.id;opt.textContent=p.title;select.append(opt);
    }
    if(products.some(p=>p.id===previous))select.value=previous;
  }
  window.mqb33OpenFeedback=(productId='')=>{
    fillProductOptions(productId);$('mqb33FeedbackModal')?.classList.remove('hidden');
    window.mqb33ShowProductReviews();
  };
  window.mqb33CloseFeedback=()=>$('mqb33FeedbackModal')?.classList.add('hidden');
  window.mqb33ShowProductReviews=()=>{
    const productId=$('mqb33FeedbackProduct')?.value;
    const list=reviewList(productId), holder=$('mqb33PublishedReviewList');
    if(!holder)return;holder.replaceChildren();
    const s=summary(productId);$('mqb33RatingSummary').textContent=s.label;
    if(!list.length){holder.append(textEl('p','mqb33-empty','No approved reviews for this product yet.'));return;}
    for(const review of list){
      const card=textEl('article','mqb33-review-card');
      card.append(textEl('div','mqb33-stars',`${'★'.repeat(Number(review.rating))}${'☆'.repeat(5-Number(review.rating))}  ${val(review.name).slice(0,80)}`));
      card.append(textEl('p','mqb33-review-comment',val(review.comment)));
      const reply=state.replies?.[productId]?.[review.uid]?.reply;
      if(reply)card.append(textEl('p','mqb33-store-reply','Store reply: '+val(reply)));
      holder.append(card);
    }
  };
  window.mqb33SubmitFeedback=async e=>{
    e.preventDefault();
    const fb=live(),user=fb?.auth?.currentUser, product=$('mqb33FeedbackProduct')?.value;
    if(!fb?.db||!user) return status('mqb33FeedbackStatus','Please sign in or start guest checkout in the same session before leaving feedback.',true);
    if(fb.verifiedAdmin)return status('mqb33FeedbackStatus','Use a customer account to submit customer feedback. Store staff can respond in the Staff Portal.',true);
    if(!products.some(p=>p.id===product))return status('mqb33FeedbackStatus','Select a currently available product.',true);
    const name=val($('mqb33ReviewName').value).trim().slice(0,80);
    const comment=val($('mqb33ReviewComment').value).trim().slice(0,800);
    const rating=Number($('mqb33ReviewStars').value);
    if(name.length<2||comment.length<8||!Number.isInteger(rating)||rating<1||rating>5){
      return status('mqb33FeedbackStatus','Enter a display name, 1–5 stars and a review of at least 8 characters.',true);
    }
    const submit=e.target.querySelector('button[type="submit"]');if(submit)submit.disabled=true;
    status('mqb33FeedbackStatus','Sending feedback for moderation…');
    try{
      await fb.db.ref('reviewSubmissions/'+product+'/'+user.uid).set({
        uid:user.uid, name,comment,rating,createdAt:firebase.database.ServerValue.TIMESTAMP
      });
      status('mqb33FeedbackStatus','Thank you! Your review was submitted privately and will appear after moderation.');
      $('mqb33ReviewComment').value='';
    }catch(err){
      status('mqb33FeedbackStatus','Review not submitted: '+(String(err?.code||err?.message||err)).slice(0,170)+'. You may have already submitted one review for this product.',true);
    }finally{if(submit)submit.disabled=false;}
  };
  function decorateInventory(){
    const tbody=$('adminInventoryTableBody');if(!tbody||typeof products==='undefined')return;
    [...tbody.querySelectorAll('tr')].forEach((row,i)=>{
      const p=products[i];if(!p)return;
      const cell=row.lastElementChild;if(!cell)return;
      const meta=textEl('div','mqb33-stock-rating',summary(p.id).label);
      const titleCell=row.firstElementChild;titleCell?.append(meta);
      const actions=textEl('div','mqb33-stock-actions');
      actions.append(btn('Reviews','mqb33-review-action',()=>{
        state.adminFilter=p.id;window.switchAdminTab?.('reviews');window.mqb33RenderAdminReviews?.();
      }));
      if(editor()) actions.append(btn('Delete / Remove','mqb33-remove-action',()=>window.mqb33RemoveProduct(p.id)));
      cell.append(actions);
    });
  }
  window.mqb33RemoveProduct=async productId=>{
    if(!editor())return alert('Only authorized Super Admin or Owner can remove products.');
    const p=products.find(x=>x.id===productId);
    if(!p)return alert('Product not found.');
    if(!confirm('Remove "'+p.title+'" from the active storefront, shopping and stock list? This is reversible; old orders and reviews remain intact.'))return;
    if(!confirm('Confirm: hide this product from shopping. Do not use this if it is part of an active pending order without checking that order first.'))return;
    try{
      await live().db.ref('catalog/'+p.id).update({active:false,removedAt:firebase.database.ServerValue.TIMESTAMP,removedBy:live().uid});
      alert('Product removed from active catalog. Use Removed products to restore it.');
    }catch(e){alert('Removal failed: '+String(e?.message||e));}
  };
  window.mqb33RestoreProduct=async id=>{
    if(!editor())return alert('Only authorized Super Admin or Owner can restore products.');
    if(!confirm('Restore this product to customer shopping and Stock?'))return;
    try{await live().db.ref('catalog/'+id).update({active:true,restoredAt:firebase.database.ServerValue.TIMESTAMP});}
    catch(e){alert('Restore failed: '+String(e?.message||e));}
  };
  window.mqb33RefreshArchived=()=>{
    const holder=$('mqb33ArchivedProducts'),box=$('mqb33ArchivePanel');
    if(!holder||!box)return;holder.replaceChildren();
    const list=live()?.catalogArchived||[];
    box.hidden=!editor();
    if(!editor())return;
    if(!list.length){holder.append(textEl('p','mqb33-empty','No removed products.'));return;}
    for(const p of list){
      const row=textEl('div','mqb33-archive-row');
      row.append(textEl('span','',p.title||p.id));
      row.append(btn('Restore','mqb33-restore-action',()=>window.mqb33RestoreProduct(p.id)));
      holder.append(row);
    }
  };
  async function loadAdminReviews(){
    const fb=live();if(!staff()||!fb?.db)return;
    status('mqb33ReviewAdminStatus','Loading private customer submissions…');
    try{
      const snap=await fb.db.ref('reviewSubmissions').once('value');
      state.pending=snap.val()||{};
      status('mqb33ReviewAdminStatus','Customer feedback loaded. Approve genuine submissions to show public ratings.');
      window.mqb33RenderAdminReviews();
    }catch(err){
      status('mqb33ReviewAdminStatus','Reviews unavailable: '+String(err?.code||err?.message||err),true);
    }
  }
  window.mqb33RenderAdminReviews=()=>{
    const holder=$('mqb33AdminReviewList');if(!holder)return;
    holder.replaceChildren();
    if(!staff()){holder.append(textEl('p','','Authorized staff sign-in required.'));return;}
    const selected=state.adminFilter;
    const controls=textEl('div','mqb33-review-filter');
    const select=document.createElement('select');select.className='mqb33-review-select';
    select.append(new Option('All products',''));
    if(typeof products!=='undefined')products.forEach(p=>select.append(new Option(p.title,p.id)));
    select.value=selected;
    select.addEventListener('change',()=>{state.adminFilter=select.value;window.mqb33RenderAdminReviews();});
    controls.append(textEl('label','','Filter product: '),select);
    controls.append(btn('Reload customer submissions','mqb33-review-action',loadAdminReviews));
    holder.append(controls);
    let count=0;
    const productIds=Object.keys(state.pending||{});
    for(const pid of productIds){
      if(selected && pid!==selected)continue;
      for(const [uid,review] of Object.entries(state.pending?.[pid]||{})){
        if(!review||typeof review!=='object')continue;
        count++;
        const p=products?.find?.(p=>p.id===pid);
        const published=!!state.published?.[pid]?.[uid];
        const row=textEl('article','mqb33-review-card mqb33-admin-review');
        row.append(textEl('h5','mqb33-review-heading',(p?.title||pid)+(published?' — Published':' — Awaiting approval')));
        row.append(textEl('div','mqb33-stars',`${'★'.repeat(Number(review.rating)||0)}${'☆'.repeat(5-(Number(review.rating)||0))} · ${val(review.name)}`));
        row.append(textEl('p','mqb33-review-comment',val(review.comment)));
        const actions=textEl('div','mqb33-stock-actions');
        if(editor()){
          actions.append(btn(published?'Hide review':'Approve & publish','mqb33-review-action',()=>window.mqb33Moderate(pid,uid,!published)));
        }
        if(published){
          const existing=val(state.replies?.[pid]?.[uid]?.reply);
          const editorField=document.createElement('textarea');editorField.className='mqb33-reply-input';editorField.maxLength=500;editorField.rows=2;editorField.placeholder='Official store reply (clearly labelled)';editorField.value=existing;
          row.append(editorField);
          actions.append(btn('Save store reply','mqb33-review-action',()=>window.mqb33SaveReply(pid,uid,editorField.value)));
        }
        row.append(actions);holder.append(row);
      }
    }
    if(!count)holder.append(textEl('p','mqb33-empty','No customer feedback submissions found for this filter.'));
  };
  window.mqb33Moderate=async(pid,uid,approve)=>{
    if(!editor())return alert('Only Super Admin or Owner may approve/hide customer reviews.');
    const fb=live(),source=state.pending?.[pid]?.[uid];if(!source)return alert('Submission missing; reload first.');
    const product=products?.find?.(p=>p.id===pid);
    if(approve && !product)return alert('Restore the product before publishing a review.');
    if(!confirm((approve?'Publish':'Hide')+' this customer review without changing their rating or words?'))return;
    try{
      if(approve){
        await fb.db.ref('publishedReviews/'+pid+'/'+uid).set({
          rating:Number(source.rating),comment:source.comment,name:source.name,
          uid,approvedBy:fb.uid,approvedAt:firebase.database.ServerValue.TIMESTAMP
        });
      }else await fb.db.ref('publishedReviews/'+pid+'/'+uid).remove();
      status('mqb33ReviewAdminStatus',approve?'Review published with original customer words.':'Review hidden from storefront.');
    }catch(e){status('mqb33ReviewAdminStatus','Action not saved: '+String(e?.message||e),true);}
  };
  window.mqb33SaveReply=async(pid,uid,reply)=>{
    if(!staff())return alert('Authorized staff only.');
    const clean=val(reply).trim();
    if(clean.length<2||clean.length>500)return alert('Store reply must be 2–500 characters.');
    try{
      await live().db.ref('reviewReplies/'+pid+'/'+uid).set({
        reply:clean,byUid:live().uid,updatedAt:firebase.database.ServerValue.TIMESTAMP
      });
      status('mqb33ReviewAdminStatus','Official store reply saved and visible to customers.');
    }catch(e){status('mqb33ReviewAdminStatus','Reply not saved: '+String(e?.message||e),true);}
  };
  function setup(){
    if(typeof window.renderProducts==='function'){
      const previous=window.renderProducts;
      window.renderProducts=function(){const r=previous.apply(this,arguments);decorateCards();fillProductOptions();return r;};
    }
    if(typeof window.renderAdminInventory==='function'){
      const previous=window.renderAdminInventory;
      window.renderAdminInventory=function(){const r=previous.apply(this,arguments);decorateInventory();window.mqb33RefreshArchived();return r;};
    }
    if(typeof window.openProductDetails==='function'){
      const previous=window.openProductDetails;
      window.openProductDetails=function(productId){
        const r=previous.apply(this,arguments);
        const body=$('productDetailsContent');
        if(body && typeof products!=='undefined' && products.some(p=>p.id===productId)){
          const foot=textEl('div','mqb33-details-review');
          foot.append(textEl('span','mqb33-stars',summary(productId).label+'  '));
          foot.append(textEl('span','mqb33-detail-hint','To write a review, use Customer Feedback in the menu.'));
          body.append(foot);
        }
        return r;
      };
    }
    document.addEventListener('keydown',e=>{if(e.key==='Escape')window.mqb33CloseFeedback();});
    $('mqbLanguageSelect')?.addEventListener('change',()=>queueMicrotask(decorateCards));
    $('mqb33FeedbackModal')?.addEventListener('click',e=>{if(e.target.id==='mqb33FeedbackModal')window.mqb33CloseFeedback();});
    const fb=live();
    if(fb?.db && !state.listening){
      state.listening=true;
      fb.db.ref('publishedReviews').on('value',snap=>{
        state.published=snap.val()||{};
        decorateCards();window.mqb33ShowProductReviews();
        window.mqb33RenderAdminReviews();
      },err=>status('mqb33FeedbackStatus','Public ratings unavailable: '+String(err?.code||err),true));
      fb.db.ref('reviewReplies').on('value',snap=>{
        state.replies=snap.val()||{};
        window.mqb33ShowProductReviews();
        window.mqb33RenderAdminReviews();
      });
    }
    window.mqb33RefreshArchived();
    decorateCards();
    fillProductOptions();
  }
  // The existing app initializes Firebase at DOMContentLoaded. V33 follows that boot order.
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup);
  else setup();
  window.mqb33LoadAdminReviews=loadAdminReviews;
  // Reload private submissions each time staff opens Reviews.
  const previousTab=window.switchAdminTab;
  if(typeof previousTab==='function'){
    window.switchAdminTab=function(tab){
      const r=previousTab.apply(this,arguments);
      if(tab==='reviews')loadAdminReviews();
      return r;
    };
  }
})();