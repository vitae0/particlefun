import { SPECIES } from './catalog.js';
import { FieldLab } from './field-physics.js';
import { Transport3D } from './transport3d.js';
import { Apparatus } from './apparatus.js';
import { AutomaticEvents } from './auto-events.js';
import { ScientificRenderer } from './scientific-renderer.js';
import { LIVE_SCENES,sceneById } from './live-scenes.js';

const $=id=>document.getElementById(id);
const lab=new FieldLab(()=>random()),transport=new Transport3D(lab),apparatus=new Apparatus(lab,()=>random());
lab.transport=transport;lab.apparatus=apparatus;
const rng={state:0x9e3779b9,next(){let x=this.state|0;x^=x<<13;x^=x>>>17;x^=x<<5;this.state=x>>>0;return this.state/4294967296;}};
function random(){return rng.next();}
const events=new AutomaticEvents(lab,()=>random());
const plot=new ScientificRenderer($('plot'),lab);
const speeds=[.125,.25,.5,1,2,4,8,16,32];
let speedIndex=3,sceneId='e-rest',selectedSpecies='e',angle=0,baseStep=.25;
let running=false,popupMode=null,page=0,history=[],framePrevious=0;
let dragging=false,moved=false,startPt=null,dragMoved=false,recordedHits=0;
const clone=o=>structuredClone(o);
const fmt=(v,n=4)=>Number.isFinite(v)?(Math.abs(v)>1e6||Math.abs(v)<1e-4&&v!==0?v.toExponential(2):Number(v.toPrecision(n)).toString()):'—';
function note(s){$('message').textContent=s;}
function timeText(){
 const t=lab.clock;
 const val=t>299792458*1e15?(t/(299792458*1e15)).toPrecision(4)+' s':fmt(t)+' fm/c';
 $('simtime').textContent='t = '+val;
 const d=transport.last;
 const nonconservative=transport.E.some(e=>e!==0)||apparatus.devices.some(x=>['plates','wien','trap','oilDrop','spinmagnet','photoelectric'].includes(x.kind));
 const drift=nonconservative?'ΔE: dış alan / ölçüm kaynağı':('ΔE/E = '+fmt(d.energyDrift*100,3)+'%');
 $('diagnostic').textContent=drift+' · N='+lab.fields.length+' · 3B fizik / 2B kesit · '+(d.unconsumed>0?'adım limiti':'');
 const last=apparatus.hits[0];
 if(apparatus.hits.length>recordedHits&&last){recordedHits=apparatus.hits.length;
   note('Aygıt olayı: '+last.kind+(last.K!==undefined?' · K='+fmt(last.K*1e6)+' eV':'')+' · '+fmt(last.clock)+' fm/c');
 }
 $('back').disabled=history.length===0;
}
function labels(){
 $('play').textContent=running?'Ⅱ':'▶';
 $('play').setAttribute('aria-label',running?'Duraklat':'Başlat');
 $('speed').textContent=speeds[speedIndex]+'×';
 timeText();
}
function updateZRange(){
 const lim=Math.max(.1,plot.camera.span/2);
 const slider=$('slice');slider.min=-lim;slider.max=lim;slider.step=Math.max(1e-4,lim/1000);
 if(Math.abs(plot.camera.z)>lim)plot.camera.z=Math.sign(plot.camera.z)*lim;
 slider.value=plot.camera.z;$('zvalue').textContent=fmt(plot.camera.z,3);
}
function snapshot(){
 return clone({
  fields:lab.fields,sources:lab.sources,clock:lab.clock,id:lab.id,
  stateEvents:lab.events,labReaction:lab.lastReaction,
  apparatusHits:apparatus.hits,apparatusLedger:apparatus.ledger,
  rng:rng.state,
  decay:[...events.decays],exposure:[...events.exposure],
  encounters:[...events.encounters],observations:events.observations,
  unresolved:events.unresolved,trials:events.trials,hits:events.hits,
  transportReference:transport.reference,transportLast:transport.last,
  recordedHits
 });
}
function restore(s){
 lab.fields=s.fields;lab.sources=s.sources;lab.clock=s.clock;lab.id=s.id;lab.events=s.stateEvents;lab.lastReaction=s.labReaction;
 apparatus.hits=s.apparatusHits;apparatus.ledger=s.apparatusLedger;
 rng.state=s.rng;events.decays=new Map(s.decay);events.exposure=new Set(s.exposure);
 events.encounters=new Map(s.encounters);events.observations=s.observations;events.unresolved=s.unresolved;events.trials=s.trials;events.hits=s.hits;
 transport.reference=s.transportReference;transport.last=s.transportLast;recordedHits=s.recordedHits;
 plot.last=0;timeText();
}
function remember(){history.push(snapshot());if(history.length>160)history.shift();}
function stepBack(){
 running=false;const s=history.pop();
 if(!s){note('Kaydedilmiş önceki kare yok.');labels();return;}
 restore(s);labels();note('Önceki fizik karesi geri yüklendi; stokastik üreteç durumu da geri alındı.');
 plot.draw();
}
function addTrail(){
 for(const p of lab.fields){
  if(!p.trail)p.trail=[];
  p.trail.push({x:p.x,y:p.y,z:p.z||0});
  if(p.trail.length>100)p.trail.shift();
 }
}
function stepForward(){
 if(!lab.fields.length){return;}
 remember();
 const requested=baseStep*speeds[speedIndex];
 const fastInstrument=baseStep>=1000&&apparatus.devices.some(x=>['slits','interferometer','photoelectric','screen','oilDrop','spinmagnet'].includes(x.kind));
 if(fastInstrument){
  const result=apparatus.fastForward();
  if(result){
   events.synchronize();
   if(result.approximation==='paraxial spin force'||result.approximation?.startsWith('relativistic E/B RK4')){
    const detectorY=lab.fields.map(p=>p.y);
    plot.camera.x=result.device.x;
    plot.camera.y=(Math.max(...detectorY)+Math.min(...detectorY))/2;
    plot.camera.span=Math.max(result.approximation==='paraxial spin force'?3e11:5e12,3*(Math.max(...detectorY)-Math.min(...detectorY)));
    updateZRange();
   }
   const label=result.approximation==='paraxial spin force'?'Spin-demet uçuşu (paraksiyel)':result.device.kind==='oilDrop'?'Millikan/Stokes damla hareketi':'Tek foton aygıt uçuşu';
   note(label+': fiziksel Δt='+fmt(result.dt)+' fm/c.');
  }else note('Bu düzenek için güvenilir analitik olay ilerletmesi bulunmuyor.');
 }else{
  const before=lab.clock;events.tick(Math.min(32,requested));
  const got=lab.clock-before;
  if(got<Math.min(32,requested)-1e-7)note('Güvenli integrasyon limitine ulaşıldı; fiziksel zaman tamamlanmayan kısmı sayılmadı.');
 }
 addTrail();plot.last=0;timeText();
}
function loadScene(id){
 const sc=sceneById(id);if(!sc){note('Bilinmeyen deney.');return;}
 running=false;sceneId=id;history=[];rng.state=0x9e3779b9;
 lab.reset();events.reset();
 lab.widthFm=sc.scale||100;lab.packetSigma=sc.packetSigma||(sc.step>1000?40000:2.1);
 transport.softeningFm=sc.softening||.4;transport.maxStep=.32;transport.enabled=true;
 baseStep=sc.step||.25;
 for(const d of sc.devices||[])apparatus.add(clone(d));
 for(const p of sc.beams||[]){
  if(SPECIES[p.type].confined)lab.addSource(p.type,p.x,p.y,p.z);
  else{
   const part=lab.add(p.type,p.K,p.angle,p.x,p.y,p.z,p.elev);
   if(p.type==='silver')part.spinProjection=random()<.5?-1:1;
   part.trail=[{x:part.x,y:part.y,z:part.z}];
  }
 }
 events.synchronize();
 plot.camera={x:0,y:0,z:0,span:sc.scale||100};
 updateZRange();$('sceneLabel').textContent=sc.title+' · '+sc.group;
 $('kinetic').value=0;selectedSpecies='e';
 recordedHits=0;
 transport.reference=transport.totalEnergy();
 note(sc.description+' · Hazır / duraklatıldı.');
 hidePopup();labels();plot.draw();
}
function addField(x=plot.camera.x,y=plot.camera.y){
 const s=SPECIES[selectedSpecies],K=Number($('kinetic').value);
 if(!s){note('Önce alan seç.');return;}
 if(!Number.isFinite(K)||K<0){note('K ≥ 0 olmalı.');return;}
 try{
  remember();
  if(s.confined)lab.addSource(s.id,x,y,plot.camera.z);
  else{
   const p=lab.add(s.id,K,angle,x,y,plot.camera.z);
   if(s.id==='silver')p.spinProjection=random()<.5?-1:1;
  }
  events.synchronize();transport.reference=transport.totalEnergy();
  note(s.name+' eklendi: K='+fmt(K)+' MeV'+(s.confined?' · hapsolmuş alan kaynağı':''));
  plot.draw();
 }catch(e){history.pop();note(e.message);}
}
function updateMenuRows(items,callback){
 const limit=window.innerHeight<540?6:window.innerHeight<730?8:12;
 const pages=Math.max(1,Math.ceil(items.length/limit));
 page=Math.max(0,Math.min(page,pages-1));
 const area=$('popupItems');area.replaceChildren();
 items.slice(page*limit,(page+1)*limit).forEach(it=>{
  const button=document.createElement('button');button.type='button';button.className='item'+(it.selected?' active':'');
  const strong=document.createElement('strong');strong.textContent=it.name;
  const small=document.createElement('small');small.textContent=it.sub||'';
  button.title=it.title||'';button.append(strong,small);button.addEventListener('click',()=>callback(it));
  area.append(button);
 });
 $('previous').disabled=page===0;$('next').disabled=page>=pages-1;$('page').textContent=(page+1)+' / '+pages;
}
function hidePopup(){popupMode=null;$('popup').hidden=true;}
function menu(mode){
 if(popupMode===mode){hidePopup();return;}
 popupMode=mode;page=0;$('popup').hidden=false;renderPopup();
}
function renderPopup(){
 if(!popupMode)return;
 if(popupMode==='experiments'){
  $('popupTitle').textContent='Deneyler · '+LIVE_SCENES.length+' sahne';
  const arr=LIVE_SCENES.map(s=>({id:s.id,name:s.title,sub:s.group,title:s.description,selected:s.id===sceneId}));
  updateMenuRows(arr,it=>loadScene(it.id));
 }else if(popupMode==='species'){
  $('popupTitle').textContent='Parçacık / alan';
  updateMenuRows(Object.values(SPECIES).map(s=>({id:s.id,name:s.name,
   sub:s.confined?'hapsolmuş kaynak':s.mass+' MeV/c²',
   selected:s.id===selectedSpecies})),it=>{
   selectedSpecies=it.id;
   const s=SPECIES[it.id];$('kinetic').value=s.mass===0?2e-6:0;
   note(s.name+' seçildi. K alanına enerji gir; + veya tuvale tıklayarak ekle.');
   hidePopup();
  });
 }else if(popupMode==='view'){
  $('popupTitle').textContent='Görünüm ve sayısal ayarlar';
  const area=$('popupItems');area.replaceChildren();
  const label=(name,node)=>{const row=document.createElement('label');row.textContent=name;row.append(node);area.append(row);};
  const select=(opts,now,callback)=>{
   const s=document.createElement('select');
   opts.forEach(([v,name])=>{const o=document.createElement('option');o.value=v;o.textContent=name;s.append(o);});
   s.value=now;s.addEventListener('change',()=>callback(s.value));return s;
  };
  label('Renk skalası',select([['linear','lineer'],['log','log'],['exp','üstel']],plot.color,v=>{plot.color=v;plot.draw();}));
  label('Ekran örnekleme',select([['low','düşük'],['medium','orta'],['high','yüksek']],plot.quality,v=>{plot.quality=v;plot.draw();}));
  label('Kuvvet okları',select([['yes','açık'],['no','kapalı']],plot.vectors?'yes':'no',v=>{plot.vectors=v==='yes';plot.draw();}));
  label('Yörünge izleri',select([['yes','açık'],['no','kapalı']],plot.trails?'yes':'no',v=>{plot.trails=v==='yes';plot.draw();}));
  const inp=document.createElement('input');inp.type='number';inp.min='0.001';inp.step='0.01';inp.value=transport.softeningFm;
  inp.addEventListener('change',()=>{const v=Number(inp.value);if(v>0&&Number.isFinite(v)){transport.softeningFm=v;transport.reference=transport.totalEnergy();}});
  label('Coulomb düzenleme a (fm)',inp);
  const step=document.createElement('input');step.type='number';step.min='.0001';step.max='10';step.step='.01';step.value=transport.maxStep;
  step.addEventListener('change',()=>{const v=Number(step.value);if(v>0&&v<=10)transport.maxStep=v;});
  label('İntegratör max Δt (fm/c)',step);
  const text=document.createElement('p');text.className='note';text.textContent='Üç boyutlu x,y,z ve pₓ,pᵧ,pz evrilir. Burada yalnızca z sabit kesiti çizilir. Zaman geri alındığında aynı stokastik RNG durumu da yüklenir.';area.append(text);
  $('page').textContent='ayarlar';$('previous').disabled=true;$('next').disabled=true;
 }else if(popupMode==='help'){
  $('popupTitle').textContent='Model kapsamı';
  const area=$('popupItems');area.replaceChildren();
  for(const msg of [
    'Çekirdek 3B relativistik Coulomb + dış E/B Lorentz kuvvetlerini uygular. Elektrostatik eşzamanlıdır; tam QED değildir.',
    'Kuark/gluonlar serbest değildir. Proton ve nötron uud/udd valans + gluon dokusuyla ŞEMATİK çizilir.',
    'Young çift yarık ve Mach–Zehnder, AYNI sahnede aygıt ve Born dedektörü kullanır; tam etkileşimli Maxwell-QFT çözücüsü değildir.',
    'Otomatik süreçler ancak tanımlı tesir kesiti veya ömür modeli varsa gerçekleşir. Nadir olayları hızlandırmak için fiziksel olasılık değiştirilmez.',
    'Pan: sürükle; zoom: tekerlek; z: alt sürgü; Space: başlat/durdur; sol ok: geri; sağ ok: ileri; ⏭: serbest fotonun aygıta ulaşımı.',
    'Coulomb yumuşatma, tek-parçacık Gauss gösterimi ve cihazların ideal alan bölgeleri model yaklaşımıdır. E/B çok büyük değerleri fiziksel aygıt ölçeğine göre seçilir.'
  ]){
   const p=document.createElement('p');p.className='note';p.textContent=msg;area.append(p);
  }
  $('page').textContent='model notları';$('previous').disabled=true;$('next').disabled=true;
 }
}
$('experiments').addEventListener('click',()=>menu('experiments'));
$('species').addEventListener('click',()=>menu('species'));
$('view').addEventListener('click',()=>menu('view'));
$('help').addEventListener('click',()=>menu('help'));
$('popupClose').addEventListener('click',hidePopup);
$('previous').addEventListener('click',()=>{page--;renderPopup();});
$('next').addEventListener('click',()=>{page++;renderPopup();});
$('add').addEventListener('click',()=>addField());
$('play').addEventListener('click',()=>{running=!running;labels();});
$('back').addEventListener('click',stepBack);
$('forward').addEventListener('click',()=>{running=false;stepForward();labels();plot.draw();});
$('slower').addEventListener('click',()=>{speedIndex=Math.max(0,speedIndex-1);labels();});
$('faster').addEventListener('click',()=>{speedIndex=Math.min(speeds.length-1,speedIndex+1);labels();});
$('restart').addEventListener('click',()=>loadScene(sceneId));
$('slice').addEventListener('input',e=>{
 plot.camera.z=Number(e.target.value);$('zvalue').textContent=fmt(plot.camera.z,3);plot.draw();
});
$('instrument').addEventListener('click',()=>{
 remember();
 const p=apparatus.fastForward();
 if(p){
  events.synchronize();addTrail();
  if(p.approximation==='paraxial spin force'||p.approximation?.startsWith('relativistic E/B RK4')){
    const yValues=lab.fields.map(q=>q.y);
    plot.camera.x=p.device.x;
    plot.camera.y=(Math.min(...yValues)+Math.max(...yValues))/2;
    plot.camera.span=Math.max(p.approximation==='paraxial spin force'?3e11:5e12,3*(Math.max(...yValues)-Math.min(...yValues)));
    updateZRange();
  }
  note('Ölçüm aygıtına uçuş: Δt='+fmt(p.dt)+' fm/c.'+(p.approximation?' · '+p.approximation:''));
  timeText();plot.draw();return;
 }
 const hasForce=transport.forces().some(f=>Math.hypot(...f)>1e-16);
 if(hasForce){history.pop();note('Kuvvetli yörüngede analitik atlama fiziksel değil. Normal integratörü kullan.');return;}
 const d=events.jumpToNextDecay();
 if(!d){history.pop();note('Atlanabilecek aygıt / bozunma olayı yok.');return;}
 addTrail();note('Doğal bozunma, Δt='+fmt(d.dt)+' fm/c.');timeText();plot.draw();
});
const canvas=$('plot');
canvas.addEventListener('wheel',e=>{
 e.preventDefault();const r=canvas.getBoundingClientRect();
 plot.zoom(Math.exp(Math.max(-2,Math.min(2,e.deltaY*.0012))),e.clientX-r.left,e.clientY-r.top);
 updateZRange();plot.draw();
},{passive:false});
canvas.addEventListener('pointerdown',e=>{
 if(e.button!==0)return;
 dragging=true;moved=false;startPt={x:e.clientX,y:e.clientY};dragMoved=false;
 canvas.setPointerCapture?.(e.pointerId);
});
canvas.addEventListener('pointermove',e=>{
 if(!dragging)return;
 const dx=e.clientX-startPt.x,dy=e.clientY-startPt.y;
 if(Math.abs(dx)+Math.abs(dy)>3)dragMoved=true;
 if(dragMoved){plot.pan(dx,dy);plot.draw();}
 startPt={x:e.clientX,y:e.clientY};
});
canvas.addEventListener('pointerup',e=>{
 if(!dragging)return;
 dragging=false;canvas.releasePointerCapture?.(e.pointerId);
 if(!dragMoved&&!popupMode){
  const r=canvas.getBoundingClientRect();const p=plot.world(e.clientX-r.left,e.clientY-r.top);
  addField(p.x,p.y);
 }
});
canvas.addEventListener('pointercancel',()=>{dragging=false;});
window.addEventListener('keydown',e=>{
 if(e.code==='Space'){
  e.preventDefault();running=!running;labels();return;
 }
 if(e.key==='Escape'){hidePopup();return;}
 if(['INPUT','SELECT','TEXTAREA'].includes(e.target?.tagName))return;
 if(e.key==='ArrowLeft'){e.preventDefault();stepBack();}
 if(e.key==='ArrowRight'){e.preventDefault();running=false;stepForward();labels();plot.draw();}
 if(e.key==='-'){speedIndex=Math.max(0,speedIndex-1);labels();}
 if(e.key==='+'){speedIndex=Math.min(speeds.length-1,speedIndex+1);labels();}
});
window.addEventListener('resize',()=>{updateZRange();plot.draw();if(popupMode)renderPopup();});
function animate(t){
 const dt=framePrevious?Math.min(.075,(t-framePrevious)/1000):0;framePrevious=t;
 if(running&&dt>0){
  const iterations=Math.max(1,Math.min(3,Math.round(dt*60)));
  for(let i=0;i<iterations;i++)stepForward();
 }
 if(!running||t%2<1){} // all browser frames share the same authoritative state
 plot.draw();
 if(t%160<20)timeText();
 requestAnimationFrame(animate);
}
loadScene('e-rest');labels();requestAnimationFrame(animate);
if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches){running=false;labels();}
