import test from 'node:test';
import assert from 'node:assert/strict';
import { C, HC, SPECIES, conserved } from '../src/catalog.js';
import { FieldLab, four, energy, checkFourMomenta } from '../src/field-physics.js';
import { AutomaticEvents, crossSections, kleinNishinaCrossSection,
  breitWheelerCrossSection, invariantS, RE, ALPHA } from '../src/auto-events.js';
import { ADVANCED, evaluate, sampleAdvanced } from '../src/experiments.js';

const near=(v,expected,rtol=1e-8)=>{
 assert.ok(Number.isFinite(v));
 assert.ok(Math.abs(v-expected)<=rtol*Math.max(1,Math.abs(expected)),v+' ≉ '+expected);
};
function labOf(...specs){
 const lab=new FieldLab(()=>.51);
 for(const s of specs)lab.add(...s);
 return lab;
}
test('Mandelstam invariant is (p1+p2)^2 including masses once, not twice',()=>{
 const m=SPECIES.e.mass;
 const lab=labOf(['e',0,0,-2,0],['photon',2,180,2,0]);
 near(invariantS(...lab.fields),m*m+2*m*2,1e-10);
 const photons=labOf(['photon',8,0,-2,0],['photon',8,180,2,0]);
 near(invariantS(...photons.fields),256,1e-10);
});
test('Breit-Wheeler tree cross section: vanishes at threshold, positive above, tends to zero at high s',()=>{
 const m=SPECIES.e.mass;
 near(breitWheelerCrossSection(4*m*m,m),0);
 const mid=breitWheelerCrossSection(16*m*m,m);
 assert.ok(mid>0);
 assert.ok(breitWheelerCrossSection(1e7*m*m,m)<mid);
});
test('Klein-Nishina low-energy limit is Thomson 8πr_e²/3',()=>{
 const thomson=8*Math.PI*RE*RE/3;
 near(kleinNishinaCrossSection(1e-7),thomson,1e-6);
 assert.ok(kleinNishinaCrossSection(10)<thomson);
});
test('automatic Breit-Wheeler channel includes actual cross section, rejects parallel photons',()=>{
 const pair=labOf(['photon',4,0,-2,0],['photon',4,180,2,0]);
 assert.ok(crossSections(...pair.fields).some(r=>r.id==='gg2ee'&&r.sigma>0));
 const aligned=labOf(['photon',4,0,-2,0],['photon',4,0,2,0]);
 assert.equal(crossSections(...aligned.fields).length,0);
});
test('stochastic natural lifetime exponentially sampled, time dilation factor gamma',()=>{
 const tau=SPECIES.mu.lifetime;
 const a=labOf(['mu',0,0,0,0]);
 const b=labOf(['mu',SPECIES.mu.mass,0,0,0]); // gamma=2
 const ea=new AutomaticEvents(a,()=>.5),eb=new AutomaticEvents(b,()=>.5);
 const ta=ea.nextDue().due,tb=eb.nextDue().due;
 near(ta,-Math.log(.5)*tau,1e-10);near(tb,2*ta,1e-10);
});
test('natural W/Z lifetime produces spontaneous decay or explicitly unresolved state',()=>{
 for(const type of ['Wp','Wm','Z','H']){
  const lab=labOf([type,0,0,0,0]);
  const auto=new AutomaticEvents(lab,()=>.2);
  auto.tick(3);
  assert.ok(auto.observations.length>0,type);
  assert.equal(lab.fields.some(p=>p.type===type),false);
 }
});
test('unmodeled H→bb and other channels remain explicitly unresolved',()=>{
 const lab=labOf(['H',0,0,0,0]);
 const engine=new AutomaticEvents(lab,()=>.5);engine.tick(2);
 assert.equal(engine.unresolved.length,1);
 assert.equal(engine.unresolved[0].type,'H');
 assert.equal(engine.observations[0].unresolved,true);
});
test('neutron lifetime is NOT squeezed to femtoseconds; jump honors true sampled time',()=>{
 const lab=labOf(['n',0,0,0,0]);
 const auto=new AutomaticEvents(lab,()=>.5);
 auto.tick(3);
 assert.equal(lab.fields.length,1);
 const next=auto.jumpToNextDecay();
 assert.ok(next.dt>1e24);
 assert.ok(!lab.fields.some(p=>p.type==='n'));
 const types=lab.fields.map(p=>p.type).sort();
 assert.deepEqual(types,['ave','e','p'].sort());
});
test('hadrons rendered as constituent sources without allowing free colored asymptotic beams',()=>{
 const lab=new FieldLab();
 for(const id of ['u','ad','g1','g8']){
  assert.throws(()=>lab.add(id,1),/renk hapsi/);
  assert.doesNotThrow(()=>lab.addSource(id));
 }
 assert.equal(lab.sources.length,4);
 lab.add('p',0);
 assert.equal(lab.fields.length,1);
});
test('advanced experiments finite over all parameter endpoints',()=>{
 for(const e of ADVANCED){
  for(const v of [e.min,e.value,e.max]){
   const s=evaluate(e.id,v);
   assert.ok(Number.isFinite(s.value),e.id);
   for(let i=0;i<=20;i++){
    const x=s.domain[0]+(s.domain[1]-s.domain[0])*i/20;
    assert.ok(Number.isFinite(s.sampleCurve(x)),e.id+' curve');
   }
  }
 }
 assert.ok(ADVANCED.length>=17);
});
test('Stern-Gerlach spin-one-half at 0, 90, 180° follows Born rule',()=>{
 near(evaluate('stern',0).probability,1);
 near(evaluate('stern',90).probability,.5);
 near(evaluate('stern',180).probability,0);
});
test('Bell ideal CHSH gives 2sqrt2 and BB84 intercept-resend 25% QBER',()=>{
 near(evaluate('bell',1).value,2*Math.SQRT2);
 near(evaluate('bb84',1).value,.25);
});
test('HOM indistinguishable zero-delay photons have no coincidence',()=>{
 near(evaluate('hom',0).probability,0);
 near(evaluate('hom',4).probability,.5*(1-Math.exp(-8)));
});
test('Josephson and flux SQUID periodicities are correct',()=>{
 near(evaluate('josephson',1).value,483.5978484);
 near(evaluate('squid',0).value,1);
 near(evaluate('squid',.5).value,0);
 near(evaluate('squid',1).value,1);
});
test('photoelectric threshold and tunnel transmission are physical',()=>{
 near(evaluate('photoelectric',.1).value,0);
 assert.ok(evaluate('photoelectric',1).value>0);
 const t1=evaluate('tunnel',.1).value,t2=evaluate('tunnel',1).value;
 assert.ok(t1>t2&&t2>0);
});
