import { HC, SPECIES } from './catalog.js';
import { energy } from './field-physics.js';

// Units: r in fm, t in fm/c, momentum in MeV/c, c=1.
// Coulomb potential U_ij = alpha*hbar*c*q_i*q_j/sqrt(r²+a²).
// Eext[V/m] : 1e-21*q E MeV/fm. Bext[T]: 2.99792458e-13*q*(v×B) MeV/fm.
// Pair fields are instantaneous 3-D electrostatic interactions, not full QED.
export const ALPHA_HC = HC/137.035999084;
const ELECTRIC_COEFF = 1e-21;
const MAGNETIC_COEFF = 2.99792458e-13;
const unit=(p)=>{const E=energy(p);return [p.px/E,p.py/E,(p.pz||0)/E];};
export const momentumNorm=p=>Math.hypot(p.px,p.py,p.pz||0);
const finite=n=>Number.isFinite(n);

export class Transport3D {
 constructor(lab){
  this.lab=lab;
  this.enabled=true;
  this.softeningFm=.35;
  this.maxStep=.32;
  this.minStep=1e-5;
  this.E=[0,0,0]; // V/m
  this.B=[0,0,0]; // Tesla
  this.gradientTPerM=0;
  this.last={steps:0,unconsumed:0,energyDrift:0};
  this.reference=null;
 }
 setMagnetic(x=0,y=0,z=0){this.B=[x,y,z];}
 setElectric(x=0,y=0,z=0){this.E=[x,y,z];}
 reset(){this.E=[0,0,0];this.B=[0,0,0];this.gradientTPerM=0;this.reference=null;this.last={steps:0,unconsumed:0,energyDrift:0};}
 potential(){
  const ps=this.lab.fields,a2=this.softeningFm**2;
  let U=0;
  for(let i=0;i<ps.length;i++)for(let j=i+1;j<ps.length;j++){
   const x=ps[i],y=ps[j],q=SPECIES[x.type].charge*SPECIES[y.type].charge;
   if(!q)continue;
   const r=Math.hypot(x.x-y.x,x.y-y.y,(x.z||0)-(y.z||0));
   U+=ALPHA_HC*q/Math.sqrt(r*r+a2);
  }
  return U;
 }
 totalEnergy(){
  // Only an isolated pair system in static zero external E obeys this energy.
  return this.lab.fields.reduce((s,p)=>s+energy(p),0)+this.potential();
 }
 forces(){
  const ps=this.lab.fields,fs=ps.map(()=>[0,0,0]),a2=this.softeningFm**2;
  if(this.enabled)for(let i=0;i<ps.length;i++){
   const a=ps[i],qa=SPECIES[a.type].charge;if(!qa)continue;
   for(let j=i+1;j<ps.length;j++){
    const b=ps[j],qq=qa*SPECIES[b.type].charge;if(!qq)continue;
    const dx=a.x-b.x,dy=a.y-b.y,dz=(a.z||0)-(b.z||0);
    const r2=dx*dx+dy*dy+dz*dz+a2;
    const fac=ALPHA_HC*qq/Math.pow(r2,1.5);
    const f=[fac*dx,fac*dy,fac*dz];
    for(let k=0;k<3;k++){fs[i][k]+=f[k];fs[j][k]-=f[k];}
   }
  }
  for(let i=0;i<ps.length;i++){
   const p=ps[i],q=SPECIES[p.type].charge;
   for(let k=0;k<3;k++)fs[i][k]+=q*ELECTRIC_COEFF*this.E[k];
   if(this.gradientTPerM && p.spinProjection!==undefined){
     // μz = ±g_s μB/2. For electron g≈2, μB=5.7883818e-11 MeV/T.
     // ∇B in Tesla/m converted to Tesla/fm.
     fs[i][1]+=p.spinProjection*5.7883817982e-11*this.gradientTPerM*1e-15;
   }
  }
  return fs;
 }
 boris(p,dt){
  const q=SPECIES[p.type].charge;
  if(!q||!this.B.some(Boolean))return;
  const E=energy(p), coeff=q*MAGNETIC_COEFF*dt/(2*E);
  const t=this.B.map(v=>v*coeff),t2=t.reduce((s,x)=>s+x*x,0);
  const s=t.map(v=>2*v/(1+t2));
  const pMinus=[p.px,p.py,p.pz||0];
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const prime=cross(pMinus,t).map((v,i)=>v+pMinus[i]);
  const rotated=cross(prime,s).map((v,i)=>v+pMinus[i]);
  [p.px,p.py,p.pz]=rotated;
 }
 stableStep(maxDt){
  const ps=this.lab.fields,fs=this.forces();
  let dt=Math.min(maxDt,this.maxStep);
  const B=Math.hypot(...this.B);
  for(let i=0;i<ps.length;i++){
   const p=ps[i],E=energy(p),f=Math.hypot(...fs[i]),v=unit(p);
   if(f)dt=Math.min(dt,Math.sqrt(.12*this.softeningFm*E/f));
   if(B&&SPECIES[p.type].charge)dt=Math.min(dt,.12*E/(Math.abs(SPECIES[p.type].charge)*MAGNETIC_COEFF*B));
   for(let j=i+1;j<ps.length;j++){
    const b=ps[j],w=unit(b);
    const r=Math.max(this.softeningFm,Math.hypot(p.x-b.x,p.y-b.y,(p.z||0)-(b.z||0)));
    const rel=Math.hypot(v[0]-w[0],v[1]-w[1],v[2]-w[2]);
    if(rel)dt=Math.min(dt,.16*r/rel);
   }
  }
  return Math.max(this.minStep,dt);
 }
 integrate(dt){
  const ps=this.lab.fields,f0=this.forces();
  for(let i=0;i<ps.length;i++){
   const p=ps[i];
   p.px+=f0[i][0]*dt*.5;p.py+=f0[i][1]*dt*.5;
   p.pz=(p.pz||0)+f0[i][2]*dt*.5;
   this.boris(p,dt);
   const v=unit(p);
   p.x+=v[0]*dt;p.y+=v[1]*dt;p.z=(p.z||0)+v[2]*dt;
   const E=energy(p),pdotv=(p.px*v[0]+p.py*v[1]+p.pz*v[2]);
   p.phase=((p.phase||0)+(pdotv-E)*dt/HC)%(2*Math.PI);
  }
  const f1=this.forces();
  for(let i=0;i<ps.length;i++){
   ps[i].px+=f1[i][0]*dt*.5;ps[i].py+=f1[i][1]*dt*.5;
   ps[i].pz+=f1[i][2]*dt*.5;
  }
  this.lab.clock+=dt;
 }
 advance(dt){
  let remaining=Math.max(0,Number(dt)||0);
  if(!finite(remaining)||remaining>1e19)throw Error('Geçersiz fizik zamanı.');
  if(this.reference===null)this.reference=this.totalEnergy();
  let steps=0;
  while(remaining>1e-11&&steps<2500){
   const next=Math.min(remaining,this.stableStep(remaining));
   this.integrate(next);
   remaining-=next;steps++;
  }
  this.last={steps,unconsumed:remaining,energyDrift:this.reference?
    (this.totalEnergy()-this.reference)/Math.abs(this.reference):0};
  // Explicitly refuse to count unintegrated time. Caller must use achieved dt.
  return dt-remaining;
 }
}
