import { HC, SPECIES, C, conserved } from './catalog.js';

// Natural units: position fm, time fm/c, energy & momentum MeV (p in MeV/c).
// Strict on-shell 4-momentum, no free colored states. 2D spatial slice.
// Interaction rates/differential amplitudes are NOT calculated here.
const clamp = (x,lo,hi)=>Math.max(lo,Math.min(hi,x));
const eps = 1e-9;
export const norm = p=>Math.hypot(p.px,p.py,p.pz||0);
export const energy = p=>Math.hypot(SPECIES[p.type].mass, p.px, p.py,p.pz||0);
export const invariantMass = (a,b)=>Math.sqrt(Math.max(0,(a.E+b.E)**2-(a.px+b.px)**2-(a.py+b.py)**2-((a.pz||0)+(b.pz||0))**2));
export function four(p){return { E:energy(p),px:p.px,py:p.py,pz:p.pz||0 }; }
function sum4(points){return points.reduce((s,p)=>({E:s.E+p.E,px:s.px+p.px,py:s.py+p.py,pz:s.pz+(p.pz||0)}),{E:0,px:0,py:0,pz:0})}
const mass2 = v=>Math.max(0,v.E*v.E-v.px*v.px-v.py*v.py-(v.pz||0)**2);
export function checkFourMomenta(input,output,tol=1e-8){
  const a=sum4(input),b=sum4(output);
  return Math.abs(a.E-b.E)<=tol*Math.max(1,a.E) &&
    Math.abs(a.px-b.px)<=tol*Math.max(1,a.E) &&
    Math.abs(a.py-b.py)<=tol*Math.max(1,a.E) &&
    Math.abs(a.pz-b.pz)<=tol*Math.max(1,a.E);
}
function boost(v,parent){
  const bx=parent.px/parent.E,by=parent.py/parent.E,bz=(parent.pz||0)/parent.E;
  const beta2=bx*bx+by*by+bz*bz;
  if(beta2<1e-26)return {...v,pz:v.pz||0};
  if(beta2>=1)throw Error('CM referans çerçevesi bulunamadı.');
  const g=1/Math.sqrt(1-beta2),bp=bx*v.px+by*v.py+bz*(v.pz||0);
  const fac=(g-1)*bp/beta2+g*v.E;
  return {E:g*(v.E+bp),px:v.px+fac*bx,py:v.py+fac*by,pz:(v.pz||0)+fac*bz};
}
function decay2(parent,m1,m2,random){
  const M=Math.sqrt(mass2(parent));
  if(M<m1+m2-1e-7||M<=0)throw Error('Enerji eşiği sağlanmadı.');
  const s=M*M;
  const lam=Math.max(0,(s-(m1+m2)**2)*(s-(m1-m2)**2));
  const k=Math.sqrt(lam)/(2*M);
  // Uniform solid angle is kinematic phase space; no claimed spin matrix element.
  const z=2*random()-1,phi=2*Math.PI*random(),rad=Math.sqrt(Math.max(0,1-z*z));
  const px=k*rad*Math.cos(phi),py=k*rad*Math.sin(phi),pz=k*z;
  return [boost({E:Math.hypot(k,m1),px,py,pz},parent),
    boost({E:Math.hypot(k,m2),px:-px,py:-py,pz:-pz},parent)];
}
export function sampleFinalState(initial, finalTypes, random=Math.random){
  const total=sum4(initial.map(four)), M=Math.sqrt(mass2(total));
  const masses=finalTypes.map(id=>SPECIES[id]?.mass);
  if(masses.some(x=>x===undefined))throw new Error('Bilinmeyen son durum.');
  if(M < masses.reduce((a,b)=>a+b,0)-1e-6)
    throw new Error('Eşik altında: √s=' + M.toFixed(3) + ' MeV.');
  if(M<=0)throw new Error('Sistemin CM enerjisi sıfır.');
  if(finalTypes.length===2){
    const vec=decay2(total,masses[0],masses[1],random);
    if(!checkFourMomenta(initial.map(four),vec))throw new Error('4-momentum korunmadı.');
    return vec;
  }
  if(finalTypes.length===3){
    // Exact sequential two-body kinematics; uniform m12² is NOT the true V-A decay matrix element.
    const [a,b,c]=masses, min=a+b, max=M-c;
    const m12=Math.sqrt(min*min+(max*max-min*min)*random());
    const [pair,third]=decay2(total,m12,c,random);
    const [first,second]=decay2(pair,a,b,random);
    const result=[first,second,third];
    if(!checkFourMomenta(initial.map(four),result))throw new Error('4-momentum korunmadı.');
    return result;
  }
  throw new Error('Yalnızca iki ve üç cisimli süreçler desteklenir.');
}

