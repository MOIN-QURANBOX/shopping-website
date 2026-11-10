/* MOIN QURAN BOX V51 — product photo crop-before-upload.
 * Changes ONLY the file selected in either product-photo input, before V35's
 * existing compressor/upload listeners see it. Does NOT write catalog/orders.
 * Square white-padded output keeps the selected composition visible even on
 * product cards using object-fit:cover. Local files only; remote URLs untouched.
 */
(function(){
'use strict';
const IDS=new Set(['mqb353MainImageFile','mqb353SecondImageFile']);
const $=id=>document.getElementById(id);
let active=null,replaying=false;
const status=(v,error=false)=>{const n=$('mqb51CropStatus');if(n){n.textContent=v||'';n.style.color=error?'#a42f24':'#43584b';}};
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const modal=()=> $('mqb51CropModal');
function close(cancel=true){
  const m=modal();if(m)m.hidden=true;
  document.body.classList.remove('mqb51-crop-open');
  const last=active;active=null;
  if(last){
    if(last.url)URL.revokeObjectURL(last.url);
    if(cancel)last.input.value=''; // Does not touch the existing saved product photo.
    last.input.focus();
  }
}
function draw(){
 if(!active)return;
 const canvas=$('mqb51CropCanvas'),ctx=canvas?.getContext('2d');if(!ctx)return;
 const {img,zoom,panX,panY}=active;const size=canvas.width;
 ctx.clearRect(0,0,size,size);ctx.fillStyle='#fff';ctx.fillRect(0,0,size,size);
 const fit=Math.min((size*.96)/img.naturalWidth,(size*.96)/img.naturalHeight);
 const w=img.naturalWidth*fit*zoom,h=img.naturalHeight*fit*zoom;
 ctx.save();ctx.beginPath();ctx.rect(0,0,size,size);ctx.clip();ctx.drawImage(img,(size-w)/2+panX,(size-h)/2+panY,w,h);ctx.restore();
 const z=$('mqb51ZoomText');if(z)z.textContent=Math.round(zoom*100)+'%';
}
function openCrop(input,file){
 if(active){input.value='';return;}
 if(!/^image\/(png|jpeg|webp)$/i.test(file.type)){alert('Choose a JPG, PNG or WebP product photo.');input.value='';return;}
 if(file.size>20*1024*1024){alert('Please select a photo smaller than 20 MB.');input.value='';return;}
 const url=URL.createObjectURL(file),img=new Image();
 active={input,file,url,img,zoom:1,panX:0,panY:0};
 const m=modal();if(!m){close();return;}
 m.hidden=false;document.body.classList.add('mqb51-crop-open');
 $('mqb51Zoom').value='100';
 $('mqb51CropTarget').textContent=input.id==='mqb353MainImageFile'?'Main product photo':'Second gallery photo';
 status('Fit entire photo keeps all edges visible. Zoom or drag to crop intentionally.');
 img.onload=()=>{if(!active||active.img!==img)return;draw();$('mqb51CropSave')?.focus();};
 img.onerror=()=>{status('Unable to open this photo. Try JPEG, PNG or WebP.',true);};
 img.src=url;
}
async function makeBlob(canvas){
 // Keep well below the existing RTDB 70KB base64 image ceiling.
 let edge=620,quality=.81,blob=null;
 for(let i=0;i<13;i++){
   const out=document.createElement('canvas');out.width=out.height=edge;
   const c=out.getContext('2d');c.fillStyle='#fff';c.fillRect(0,0,edge,edge);
   c.drawImage(canvas,0,0,edge,edge);
   blob=await new Promise(resolve=>out.toBlob(resolve,'image/jpeg',quality));
   if(blob && blob.size<=45000)return blob;
   if(quality>.44)quality-=.085;
   else {edge=Math.max(360,Math.round(edge*.83));quality=.7;}
 }
 if(!blob||blob.size>53000)throw Error('This photo is too detailed to compress within the store image limit. Try a simpler photo or a hosted HTTPS image URL.');
 return blob;
}
async function applyCrop(){
 if(!active||!active.img.complete||!active.img.naturalWidth)return;
 const btn=$('mqb51CropSave');btn.disabled=true;status('Preparing your exact crop…');
 try{
   const file=await makeBlob($('mqb51CropCanvas'));
   const dt=new DataTransfer();dt.items.add(new File([file],(active.file.name||'product').replace(/\.[^.]+$/,'')+'-cropped.jpg',{type:'image/jpeg',lastModified:Date.now()}));
   const input=active.input;input.files=dt.files;
   // Existing handlers still perform the normal preview/compression and save.
   close(false);replaying=true;
   try{input.dispatchEvent(new Event('change',{bubbles:true}));}finally{replaying=false;}
 }catch(err){status(err.message||'Crop could not be saved.',true);}
 finally{if(btn)btn.disabled=false;}
}
function init(){
 const m=modal();if(!m)return;
 // Capturing at window prevents the old inline onchange and V35 target handlers
 // from processing the original un-cropped file.
 window.addEventListener('change',e=>{
   const input=e.target;if(replaying||!input||!IDS.has(input.id)||!input.files?.length)return;
   e.stopImmediatePropagation();e.preventDefault();
   openCrop(input,input.files[0]);
 },true);
 $('mqb51CropCancel')?.addEventListener('click',()=>close());
 $('mqb51CropClose')?.addEventListener('click',()=>close());
 $('mqb51CropSave')?.addEventListener('click',applyCrop);
 $('mqb51CropFit')?.addEventListener('click',()=>{if(!active)return;active.zoom=1;active.panX=active.panY=0;$('mqb51Zoom').value=100;draw();});
 $('mqb51Zoom')?.addEventListener('input',e=>{if(!active)return;active.zoom=clamp(Number(e.target.value)/100,1,3);draw();});
 const surface=$('mqb51CropCanvas');let dragging=false,lastX=0,lastY=0;
 surface?.addEventListener('pointerdown',e=>{if(!active)return;dragging=true;lastX=e.clientX;lastY=e.clientY;surface.setPointerCapture(e.pointerId);});
 surface?.addEventListener('pointermove',e=>{
   if(!active||!dragging)return;
   const ratio=surface.width/surface.getBoundingClientRect().width;
   active.panX+=(e.clientX-lastX)*ratio;active.panY+=(e.clientY-lastY)*ratio;
   lastX=e.clientX;lastY=e.clientY;draw();
 });
 surface?.addEventListener('pointerup',()=>{dragging=false;});surface?.addEventListener('pointercancel',()=>{dragging=false;});
 m.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();close();}});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
