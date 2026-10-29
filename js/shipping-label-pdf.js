/* MOIN QURAN BOX V25.5 — store-prepared shipping label, 4 x 6 inches.
 * NOT a carrier-issued AWB or proof of a booked shipment.
 * PDF generated locally on the staff device, never uploaded to public hosting.
 */
(() => {
  'use strict';
  const clean=v=>String(v??'').normalize('NFKD').replace(/[\u2010-\u2015]/g,'-')
    .replace(/[\u2018\u2019]/g,"'").replace(/[\u201C\u201D]/g,'"')
    .replace(/[^\x20-\x7E]/g,' ').replace(/\s+/g,' ').trim();
  const e=v=>clean(v).replace(/[\\()]/g,'\\$&');
  const clip=(v,n=200)=>clean(v).slice(0,n);
  function fields({order:o={},shop:s={},profile:p={}}){
    const sh=(o.shipping&&typeof o.shipping==='object')?o.shipping:{};
    return {
      brand:clip(s.brandName||'MOIN QURAN BOX',70),origin:clip(s.address||'Falaknuma, Hyderabad, Telangana 500012',230),
      originPhone:clip(s.phone1||'',32),
      name:clip(o.customerName||p.name||'',80),phone:clip(o.customerPhone||p.phone||'',32),
      address:clip([o.address,o.city,o.state].filter(Boolean).join(', '),320),
      pin:clip(o.postalCode||'',10),
      order:clip(o.orderId||o.__key||'NOT PROVIDED',75),
      carrier:clip(sh.carrier||o.courierName||'Not assigned',65),
      awb:clip(sh.trackingNumber||o.awb||'Pending courier allocation',85),
      payment:clip(o.paymentMethod||'Not recorded',50),
      paymentStatus:clip(o.paymentStatus||'unverified',35),
      itemCount:Array.isArray(o.items)?o.items.reduce((n,i)=>n+Math.max(0,Number(i.qty)||0),0):0,
      total:Number(o.paymentVerification?.verifiedAmount)||0
    };
  }
  function buildPdf(d){
    // 288 x 432 points = 4 x 6 inches, scalable to A4 via print settings.
    const c=[];const pt=(x,y,s,v,bold=false)=>{
      c.push('0.08 0.12 0.11 rg BT /'+(bold?'B':'R')+' '+s+' Tf '+x+' '+y+' Td ('+e(v)+') Tj ET');
    };
    const rule=(y)=>c.push('0.72 0.76 0.74 RG 13 '+y+' m 275 '+y+' l S');
    const box=(x,y,w,h)=>c.push('0.12 0.23 0.18 RG '+x+' '+y+' '+w+' '+h+' re S');
    const wrap=(v,cap,max)=>{const words=clean(v).split(' '),lines=[];let line='';
      for(const w of words){if(!w)continue;if((line+' '+w).trim().length>cap){if(line)lines.push(line);line=w;}else line=(line+' '+w).trim();}
      if(line)lines.push(line);return lines.slice(0,max);
    };
    c.push('0.09 0.20 0.15 rg 0 386 288 46 re f');
    c.push('1 1 1 rg BT /B 16 Tf 13 412 Td ('+e(d.brand).slice(0,72)+') Tj ET');
    c.push('1 1 1 rg BT /R 8 Tf 13 396 Td (STORE PREPARED SHIPPING LABEL) Tj ET');
    pt(13,370,8,'ORDER: '+d.order,true);rule(360);
    pt(13,345,8,'FROM / SHIPPER',true);
    let y=331;for(const line of wrap(d.origin,53,3)){pt(13,y,8,line);y-=11;}
    if(d.originPhone){pt(13,y,8,'Contact: '+d.originPhone);y-=11;}
    rule(y-6);y-=23;
    pt(13,y,9,'SHIP TO / RECIPIENT',true);y-=17;
    pt(13,y,11,d.name.slice(0,37),true);y-=17;
    for(const line of wrap(d.address,47,5)){pt(13,y,9,line);y-=13;}
    pt(13,y-1,13,'PIN: '+d.pin,true);y-=19;
    pt(13,y,9,'PHONE: '+d.phone,true);y-=18;
    rule(y);y-=16;
    pt(13,y,9,'COURIER: '+d.carrier,true);y-=15;
    for(const l of wrap('AWB: '+d.awb,43,2)){pt(13,y,9,l);y-=14;}
    pt(13,y,9,'PARCEL ITEMS: '+d.itemCount);y-=15;
    pt(13,y,9,'PAYMENT: '+d.payment);y-=14;
    pt(13,y,8,'STATUS: '+d.paymentStatus);y-=13;
    // No collection figure without a securely confirmed amount; never print customer estimated total as COD due.
    rule(Math.max(39,y-2));
    pt(13,27,7,'Verify courier booking, COD amount and AWB before dispatch.');
    pt(13,16,7,'This label is NOT a courier-issued waybill or proof of payment.');
    const stream=c.join('\n')+'\n';
    const objs=[null];const add=x=>(objs.push(x),objs.length-1);
    const pages=add('');const regular=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
    const bold=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
    const content=add('<< /Length '+stream.length+' >>\nstream\n'+stream+'endstream');
    const page=add('<< /Type /Page /Parent '+pages+' 0 R /MediaBox [0 0 288 432] /Resources << /Font << /R '+regular+' 0 R /B '+bold+' 0 R >> >> /Contents '+content+' 0 R >>');
    objs[pages]='<< /Type /Pages /Kids ['+page+' 0 R] /Count 1 >>';
    const root=add('<< /Type /Catalog /Pages '+pages+' 0 R >>');
    let pdf='%PDF-1.4\n';const offsets=[0];
    for(let i=1;i<objs.length;i++){offsets.push(pdf.length);pdf+=i+' 0 obj\n'+objs[i]+'\nendobj\n';}
    const start=pdf.length;pdf+='xref\n0 '+objs.length+'\n0000000000 65535 f \n';
    for(const off of offsets.slice(1))pdf+=String(off).padStart(10,'0')+' 00000 n \n';
    pdf+='trailer\n<< /Size '+objs.length+' /Root '+root+' 0 R >>\nstartxref\n'+start+'\n%%EOF\n';
    return pdf;
  }
  function download(data){const d=fields(data);if(!d.name||!d.phone||!d.address||!/^[0-9]{6}$/.test(d.pin))throw Error('Missing recipient address information');
    const blob=new Blob([buildPdf(d)],{type:'application/pdf'});const url=URL.createObjectURL(blob);
    const a=document.createElement('a');a.href=url;a.download='MQB-Shipping-Label-'+d.order.replace(/[^A-Za-z0-9_-]/g,'_')+'.pdf';
    document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),12000);
    return a.download;
  }
  window.MQBShippingLabelPDF={fields,buildPdf,download};
})();
