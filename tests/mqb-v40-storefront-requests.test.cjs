'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const page=read('index.html'),live=read('js/firebase-live.js'),app=read('js/app.js'),store=read('js/storefront-v26.js'),ratings=read('js/product-feedback-v33.js');

test('guest email is optional and old consent block is not shown',()=>{
 const input=page.match(/<input\s+id="chkEmail"[^>]*>/);
 assert.ok(input,'Guest email input missing');
 assert.doesNotMatch(input[0].replace(/placeholder="[^"]*"/,''),/\srequired(?:\s|=|>)/);
 assert.match(page,/Email \(optional/);
 assert.doesNotMatch(page,/<fieldset class="mqb34-consent"/);
 assert.doesNotMatch(live,/form\.orderUpdatesConsent\s*=/);
});
test('password-based account registration still requires email',()=>{
 assert.match(page,/<input type="email" required id="cxRegEmail"/);
});
test('new orders remain pending until backend verifies Razorpay',()=>{
 assert.match(live,/status:form\.paymentMethod==='Razorpay'\?'Payment Pending'/);
 assert.match(live,/paymentStatus:form\.paymentMethod==='Razorpay'\?'pending'/);
});
test('verified super admin can toggle featured section through public Firebase',()=>{
 assert.match(app,/featuredCollection:\s*false/);
 assert.match(app,/verifiedAdmin/);
 assert.match(app,/publicSettings\/featuredCollectionEnabled/);
 assert.match(store,/publicFeaturedCollectionEnabled===true/);
 assert.match(store,/collection\.hidden=!collectionEnabled/);
 assert.match(store,/<section class="mqb26-featured" hidden/);
});
test('empty rating placeholder is removed while genuine ratings remain',()=>{
 assert.doesNotMatch(ratings,/No customer ratings yet/);
 assert.match(ratings,/if\(!rating\.count\)\{el\?\.remove\(\)/);
 assert.match(ratings,/if\(rating\.count\)/);
});
test('staff order categories, dates and server-data-safe cancelled archive',()=>{
 for(const name of ['pending','confirmed','inprogress','delivered','cancelled','all'])assert.match(page,new RegExp(`data-group="${name}"`));
 assert.match(page,/mqb40DateFrom/);assert.match(page,/mqb40DateTo/);
 assert.match(live,/mqb40GroupOf/);
 assert.match(live,/isSuperAdmin\(\) && o\.status==='Cancelled'/);
 assert.match(live,/adminData\/orderArchive/);
 assert.match(live,/This hides the record from active staff orders only/);
 assert.doesNotMatch(live,/\.ref\('orderRequests\/.*\)\.remove\(\)/);
});
test('no production Razorpay activation in this patch',()=>{
 const config=read('js/razorpay-v38-approved-config.js');
 assert.match(config,/enabled:\s*false/);
});
