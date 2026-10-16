import test from 'node:test';
import assert from 'node:assert/strict';

class MockContext {
 setTransform(){} fillRect(){} strokeRect(){}beginPath(){}moveTo(){}lineTo(){}
 stroke(){}fill(){}arc(){}fillText(){}putImageData(){}drawImage(){}
 setLineDash(){}save(){}restore(){}
 createImageData(w,h){return {data:new Uint8ClampedArray(w*h*4)}}
 createRadialGradient(){return {addColorStop(){}}}
}
class MockElement {
 constructor(id=''){
  this.id=id;this.tagName='DIV';this.children=[];this.listeners={};
  this.textContent='';this.value=id==='kinetic'?'0':id==='slice'?'0':'';
  this.hidden=false;this.disabled=false;this.style={};this.dataset={};this.title='';
  this.classList={add(){},remove(){}};
 }
 addEventListener(t,f){(this.listeners[t]??=[]).push(f)}
 trigger(t,e={}){for(const f of this.listeners[t]||[])f({target:this,preventDefault(){},...e})}
 append(...xs){this.children.push(...xs)}
 appendChild(x){this.children.push(x)}
 replaceChildren(...xs){this.children=xs}
 setAttribute(k,v){this[k]=v}
 getBoundingClientRect(){return {left:0,top:0,width:850,height:550}}
 getContext(){return new MockContext()}
 setPointerCapture(){}releasePointerCapture(){}
}
const root=new Map();
const mock={getElementById(id){if(!root.has(id))root.set(id,new MockElement(id));return root.get(id)},
 createElement(tag){const e=new MockElement();e.tagName=tag.toUpperCase();return e;},
 querySelectorAll(){return [];}};
const original={document:globalThis.document,window:globalThis.window,raf:globalThis.requestAnimationFrame};
const windowEvents={};
globalThis.document=mock;
globalThis.window={innerHeight:860,devicePixelRatio:1,matchMedia(){return {matches:false}},
 addEventListener(name,fn){(windowEvents[name]??=[]).push(fn)}};
let onFrame=null;
globalThis.requestAnimationFrame=fn=>{onFrame=fn;};
await import('../src/research.js');
const el=id=>mock.getElementById(id);
test('application initializes with stopped real Coulomb experiment',()=>{
 assert.match(el('sceneLabel').textContent,/Durgun iki elektron/);
 assert.equal(el('play').textContent,'▶');
 assert.match(el('simtime').textContent,/0 fm\/c/);
});
test('Space ALWAYS toggles simulation even from focused input',()=>{
 const key=windowEvents.keydown?.[0];
 assert.ok(key);
 key({code:'Space',key:' ',target:{tagName:'INPUT'},preventDefault(){}});
 assert.equal(el('play').textContent,'Ⅱ');
 key({code:'Space',key:' ',target:{tagName:'INPUT'},preventDefault(){}});
 assert.equal(el('play').textContent,'▶');
});
test('frame stepping and rewinding restores physical time',()=>{
 el('forward').trigger('click');
 assert.notEqual(el('simtime').textContent,'t = 0 fm/c');
 assert.equal(el('back').disabled,false);
 el('back').trigger('click');
 assert.match(el('simtime').textContent,/t = 0 fm\/c/);
});
test('pan, mouse zoom, and 3D z slider respond without navigation',()=>{
 const plot=el('plot');
 plot.trigger('wheel',{deltaY:-150,clientX:300,clientY:250});
 const r=el('slice');
 r.value='2';r.trigger('input');
 assert.equal(el('zvalue').textContent,'2');
 const old=el('sceneLabel').textContent;
 plot.trigger('pointerdown',{button:0,clientX:100,clientY:100,pointerId:1});
 plot.trigger('pointermove',{clientX:130,clientY:140,pointerId:1});
 plot.trigger('pointerup',{clientX:130,clientY:140,pointerId:1});
 assert.equal(el('sceneLabel').textContent,old);
});
test('loading a new scene after playback starts paused and clears rewind history',()=>{
 el('play').trigger('click');
 assert.equal(el('play').textContent,'Ⅱ');
 el('experiments').trigger('click');
 const popup=el('popupItems');
 assert.ok(popup.children.length>0);
 const target=popup.children[0];target.trigger('click');
 assert.equal(el('play').textContent,'▶');
 assert.equal(el('back').disabled,true);
});
test.after(()=>{
 for(const [key,value] of Object.entries(original)){
  const name=key==='raf'?'requestAnimationFrame':key;
  if(value===undefined)delete globalThis[name];else globalThis[name]=value;
 }
});
