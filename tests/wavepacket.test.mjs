import test from 'node:test';
import assert from 'node:assert/strict';
import {HC,SPECIES} from '../src/catalog.js';
import {FieldLab} from '../src/field-physics.js';
import {packetAt,packetGeometry,safePacketWidth} from '../src/wavepacket.js';
import {ScientificRenderer} from '../src/scientific-renderer.js';

const near=(x,y,tol=1e-10)=>assert.ok(Math.abs(x-y)<=tol*Math.max(1,Math.abs(y)),x+' != '+y);
test('electron reduced Compton wavelength is about 386.16 fm',()=>{
 const reduced=HC/SPECIES.e.mass;
 near(reduced,386.159,1e-5);
});
test('electron packet at 2.1 fm violates narrow-momentum paraxial approximation',()=>{
 const l=new FieldLab(),p=l.add('e',0,0,0,0);
 const b=safePacketWidth(p,2.1);
 assert.ok(b.substituted);
 assert.ok(b.minSigma>1900&&b.minSigma<2000);
 const g=packetGeometry(p,2.1,1);
 assert.ok(g.sigmaL>1900);
 assert.ok(g.sigmaL/g.sigma0<1.0001);
});
test('free wavepacket peak density falls as sigmaL*sigmaT² grows',()=>{
 const l=new FieldLab(),p=l.add('e',0,0,0,0);
 const t0=packetAt(p,2.1,0,0,0,0);
 const t1=packetAt(p,2.1,10000,0,0,0);
 near(t0.probability,1);
 assert.ok(t1.probability<1&&t1.densityFm3<t0.densityFm3);
 near(t1.densityFm3/t0.densityFm3,
   t1.geometry.peakProbabilityRatio,1e-9);
});
test('absolute 3D density is correctly normalized',()=>{
 const l=new FieldLab(),p=l.add('e',0,0,0,0);
 const t=packetAt(p,2.1,10000,0,0,0);
 const geom=t.geometry;
 const origin=packetAt(p,2.1,10000,0,0,0);
 near(origin.densityFm3*Math.pow(2*Math.PI,1.5)*
   geom.sigmaL*geom.sigmaT**2,1);
});
test('stationary free electron probability is isotropic and monotonically decreasing in radius',()=>{
 const l=new FieldLab(),p=l.add('e',0,0,0,0);
 const g=packetGeometry(p,2.1,1);
 const samples=[0,200,600,1200].map(r=>packetAt(p,2.1,1,r,0,0).probability);
 for(let i=1;i<samples.length;i++)assert.ok(samples[i]<samples[i-1]);
 near(packetAt(p,2.1,1,0,500,0).probability,
   packetAt(p,2.1,1,0,0,500).probability,1e-10);
});
test('all Gaussian real amplitudes bounded by the normalized envelope',()=>{
 const l=new FieldLab(),p=l.add('e',0,0,0,0);
 for(const t of [0,1,100,10000])for(const x of [0,100,400]){
   const a=packetAt(p,2.1,t,x,0,0);
   assert.ok(a.probability>=0&&a.probability<=1);
   assert.ok(a.realAmplitude**2<=a.probability+1e-12);
 }
});
test('scientific electron default plots Coulomb potential, not arbitrary phase rings',()=>{
 const fake={getContext(){return {}},getBoundingClientRect(){return {width:800,height:500}}};
 const old=globalThis.document;
 globalThis.document={createElement(){return{getContext(){return {}},width:0,height:0}}}};
 try{
   const r=new ScientificRenderer(fake,new FieldLab());
   assert.equal(r.display,'potential');
 }finally{if(old===undefined)delete globalThis.document;else globalThis.document=old;}
});