const CHANNELS=[
 ['ee2gg',['e','ae'],['photon','photon'],'e⁻e⁺ → γγ','collision'],
 ['ee2mumu',['e','ae'],['mu','amu'],'e⁻e⁺ → μ⁻μ⁺','collision'],
 ['ee2tautau',['e','ae'],['tau','atau'],'e⁻e⁺ → τ⁻τ⁺','collision'],
 ['mm2gg',['mu','amu'],['photon','photon'],'μ⁻μ⁺ → γγ','collision'],
 ['gg2ee',['photon','photon'],['e','ae'],'γγ → e⁻e⁺','collision'],
 ['gg2mumu',['photon','photon'],['mu','amu'],'γγ → μ⁻μ⁺','collision'],
 ['gg2tautau',['photon','photon'],['tau','atau'],'γγ → τ⁻τ⁺','collision'],
 ['compton',['photon','e'],['photon','e'],'γe⁻ → γe⁻','collision'],
 ['antiCompton',['photon','ae'],['photon','ae'],'γe⁺ → γe⁺','collision'],
 ['moller',['e','e'],['e','e'],'e⁻e⁻ → e⁻e⁻','collision'],
 ['bhabha',['e','ae'],['e','ae'],'e⁻e⁺ → e⁻e⁺ (elastik)','collision'],
 ['Zee',['Z'],['e','ae'],'Z⁰ → e⁻e⁺','decay'],
 ['Zmm',['Z'],['mu','amu'],'Z⁰ → μ⁻μ⁺','decay'],
 ['Ztt',['Z'],['tau','atau'],'Z⁰ → τ⁻τ⁺','decay'],
 ['Zvv',['Z'],['ve','ave'],'Z⁰ → νe ν̄e','decay'],
 ['Wp_e',['Wp'],['ae','ve'],'W⁺ → e⁺ νe','decay'],
 ['Wm_e',['Wm'],['e','ave'],'W⁻ → e⁻ ν̄e','decay'],
 ['Wp_mu',['Wp'],['amu','vm'],'W⁺ → μ⁺ νμ','decay'],
 ['Wm_mu',['Wm'],['mu','avm'],'W⁻ → μ⁻ ν̄μ','decay'],
 ['Hgg',['H'],['photon','photon'],'H → γγ (nadir kanal)','decay'],
 ['Hbb',['H'],['b','ab'],'H → b b̄ (hadronlaşma ayrı)','unavailable'],
 ['piz',['pi0'],['photon','photon'],'π⁰ → γγ','decay'],
 ['pim',['pim'],['mu','avm'],'π⁻ → μ⁻ ν̄μ','decay'],
 ['pip',['pip'],['amu','vm'],'π⁺ → μ⁺ νμ','decay'],
 ['Km',['Km'],['mu','avm'],'K⁻ → μ⁻ ν̄μ','decay'],
 ['Kp',['Kp'],['amu','vm'],'K⁺ → μ⁺ νμ','decay'],
 ['muDecay',['mu'],['e','ave','vm'],'μ⁻ → e⁻ ν̄e νμ','decay'],
 ['amuDecay',['amu'],['ae','ve','avm'],'μ⁺ → e⁺ νe ν̄μ','decay'],
 ['tauDecay',['tau'],['mu','avm','vt'],'τ⁻ → μ⁻ ν̄μ ντ','decay'],
 ['atauDecay',['atau'],['amu','vm','avt'],'τ⁺ → μ⁺ νμ ν̄τ','decay'],
 ['neutron',['n'],['p','e','ave'],'n → p e⁻ ν̄e','decay'],
 ['antiNeutron',['an'],['ap','ae','ve'],'n̄ → p̄ e⁺ νe','decay']
].map(([id,initial,final,label,kind])=>({id,initial,final,label,kind}));
export const REACTIONS=Object.freeze(CHANNELS);
export function reaction(id){const found=REACTIONS.find(x=>x.id===id);if(!found)throw Error('Bilinmeyen kanal.');return found}
function sameMultiset(a,b){return a.length===b.length&&[...a].sort().join('|')===[...b].sort().join('|')}
export function channelStatus(ch, particles){
  if(ch.kind==='unavailable')return {ok:false,reason:'Renk hapsi: serbest kuark son durumu üretilemez.'};
  if(!sameMultiset(ch.initial,particles.map(p=>p.type)))
    return {ok:false,reason:'Başlangıç parçacıkları uyuşmuyor.'};
  const from=conserved(ch.initial),to=conserved(ch.final);
  for(const k of ['charge','baryon','e','mu','tau'])
    if(Math.abs(from[k]-to[k])>eps)return {ok:false,reason:k+' korunumu sağlanmadı.'};
  const M=Math.sqrt(mass2(sum4(particles.map(four))));
  const min=ch.final.reduce((a,id)=>a+SPECIES[id].mass,0);
  if(M<min-1e-6)return {ok:false,reason:'Enerji eşiği: gereken '+min.toFixed(2)+' MeV, mevcut '+M.toFixed(2)+' MeV.'};
  if(M===0)return {ok:false,reason:'CM durgunluk çerçevesi yok (eş yönlü fotonlar).'};
  return {ok:true,reason:'İzinli: dört-momentum ve yük/lepton/baryon sayısı korunabilir.',M};
}
export function eligibleChannels(particles) {
  return REACTIONS.filter(ch=>ch.kind!=='unavailable'&&sameMultiset(ch.initial,particles.map(p=>p.type)))
    .map(ch=>({...ch,...channelStatus(ch,particles)}));
}
export class FieldLab {
  constructor(random=Math.random){
    this.random=random;this.fields=[];this.sources=[];this.events=[];this.clock=0;this.id=1;
    this.widthFm=26;this.channel=null;this.autoCollision=false;this.packetSigma=2.1;this.transport=null;this.apparatus=null;
    this.completed=new Set();this.lastReaction=null;
  }
  reset(){this.fields=[];this.sources=[];this.events=[];this.clock=0;this.id=1;this.completed.clear();this.lastReaction=null;this.channel=null;this.autoCollision=false;this.transport?.reset();this.apparatus?.reset();}
  add(type,kineticMeV=4,angleDeg=0,x=0,y=0,z=0,elevationDeg=0){
    const s=SPECIES[type];if(!s)throw new Error('Bilinmeyen tür.');
    if(s.confined)throw new Error(s.name+': renk hapsi nedeniyle serbest durum olarak eklenemez. Hadron deneylerini kullan.');
    if(this.fields.length>=48)throw new Error('En fazla 48 alan paketi.');
    const kinetic=Number(kineticMeV),a=Number(angleDeg),X=Number(x),Y=Number(y),Z=Number(z),elev=Number(elevationDeg)*Math.PI/180;
    if(![kinetic,a,X,Y,Z,elev].every(Number.isFinite)||kinetic<0||kinetic>1e8)throw new Error('Enerji/konum sonlu ve fiziksel aralıkta olmalı.');
    if(s.mass===0&&kinetic===0)throw new Error('Kütlesiz parçacığın enerjisi pozitif olmalı.');
    const E=s.mass+kinetic,pp=Math.sqrt(kinetic*(2*s.mass+kinetic)),angle=a*Math.PI/180;
    const p={id:this.id++,type,x:X,y:Y,z:Z,px:pp*Math.cos(angle)*Math.cos(elev),py:pp*Math.sin(angle)*Math.cos(elev),pz:pp*Math.sin(elev),phase:0,birth:this.clock};
    this.fields.push(p);return p;
  }
  // Confined quark/gluon gauge-sector field SOURCE, not an on-shell free particle.
  addSource(type,x=0,y=0,z=0) {
    const s=SPECIES[type];
    if(!s?.confined)throw new Error('Yalnızca renkli alan kaynakları.');
    if(this.sources.length>=24)throw new Error('Alan kaynağı sınırı.');
    const source={id:'s'+this.id++,type,x:Number(x),y:Number(y),z:Number(z),sourceOnly:true};
    if(!Number.isFinite(source.x)||!Number.isFinite(source.y)||!Number.isFinite(source.z))throw new Error('Geçersiz konum.');
    this.sources.push(source);return source;
  }
  fromFour(type,v,x,y,z=0){
    const s=SPECIES[type];if(!s||s.confined)throw new Error('Serbest son durum oluşturulamaz.');
    const m2=Math.max(0,v.E*v.E-v.px*v.px-v.py*v.py-(v.pz||0)**2);
    if(Math.abs(m2-s.mass*s.mass)>1e-5*Math.max(1,v.E*v.E))
      throw new Error('Son durum kütle kabuğunda değil.');
    if(this.fields.length>=48)throw new Error('En fazla 48 alan paketi.');
    const p={id:this.id++,type,x,y,z,px:v.px,py:v.py,pz:v.pz||0,phase:0,birth:this.clock};
    this.fields.push(p);return p;
  }
  descriptions(){return this.fields.map(p=>({...p,...SPECIES[p.type],E:energy(p),speed: norm(p)/energy(p)}))}
  fieldValue(p,x,y,z=0){
    const E=energy(p),m=SPECIES[p.type].mass;
    const s0=this.packetSigma,delta=this.clock-p.birth;
    // Paraxial relativistic scalar packet (not Dirac/Maxwell/Proca/QCD).
    const gL=m*m/Math.pow(E,3),gT=1/E;
    const l=HC*delta*gL/(2*s0*s0),t=HC*delta*gT/(2*s0*s0);
    const sx=Math.max(s0,s0*Math.hypot(1,l)),sy=Math.max(s0,s0*Math.hypot(1,t));
    const ux=norm(p)>0?p.px/norm(p):1,uy=norm(p)>0?p.py/norm(p):0,uz=norm(p)>0?(p.pz||0)/norm(p):0;
    const dx=x-p.x,dy=y-p.y,dz=z-(p.z||0);
    const longitudinal=dx*ux+dy*uy+dz*uz,transverse=Math.sqrt(Math.max(0,dx*dx+dy*dy+dz*dz-longitudinal*longitudinal));
    const ampl=Math.exp(-.25*(longitudinal*longitudinal/(sx*sx)+transverse*transverse/(sy*sy)));
    const chirp=.25*((l/(1+l*l))*longitudinal**2/s0**2+(t/(1+t*t))*transverse**2/s0**2);
    // Phase evaluated around a moving centroid, with appropriate on-shell E.
    const phase=(p.px*dx+p.py*dy+(p.pz||0)*dz)/HC+
      chirp-.5*(Math.atan(l)+Math.atan(t))+p.phase;
    return ampl*Math.cos(phase);
  }
  react(channelId,ids){
    const ch=reaction(channelId);
    const particles=ids.map(id=>this.fields.find(p=>p.id===id));
    if(particles.some(p=>!p))throw new Error('Başlangıç paketi bulunamadı.');
    const status=channelStatus(ch,particles);
    if(!status.ok)throw new Error(status.reason);
    const initial=particles.map(four);
    const output=sampleFinalState(particles,ch.final,this.random);
    const location=particles.reduce((s,p)=>({x:s.x+p.x/particles.length,y:s.y+p.y/particles.length,z:s.z+(p.z||0)/particles.length}),{x:0,y:0,z:0});
    const oldIds=new Set(particles.map(p=>p.id));
    this.fields=this.fields.filter(p=>!oldIds.has(p.id));
    const created=output.map((v,i)=>this.fromFour(ch.final[i],v,location.x,location.y,location.z));
    const record={t:this.clock,label:ch.label,initial:ch.initial,final:ch.final,
      error:fourError(initial,output),x:location.x,y:location.y};
    this.events.unshift(record);this.events.length=Math.min(50,this.events.length);
    this.lastReaction=record;this.channel=null;this.autoCollision=false;
    return {record,created};
  }
  // This is a *conditioned demonstration*, not a cross section or a rate calculation.
  advance(dt){
    const delta=clamp(Number(dt)||0,0,1e15);
    if(!delta)return false;
    if(this.transport)return this.transport.advance(delta);
    const pre=this.fields.map(p=>[p.id,p.x,p.y]);
    for(const p of this.fields){
      const E=energy(p);
      const vx=p.px/E,vy=p.py/E;
      p.x+=vx*delta;p.y+=vy*delta;p.z=(p.z||0)+(p.pz||0)/E*delta;
      p.phase=(p.phase+((norm(p)**2/E)-E)*delta/HC)%(2*Math.PI);
    }
    this.clock+=delta;
    if(this.autoCollision&&this.channel){
      const ch=reaction(this.channel);
      const pairs=pre.filter(p=>this.fields.some(n=>n.id===p[0]));
      if(ch.initial.length===2){
        for(let i=0;i<pairs.length;i++)for(let j=i+1;j<pairs.length;j++){
          const a=this.fields.find(p=>p.id===pairs[i][0]),b=this.fields.find(p=>p.id===pairs[j][0]);
          if(!a||!b||!sameMultiset([a.type,b.type],ch.initial))continue;
          const before=Math.hypot(pairs[i][1]-pairs[j][1],pairs[i][2]-pairs[j][2]);
          const after=Math.hypot(a.x-b.x,a.y-b.y);
          if(after<=Math.min(3.5,this.packetSigma*1.5)&&after<before){
            const status=channelStatus(ch,[a,b]);
            if(status.ok){this.react(ch.id,[a.id,b.id]);return true;}
            this.events.unshift({t:this.clock,label:ch.label+': '+status.reason,blocked:true});
            this.events.length=Math.min(this.events.length,50);
            this.autoCollision=false;return false;
          }
        }
      }
    }
    return false;
  }
  resetPhase(){for(const p of this.fields){p.phase=0;p.birth=this.clock}}
}
export function fourError(a,b){
  const p=sum4(a),q=sum4(b),scale=Math.max(1,Math.abs(p.E));
  return Math.max(Math.abs(p.E-q.E),Math.abs(p.px-q.px),Math.abs(p.py-q.py),Math.abs(p.pz-q.pz))/scale;
}
