/* MOIN QURAN BOX V43 — professional 4 × 6 inch store-prepared parcel label.
 * Customer and destination are FIRST, with clear large type and landmark.
 * Shipper appears below. Large blank India Post courier-sticker zone is reserved.
 * This is NOT an India Post-issued waybill or proof of courier acceptance.
 * Downloaded locally by an authenticated staff user's existing dashboard only.
 */
(() => {
  'use strict';
  const clean=v=>String(v??'').normalize('NFKD').replace(/\u20B9/g,'INR ')
    .replace(/[\u2010-\u2015]/g,'-').replace(/[\u2018\u2019]/g,"'")
    .replace(/[\u201C\u201D]/g,'"').replace(/[^\x20-\x7E]/g,' ')
    .replace(/\s+/g,' ').trim();
  const pdfEscape=v=>clean(v).replace(/[\\()]/g,'\\$&');
  const take=(v,n=900)=>clean(v).slice(0,n);
  const originDefault='Madina Colony, Opposite Hafez Ustad Haleem, Falaknuma, Hyderabad, Telangana 500053';
  function fields({order:o={},shop:s={},profile:p={}}){
    const sh=(o.shipping&&typeof o.shipping==='object')?o.shipping:{};
    const note=take(o.landmark||o.deliveryLandmark||o.deliveryNote||'',250)
      .split(/\s*\|\s*Location pin:/i)[0].replace(/\bLocation pin:\s*https?:\/\/\S+/ig,'').trim();
    const landmark=note.replace(/^\s*(?:landmark|delivery note)\s*:\s*/i,'');
    const pin=take(o.postalCode||o.pinCode||o.pincode||'',12);
    return {
      brand:take(s.brandName||'MOIN QURAN BOX',85),
      origin:take(s.address||originDefault,450),
      originPhone:take(s.phone1||'+91 7337464501',32),
      name:take(o.customerName||p.name||'',120),
      phone:take(o.customerPhone||p.phone||'',36),
      address:take([o.address,o.city,o.state].filter(Boolean).join(', '),900),
      landmark:take(landmark,240),pin,
      order:take(o.orderId||o.__key||'NOT PROVIDED',100),
      carrier:take(sh.carrier||o.courierName||'India Post',60),
      awb:take(sh.trackingNumber||o.awb||'',100),
      payment:take(o.paymentMethod||'Not recorded',45),
      paymentStatus:take(o.paymentStatus||'unverified',40),
      itemCount:Array.isArray(o.items)?o.items.reduce((n,i)=>n+Math.max(0,Math.floor(Number(i.qty)||0)),0):0,
      gifts:take((window.mqb42OfferGiftsForOrder?.(o)||[]).join(', '),190)
    };
  }
  function widthPt(value,size,bold=false){
    // Conservative widths for PDF Helvetica. Keep a 6pt safe margin on wrap.
    let n=0;
    for(const ch of clean(value)){
      if('ilI1.,:;!| '.includes(ch))n+=.30;
      else if('MW@#%&'.includes(ch))n+=.92;
      else if(/[A-Z]/.test(ch))n+=.71;
      else n+=.55;
    }
    return n*size*(bold?1.07:1.04);
  }
  function wrap(value,maxWidth,size=10,bold=false,maxLines=8){
    const words=clean(value).split(' ').filter(Boolean),lines=[];
    let line='';
    for(let word of words){
      while(word && widthPt(word,size,bold)>maxWidth){
        if(line){lines.push(line);line='';}
        let cut=1;while(cut<word.length && widthPt(word.slice(0,cut+1),size,bold)<=maxWidth)cut++;
        lines.push(word.slice(0,cut));word=word.slice(cut);
      }
      if(!word)continue;
      if(line && widthPt(line+' '+word,size,bold)>maxWidth){lines.push(line);line=word;}
      else line+=(line?' ':'')+word;
    }
    if(line)lines.push(line);
    if(lines.length>maxLines)throw Error('Address/name is too long for a readable 4x6 label. Please shorten delivery text without omitting vital details.');
    return lines.length?lines:[''];
  }
  function pageStream(d){
    if(!d.name||!d.phone||!d.address||!/^\d{6}$/.test(d.pin))throw Error('Recipient name, phone, complete address and 6-digit PIN are required for '+d.order);
    const c=['1 w'];
    const ink=(r=.09,g=.15,b=.12)=>c.push(`${r} ${g} ${b} rg`);
    const txt=(x,y,size,value,bold=false)=>{ink();c.push(`BT /${bold?'B':'R'} ${size} Tf ${x} ${y} Td (${pdfEscape(value)}) Tj ET`);};
    const rule=(y)=>c.push(`0.35 0.45 0.38 RG 12 ${y} m 276 ${y} l S`);
    const box=(x,y,w,h)=>c.push(`0.4 0.48 0.43 RG ${x} ${y} ${w} ${h} re S`);
    box(7,7,274,418);
    // 1. Destination: highest priority, large clear text; never truncate silently.
    c.push('0.09 0.23 0.16 rg 8 406 272 18 re f');
    c.push('1 1 1 rg BT /B 9 Tf 15 411 Td (DELIVER TO - CUSTOMER ADDRESS) Tj ET');
    const recipient=wrap(d.name.toUpperCase(),252,13.5,true,2);
    recipient.forEach((line,i)=>txt(15,386-i*16,13.5,line,true));
    const addr=wrap(d.address,253,10.5,false,6);
    txt(15,351,8,'HOUSE / STREET / AREA / CITY / STATE',true);
    addr.forEach((line,i)=>txt(15,335-i*12,10.5,line,false));
    if(d.landmark){
      const lm=wrap('LANDMARK: '+d.landmark,252,9.5,true,2);
      lm.forEach((line,i)=>txt(15,263-i*11,9.5,line,true));
    }
    txt(15,230,17,'PIN: '+d.pin,true);
    const digits=d.phone.replace(/\D/g,'');
    txt(15,213,10.5,'MOBILE: '+d.phone,true);
    rule(205);
    // 2. Sender / return information follows destination.
    txt(15,193,8,'FROM / RETURN TO',true);
    const brand=wrap(d.brand.toUpperCase(),250,10.5,true,1);
    txt(15,180,10.5,brand[0],true);
    const origin=wrap(d.origin,251,8.3,false,3);
    origin.forEach((line,i)=>txt(15,169-i*10,8.3,line));
    txt(15,137,8.3,'PHONE: '+d.originPhone);
    // 3. Blank sticker area, NO simulated barcode / no invented AWB.
    box(14,39,260,91);
    txt(32,88,9,'SPACE FOR INDIA POST COURIER STICKER',true);
    txt(43,75,8,'Paste official AWB / barcode label here');
    txt(15,28,8,'ORDER: '+d.order,true);
    const method=/cod/i.test(d.payment)?'COD':d.paymentStatus==='verified'?'PAID / VERIFIED':'UNPAID - VERIFY BEFORE DISPATCH';
    txt(15,16,8,'PAYMENT: '+method+'   |   PIECES: '+d.itemCount);
    // The AWB is printed only if the official sticker is not yet on the parcel.
    if(d.awb && widthPt('ORDER: '+d.order,8,true)<145 && widthPt('AWB: '+d.awb,7,true)<103)txt(166,28,7,'AWB: '+d.awb,true);
    return c.join('\n')+'\n';
  }
  function buildMultiPdf(dataset){
    if(!Array.isArray(dataset)||!dataset.length||dataset.length>2000)throw Error('Choose 1 to 2,000 shipping labels per PDF.');
    const objs=[null];const add=x=>(objs.push(x),objs.length-1);
    const pages=add('');
    const regular=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
    const bold=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
    const kids=[];
    for(const d of dataset){
      const stream=pageStream(d);
      const content=add('<< /Length '+stream.length+' >>\nstream\n'+stream+'endstream');
      kids.push(add('<< /Type /Page /Parent '+pages+' 0 R /MediaBox [0 0 288 432] /Resources << /Font << /R '+regular+' 0 R /B '+bold+' 0 R >> >> /Contents '+content+' 0 R >>')+' 0 R');
    }
    objs[pages]='<< /Type /Pages /Kids ['+kids.join(' ')+'] /Count '+kids.length+' >>';
    const root=add('<< /Type /Catalog /Pages '+pages+' 0 R >>');
    let pdf='%PDF-1.4\n';const offsets=[0];
    for(let i=1;i<objs.length;i++){offsets.push(pdf.length);pdf+=i+' 0 obj\n'+objs[i]+'\nendobj\n';}
    const start=pdf.length;pdf+='xref\n0 '+objs.length+'\n0000000000 65535 f \n';
    for(const off of offsets.slice(1))pdf+=String(off).padStart(10,'0')+' 00000 n \n';
    pdf+='trailer\n<< /Size '+objs.length+' /Root '+root+' 0 R >>\nstartxref\n'+start+'\n%%EOF\n';
    return pdf;
  }
  const buildPdf=d=>buildMultiPdf([d]);
  function downloadMany(records){
    if(!Array.isArray(records)||!records.length)throw Error('No shipping labels selected.');
    const d=records.map(fields),seen=new Set();
    for(const x of d){
      if(!x.name||!x.phone||!x.address||!/^\d{6}$/.test(x.pin))throw Error('Missing recipient address on '+x.order);
      if(seen.has(x.order))throw Error('Duplicate order ID '+x.order+' in batch. No PDF downloaded.');
      seen.add(x.order);
    }
    const pdf=buildMultiPdf(d);
    const url=URL.createObjectURL(new Blob([pdf],{type:'application/pdf'})),a=document.createElement('a');
    a.href=url;a.download='MQB-Shipping-Labels-'+new Date().toISOString().slice(0,10)+'-'+d.length+'-orders.pdf';
    document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),15000);
    return {count:d.length,filename:a.download};
  }
  function download(data){const d=fields(data);const pdf=buildPdf(d);
    const url=URL.createObjectURL(new Blob([pdf],{type:'application/pdf'})),a=document.createElement('a');
    a.href=url;a.download='MQB-Shipping-Label-'+d.order.replace(/[^A-Za-z0-9_-]/g,'_')+'.pdf';
    document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),15000);
    return a.download;
  }
  window.MQBShippingLabelPDF={fields,buildPdf,buildMultiPdf,download,downloadMany};
})();
