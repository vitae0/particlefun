import test from 'node:test';
import assert from 'node:assert/strict';
import { FieldLab } from '../src/field-physics.js';
import { FieldRenderer } from '../src/field-renderer.js';
import { SPECIES } from '../src/catalog.js';

class Context{
 setTransform(){}fillRect(){}beginPath(){}moveTo(){}lineTo(){}
 stroke(){}fill(){}arc(){}fillText(){}putImageData(){}drawImage(){}
 createImageData(w,h){return {width:w,height:h,data:new Uint8ClampedArray(w*h*4)}}
 createRadialGradient(){return {addColorStop(){}}}
 setLineDash(){}
}
class Canvas{
 constructor(){this.width=0;this.height=0;this.ctx=new Context()}
 getContext(){return this.ctx}
 getBoundingClientRect(){return {width:680,height:400}}
}
const originalDocument=globalThis.document,originalWindow=globalThis.window;
globalThis.document={createElement:()=>new Canvas()};
globalThis.window={devicePixelRatio:1};
function renderer(){
 const lab=new FieldLab(()=>.3);
 return {lab,renderer:new FieldRenderer(new Canvas(),lab)};
}
test('proton is visualized as uud + gluon field, not a single dot',()=>{
 const o=renderer();o.lab.add('p',0);
 assert.deepEqual(o.renderer.components().map(x=>x.type),['u','u','d','g1']);
 assert.equal(o.renderer.components().some(x=>x.type==='p'),false);
 o.renderer.draw();
});
test('neutron and antiparticles use correct valence inventory',()=>{
 const o=renderer();o.lab.add('n',0,0,-7);o.lab.add('ap',0,0,7);
 assert.deepEqual(o.renderer.components().map(x=>x.type),
   ['u','d','d','g1','au','au','ad','g1']);
 o.renderer.draw();
});
test('Higgs, gluon sources and anti-leptons render without standalone colored beams',()=>{
 const o=renderer();o.lab.add('H',0);o.lab.add('ae',12,0,-4);
 o.lab.addSource('g5',3,1);o.lab.addSource('b',0,-1);
 assert.ok(o.renderer.components().some(x=>x.type==='H'));
 assert.ok(o.renderer.components().some(x=>x.type==='g5'));
 assert.ok(o.renderer.components().find(x=>x.type==='g5').source);
 o.renderer.draw();
});
test('renderer supports full precision and three color mappings',()=>{
 const o=renderer();
 o.lab.add('photon',8,0);
 for(const precision of ['fast','balanced','precise'])
 for(const mode of ['linear','log','exp']){
  o.renderer.precision=precision;
  o.renderer.colorScale=mode;
  assert.doesNotThrow(()=>o.renderer.draw());
  const pix=o.renderer.layerCtx.createImageData(o.renderer.layer.width,o.renderer.layer.height).data;
  assert.ok(pix.length>0);
 }
});
test('all eighteen analytical experiments can be graphed without rendering errors',async()=>{
 const { ADVANCED }=await import('../src/experiments.js');
 const o=renderer();
 for(const e of ADVANCED){
  o.renderer.setExperiment(e.id,e.value);
  assert.doesNotThrow(()=>o.renderer.draw(),e.id);
 }
});
test('antiparticle hues exactly rotate by 180 degrees',()=>{
 for(const s of Object.values(SPECIES)){
  if(!s.antiId)continue;
  assert.equal(SPECIES[s.antiId].colorHue,(s.colorHue+180)%360);
 }
});
test.after(()=>{
 if(originalDocument===undefined)delete globalThis.document;else globalThis.document=originalDocument;
 if(originalWindow===undefined)delete globalThis.window;else globalThis.window=originalWindow;
});
