import { HC, SPECIES, GROUPS } from './catalog.js';
import { FieldLab, energy, norm, eligibleChannels, channelStatus, reaction } from './field-physics.js';
import { FieldRenderer } from './field-renderer.js';
import { PRESETS, presetById } from './presets.js';

const $=id=>document.getElementById(id);
const lab=new FieldLab(),renderer=new FieldRenderer($('canvas'),lab);
let running=true,currentPreset='annihilation',prev=0,lastUpdate=0;
function note(message,bad=false){$('message').textContent=message;$('message').style.color=bad?'#eca5aa':'#9bb0c4';}
function fmt(n,d=2){if(!Number.isFinite(n))return '—';return n.toLocaleString('tr-TR',{maximumFractionDigits:d});}
function labelFor(s){return s.mass===0?'Toplam enerji · MeV':'Kinetik enerji · MeV';}

function setupMenus(){
  const speciesSelect=$('species');
  for(const [group,label] of GROUPS){
    const optgroup=document.createElement('optgroup');optgroup.label=label;
    for(const s of Object.values(SPECIES)){
      if(s.family!==group)continue;
      const opt=document.createElement('option');opt.value=s.id;
      opt.textContent=s.name+(s.confined?' · hapsolmuş':'');
      opt.disabled=s.confined;
      optgroup.appendChild(opt);
    }
    speciesSelect.appendChild(optgroup);
  }
  speciesSelect.value='e';
  const groups=[...new Set(PRESETS.map(p=>p.group))];
  for(const group of groups){
    const optgroup=document.createElement('optgroup');optgroup.label=group;
    for(const p of PRESETS.filter(p=>p.group===group)){
      const option=document.createElement('option');option.value=p.id;option.textContent=p.name;
      optgroup.appendChild(option);
    }
    $('preset').appendChild(optgroup);
  }
}
function channelOptions(){
  const select=$('channel'),prior=select.value,eligible=eligibleChannels(lab.fields);
  select.replaceChildren();
  if(!eligible.length){
    const option=document.createElement('option');option.value='';option.textContent='Uygun giriş çifti yok';
    select.appendChild(option);$('trigger').disabled=true;return;
  }
  for(const ch of eligible){
    const opt=document.createElement('option');opt.value=ch.id;opt.textContent=ch.label+(ch.ok?'':' · eşik/kinematik engel');
    select.appendChild(opt);
  }
  const chosen=[lab.channel,prior].find(id=>eligible.some(x=>x.id===id));
  if(chosen)select.value=chosen;
  $('trigger').disabled=false;
}
function fieldChips(){
  const el=$('fields');el.replaceChildren();$('count').textContent=lab.fields.length;
  if(!lab.fields.length){const p=document.createElement('p');p.className='empty';p.textContent='Henüz alan yok. Yukarıdan parçacık ekle veya bir deney seç.';el.appendChild(p);return;}
  for(const f of lab.fields){
    const s=SPECIES[f.type],button=document.createElement('button');
    button.type='button';button.className='chip';button.setAttribute('aria-pressed',String(renderer.selected===f.id));
    button.setAttribute('title',s.name+' · E = '+fmt(energy(f),3)+' MeV · v/c = '+fmt(norm(f)/energy(f),4));
    const dot=document.createElement('span');dot.className='swatch';
    dot.style.background='hsl('+s.colorHue+' 76% 72%)';
    const label=document.createElement('span');label.textContent=s.name+' #'+f.id;
    button.append(dot,label);
    button.addEventListener('click',()=>{
      renderer.selected=renderer.selected===f.id?null:f.id;fieldChips();
    });
    el.appendChild(button);
  }
}
function currentInfo(){
  $('time').textContent='t = '+fmt(lab.clock,2)+' fm/c';
  $('eventBadge').textContent=lab.events.length+' olay';
  const event=lab.events[0];
  $('eventLog').textContent=event
    ? event.label+(event.error!==undefined?' · Δpμ / E ≤ '+event.error.toExponential(2):'')+' · t='+fmt(event.t,1)+' fm/c'
    :'Henüz etkileşim gerçekleşmedi.';
}
function refresh(){fieldChips();channelOptions();currentInfo();}
function seed(id){
  const p=presetById(id);if(!p)return;
  currentPreset=p.id;lab.reset();renderer.selected=null;
  $('preset').value=id;
  const collisionPreset=Boolean(p.channel&&reaction(p.channel).kind==='collision');
  for(const [type,K,angle,x,y] of p.beams)lab.add(type,K,angle,x,y);
  lab.channel=p.channel||null;lab.autoCollision=collisionPreset;
  $('experimentTitle').textContent=p.name;
  note(p.description);
  if(p.channel){
    const ch=reaction(p.channel),status=channelStatus(ch,lab.fields);
    if(!status.ok)note('Engel: '+status.reason+' '+p.description,true);
    else if(ch.kind==='decay')note(p.description+' “İşlemi uygula” ile seçilmiş bozunma gerçekleşir.');
  }
  running=id!=='empty';
  playLabel();
  refresh();
}
function playLabel(){$('play').textContent=running?'Ⅱ':'▶';$('play').setAttribute('aria-label',running?'Duraklat':'Oynat');$('state').textContent=running?'● çalışıyor':'Ⅱ duraklatıldı';}
function place(type,K,angle,x,y){
  const p=lab.add(type,K,angle,x,y);
  renderer.selected=null;
  lab.channel=null;lab.autoCollision=false;
  $('experimentTitle').textContent='Özel alan deneyi';
  note(SPECIES[type].name+' alan paketi eklendi. Kanalları aşağıdan seç.');
  refresh();
  return p;
}
function reactSelected(){
  const id=$('channel').value;if(!id){note('Bu başlangıç durumu için listelenmiş kanal yok.',true);return;}
  const ch=reaction(id),status=channelStatus(ch,lab.fields);
  if(!status.ok){note(status.reason,true);return;}
  if(ch.kind==='collision'){
    const [a,b]=lab.fields;
    const distance=Math.hypot(a.x-b.x,a.y-b.y);
    if(distance>lab.packetSigma*1.5){
      lab.channel=id;lab.autoCollision=true;
      running=true;playLabel();
      note('Kanal hazır: '+ch.label+'. Demetler örtüşünce kinematik olay tetiklenecek. Kesit/olasılık hesaplanmıyor.');
      return;
    }
  }
  try{
    const result=lab.react(id,lab.fields.map(p=>p.id));
    note('Korunumlu olay: '+result.record.label+'. Bu kanal koşullu seçildi; fiziksel tesir kesiti veya dal oranı kullanılmadı.');
    $('experimentTitle').textContent=result.record.label;
    refresh();
  }catch(e){note(e.message,true);}
}
setupMenus();
$('species').addEventListener('change',()=>{$('energyLabel').textContent=labelFor(SPECIES[$('species').value]);});
$('addForm').addEventListener('submit',e=>{
  e.preventDefault();
  try{
    const K=Number($('kinetic').value),angle=Number($('angle').value);
    const n=lab.fields.length;
    place($('species').value,K,angle,n%2?8:-8,n%3===2?4:0);
  }catch(error){note(error.message,true);}
});
$('canvas').addEventListener('click',e=>{
  const box=$('canvas').getBoundingClientRect();
  const pt=renderer.world(e.clientX-box.left,e.clientY-box.top);
  try{place($('species').value,Number($('kinetic').value),Number($('angle').value),pt.x,pt.y);}
  catch(err){note(err.message,true);}
});
$('preset').addEventListener('change',e=>seed(e.target.value));
$('play').addEventListener('click',()=>{running=!running;playLabel();});
$('step').addEventListener('click',()=>{running=false;playLabel();const event=lab.advance(1);if(event){note('Çarpışma: '+lab.events[0].label);refresh();}currentInfo();renderer.draw();});
$('reset').addEventListener('click',()=>seed(currentPreset));
$('clear').addEventListener('click',()=>seed('empty'));
$('zoom').addEventListener('change',e=>{lab.widthFm=Number(e.target.value);renderer.draw();});
$('trigger').addEventListener('click',reactSelected);
$('channel').addEventListener('change',e=>{lab.channel=e.target.value||null;lab.autoCollision=false;const ch=lab.channel?reaction(lab.channel):null;if(ch)note(ch.label+' · Bu kanal için korunumluluk ve eşik denetimi uygulanır.');});
function animate(ts){
  const dt=prev?Math.min((ts-prev)/1000,0.08):0;prev=ts;
  if(running&&dt>0){
    const event=lab.advance(dt*24);
    if(event){
      note('Çarpışma gerçekleşti: '+lab.events[0].label+' · dört-momentum korunumu doğrulandı.');
      $('experimentTitle').textContent=lab.events[0].label;
      refresh();
    }
  }
  renderer.draw(ts);
  if(ts-lastUpdate>=130){lastUpdate=ts;currentInfo();}
  requestAnimationFrame(animate);
}
seed('annihilation');
if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches){running=false;playLabel();}
requestAnimationFrame(animate);
