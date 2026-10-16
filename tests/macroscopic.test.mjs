import test from 'node:test';
import assert from 'node:assert/strict';
import {FieldLab,energy} from '../src/field-physics.js';
import {Transport3D} from '../src/transport3d.js';
import {Apparatus} from '../src/apparatus.js';
import {LIVE_SCENES} from '../src/live-scenes.js';
import {SPECIES} from '../src/catalog.js';

const close=(a,b,rel=.03)=>assert.ok(Number.isFinite(a)&&Math.abs(a-b)<=rel*Math.max(1e-30,Math.abs(b)),a+' should be close to '+b);
function scene(id){
 const s=LIVE_SCENES.find(s=>s.id===id);assert.ok(s,id);
 const lab=new FieldLab(()=>.37);lab.transport=new Transport3D(lab);
 lab.apparatus=new Apparatus(lab,()=>.37);
 for(const d of s.devices)lab.apparatus.add(structuredClone(d));
 for(const p of s.beams){
  if(SPECIES[p.type].confined)lab.addSource(p.type,p.x,p.y,p.z);
  else {
   const particle=lab.add(p.type,p.K,p.angle,p.x,p.y,p.z,p.elev);
   if(p.type==='silver')particle.spinProjection=.37<.5?-1:1;
  }
 }
 return lab;
}
test('real optical 500 nm wavelength, 1.2 micron slit separation, mm flight',()=>{
 const l=scene('young'),p=l.fields[0],d=l.apparatus.devices.find(x=>x.kind==='slits');
 const wavelength=2*Math.PI*197.3269804/energy(p); // fm
 close(wavelength,4.96e8,.03);
 close(d.separation,1.2e9,.01);
 close(d.distance,1e12,.01);
 const event=l.apparatus.fastForward();
 assert.ok(event);
 close(event.dt,2e12,.01);
 assert.ok(l.apparatus.hits.some(h=>h.kind==='born'));
});
test('macroscopic Millikan terminal velocity has the correct order of magnitude',()=>{
 const l=scene('millikan');
 const m=SPECIES.oil.mass*1.602176634e-13/(299792458**2);
 close(m,4.71238898e-16,.01);
 const before=l.fields[0].y;
 const evt=l.apparatus.fastForward();
 assert.ok(evt && evt.dt>1e20);
 const moved=(l.fields[0].y-before)*1e-15;
 assert.ok(Math.abs(moved)>1e-7&&Math.abs(moved)<1e-4);
 assert.equal(l.apparatus.hits[0].kind,'millikan');
});
test('Stern–Gerlach at macroscopic scale produces distinct ±μ_B spin exits',()=>{
 const lab=scene('stern');
 lab.fields[0].spinProjection=-1;
 lab.fields[1].spinProjection=1;
 const E=energy(lab.fields[0]);
 assert.ok(E>9e4);
 const original=lab.clock;
 const out=lab.apparatus.fastForward();
 assert.ok(out&&out.dt>1e18);
 assert.equal(lab.apparatus.hits.filter(h=>h.kind==='screen').length,lab.fields.length);
 assert.ok(lab.fields[0].y<0&&lab.fields[1].y>0);
 assert.ok(lab.clock>original);
});
test('Thomson real-size E/B apparatus uses SI Lorentz RK4 and reaches screen',()=>{
 const lab=scene('thomson');
 const x=lab.fields[0].x;
 const oldE=energy(lab.fields[0]);
 const result=lab.apparatus.fastForward();
 assert.ok(result,result);
 assert.ok(result.approximation.startsWith('relativistic'));
 assert.ok(result.dt>1e12);
 assert.ok(lab.fields[0].x>x);
 assert.ok(Math.abs(lab.fields[0].x-1.2e14)<1e10);
 assert.ok(lab.apparatus.hits.length>0);
 assert.ok(Number.isFinite(energy(lab.fields[0])));
});
test('CRT electrostatic deflection changes vertical momentum in correct sign',()=>{
 const lab=scene('crt');
 const p=lab.fields[0],before=p.py;
 const out=lab.apparatus.fastForward();assert.ok(out);
 assert.ok(p.py<before, 'negative electron and positive Ey must accelerate toward -y');
 assert.ok(p.y<0);
});
test('beamline and apparatus use 3D z coordinates',()=>{
 const lab=scene('thomson');
 lab.fields[0].z=1e12;
 const before=lab.fields[0].z;
 const out=lab.apparatus.fastForward();
 assert.ok(out);
 close(lab.fields[0].z,before,1e-8);
});
