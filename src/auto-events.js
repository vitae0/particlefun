import { HC, SPECIES } from './catalog.js';
import { energy, four, channelStatus, reaction } from './field-physics.js';

// Born/tree-level total CROSS SECTIONS in femtometer squared (fm²).
// Collision probability also needs an explicitly assumed normalized 3D beam profile.
export const ALPHA=1/137.035999084;
export const ME=SPECIES.e.mass;
export const RE=ALPHA*HC/ME; // classical electron radius ~ 2.818 fm
const PI=Math.PI;
const same=(arr,a,b)=>arr.length===2&&((arr[0]===a&&arr[1]===b)||(arr[0]===b&&arr[1]===a));
export const invariantS=(a,b)=>{
  const A=four(a),B=four(b);
  return Math.max(0,SPECIES[a.type].mass**2+SPECIES[b.type].mass**2+
    2*(A.E*B.E-A.px*B.px-A.py*B.py));
};
export function breitWheelerCrossSection(s,m=ME){
  if(!(s>4*m*m))return 0;
  const beta=Math.sqrt(Math.max(0,1-4*m*m/s));
  const r=ALPHA*HC/m;
  const log=Math.log1p(2*beta/(1-beta));
  const val=.5*PI*r*r*(1-beta*beta)*((3-beta**4)*log-2*beta*(2-beta*beta));
  return Math.max(0,val);
}
export function kleinNishinaCrossSection(k){
  if(k<=0)return 0;
  const T=8*PI*RE*RE/3;
  if(k<.001)return T*(1-2*k+5.2*k*k); // Thomson low-energy series.
  const L=Math.log1p(2*k);
  const v=2*PI*RE*RE*(
   ((1+k)/(k*k))*(2*(1+k)/(1+2*k)-L/k)+L/(2*k)-(1+3*k)/(1+2*k)**2
  );
  return Math.max(0,v);
}
export function eeMuonCrossSection(s,m){
  if(s<=4*m*m)return 0;
  // LO photon-channel unpolarized e+e- -> charged lepton pair,
  // m_e neglected in matrix element; validity sqrt(s) >> m_e,
  // away from the Z-resonance.
  return (4*PI*ALPHA*ALPHA*HC*HC/(3*s)) *
   Math.sqrt(1-4*m*m/s)*(1+2*m*m/s);
}
function eeGammaCrossSection(s){
  // High-energy leading-log tree-level total, only sqrt(s) > 10m_e.
  if(s<=100*ME*ME)return 0;
  return Math.max(0,2*PI*ALPHA*ALPHA*HC*HC/s*(Math.log(s/(ME*ME))-1));
}
export function crossSections(a,b){
  const types=[a.type,b.type],s=invariantS(a,b);
  const out=[];
  const append=(id,sigma,model)=>{if(Number.isFinite(sigma)&&sigma>0)out.push({id,sigma,model})};
  if(same(types,'photon','photon')){
    append('gg2ee',breitWheelerCrossSection(s,ME),'Breit–Wheeler LO');
    append('gg2mumu',breitWheelerCrossSection(s,SPECIES.mu.mass),'Breit–Wheeler LO');
    append('gg2tautau',breitWheelerCrossSection(s,SPECIES.tau.mass),'Breit–Wheeler LO');
  }
  if(same(types,'e','ae')){
    append('ee2gg',eeGammaCrossSection(s),'high-energy QED leading log');
    for(const [id,type] of [['ee2mumu','mu'],['ee2tautau','tau']])
      append(id,eeMuonCrossSection(s,SPECIES[type].mass),'QED photon channel LO');
  }
  if(same(types,'photon','e')||same(types,'photon','ae')){
    const photon=a.type==='photon'?a:b,electron=a.type==='photon'?b:a;
    const pf=four(photon),ef=four(electron);
    const restPhoton=(pf.E*ef.E-pf.px*ef.px-pf.py*ef.py)/ME;
    append(electron.type==='e'?'compton':'antiCompton',
      kleinNishinaCrossSection(restPhoton/ME),'Klein–Nishina total');
  }
  return out.filter(c=>channelStatus(reaction(c.id),[a,b]).ok);
}
function threeDOverlap(a,b,sigma){
  const dx=a.x-b.x,dy=a.y-b.y;
  const r2=dx*dx+dy*dy;const s2=sigma*sigma;
  // Independent normalized Gaussian 3D packets of equal width.
  return Math.exp(-r2/(4*s2))/Math.pow(4*Math.PI*s2,1.5);
}
function moller(a,b){
  const A=four(a),B=four(b),v1x=A.px/A.E,v1y=A.py/A.E,v2x=B.px/B.E,v2y=B.py/B.E;
  const vx=v1x-v2x,vy=v1y-v2y,cr=v1x*v2y-v1y*v2x;
  return Math.sqrt(Math.max(0,vx*vx+vy*vy-cr*cr));
}
const DECAYS={
 Z: [['Zee',.03363],['Zmm',.03366],['Ztt',.03370],['Zvv',.0667]],
 Wp: [['Wp_e',.1086],['Wp_mu',.1063]],
 Wm: [['Wm_e',.1086],['Wm_mu',.1063]],
 H: [['Hgg',.00227],['Hbb',.582]],
 pi0: [['piz',.98823]],
 pip: [['pip',.999877]],pim: [['pim',.999877]],
 Kp: [['Kp',.6356]],Km: [['Km',.6356]],
 mu: [['muDecay',1]],amu:[['amuDecay',1]],
 tau: [['tauDecay',.1739]],atau:[['atauDecay',.1739]],
 n: [['neutron',1]],an:[['antiNeutron',1]]
};
const clamp01=x=>Math.max(0,Math.min(1,x));
export class AutomaticEvents {
 constructor(lab,random=Math.random){
  this.lab=lab;this.random=random;this.mode='sample';
  this.decays=new Map();this.exposure=new Set();this.precisionStep=.35;
  this.observations=[];this.trials=0;this.hits=0;
  this.unresolved=[];
 }
 reset(){this.decays.clear();this.exposure.clear();this.observations=[];this.unresolved=[];this.trials=0;this.hits=0;}
 log(label,extra={}){
   const record={t:this.lab.clock,label,...extra};
   this.observations.unshift(record);this.observations.length=Math.min(90,this.observations.length);
   return record;
 }
 synchronize(){
  const ids=new Set(this.lab.fields.map(p=>p.id));
  for(const id of this.decays.keys())if(!ids.has(id))this.decays.delete(id);
  for(const p of this.lab.fields){
   const s=SPECIES[p.type];
   if(s.lifetime>0&&!this.decays.has(p.id)){
     const proper=-Math.log(Math.max(1e-16,1-this.random()))*s.lifetime;
     const gamma=energy(p)/s.mass;
     this.decays.set(p.id,{due:this.lab.clock+proper*gamma,proper,source:p.type});
   }
  }
 }
 nextDue(){
  this.synchronize();
  let best=null;
  for(const [id,data] of this.decays){
   if(!best||data.due<best.due)best={id,...data};
  }
  return best;
 }
 decay(p){
  const channels=DECAYS[p.type]||[];
  const u=this.random();let acc=0,selected=null;
  for(const [id,br] of channels){acc+=br;if(u<acc){selected=id;break;}}
  if(!selected || selected==='Hbb'){
    // The missing physical final states are NOT replaced by free quarks.
    // Move incoming four-momentum to an explicitly unobserved reservoir.
    const previous=four(p);
    this.lab.fields=this.lab.fields.filter(f=>f.id!==p.id);
    this.unresolved.push({type:p.type,initial:previous,at:this.lab.clock,channel:selected||'other'});
    this.log(SPECIES[p.type].name+' → diğer fiziksel kanal (ürünler hesaplanmıyor)',
      {unresolved:true,sector:p.type});
    return;
  }
  const ch=reaction(selected),allowed=channelStatus(ch,[p]);
  if(!allowed.ok){this.log('Bozunma engellendi: '+allowed.reason,{blocked:true});return;}
  const result=this.lab.react(selected,[p.id]);
  // Keep lifetime engine authoritative for subsequent daughters.
  this.log('Doğal bozunma · '+ch.label,{error:result.record.error,kind:'decay'});
 }
 collisions(dt){
  const parts=this.lab.fields;
  // The 3D packet model assumes no relative offset in the unshown z-axis.
  // One-packet overlap is a model of two single-particle wavepackets, not a dense beam.
  for(let i=0;i<parts.length;i++)for(let j=i+1;j<parts.length;j++){
   const a=parts[i],b=parts[j],key=[a.id,b.id].join(':');
   if(this.exposure.has(key))continue;
   const r=Math.hypot(a.x-b.x,a.y-b.y);
   if(r>3*this.lab.packetSigma)continue;
   const cs=crossSections(a,b);
   // Every time increment samples its own Poisson hazard. A single crossing
   // integrates the hazard across the full encounter, not only the first edge.
   if(!cs.length)continue;
   const speed=moller(a,b),density=threeDOverlap(a,b,this.lab.packetSigma);
   const rates=cs.map(c=>({...c,rate:c.sigma*speed*density}));
   const total=rates.reduce((s,c)=>s+c.rate,0);
   const prob=clamp01(1-Math.exp(-total*Math.max(dt,0)));
   this.trials++;
   if(this.mode==='expected'){
      this.log('Beklenen P = '+(100*prob).toPrecision(3)+'% · '+rates.map(x=>x.id).join(' / '),
       {prob,expected:true});continue;
   }
   if(this.random()>=prob){
      this.log('Geçiş yok · P='+(100*prob).toPrecision(3)+'% ('+rates.map(x=>x.id).join(', ')+')',
       {prob,noEvent:true});continue;
   }
   let u=this.random()*total,chosen=rates[rates.length-1];
   for(const c of rates){u-=c.rate;if(u<=0){chosen=c;break;}}
   try{
     this.exposure.add(key);
     const result=this.lab.react(chosen.id,[a.id,b.id]);
     this.hits++;
     this.log('Otomatik çarpışma · '+result.record.label,
       {prob,crossSection:chosen.sigma,model:chosen.model,error:result.record.error,kind:'collision'});
     return true;
   }catch(e){this.log('Çarpışma reddedildi: '+e.message,{blocked:true});}
  }
  return false;
 }
 tick(dt){
  const elapsed=Math.max(0,Number(dt)||0);
  if(!elapsed)return;
  this.synchronize();
  let left=elapsed;
  // Subdivide around short-lived decays, but never manufacture a fixed event.
  let steps=0;
  while(left>0&&steps++<128){
    const next=this.nextDue();
    const before=next?Math.max(0,next.due-this.lab.clock):Infinity;
    const chunk=Math.min(left,before,this.precisionStep||0.35);
    if(chunk>1e-14){this.lab.advance(chunk);this.collisions(chunk);left-=chunk;}
    else if(next&&before<1e-10){const p=this.lab.fields.find(p=>p.id===next.id);
      this.decays.delete(next.id);
      if(p)this.decay(p);
      this.synchronize();
    }else break;
  }
 }
 jumpToNextDecay(){
  const next=this.nextDue();
  if(!next)return null;
  const dt=Math.max(0,next.due-this.lab.clock);
  if(dt>0){
    // Exact ballistic transport from the currently modeled free propagator.
    // No fictitious speed-up of the decay rate; display time jumps to sampled event.
    for(const p of this.lab.fields){
      const E=energy(p);p.x+=p.px/E*dt;p.y+=p.py/E*dt;
      p.phase=((p.phase+((p.px*p.px+p.py*p.py)/E-E)*dt/HC)%(2*Math.PI));
    }
    this.lab.clock=next.due;
  }
  const p=this.lab.fields.find(x=>x.id===next.id);
  this.decays.delete(next.id);
  if(p)this.decay(p);
  // Only translate reference origin to keep result visible; no change to relative physics.
  const anchor=this.lab.fields[0];
  if(anchor&&Math.max(Math.abs(anchor.x),Math.abs(anchor.y))>this.lab.widthFm){
    const ax=anchor.x,ay=anchor.y;
    for(const f of this.lab.fields){f.x-=ax;f.y-=ay;}
  }
  this.synchronize();
  return {dt,record:this.observations[0]};
 }
}
