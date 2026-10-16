import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const html=readFileSync('index.html','utf8');
const css=readFileSync('src/laboratory.css','utf8');
const ui=readFileSync('src/laboratory.js','utf8');

test('main page is a single field laboratory with no legacy particle/dot mode switch',()=>{
  assert.match(html,/id="canvas"/);
  assert.doesNotMatch(html,/data-mode="particle"|data-mode="wave"|id="modeSwitch"|class="mode-switch"/);
  assert.match(html,/src\/laboratory\.js/);
  assert.ok(existsSync('src/catalog.js'));
  assert.ok(existsSync('src/auto-events.js'));
  assert.ok(existsSync('src/experiments.js'));
});
test('all requested always-visible controls are in the persistent footer, not popups',()=>{
 const footer=html.split('<footer class="controls">')[1].split('</footer>')[0];
 for(const id of ['slower','play','faster','speed','step','jump','restart','scale','precision','colors','mode']){
  assert.match(footer,new RegExp('id="'+id+'"'),id);
 }
});
test('scientific popup menus are paginated and body has no scrollbar',()=>{
 for(const p of ['species','basic','advanced','events','info'])
   assert.match(html,new RegExp('data-panel="'+p+'"'));
 assert.match(css,/overflow:hidden/);
 assert.match(css,/height:100dvh/);
 assert.match(ui,/ITEMS_PER_PAGE/);
 assert.match(ui,/pagePrev/);
 assert.match(ui,/pageNext/);
});
test('both physical rate mode and analytical advanced modes are accessible',()=>{
 assert.match(ui,/events\.mode==='expected'/);
 assert.match(ui,/function loadAdvanced/);
 assert.match(ui,/function manyTrials/);
 assert.match(ui,/function nextDecay/);
});
test('source and hadron renderer has no direct classical particle markers',()=>{
 const shader=readFileSync('src/field-renderer.js','utf8');
 assert.match(shader,/kind:'valence'/);
 assert.match(shader,/kind:'gluonsea'/);
 assert.doesNotMatch(shader,/ctx\.arc\(x,\s*y,\s*r/);
});
