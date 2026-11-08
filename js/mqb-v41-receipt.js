/* V41 receipt — private to the authenticated Firebase customer who placed it.
   Uses the customer's original anonymous or password session. Never trusts
   order ID alone, never uses an embedded service account, and never infers
   payment success from the URL. */
(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const text=(id,value)=>{const node=$(id);if(node)node.textContent=String(value??'—');};
  const money=value=> '₹'+(Number.isFinite(Number(value))?Number(value):0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});
  const date=value=>{
    const ms=typeof value==='number'?value:(/^\d+$/.test(String(value||''))?Number(value):Date.parse(value));
    return Number.isFinite(ms)&&ms>0?new Date(ms).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'}):'Not recorded';
  };
  const status=message=>{const n=$('notice');if(n){n.classList.add('error');n.querySelector('h1').textContent='Receipt unavailable';}text('loadingText',message);};
  const params=new URLSearchParams(location.search);const key=params.get('orderKey')||'';
  if(!/^[-A-Za-z0-9_]{8,128}$/.test(key))return status('This receipt link is not valid. Open your order history from the same device or contact the store.');
  if(!window.firebase?.auth||!window.firebase?.database)return status('Unable to load the secure order connection. Return to the store and try again.');
  const config={apiKey:'AIzaSyBcqj1WRGKYYgG3hONHjh3bfgXOwyUuyVM',authDomain:'moin-quran-box.firebaseapp.com',projectId:'moin-quran-box',databaseURL:'https://moin-quran-box-default-rtdb.firebaseio.com',appId:'1:623897373952:web:0514b4f11bcc977da3d7e5'};
  let app;
  try {app=firebase.apps.length?firebase.app():firebase.initializeApp(config);}
  catch{return status('Unable to connect to your order securely.');}
  app.auth().onAuthStateChanged(async user=>{
    if(!user)return status('Your customer session is not available. Open the receipt from the browser that placed the order, or sign into your account. No payment has been changed.');
    try {
      const snap=await app.database().ref('orderRequests/'+user.uid+'/'+key).once('value');
      const o=snap.val();
      if(!o || o.uid!==user.uid)return status('This order is not available in your signed-in customer account. Contact the store with your order ID.');
      if(o.paymentMethod!=='Razorpay'||o.paymentStatus!=='verified'||!o.paymentVerification||o.status==='Payment Pending')
        return status('Your order exists, but its Razorpay capture has not been verified. If money was deducted, do not pay again. Contact the store with your order ID.');
      const pv=o.paymentVerification;const verified=Number(pv.verifiedAmount);
      if(!Number.isFinite(verified)||verified<=0||!String(pv.razorpayPaymentId||'').startsWith('pay_'))
        return status('The server payment verification details are incomplete. Do not pay again. Contact the store.');
      text('orderId',o.orderId||key);text('paidAmount',money(verified));text('totalAmount',money(verified));
      text('orderStatus',o.status||'Confirmed');text('orderDate',date(o.date));text('paymentMethod','Razorpay online payment');
      text('paymentStatus','Captured · verified');text('verifiedAmount',money(verified));
      text('razorpayPaymentId',pv.razorpayPaymentId);text('razorpayOrderId',pv.razorpayOrderId||'Not recorded');
      text('verifiedAt',date(pv.verifiedAtMs??pv.verifiedAt));
      text('customerName',o.customerName||'Not provided');text('customerPhone',o.customerPhone||'Not provided');
      text('deliveryAddress',[o.address,o.postalCode].filter(Boolean).join(' · '));text('shippingStatus',o.status||'Confirmed');
      const list=$('items');list.replaceChildren();
      for(const item of Array.isArray(o.items)?o.items:[]){
        const qty=Math.max(1,Math.floor(Number(item.qty)||1));
        const row=document.createElement('div');row.className='item';
        const product=document.createElement('div');
        const title=document.createElement('strong');title.textContent=String(item.title||'Product').slice(0,180);
        const detail=document.createElement('small');detail.textContent='Quantity '+qty+' · '+money(item.salePrice)+' each';
        product.append(title,detail);
        const amount=document.createElement('strong');amount.textContent=money(qty*Number(item.salePrice||0));
        row.append(product,amount);list.append(row);
      }
      $('notice').style.display='none';$('receipt').style.display='block';
    } catch(error) {status('Your secure order details could not be loaded. Please sign in using the same account/device, or contact the store. '+String(error?.code||'').slice(0,70));}
  });
})();
