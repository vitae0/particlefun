import test from 'node:test';
import assert from 'node:assert/strict';
import { C, SPECIES } from '../src/constants.js';
import { ParticleLab, momentumFromVelocity, velocityFromMomentum, freePacketSigma } from '../src/physics.js';

test('SI relativistic momentum round trip and subluminal limit', () => {
  const m = SPECIES.electron.mass;
  const p = momentumFromVelocity(m, 0.65 * C.c, 0.1 * C.c);
  const v = velocityFromMomentum(m, p.px, p.py);
  assert.ok(Math.abs(v.vx / C.c - 0.65) < 1e-12);
  assert.ok(Math.abs(v.vy / C.c - 0.1) < 1e-12);
  assert.throws(() => momentumFromVelocity(m, C.c, 0), RangeError);
});

test('Coulomb forces obey Newton third law and correct attraction sign', () => {
  const lab = new ParticleLab();
  lab.add('electron', -2, 0);
  lab.add('positron', 2, 0);
  const [a, b] = lab.forces();
  assert.ok(a.fx > 0 && b.fx < 0);
  assert.ok(Math.abs((a.fx + b.fx) / a.fx) < 1e-14);
  assert.equal(a.fy + b.fy, 0);
});

test('neutral neutron experiences no EM force', () => {
  const lab = new ParticleLab();
  lab.add('electron', 0, 0);
  lab.add('neutron', 2, 0, 60, 0);
  const forces = lab.forces();
  assert.equal(forces[1].fx, 0);
  assert.equal(forces[1].fy, 0);
  const before = lab.describe(lab.particles[1]).speedKmS;
  lab.advance(0.5);
  assert.ok(Math.abs(lab.describe(lab.particles[1]).speedKmS - before) < 1e-9);
});

test('free packet broadens according to exact Gaussian solution', () => {
  const m = SPECIES.electron.mass;
  const a = freePacketSigma(m, 1, 0);
  const b = freePacketSigma(m, 1, 40);
  assert.equal(a, 1);
  assert.ok(b > a);
});

test('Gaussian packet density normalized on a broad 2D grid', () => {
  const lab = new ParticleLab();
  const p = lab.add('electron', 0, 0);
  let sum = 0;
  const dx = 0.1;
  for (let x = -6; x <= 6; x += dx) for (let y = -6; y <= 6; y += dx) {
    sum += lab.densityAt(p, x, y) * dx * dx;
  }
  assert.ok(Math.abs(sum - 1) < 0.01);
});

test('B-field alone does no work (relativistic Boris)', () => {
  const lab = new ParticleLab();
  lab.add('electron', 0, 0, 35000, 12000);
  lab.bTesla = 1800;
  const before = Math.hypot(lab.particles[0].px, lab.particles[0].py);
  lab.advance(1);
  const after = Math.hypot(lab.particles[0].px, lab.particles[0].py);
  assert.ok(Math.abs(after / before - 1) < 1e-11);
});

test('softened Coulomb potential matches electric field gradient sign', () => {
  const lab = new ParticleLab();
  lab.add('proton', 0, 0);
  const x = 2, h = 1e-4;
  const e = lab.electricAt(x, 0).ex;
  const plus = lab.electricAt(x + h, 0).potential;
  const minus = lab.electricAt(x - h, 0).potential;
  const grad = -(plus - minus) / (2 * h * C.nm);
  assert.ok(Math.abs(grad / e - 1) < 1e-7);
});

test('no forces means uniform motion', () => {
  const lab = new ParticleLab();
  const n = lab.add('neutron', 0, 0, 200, -100);
  lab.advance(0.5);
  assert.ok(Math.abs(n.xNm - 0.1) < 1e-10);
  assert.ok(Math.abs(n.yNm + 0.05) < 1e-10);
});

test('total energy remains approximately conserved for separated pair', () => {
  const lab = new ParticleLab();
  lab.add('electron', -8, 0, 0, 100);
  lab.add('proton', 0, 0, 0, 0);
  const a = lab.energy().total;
  lab.advance(0.8);
  const b = lab.energy().total;
  assert.ok(Math.abs((b - a) / a) < 0.02, 'conserved energy relative drift too high');
});
