import { HC, SPECIES } from './catalog.js';
import { energy } from './field-physics.js';

// Devices live in the SAME 3D scene. Local fields are piecewise-uniform;
// optical apparatus applies Born-rule detection, not free classical ray scattering.
const cos=Math.cos,sin=Math.sin,PI=Math.PI;
const c=(n,a,b)=>Math.max(a,Math.min(b,n));
const sinc=x=>Math.abs(x)<1e-10?1:Math.sin(x)/x;
export class Apparatus {
 constructor(lab,random=Math.random){
  this.lab=lab;this.random=random;this.devices=[];this.hits=[];this.ledger=[];
 }
 reset(){this.devices=[];this.hits=[];this.ledger=[];}
 add(device){const d={...device,id:this.devices.length+1};this.devices.push(d);return d;}
 fieldAt(p){
  let E=[0,0,0],B=[0,0,0],grad=0;
  for(const d of this.devices){
   const inside= !d.box || Math.abs(p.x-(d.box.x||0)) <= (d.box.w||Infinity)/2 &&
    Math.abs(p.y-(d.box.y||0)) <= (d.box.h||Infinity)/2 &&
    Math.abs((p.z||0)-(d.box.z||0)) <= (d.box.depth||Infinity)/2;
   if(!inside)continue;
   if(d.kind==='plates'||d.kind==='wien'||d.kind==='trap'){
    for(let k=0;k<3;k++)E[k]+=(d.E||[0,0,0])[k]||0;
   }
   if(['magnet','wien','trap','spinmagnet'].includes(d.kind))
    for(let k=0;k<3;k++)B[k]+=(d.B||[0,0,0])[k]||0;
   if(d.kind==='spinmagnet')grad+=(d.gradient||0);
  }
  return {E,B,grad};
 }
 crossed(before,p,x){
  const prev=before.find(a=>a.id===p.id);if(!prev)return false;
  return (prev.x<x&&p.x>=x)||(prev.x>x&&p.x<=x);
 }
 // Exact straight-line time-of-flight shortcut ONLY for free neutral photons.
 // This avoids billions of microscopic steps for optical devices. It does
 // not bypass charged-particle forces, detector sampling or physical time.
 fastForward(){
  const packets=this.lab.fields;
  if(packets.length&&packets.every(p=>p.type==='oil')&&this.devices.some(d=>d.kind==='oilDrop'))
    return this.advanceOilDrop();
  if(packets.length&&packets.every(p=>p.type==='silver')&&this.devices.some(d=>d.kind==='spinmagnet'))
    return this.advanceSpinBeamline();
  if(packets.length&&packets.every(p=>['e','ae','mu','amu','p','ap','alpha'].includes(p.type))&&
     this.devices.some(d=>['plates','magnet','wien'].includes(d.kind))&&
     this.devices.some(d=>d.kind==='screen')&&
     packets.every(p=>Math.abs(p.x)>1e11))
    return this.advanceLorentzBeamline();
  if(!packets.length||packets.some(p=>p.type!=='photon'))return null;
  const planes=this.devices.filter(d=>['screen','slits','photoelectric','interferometer'].includes(d.kind));
  let closest=null;
  for(const p of packets){
   const E=energy(p),vx=p.px/E;
   if(Math.abs(vx)<1e-12)continue;
   for(const d of planes){
    const t=(d.x-p.x)/vx;
    if(t>1e-9&&Number.isFinite(t)&&(!closest||t<closest.dt))closest={dt:t,device:d};
   }
  }
  if(!closest)return null;
  const before=packets.map(p=>({id:p.id,x:p.x,y:p.y,z:p.z||0}));
  for(const p of packets){
   const E=energy(p);p.x+=p.px/E*closest.dt;p.y+=p.py/E*closest.dt;
   p.z=(p.z||0)+(p.pz||0)/E*closest.dt;
   p.phase=((p.phase-E*closest.dt/HC)%(2*Math.PI));
  }
  this.lab.clock+=closest.dt;
  this.afterStep(before,closest.dt);
  return {dt:closest.dt,device:closest.device,hits:this.hits};
 }


