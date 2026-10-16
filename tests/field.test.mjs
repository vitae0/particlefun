import test from 'node:test';
import assert from 'node:assert/strict';
import { HC, SPECIES, GROUPS, antiparticleOf, conserved } from '../src/catalog.js';
import { FieldLab, REACTIONS, four, energy, channelStatus, sampleFinalState, checkFourMomenta } from '../src/field-physics.js';
import { PRESETS } from '../src/presets.js';

const approx=(a,b,eps=1e-9)=>assert.ok(Math.abs(a-b)<=eps*Math.max(1,Math.abs(a),Math.abs(b)),a+' != '+b);
const labWith=(beams)=>{const lab=new FieldLab(()=>.367);
  for(const [type,K,theta,x,y] of beams)lab.add(type,K,theta,x,y);
  return lab;};

test('complete Standard Model fundamental inventory including eight confined gluon states',()=>{
  for(const id of ['e','ae','mu','amu','tau','atau','ve','ave','vm','avm','vt','avt',
    'u','au','d','ad','s','as','c','ac','b','ab','t','at',
    'photon','Wp','Wm','Z','H',...Array.from({length:8},(_,i)=>'g'+(i+1))]){
    assert.ok(SPECIES[id],id);
  }
  assert.ok(Object.keys(SPECIES).length>=40);
  assert.equal(SPECIES.photon.mass,0);
});
test('exact visual anti hues and electric charge reversal',()=>{
  for(const [id,s] of Object.entries(SPECIES)){
    if(!s.antiId)continue;
    const antip=SPECIES[s.antiId];
    assert.equal((s.colorHue+180)%360,antip.colorHue,id);
    approx(s.charge,-antip.charge);
    assert.equal(antip.antiId,id);
  }
});
test('isolated colored states are rejected, composite proton is allowed',()=>{
  const lab=new FieldLab();
  for(const id of ['u','ad','t','g1','g8'])assert.throws(()=>lab.add(id,5),/renk hapsi/);
  assert.doesNotThrow(()=>lab.add('p',5));
});
test('on-shell energy and massless speed limit',()=>{
  const lab=labWith([['e',5,45,0,0],['photon',3,180,0,0]]);
  const [e,g]=lab.fields;
  approx(energy(e),SPECIES.e.mass+5);
  approx(energy(g),3);
  assert.ok(Math.abs(Math.hypot(g.px,g.py)/energy(g)-1)<1e-12);
  assert.throws(()=>lab.add('photon',0),/pozitif/);
});
test('all collision and decay presets obey exact 4-momentum conservation or correctly block',()=>{
  let successes=0,blocked=0;
  for(const p of PRESETS){
    if(!p.channel)continue;
    const lab=labWith(p.beams);
    const ch=REACTIONS.find(c=>c.id===p.channel);
    assert.ok(ch,p.id);
    const status=channelStatus(ch,lab.fields);
    if(!status.ok){blocked++;assert.ok(['below','parallel'].includes(p.id),p.id);continue;}
    const input=lab.fields.map(four);
    const result=lab.react(ch.id,lab.fields.map(x=>x.id));
    const output=lab.fields.map(four);
    assert.ok(checkFourMomenta(input,output,1e-8),p.id);
    assert.ok(result.record.error<1e-8,p.id);
    successes++;
  }
  assert.ok(successes>=19);
  assert.equal(blocked,2);
});
test('Breit-Wheeler pair-production requires both COM threshold and non-collinear photons',()=>{
  const ch=REACTIONS.find(c=>c.id==='gg2ee');
  const below=labWith([['photon',.35,0,-8,0],['photon',.35,180,8,0]]);
  assert.equal(channelStatus(ch,below.fields).ok,false);
  const parallel=labWith([['photon',2,0,-8,0],['photon',2,0,8,0]]);
  assert.equal(channelStatus(ch,parallel.fields).ok,false);
  const above=labWith([['photon',2,0,-8,0],['photon',2,180,8,0]]);
  assert.equal(channelStatus(ch,above.fields).ok,true);
});
test('muon decay conserves charge and per-generation lepton numbers',()=>{
  const a=conserved(['mu']),b=conserved(['e','ave','vm']);
  for(const k of Object.keys(a))approx(a[k],b[k]);
});
test('neutron beta decay conserves baryon number and is kinematically allowed',()=>{
  const n=labWith([['n',0,0,0,0]]);
  const ch=REACTIONS.find(c=>c.id==='neutron');
  assert.ok(channelStatus(ch,n.fields).ok);
  const initial=n.fields.map(four);
  n.react(ch.id,[n.fields[0].id]);
  assert.ok(checkFourMomenta(initial,n.fields.map(four)));
});
test('no unphysical automatic events without selected process',()=>{
  const lab=labWith([['e',10,0,-7,0],['ae',10,180,7,0]]);
  for(let i=0;i<12;i++)lab.advance(2);
  assert.equal(lab.events.length,0);
});
test('conditional overlap event fires exactly once and daughters propagate',()=>{
  const lab=labWith([['e',10,0,-7,0],['ae',10,180,7,0]]);
  lab.channel='ee2gg';lab.autoCollision=true;
  for(let i=0;i<25&&!lab.events.length;i++)lab.advance(1);
  assert.equal(lab.events.length,1);
  assert.deepEqual(lab.fields.map(x=>x.type),['photon','photon']);
  assert.equal(lab.autoCollision,false);
  lab.advance(4);
  assert.equal(lab.events.length,1);
});
test('visual free scalar packet amplitude is finite and bounded',()=>{
  const lab=labWith([['mu',1,0,0,0]]);
  for(let i=0;i<500;i++)lab.advance(1);
  for(const x of [-12,-2,0,2,12]){
    const value=lab.fieldValue(lab.fields[0],x,x/2);
    assert.ok(Number.isFinite(value)&&Math.abs(value)<=1+1e-12);
  }
});
test('proton and antiproton carry opposite baryon number',()=>{
  const a=conserved(['p']),b=conserved(['ap']);
  assert.equal(a.baryon,1);assert.equal(b.baryon,-1);
  assert.equal(a.charge,1);assert.equal(b.charge,-1);
});
