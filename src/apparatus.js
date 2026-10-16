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
