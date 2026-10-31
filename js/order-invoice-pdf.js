/* MOIN QURAN BOX V34 professional NON-TAX order invoice / order statement.
 * From Firebase-authorized orders only. No GST invoice or payment proof is implied.
 * Works offline without paid PDF libraries. */
(() => {
 'use strict';
 const clean = s => String(s ?? '').normalize('NFKD').replace(/[₹]/g,'INR ').replace(/[\u2010-\u2015]/g,'-')
   .replace(/[\u2018\u2019]/g,"'").replace(/[\u201C\u201D]/g,'"').replace(/[^\x20-\x7E]/g,'?').replace(/\s+/g,' ').trim();
 const esc = s => clean(s).replace(/[\\()]/g,'\\$&');
 const amt = n => 'INR '+Math.max(0,Number(n)||0).toFixed(2);
 const trim = (s,max=250) => clean(s).slice(0,max);
 const fields = ({order,shop,profile}) => {
   const o=order||{},c=shop||{},p=profile||{};
   const items=(Array.isArray(o.items)?o.items:[]).map(x=>({
     title:trim(x.title||x.name||'Product',160),
     qty:Math.max(0,Number(x.qty??x.quantity)||0),
     unit:Math.max(0,Number(x.salePrice??x.unitPrice??x.price)||0)
   }));
   return {
     shop:trim(c.brandName||'MOIN QURAN BOX',80), proprietor:trim(c.proprietor||'Shaik Muneer Uddin',80),
     shopAddress:trim(c.address||'Madina Colony, Opposite Hafez Ustad Haleem, Falaknuma, Hyderabad 500053',250),
     phone:trim(c.phone1||'+91 7337464501',50),email:trim(c.email||'mquranbox@gmail.com',90),
     orderId:trim(o.orderId||o.__key||'Unknown',100), date:trim(o.date||new Date().toISOString(),60),
     status:trim(o.status||'Requested',50),payment:trim(o.paymentStatus||'unverified',40),method:trim(o.paymentMethod||'Unspecified',40),
     channel:trim(o.channel||'Website request',60),name:trim(o.customerName||p.name||'Customer',100),
     customerEmail:trim(o.customerEmail||o.email||p.email||'',120),customerPhone:trim(o.customerPhone||p.phone||'',45),
     address:trim([o.address,o.city,o.state,o.postalCode].filter(Boolean).join(', '),330),
     courier:trim(o.shipping?.carrier||o.courierName||'',100),awb:trim(o.shipping?.trackingNumber||o.awb||'',100),
     total:Math.max(0,Number(o.total)||0),final:Math.max(0,Number(o.paymentRequest?.amount)||0),
     items
   };
 };
 function buildPdf(d){
   const streams=[];let cmds=[],y=0,page=0;const W=595,H=842;
   const paint=s=>cmds.push(s);
   const rect=(x,bottom,w,h,r,g,b)=>paint(`${r} ${g} ${b} rg ${x} ${bottom} ${w} ${h} re f`);
   const txt=(x,at,body,size=10,bold=false,color=[0.14,0.23,0.18])=>{
     paint(`${color[0]} ${color[1]} ${color[2]} rg BT /${bold?'F2':'F1'} ${size} Tf ${x} ${at} Td (${esc(body)}) Tj ET`);
   };
   const rule=(at)=>{paint('0.83 0.86 0.82 RG 42 '+at+' m 553 '+at+' l S');};
   function footer(){
     rule(55);txt(42,40,'MOIN QURAN BOX  |  Hyderabad  |  '+d.phone,8,false,[.39,.44,.39]);
     txt(42,27,'NON-TAX ORDER RECORD - not a GST tax invoice or proof of payment',8,true,[.55,.33,.16]);
     txt(527,27,String(page),8,false,[.3,.3,.3]);
   }
   function next(){
     if(cmds.length){footer();streams.push(cmds.join('\n')+'\n');}
     cmds=[];page++;
     rect(0,745,W,97,.09,.21,.16);rect(0,742,W,3,.73,.56,.27);
     txt(42,793,d.shop,21,true,[1,1,1]);
     txt(42,769,'ORDER SUMMARY  /  NON-TAX RECORD',10,true,[.91,.81,.60]);
     y=724;
   }
   function wrap(s,width=82){
     const words=clean(s).split(/\s+/).filter(Boolean),res=[];let line='';
     for(let word of words){
       while(word.length>width){if(line){res.push(line);line='';}res.push(word.slice(0,width));word=word.slice(width);}
       if((line?line.length+1:0)+word.length>width){res.push(line);line=word;}else line+=(line?' ':'')+word;
     }
     if(line)res.push(line);return res.length?res:[''];
   }
   function paragraph(label,value){
     const content=label?`${label}: ${value}`:String(value||'');const lines=wrap(content,101);
     for(const line of lines){if(y<94)next();txt(43,y,line,9,false);y-=14;}
   }
   function section(title){if(y<115)next();y-=15;rule(y+8);txt(43,y-5,title.toUpperCase(),10,true,[.08,.28,.18]);y-=27;}
   next();
   rect(42,y-70,511,66,.95,.97,.94);
   txt(52,y-20,'ORDER REFERENCE',8,true,[.34,.44,.37]);txt(52,y-38,d.orderId,12,true);
   txt(330,y-20,'RECORDED ON',8,true,[.34,.44,.37]);txt(330,y-38,d.date.slice(0,19).replace('T',' '),10,true);
   y-=88;
   section('Store information');
   paragraph('Seller',d.proprietor+'  |  '+d.shop);
   paragraph('Address',d.shopAddress);
   paragraph('Call / WhatsApp',d.phone);
   paragraph('Email',d.email);
   section('Customer & delivery details');
   paragraph('Customer',d.name);
   if(d.customerPhone)paragraph('Phone',d.customerPhone);
   if(d.customerEmail)paragraph('Email',d.customerEmail);
   paragraph('Deliver to',d.address);
   section('Order & payment details');
   paragraph('Order status',d.status+'  |  Payment: '+d.payment+'  |  '+d.method);
   paragraph('Order channel',d.channel);
   if(d.courier)paragraph('Courier',d.courier);
   if(d.awb)paragraph('Tracking / AWB',d.awb);
   section('Items ordered');
   function rowHeader(){
     if(y<130)next();
     rect(42,y-9,511,26,.90,.93,.89);
     txt(49,y,'ITEM DESCRIPTION',9,true);txt(368,y,'QTY',9,true);
     txt(421,y,'UNIT PRICE',9,true);txt(517,y,'AMOUNT',9,true);y-=28;
   }
   rowHeader();
   if(!d.items.length)paragraph('Items','No stored line items');
   for(let i=0;i<d.items.length;i++){
     const row=d.items[i],lines=wrap(`${i+1}. ${row.title}`,55);
     if(y-lines.length*13<104){next();section('Items ordered — continued');rowHeader();}
     txt(49,y,lines[0],9,false);for(let j=1;j<lines.length;j++)txt(49,y-j*13,lines[j],9,false);
     txt(373,y,String(row.qty),9,false);txt(421,y,amt(row.unit),8,false);txt(509,y,amt(row.qty*row.unit).replace('INR ',''),8,true);
     y-=Math.max(25,lines.length*13+9);rule(y+9);
   }
   if(y<220)next();
   const subtotal=d.items.reduce((acc,it)=>acc+it.qty*it.unit,0);
   y-=8;txt(45,y,'Item subtotal at recorded prices',10,false);txt(430,y,amt(subtotal),10,true);y-=23;
   txt(45,y,'Order estimate recorded',11,true);txt(430,y,amt(d.total),11,true);y-=23;
   if(d.final>0){
     rect(42,y-22,511,35,.90,.96,.91);txt(53,y,'Owner-approved payable amount',10,true);txt(424,y,amt(d.final),10,true);y-=49;
   }else{paragraph('Delivery charges','Confirmed separately before payment');y-=6;}
   section('Important payment and tax information');
   paragraph('', 'This document is a non-tax order summary, not a GST tax invoice.');
   paragraph('', 'An approved payable amount does not mean that payment has been received.');
   paragraph('', 'Payment remains unverified unless separately confirmed by the store.');
   paragraph('', 'Stock, delivery charges and dispatch are subject to owner confirmation.');
   footer();streams.push(cmds.join('\n')+'\n');
   const objects=[null];const add=obj=>(objects.push(obj),objects.length-1);
   const pagesId=add('');const f1=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');const f2=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
   const ids=[];
   for(const stream of streams){
     const sid=add('<< /Length '+stream.length+' >>\nstream\n'+stream+'endstream');
     ids.push(add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R >> >> /Contents ${sid} 0 R >>`));
   }
   objects[pagesId]='<< /Type /Pages /Kids ['+ids.map(i=>i+' 0 R').join(' ')+'] /Count '+ids.length+' >>';
   const catalog=add('<< /Type /Catalog /Pages '+pagesId+' 0 R >>');let out='%PDF-1.4\n';const offsets=[0];
   for(let i=1;i<objects.length;i++){offsets.push(out.length);out+=i+' 0 obj\n'+objects[i]+'\nendobj\n';}
   const pos=out.length;out+='xref\n0 '+objects.length+'\n0000000000 65535 f \n';
   for(const x of offsets.slice(1))out+=String(x).padStart(10,'0')+' 00000 n \n';
   out+='trailer\n<< /Size '+objects.length+' /Root '+catalog+' 0 R >>\nstartxref\n'+pos+'\n%%EOF\n';return out;
 }
 function saveInvoice({order,shop,profile}){
   const data=fields({order,shop,profile}),pdf=buildPdf(data);
   const blob=new Blob([pdf],{type:'application/pdf'}),url=URL.createObjectURL(blob),a=document.createElement('a');
   a.href=url;a.download='MOIN-QURAN-BOX-order-'+(data.orderId.replace(/[^a-zA-Z0-9_-]/g,'_')||'statement')+'.pdf';
   document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),15000);
   return {pdf,filename:a.download};
 }
 window.MQBInvoicePDF={saveInvoice,invoiceFields:fields,buildPdf};
})();
