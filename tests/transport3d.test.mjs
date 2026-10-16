import test from 'node:test';
import assert from 'node:assert/strict';
import { FieldLab,energy,checkFourMomenta,four } from '../src/field-physics.js';
import { Transport3D,ALPHA_HC } from '../src/transport3d.js';
import { Apparatus } from '../src/apparatus.js';
import { SPECIES,HC } from '../src/catalog.js';
import { LIVE_SCENES } from '../src/live-scenes.js';

const approx=(x,y,tol=1e-7)=>{
 assert.ok(Number.isFinite(x),x);
 assert.ok(Math.abs(x-y)<=tol*Math.max(1,Math.abs(y)),x+' ≉ '+y);
};
const sceneLab=()=>{
 const lab=new FieldLab(()=>.3);
 lab.transport=new Transport3D(lab);
 lab.apparatus=new Apparatus(lab,()=>.3);
 return lab;
};
test('three dimensional electron Coulomb repulsion accelerates both particles from exact rest',()=>{
 const lab=sceneLab();
 const a=lab.add('e',0,0,-8,0,0),b=lab.add('e',0,0,8,0,0);
 const F=lab.transport.forces();
 assert.ok(F[0][0]<0&&F[1][0]>0);
 approx(F[0][0]+F[1][0],0,1e-12);
 const initial=lab.transport.totalEnergy();
 lab.advance(12);
 assert.ok(a.px<0&&b.px>0,'Electrons do not repel');
 assert.ok(a.x<-8&&b.x>8,'Separation did not grow');
 approx(a.px+b.px,0,1e-8);
 assert.ok(Math.abs(lab.transport.totalEnergy()-initial)/initial<.03);
});
test('z separation enters the real 3D Coulomb force and reduces field magnitude',()=>{
 const lab=sceneLab();const a=lab.add('e',0,0,-8,0,0),b=lab.add('e',0,0,8,0,0);
 const inPlane=Math.hypot(...lab.transport.forces()[0]);
 b.z=10;
 const in3D=Math.hypot(...lab.transport.forces()[0]);
 assert.ok(in3D<inPlane);
 assert.ok(Math.abs(lab.transport.forces()[0][2])>0);
});
test('Coulomb potential and gradients correspond in natural units',()=>{
 const lab=sceneLab();lab.add('p',0,0,-3,0,0);lab.add('e',0,0,3,0,0);
 const a=lab.fields[0];const h=1e-4;
 const fx=lab.transport.forces()[0][0];
 a.x+=h;const right=lab.transport.potential();
 a.x-=2*h;const left=lab.transport.potential();a.x+=h;
 const d=-(right-left)/(2*h);
 approx(fx,d,1e-7);
});
test('magnetic field rotates momentum but cannot perform work',()=>{
 const lab=sceneLab();const p=lab.add('e',3,0,0,0,0);
 lab.transport.B=[0,0,1e11];
 const before=energy(p);
 lab.advance(2);
 approx(energy(p),before,1e-8);
 assert.ok(Math.abs(p.py)>1e-6);
});
test('electric field changes charged momentum, not neutral photon',()=>{
 const lab=sceneLab(),e=lab.add('e',0,0,0,0,0),g=lab.add('photon',1,0,0,1);
 lab.transport.E=[0,2e20,0];
 lab.advance(.2);
 assert.ok(e.py<0);
 assert.equal(g.py,0);
});
test('z momentum free-propagates as pz/E and enforces subluminal speed',()=>{
 const lab=sceneLab();lab.add('e',1,45,0,0,3,60);
 const p=lab.fields[0],E=energy(p),t=1;
 const expected=(p.pz||0)/E*t;
 lab.advance(t);
 approx(p.z,3+expected,1e-9);
 assert.ok(Math.hypot(p.px,p.py,p.pz)/energy(p)<1);
});
test('decay daughters share 3D vertex and conserve complete 4 momentum',()=>{
 const lab=sceneLab(),p=lab.add('Z',0,0,3,4,7);
 const before=[four(p)];
 lab.react('Zee',[p.id]);
 assert.equal(lab.fields.length,2);
 assert.ok(lab.fields.every(x=>x.z===7));
 assert.ok(lab.fields.some(x=>Math.abs(x.pz)>0));
 assert.ok(checkFourMomenta(before,lab.fields.map(four)));
});
test('3D local electric plates act only inside specified rectangular volume',()=>{
 const lab=sceneLab();const e=lab.add('e',0,0,0,0,0),other=lab.add('e',0,0,20,0,0);
 lab.transport.enabled=false;
 lab.apparatus.add({kind:'plates',E:[0,1e20,0],box:{x:0,y:0,z:0,w:10,h:10,depth:10}});
 let forces=lab.transport.forces();
 assert.ok(forces[0][1]<0);
 assert.equal(forces[1][1],0);
 other.z=9;forces=lab.transport.forces();
 assert.equal(forces[1][1],0);
});
test('optical detector physical time of flight and Born sampling occur within the same scene',()=>{
 const lab=sceneLab();
 lab.add('photon',2.5e-6,0,-100,0,0);
 lab.apparatus.add({kind:'slits',x:100,slitX:0,separation:50,aperture:10,distance:100,ySpan:60});
 const result=lab.apparatus.fastForward();
 assert.ok(result&&result.dt===200);
 approx(lab.clock,200);
 assert.ok(lab.apparatus.hits.length>0);
 assert.equal(lab.apparatus.hits[0].kind,'born');
});
test('photoelectric detector enforces frequency threshold without fabricated output electron',()=>{
 const lab=sceneLab();lab.add('photon',1e-6,0,-20,0,0);
 lab.apparatus.add({kind:'photoelectric',x:0,workEV:2.3});
 lab.apparatus.fastForward();
 assert.equal(lab.fields.length,0);
 assert.equal(lab.apparatus.hits[0].kind,'photoelectric_blocked');
});
test('photoelectric K = photon energy minus work function',()=>{
 const lab=sceneLab();lab.add('photon',4e-6,0,-20,0,0);
 lab.apparatus.add({kind:'photoelectric',x:0,workEV:2.3});
 lab.apparatus.fastForward();
 assert.equal(lab.fields.length,1);
 assert.equal(lab.fields[0].type,'e');
 approx(energy(lab.fields[0])-SPECIES.e.mass,1.7e-6,1e-7);
});
test('live presets are real scene configurations and each has valid masses',()=>{
 assert.ok(LIVE_SCENES.length>60);
 for(const sc of LIVE_SCENES){
  assert.ok(sc.id&&sc.title&&sc.group);
  for(const b of sc.beams){
   assert.ok(SPECIES[b.type],sc.id+' '+b.type);
   assert.ok(Number.isFinite(b.K)&&b.K>=0,sc.id);
  }
 }
});
