import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync,existsSync } from 'node:fs';
import { LIVE_SCENES } from '../src/live-scenes.js';

const html=readFileSync('index.html','utf8');
const css=readFileSync('src/research.css','utf8');
const app=readFileSync('src/research.js','utf8');

test('only one scientific plot, no particle/wave/field mode switch',()=>{
 assert.match(html,/id="plot"/);
 assert.doesNotMatch(html,/data-mode="particle"|data-mode="wave"|id="modeSwitch"|class="mode-switch"/);
 assert.match(html,/src\/research\.js/);
 assert.ok(existsSync('src/transport3d.js'));
 assert.ok(existsSync('src/scientific-renderer.js'));
 assert.ok(existsSync('src/apparatus.js'));
});
test('always visible rewind, play, step, speed and z section controls',()=>{
 const toolbar=html.split('<header id="tools"')[1].split('</header>')[0];
 for(const id of ['back','play','forward','slower','speed','faster','restart','instrument'])
   assert.match(toolbar,new RegExp('id="'+id+'"'),id);
 const footer=html.split('<footer id="status">')[1].split('</footer>')[0];
 assert.match(footer,/id="slice"/);
});
test('non-scrolling plot UI and paginated popup',()=>{
 assert.match(css,/overflow:hidden/);
 assert.match(css,/height:100dvh/);
 assert.match(app,/updateMenuRows/);
 assert.match(html,/id="previous"/);
 assert.match(html,/id="next"/);
 assert.match(html,/id="popup"/);
});
test('space always pauses/plays even when focused on an input',()=>{
 assert.match(app,/if\(e\.code==='Space'\)/);
 assert.match(app,/e\.preventDefault\(\);running=!running/);
});
test('every scene is loaded paused, and previously recorded frame is rewindable',()=>{
 assert.match(app,/running=false;sceneId=id/);
 assert.match(app,/function stepBack\(/);
 assert.match(app,/function remember\(/);
 assert.match(app,/rng\.state=s\.rng/);
});
test('historical experiments use in-scene beam/source and apparatus data',()=>{
 assert.ok(LIVE_SCENES.length>=60);
 const ids=['rutherford','thomson','crt','stern','young','photo','mach','wien'];
 for(const id of ids){
  const scene=LIVE_SCENES.find(s=>s.id===id);
  assert.ok(scene,id);
  assert.ok(scene.beams.length>0);
  assert.ok(scene.devices.length>0);
 }
});
test('three-dimensional pan, wheel zoom, and z-slice',()=>{
 assert.match(app,/plot\.zoom/);
 assert.match(app,/plot\.pan/);
 assert.match(app,/plot\.camera\.z/);
});
