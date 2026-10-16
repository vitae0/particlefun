import { SPECIES, GROUPS, C } from './catalog.js';
import { FieldLab, energy, reaction } from './field-physics.js';
import { FieldRenderer } from './field-renderer.js';
import { PRESETS, presetById } from './presets.js';
import { ADVANCED, evaluate, sampleAdvanced } from './experiments.js';
import { AutomaticEvents, crossSections, invariantS } from './auto-events.js';

const $=id=>document.getElementById(id);
const random=Math.random;
const lab=new FieldLab(random);
const events=new AutomaticEvents(lab,random);
const renderer=new FieldRenderer($('canvas'),lab);
const SPEEDS=[.1,.25,.5,1,2,5,10,30,100,300,1000];
const SPEED_LABELS=['0.1×','0.25×','0.5×','1×','2×','5×','10×','30×','100×','300×','1000×'];
let speedIndex=3,running=true,currentPreset='breit',advanced=null,currentMenu=null,page=0;
let selectedSpecies='e',K=8,angle=0,lastFrame=0,lastUI=0,openedCount=0;
const precisionMap={fast:1,balanced:.35,precise:.08};
let capture=0;
function pretty(x){
 if(!Number.isFinite(x))return '—';
 if(x===0)return '0';
 if(Math.abs(x)>=1e5||Math.abs(x)<.0001)return x.toExponential(2);
 return x.toLocaleString('tr-TR',{maximumFractionDigits:3});
}
function inform(s,bad=false){$('notice').textContent=s;$('notice').style.color=bad?'#eca7a7':'#a5c2d5';}
function updateRunning(){
 $('play').textContent=running?'Ⅱ':'▶';
 $('play').setAttribute('aria-label',running?'Duraklat':'Başlat');
 $('running').textContent=running?'● LIVE':'Ⅱ PAUSE';
 $('speed').textContent=SPEED_LABELS[speedIndex];
}
function setTitle(group,title,desc){
 $('sceneGroup').textContent=group;$('sceneName').textContent=title;$('sceneText').textContent=desc;
 $('modelBadge').textContent=advanced?'ANALYTIC MODEL':'FIELD PROXY / ON-SHELL';
}
function clockDisplay(){
 if(advanced){$('clock').textContent='ANALİTİK / '+advanced.year;return;}
 const t=lab.clock;
 $('clock').textContent=t>=1e15?'t = '+pretty(t/(C*1e15))+' s':'t = '+pretty(t)+' fm/c';
}
function legend(){
 const el=$('legend');el.replaceChildren();
 if(advanced){const span=document.createElement('span');span.className='token';span.textContent='İdeal analitik deney · fizik sınırları Model menüsünde';el.append(span);return;}
 const types=[...new Set([...lab.fields.map(p=>p.type),...lab.sources.map(p=>p.type)])];
 for(const id of types.slice(0,10)){
  const s=SPECIES[id],token=document.createElement('span');token.className='token';
  const dot=document.createElement('i');dot.style.background='hsl('+s.colorHue+' 78% 70%)';
  const label=document.createElement('span');label.textContent=s.name+(s.confined?' (bağlı kaynak)':'');
  token.append(dot,label);el.append(token);
 }
 if(types.length>10){const n=document.createElement('span');n.className='token';n.textContent='+'+(types.length-10);el.append(n);}
}
function updateFeedback(){
 clockDisplay();
 const count=events.hits;
 if(!advanced&&lab.fields.length===0&&lab.sources.length===0)
  $('modelBadge').textContent='EMPTY FIELD';
 else if(!advanced)
  $('modelBadge').textContent=lab.fields.length+' paket · '+count+' reaksiyon';
}
function eventSummary(){
 if(advanced)return 'Analitik deney. Ölçüm almak için “Ölçüm al” düğmesini kullan.';
 const r=events.observations[0];
 if(!r)return 'Henüz olay yok. Bozunmalar fiziksel ömre, çarpışmalar hesaplanabilen tesir kesitlerine göre kendiliğinden oluşur.';
 if(r.unresolved)return r.label+' · toplam 4-momentum kayıp değil, modellenmeyen ürünler hesabında.';
 return r.label+(r.prob!==undefined?' · Δt olasılığı '+(100*r.prob).toPrecision(2)+'%':'');
}
function clearPanel(){
 currentMenu=null;page=0;$('panel').hidden=true;
 document.querySelectorAll('.menus [data-panel]').forEach(b=>b.setAttribute('aria-expanded','false'));
}
function openPanel(name){
 if(currentMenu===name){clearPanel();return;}
 currentMenu=name;page=0;
 $('panel').hidden=false;
 document.querySelectorAll('.menus [data-panel]').forEach(b=>b.setAttribute('aria-expanded',String(b.dataset.panel===name)));
 fillPanel();
}
const ITEMS_PER_PAGE=()=>window.innerHeight<540?4:window.innerHeight<680?6:8;
function makeButton(label,sub,action,active=false){
 const b=document.createElement('button');b.className='list-item'+(active?' active':'');b.type='button';
 const title=document.createElement('span');title.textContent=label;
 b.append(title);
 if(sub){const small=document.createElement('small');small.textContent=sub;b.append(small);}
 b.addEventListener('click',action);return b;
}
function textLine(text,kind='doc'){
 const p=document.createElement('p');p.className=kind;p.textContent=text;return p;
}
function renderPages(items,make){
 const limit=ITEMS_PER_PAGE(),max=Math.max(1,Math.ceil(items.length/limit));
 page=Math.min(Math.max(0,page),max-1);
 const grid=document.createElement('div');grid.className='list-grid';
 items.slice(page*limit,(page+1)*limit).forEach(x=>grid.append(make(x)));
 $('panelBody').append(grid);
 $('pageStatus').textContent=(page+1)+' / '+max;
 $('pagePrev').disabled=page===0;$('pageNext').disabled=page>=max-1;
 return max;
}
function fieldInsert(type,energyMeV,heading){
 try{
  const s=SPECIES[type];
  if(s.confined){
   lab.addSource(type,lab.sources.length%2?2:-2,lab.sources.length%3?2:0);
   inform(s.name+' renkli alan kaynağı eklendi; SERBEST gluon/kuark parçacığı değildir.');
  }else{
   const a=Number(heading);
   const pos=lab.fields.length%2===0?-5:5;
   lab.add(type,Number(energyMeV),a,pos,(lab.fields.length%3-1)*2);
   inform(s.name+' alan paketi yerleştirildi. Fiziksel çapraz-kesit varsa reaksiyon kendiliğinden örneklenecek.');
  }
  currentPreset='';advanced=null;renderer.setExperiment(null,0);$('advancedDock').hidden=true;
  setTitle('STANDART MODEL / ALAN KAYNAKLARI','Özel alan laboratuvarı','Yalnızca hesaplanabilir etkileşimlerde fiziksel olay örneklemesi yapılır.');
  events.reset();events.synchronize();legend();updateFeedback();clearPanel();
 }catch(e){inform(e.message,true);}
}
function fillPanel(){
 const root=$('panelBody');root.replaceChildren();if(!currentMenu)return;
 const titles={species:['FIELD CATALOG','Alan seç'],basic:['01 / PRESETS','Temel deneyler'],
  advanced:['02 / ADVANCED','Tarihsel & ileri'],events:['EVENT MONITOR','Olay kayıtları'],
  info:['PHYSICS / SCOPE','Model doğruluğu']};
 $('panelEyebrow').textContent=titles[currentMenu][0];$('panelTitle').textContent=titles[currentMenu][1];
 $('pagePrev').hidden=false;$('pageNext').hidden=false;$('pageStatus').hidden=false;
 if(currentMenu==='species'){
  const options=GROUPS.flatMap(([group,label])=>Object.values(SPECIES).filter(x=>x.family===group).map(x=>({...x,groupLabel:label})));
  renderPages(options,s=>makeButton(s.name,s.groupLabel+(s.confined?' · renk kaynağı':' · '+s.mass.toPrecision(4)+' MeV'),()=>{
   selectedSpecies=s.id;fillPanel();
  },selectedSpecies===s.id));
  const group=SPECIES[selectedSpecies];
  const bar=document.createElement('div');bar.className='param-row';
  const labelE=document.createElement('label');labelE.textContent=group.confined?'Renk alanı kaynağı':'Enerji · MeV';
  const iE=document.createElement('input');iE.type='number';iE.min='0';iE.max='100000000';iE.step='any';iE.value=String(K);iE.disabled=group.confined;
  iE.addEventListener('input',()=>{K=Number(iE.value)});
  labelE.appendChild(iE);
  const labelA=document.createElement('label');labelA.textContent='Yön · °';
  const iA=document.createElement('input');iA.type='number';iA.value=String(angle);iA.step='15';iA.disabled=group.confined;
  iA.addEventListener('input',()=>{angle=Number(iA.value)});
  labelA.appendChild(iA);
  const add=document.createElement('button');add.type='button';add.textContent='＋ Ekle';
  add.addEventListener('click',()=>fieldInsert(selectedSpecies,K,angle));
  bar.append(labelE,labelA,add);root.append(bar);
  root.append(textLine(group.confined?'Kuantum renk kaynağı: lokal gluon/kuark alan dokusu. Renk hapsi nedeniyle serbest parçacık veya bozunma değildir.':'Enerji ve yönü belirle. Tuval üzerinde tıklamak da seçili alanı ekler.','tip'));
 }else if(currentMenu==='basic'){
  renderPages(PRESETS,p=>makeButton(p.name,p.group,()=>loadPreset(p.id),currentPreset===p.id&&!advanced));
  root.append(textLine('29 deney. Fiziksel olay garantisi yoktur: başarısız çarpışmalar da beklenen sonuçtur. “Olaylar” menüsünde bağımsız deneme istatistiği alabilirsin.','tip'));
 }else if(currentMenu==='advanced'){
  renderPages(ADVANCED,e=>makeButton(e.name,e.group+' · '+e.year,()=>loadAdvanced(e.id),advanced?.id===e.id));
  root.append(textLine('18 analitik deney: Young, Bell, Stern–Gerlach, SQUID, Josephson, Ramsey, fotoelektrik etki, tünelleme ve diğerleri.','tip'));
 }else if(currentMenu==='events'){
  const sample=document.createElement('div');sample.className='param-row';
  const repeat=document.createElement('button');repeat.type='button';repeat.textContent='1000 bağımsız çarpışma';
  repeat.addEventListener('click',manyTrials);
  const jump=document.createElement('button');jump.type='button';jump.textContent='⏭ Son bozunmaya atla';
  jump.addEventListener('click',nextDecay);sample.append(repeat,jump);root.append(sample);
  root.append(textLine('Yalnızca hesaplanan tesir kesiti olan kanallar stokastik örneklenir. Her son-durum için olay oranı uydurulmaz.','tip'));
  root.append(textLine('Karşılaşma alt-adımları: '+events.trials+' · örneklenmiş reaksiyonlar: '+events.hits,'data'));
  const list=events.observations.length?events.observations:[{label:'Henüz olay kaydı yok.'}];
  renderPages(list,e=>makeButton(e.label,e.error!==undefined?'Δpμ/E ≈ '+e.error.toExponential(1):
    e.unresolved?'Çözülmeyen fiziksel son durum':e.prob!==undefined?'P(adım): '+(100*e.prob).toPrecision(2)+'%':'',()=>inform(e.label)));
 }else if(currentMenu==='info'){
  const docs=[
   ['Hesaplanan QED','Breit–Wheeler, Klein–Nishina ve bazı leading-order çift üretim tesir kesitleri; ölçülmüş ömürler ve yaklaşık dallanma oranları. Tek paket için 3B Gauss örtüşmesi VARSAYIMI vardır.'],
   ['Otomatik bozunmalar','Ömürler doğal üstel dağılımdan örneklenir; laboratuvar referansında relativistik zaman genleşmesi uygulanır. Modellenmeyen son durumlar açıkça “unresolved” olarak korunur.'],
   ['Kinematik','Tüm oluşturulan son durumlar on-shell relativistik 4-momentum korunumu ile hesaplanır. İki/üç cisimli açısal dağılımlar tam matris elemanı değildir.'],
   ['Sınırlamalar','Gerçek QFT etkileşimli Fock çözümü, dinamik SU(3) gluon kafesi, hadronlaşma, spin/helicity korelasyonu ve genel olay üreteci yoktur.'],
   ['Proton / nötron','Görüntüde uud/udd valans bileşenleri + gluon bulutu vardır. Bu görsel QCD iç dalga fonksiyonu değildir, serbest kuark veya gluon değildir.'],
   ['Alan boyaması','Her tür için ayrı renk, antiparçacık için tamamlayıcı renk kullanılır. İşaretli genlik aydınlatması fiziksel ölçülebilir bir alan değeri değildir.'],
   ['Tarihsel deneyler','Temel kuantum aygıtları ayrı analitik denklemlerle modellenir. Deney grafikleri Standart Model 2B alan çözücüsü iddiası taşımaz.'],
   ['Olasılık modu','Stokastik: Poisson/Born örneklemesi. Beklenen: sadece beklenen değer, olay üretilmez. “1000 deneme” bağımsız deney örneklerini hesaplar, P yapayca artırılmaz.'],
   ['Kaynaklar','Particle Data Group 2025; NIST Klein–Nishina tablosu; temel relativistik kinematik ve kuantum ölçüm denklemleri.']
  ];
  renderPages(docs,d=>makeButton(d[0],'Fiziksel varsayımlar ve sınırlamalar',()=>{
    inform(d[1]);
    const tip=root.querySelector('.tip');
    if(tip)tip.textContent=d[1];
  }));
  root.append(textLine('Kaynak kodu ve denklemler: github.com/vitae0/particlefun','tip'));
  $('pageStatus').textContent=(page+1)+' / '+Math.ceil(docs.length/ITEMS_PER_PAGE());
 }
}
function loadPreset(id){
 const p=presetById(id);if(!p)return;
 advanced=null;renderer.setExperiment(null,0);$('advancedDock').hidden=true;
 lab.reset();events.reset();currentPreset=p.id;renderer.selected=null;
 for(const [type,k,deg,x,y] of p.beams){
  if(SPECIES[type].confined)lab.addSource(type,x,y);
  else lab.add(type,k,deg,x,y);
 }
 events.synchronize();
 setTitle('STANDART MODEL / TEMEL',p.name,p.description);
 if(p.channel&&lab.fields.length===2){
   const options=crossSections(...lab.fields);
   if(!options.length)inform('Bu düzeneğin otomatik hesaplanabilen bir çarpışma tesir kesiti yok veya enerji eşiği sağlanmıyor. Bu nedenle uydurma olay üretilmez.',true);
   else inform('Hesaplanan kanallar: '+options.map(x=>x.id+' · σ='+pretty(x.sigma)+' fm²').join('; ')+'. Sonuçlar rastlantısaldır.');
 }else if(p.channel&&lab.fields.length===1)
   inform('Bozunma, ölçülmüş doğal ömür ve mevcut dallanma oranları ile otomatik örneklenir. Çok uzun ömürlerde “Son bozunma”yı kullan.');
 else inform('Alan paketi deney düzeneği hazır.');
 running=true;updateRunning();legend();updateFeedback();clearPanel();
}
function loadAdvanced(id){
 const p=ADVANCED.find(e=>e.id===id);if(!p)return;
 advanced=p;renderer.setExperiment(id,p.value);$('advancedDock').hidden=false;
 const slider=$('parameter');slider.min=p.min;slider.max=p.max;slider.step=p.step;slider.value=p.value;
 $('parameterName').textContent=p.param;
 setTitle('KUANTUM DENEYİ / '+p.group.toUpperCase(),p.name,p.detail);
 inform(p.detail);
 updateAdvancedReadout();
 legend();clockDisplay();clearPanel();
}
function updateAdvancedReadout(){
 if(!advanced)return;
 const v=Number($('parameter').value);renderer.setExperiment(advanced.id,v);
 const result=evaluate(advanced.id,v);
 $('parameterOut').textContent=pretty(v)+' '+advanced.unit;
 $('analyticResult').textContent=pretty(result.value)+' '+result.unit;
 if(result.description)inform(result.description);
}
function takeMeasurement(){
 if(!advanced)return;
 if(events.mode==='expected'){inform('Beklenen-değer modunda rastgele ölçüm yapılmaz. 🎲 ile stokastik moda dön.');return;}
 const value=Number($('parameter').value);
 const result=sampleAdvanced(advanced.id,value,random);
 inform(result);
}
function nextDecay(){
 if(advanced){inform('Analitik deneyde fiziksel bozunma zamanlayıcısı yok.');return;}
 try{
  const result=events.jumpToNextDecay();
  if(result){updateFeedback();legend();inform('Gerçek örneklenmiş bekleme: '+pretty(result.dt)+' fm/c. '+result.record.label);}
  else inform('Bozunabilecek alan yok; elektron, proton, foton kararlı olabilir.');
  if(currentMenu==='events')fillPanel();
 }catch(e){inform('Bozunma hesabı reddedildi: '+e.message,true);}
}
function manyTrials(){
 if(advanced){inform('İleri analitik deneylerin ölçümü için alt banttaki “Ölçüm al” seçeneğini kullan.');return;}
 const p=presetById(currentPreset);
 if(!p||p.beams.length!==2){inform('1000 bağımsız karşılaşma için iki demetli temel deney seç.');return;}
 const experimentLab=new FieldLab(random);
 for(const [type,k,ang,x,y] of p.beams)experimentLab.add(type,k,ang,x,y);
 const [a,b]=experimentLab.fields,cross=crossSections(a,b);
 if(!cross.length){inform('Bu demet için hesaplanmış fiziksel tesir kesiti yok veya üretim eşiği sağlanmıyor.',true);return;}
 const sigma=experimentLab.packetSigma;
 const vx=a.px/energy(a)-b.px/energy(b),vy=a.py/energy(a)-b.py/energy(b);
 const speed=Math.hypot(vx,vy);
 const t0=-( (a.x-b.x)*vx + (a.y-b.y)*vy )/(speed*speed||1);
 const mx=(a.x-b.x)+vx*t0,my=(a.y-b.y)+vy*t0;
 const b2=mx*mx+my*my;
 const mol=Math.sqrt(Math.max(0,speed*speed-
   Math.pow((a.px/energy(a))*(b.py/energy(b))-(a.py/energy(a))*(b.px/energy(b)),2)));
 const scale=mol/(Math.max(speed,1e-30)*4*Math.PI*sigma*sigma)*Math.exp(-b2/(4*sigma*sigma));
 const hazards=cross.map(c=>({...c,mean:c.sigma*scale}));
 const total=hazards.reduce((s,c)=>s+c.mean,0);
 const chance=1-Math.exp(-total);
 let hits=0,draw=null;
 for(let i=0;i<1000;i++){
  if(random()>=chance)continue;
  hits++;
  let u=random()*total;
  for(const c of hazards){u-=c.mean;if(u<=0){draw=c;break;}}
 }
 events.trials+=1000;events.hits+=hits;
 events.log('1000 BAĞIMSIZ karşılaşma: '+hits+' olay; model P='+(100*chance).toPrecision(3)+'%',{prob:chance});
 if(draw){
  try{
   lab.reset();events.decays.clear();events.exposure.clear();
   const A=lab.add(a.type,p.beams[0][1],p.beams[0][2],0,0);
   const B=lab.add(b.type,p.beams[1][1],p.beams[1][2],0,0);
   lab.react(draw.id,[A.id,B.id]);
   events.synchronize();
   setTitle('ÖRNEKLENMİŞ BAŞARILI OLAY / TEMSİLİ',reaction(draw.id).label,
    hits+' başarı / 1000 bağımsız deneme. Görüntü, başarıyla sonuçlanmış tek bir denemeyi gösterir.');
  }catch(e){inform(e.message,true);}
 }
 inform('1000 bağımsız deneme: '+hits+' reaksiyon. Tek karşılaşma P='+(100*chance).toPrecision(3)+'%. '+(draw?'Temsili başarılı olay gösteriliyor.':'Bu seride hiç olay gözlenmedi.'));
 legend();updateFeedback();fillPanel();
}
$('closePanel').addEventListener('click',clearPanel);
document.querySelectorAll('.menus [data-panel]').forEach(b=>b.addEventListener('click',()=>openPanel(b.dataset.panel)));
$('pagePrev').addEventListener('click',()=>{page--;fillPanel();});
$('pageNext').addEventListener('click',()=>{page++;fillPanel();});
$('play').addEventListener('click',()=>{running=!running;updateRunning();});
$('slower').addEventListener('click',()=>{speedIndex=Math.max(0,speedIndex-1);updateRunning();});
$('faster').addEventListener('click',()=>{speedIndex=Math.min(SPEEDS.length-1,speedIndex+1);updateRunning();});
$('step').addEventListener('click',()=>{
 running=false;updateRunning();
 if(advanced){takeMeasurement();return;}
 events.precisionStep=precisionMap[renderer.precision];
 events.tick(Math.min(.4,events.precisionStep));
 updateFeedback();legend();
 if(currentMenu==='events')fillPanel();
});
$('jump').addEventListener('click',nextDecay);
$('restart').addEventListener('click',()=>{
 if(advanced)loadAdvanced(advanced.id);
 else if(currentPreset)loadPreset(currentPreset);
 else {lab.reset();events.reset();setTitle('STANDART MODEL','Boş alan laboratuvarı','Parçacık ekle.');legend();}
});
$('scale').addEventListener('change',e=>{lab.widthFm=Number(e.target.value);renderer.lastDraw=0;});
$('precision').addEventListener('change',e=>{
 renderer.precision=e.target.value;events.precisionStep=precisionMap[renderer.precision];renderer.lastDraw=0;
 inform('Sayısal örnekleme: '+renderer.precision+'. Fizik modeli aynı, çözünürlük ve adım büyüklüğü değişir.');
});
$('colors').addEventListener('change',e=>{renderer.colorScale=e.target.value;renderer.lastDraw=0;});
$('mode').addEventListener('click',()=>{
 events.mode=events.mode==='sample'?'expected':'sample';
 $('mode').innerHTML=events.mode==='sample'?'🎲 <span>Stokastik</span>':'∑ <span>Beklenen</span>';
 inform(events.mode==='sample'?'Fiziksel olaylar çapraz kesit/ömür ağırlıklı örneklenir.':'Beklenen mod: çarpışmalarda olay çizilmez, beklenen olasılık raporlanır. Bozunma olaylarının gerçek ömür örneklemesi korunur.');
});
$('parameter').addEventListener('input',updateAdvancedReadout);
$('measure').addEventListener('click',takeMeasurement);
$('canvas').addEventListener('click',e=>{
 if(advanced){takeMeasurement();return;}
 if(currentMenu){clearPanel();return;}
 try{
  const rect=$('canvas').getBoundingClientRect();
  const x=(e.clientX-rect.left)/rect.width-.5,y=.5-(e.clientY-rect.top)/rect.height;
  const px=x*lab.widthFm,py=y*lab.widthFm*rect.height/rect.width;
  const type=selectedSpecies;
  if(SPECIES[type].confined)lab.addSource(type,px,py);
  else lab.add(type,K,angle,px,py);
  currentPreset='';events.reset();events.synchronize();legend();
  setTitle('STANDART MODEL / ALAN DÜZENEĞİ','Özel alan deneyi','Alan kaynaklarını yerleştir; çarpışma olasılığı fiziksel modelden çıkarılır.');
  inform(SPECIES[type].name+' eklendi. '+(SPECIES[type].confined?'Renk kaynak alanı, serbest durum değil.':''));
 }catch(err){inform(err.message,true);}
});
document.addEventListener('keydown',e=>{
 if(e.key==='Escape'&&currentMenu)clearPanel();
 if(e.code==='Space'&&e.target.tagName!=='INPUT'&&e.target.tagName!=='SELECT'&&e.target.tagName!=='BUTTON'){
  e.preventDefault();running=!running;updateRunning();
 }
});
window.addEventListener('resize',()=>{renderer.lastDraw=0;if(currentMenu)fillPanel();});
function animate(ts){
 const dt=lastFrame?Math.min((ts-lastFrame)/1000,.055):0;lastFrame=ts;
 if(running&&!advanced&&dt>0){
  events.precisionStep=precisionMap[renderer.precision];
  const d=Math.min(24,dt*10*SPEEDS[speedIndex]);
  events.tick(d);
 }
 renderer.draw(ts);
 if(ts-lastUI>160){
  lastUI=ts;updateFeedback();
  const event=events.observations[0];
  if(event?.kind&&event.t>capture){
   capture=event.t;inform(eventSummary());
   legend();
  }
 }
 requestAnimationFrame(animate);
}
loadPreset('breit');updateRunning();requestAnimationFrame(animate);
if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches){
 running=false;updateRunning();
}