 // High-accuracy 3D laboratory-beam tracking at cm and ns scales.
 // Adaptive RK4 in SI seconds, with exact relativistic v=p*c/E and
 // piecewise prescribed electric/magnetic apparatus fields. No pair
 // Coulomb transport; only used when interparticle Coulomb is negligible.
 advanceLorentzBeamline(){
  const detector=this.devices.find(d=>d.kind==='screen');
  if(!detector)return null;
  const c=299792458,chargeUnit=299.792458; // (MeV/c)/s per V/m for q=e
  let maxTime=0,integrated=0,allReached=true;
  const before=this.lab.fields.map(p=>({id:p.id,x:p.x,y:p.y,z:p.z||0}));
  for(const p of this.lab.fields){
   const v0=p.px/energy(p)*c,dx=(detector.x-p.x)*1e-15;
   if(!(dx/v0>0&&Number.isFinite(dx/v0)))return null;
   maxTime=Math.max(maxTime,dx/v0);
  }
  // Demonstrate only where 3D pair Coulomb is <10^-3 of applied field.
  if(this.lab.fields.length>1){
   for(let i=0;i<this.lab.fields.length;i++)for(let j=i+1;j<this.lab.fields.length;j++){
    const a=this.lab.fields[i],b=this.lab.fields[j];
    const sep=Math.hypot(a.x-b.x,a.y-b.y,(a.z||0)-(b.z||0));
    if(sep<1e11)return null;
   }
  }
  const rhs=(type,u)=>{
    const E=Math.hypot(SPECIES[type].mass,u[3],u[4],u[5]);
    const vel=[u[3]/E*c,u[4]/E*c,u[5]/E*c];
    const at=this.fieldAt({x:u[0],y:u[1],z:u[2]});
    const ex=at.E,bt=at.B,q=SPECIES[type].charge;
    const cross=[
      vel[1]*bt[2]-vel[2]*bt[1],
      vel[2]*bt[0]-vel[0]*bt[2],
      vel[0]*bt[1]-vel[1]*bt[0]
    ];
    return [...vel.map(x=>x*1e15),...cross.map((x,i)=>q*chargeUnit*(x+ex[i]))];
  };
  const advance=(type,u,h)=>{
    const plus=(a,b,f)=>a.map((x,i)=>x+b[i]*f);
    const k1=rhs(type,u),k2=rhs(type,plus(u,k1,h/2));
    const k3=rhs(type,plus(u,k2,h/2)),k4=rhs(type,plus(u,k3,h));
    return u.map((x,i)=>x+h*(k1[i]+2*k2[i]+2*k3[i]+k4[i])/6);
  };
  for(const p of this.lab.fields){
    const charge=SPECIES[p.type].charge;
    const startX=p.x,was=energy(p);
    let u=[p.x,p.y,p.z||0,p.px,p.py,p.pz||0],t=0,steps=0;
    const v=Math.max(1,Math.hypot(p.px,p.py,p.pz||0)/was*c);
    const estimate=Math.abs((detector.x-p.x)*1e-15)/v;
    const terminal=Math.max(estimate*12,1e-10);
    const Bmax=this.devices.reduce((m,d)=>Math.max(m,Math.hypot(...(d.B||[0,0,0]))),0);
    const omega=Math.abs(charge)*299.792458*c*Math.max(Bmax,1e-20)/Math.max(1,was*c);
    // 1500 nominal time steps; reduce dt near strong magnetic precession.
    const base=Math.min(estimate/1700,omega>0?.045/omega:estimate/1700);
    while(steps++<18000&&t<terminal){
      const beforeU=u,dt=Math.max(1e-17,Math.min(base,terminal-t));
      const next=advance(p.type,u,dt);
      u=next;t+=dt;
      if((beforeU[0]-detector.x)*(next[0]-detector.x)<=0){
       const frac=(detector.x-beforeU[0])/(next[0]-beforeU[0]||1);
       u=beforeU.map((x,i)=>x+(next[i]-x)*frac);
       t-=dt*(1-frac);break;
      }
    }
    if((u[0]-detector.x)*(startX-detector.x)>0)allReached=false;
    [p.x,p.y,p.z,p.px,p.py,p.pz]=u;
    p.phase=((p.phase||0)-was*t*c*1e15/HC)%(2*Math.PI);
    integrated=Math.max(integrated,t);
  }
  this.lab.clock+=integrated*c*1e15;
  this.afterStep(before,integrated*c*1e15);
  return {dt:integrated*c*1e15,device:detector,hits:this.hits,
    approximation:allReached?'relativistic E/B RK4':'RK4: detector not reached'};
 }
 // SI Stokes limit: m dv/dt = qE - mg - 6πηrv (low Reynolds number).
 // The analytical result advances measured physical time without discretizing
 // ~10²¹ fm/c into microscopic particle-collision time steps.
 advanceOilDrop(){
  const d=this.devices.find(d=>d.kind==='oilDrop');
  if(!d)return null;
  const seconds=d.stepSeconds||.01,r=d.radiusM||.5e-6;
  const eta=d.viscosity||1.81e-5,rho=d.density||900;
  const mass=(4/3)*Math.PI*r**3*rho,drag=6*Math.PI*eta*r;
  const charge=-1.602176634e-19,E=d.E_Vm||0;
  const vTerminal=(charge*E-mass*(d.g||9.81))/drag;
  const tau=mass/drag,ex=Math.exp(-seconds/tau);
  for(const p of this.lab.fields){
   const v0=p.vY_SI||0;
   const dy=vTerminal*seconds+(v0-vTerminal)*tau*(-Math.expm1(-seconds/tau));
   const v1=vTerminal+(v0-vTerminal)*ex;
   p.y+=dy*1e15;p.py=SPECIES[p.type].mass*v1/299792458;
   p.vY_SI=v1;
   this.hits.unshift({kind:'millikan',dyM:dy,velocityMs:v1,clock:this.lab.clock+seconds*299792458*1e15});
  }
  this.lab.clock+=seconds*299792458*1e15;
  this.hits.length=Math.min(this.hits.length,300);
  return {dt:seconds*299792458*1e15,device:d,hits:this.hits};
 }
 // Paraxial Stern-Gerlach flight model for a neutral silver beam.
 // The magnetic field gradient acts on a measured ±μ_B spin projection.
 // Analytic integration of piecewise constant force, with p_x/E ~ constant.
 // Valid when |Δp_y| << |p_x|, no intermediate quantum measurement.
 advanceSpinBeamline(){
  const screen=this.devices.find(d=>d.kind==='screen');
  if(!screen)return null;
  const before=this.lab.fields.map(p=>({id:p.id,x:p.x,y:p.y,z:p.z||0}));
  let time=Infinity;
  for(const p of this.lab.fields){
   const vx=p.px/energy(p),dt=(screen.x-p.x)/vx;
   if(!(dt>0&&Number.isFinite(dt)))return null;
   time=Math.min(time,dt);
  }
  for(const p of this.lab.fields){
   const E=energy(p),vx=p.px/E,dt=(screen.x-p.x)/vx;
   const initialPy=p.py,pyz=p.pz||0;
   let displacement=initialPy/E*dt,deltaPy=0;
   for(const d of this.devices.filter(d=>d.kind==='spinmagnet')){
     const x1=(d.box.x||0)-(d.box.w||0)/2,x2=(d.box.x||0)+(d.box.w||0)/2;
     const t1=Math.max(0,Math.min(dt,(x1-p.x)/vx)),t2=Math.max(0,Math.min(dt,(x2-p.x)/vx));
     if(t2<=t1)continue;
     const F=(p.spinProjection||1)*5.7883817982e-11*(d.gradient||0)*1e-15;
     displacement+=F/(2*E)*((dt-t1)**2-(dt-t2)**2);
     deltaPy+=F*(t2-t1);
   }
   p.x=screen.x;p.y+=displacement;
   p.z=(p.z||0)+pyz/E*dt;
   p.py+=deltaPy;
   p.phase=((p.phase||0)-E*dt/HC)%(2*Math.PI);
  }
  this.lab.clock+=time;
  this.afterStep(before,time);
  return {dt:time,device:screen,hits:this.hits,approximation:'paraxial spin force'};
 }
 afterStep(before,dt){
  for(const d of this.devices){
   if(d.kind==='screen'||d.kind==='chamber'){
    for(const p of this.lab.fields){
     if(this.crossed(before,p,d.x)){
      const hit={kind:d.kind,device:d.id,type:p.type,clock:this.lab.clock,y:p.y,z:p.z||0};
      this.hits.unshift(hit);this.hits.length=Math.min(this.hits.length,300);
     }
    }
   }
   if(d.kind==='slits'||d.kind==='interferometer'){
    for(const p of this.lab.fields){
     if(p.type!=='photon'||!this.crossed(before,p,d.x))continue;
     if(d.kind==='slits'){
       // Coherent single-photon Fraunhofer sample for an ideal double aperture,
       // screen coordinate y and incidence along +x. Not a Maxwell PDE solver.
       const wavelength=2*PI*HC/energy(p);
       const sep=d.separation||400,ap=d.aperture||100,L=d.distance||25000;
       const ySpan=d.ySpan||10000;
       const intensity=y=>{
         const theta=Math.atan2(y,L),a=PI*ap*sin(theta)/wavelength;
         const b=PI*sep*sin(theta)/wavelength;
         return (sinc(a)*cos(b))**2;
       };
       let y=0;for(let k=0;k<4000;k++){
        const sample=(this.random()*2-1)*ySpan;
        if(this.random()<intensity(sample)){y=sample;break;}
       }
       p.y=y;p.x=d.x;this.hits.unshift({kind:'born',type:p.type,clock:this.lab.clock,y,z:p.z||0});
     }else{
       const ph=d.phase||0,det=this.random()<cos(ph/2)**2?0:1;
       p.y=det===0?-(d.offset||300):(d.offset||300);
       this.hits.unshift({kind:'interference',detector:det,clock:this.lab.clock,y:p.y});
     }
     this.hits.length=Math.min(this.hits.length,300);
    }
   }
   if(d.kind==='photoelectric'){
    for(const p of [...this.lab.fields]){
     if(p.type!=='photon'||!this.crossed(before,p,d.x))continue;
     const ePhoton=energy(p),work=(d.workEV||2.3)*1e-6;
     this.lab.fields=this.lab.fields.filter(v=>v.id!==p.id);
     if(ePhoton>work){
       const K=ePhoton-work;
       const v=this.lab.add('e',K,180,d.x,p.y,p.z||0);
       this.hits.unshift({kind:'photoelectric',K,clock:this.lab.clock,type:'e',y:p.y});
       this.ledger.push({kind:'workfunction',energy:work,description:'Work function transferred to target'});
     }else this.hits.unshift({kind:'photoelectric_blocked',clock:this.lab.clock});
     this.hits.length=Math.min(this.hits.length,300);
    }
   }
  }
 }
}
