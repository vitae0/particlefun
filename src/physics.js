import { C, SPECIES } from './constants.js';

// 2D motion in a 3D Coulomb field. Softening is explicit, NOT a fundamental law.
// Electrostatic pair interactions + an optional uniform, external B_z.
// No radiation, retardation, spin, quantum correlations, strong/weak forces or reactions.
const finite = (v, fallback = 0) => Number.isFinite(Number(v)) ? Number(v) : fallback;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export function momentumFromVelocity(m, vx, vy) {
  const s2 = vx * vx + vy * vy;
  if (!Number.isFinite(s2) || s2 >= C.c * C.c) throw new RangeError('Hız ışık hızından küçük olmalı.');
  const gamma = 1 / Math.sqrt(1 - s2 / (C.c * C.c));
  return { px: gamma * m * vx, py: gamma * m * vy };
}
export function velocityFromMomentum(m, px, py) {
  const gamma = Math.hypot(1, Math.hypot(px, py) / (m * C.c));
  return { vx: px / (gamma * m), vy: py / (gamma * m), gamma };
}
export function freePacketSigma(m, sigma0Nm, elapsedFs) {
  const s0 = sigma0Nm * C.nm;
  const tau = C.hbar * elapsedFs * C.fs / (2 * m * s0 * s0);
  return sigma0Nm * Math.hypot(1, tau);
}

export class ParticleLab {
  constructor() {
    this.particles = [];
    this.timeFs = 0;
    this.softeningNm = 0.2;
    this.sigma0Nm = 0.9;
    this.bTesla = 0;
    this.nextId = 1;
    this.referenceEnergy = 0;
  }

  add(type, xNm, yNm, vxKmS = 0, vyKmS = 0) {
    if (!SPECIES[type]) throw new Error('Bilinmeyen parçacık.');
    if (this.particles.length >= 24) throw new Error('En fazla 24 parçacık yerleştirilebilir.');
    const nums = [xNm, yNm, vxKmS, vyKmS].map(Number);
    if (!nums.every(Number.isFinite)) throw new Error('Konum ve hız sonlu sayı olmalı.');
    if (Math.hypot(nums[2], nums[3]) * 1000 >= C.c) throw new Error('Hız ışık hızına ulaşamaz.');
    const { px, py } = momentumFromVelocity(SPECIES[type].mass, nums[2] * 1000, nums[3] * 1000);
    const p = { id: this.nextId++, type, xNm: nums[0], yNm: nums[1], px, py, phase: 0, birthFs: this.timeFs, trail: [] };
    this.particles.push(p);
    this.rebaseline();
    return p;
  }

  setVelocity(id, vxKmS, vyKmS) {
    const p = this.particles.find(p => p.id === id);
    if (!p) return false;
    const vx = Number(vxKmS), vy = Number(vyKmS);
    if (!Number.isFinite(vx) || !Number.isFinite(vy)) throw new Error('Hız sonlu sayı olmalı.');
    const next = momentumFromVelocity(SPECIES[p.type].mass, vx * 1000, vy * 1000);
    p.px = next.px; p.py = next.py;
    p.birthFs = this.timeFs; p.phase = 0;
    this.rebaseline();
    return true;
  }

  remove(id) {
    this.particles = this.particles.filter(p => p.id !== id);
    this.rebaseline();
  }
  clear() {
    this.particles = []; this.timeFs = 0; this.nextId = 1; this.referenceEnergy = 0;
  }
  rebaseline() { this.referenceEnergy = this.energy().total; }

  // Force on each particle; action = -reaction for every pair.
  forces() {
    const f = this.particles.map(() => ({ fx: 0, fy: 0 }));
    const a2 = (this.softeningNm * C.nm) ** 2;
    for (let i = 0; i < this.particles.length; i++) {
      const a = this.particles[i], qa = SPECIES[a.type].charge;
      if (!qa) continue;
      for (let j = i + 1; j < this.particles.length; j++) {
        const b = this.particles[j], qb = SPECIES[b.type].charge;
        if (!qb) continue;
        const dx = (a.xNm - b.xNm) * C.nm, dy = (a.yNm - b.yNm) * C.nm;
        const invr3 = Math.pow(dx * dx + dy * dy + a2, -1.5);
        const fx = C.k * qa * qb * dx * invr3, fy = C.k * qa * qb * dy * invr3;
        f[i].fx += fx; f[i].fy += fy;
        f[j].fx -= fx; f[j].fy -= fy;
      }
    }
    return f;
  }

  // Kick--(relativistic magnetic Boris rotation)--drift--kick.
  integrate(dtFs) {
    const dt = dtFs * C.fs;
    const f0 = this.forces();
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i], s = SPECIES[p.type];
      p.px += f0[i].fx * dt * 0.5;
      p.py += f0[i].fy * dt * 0.5;
      if (s.charge && this.bTesla) {
        const gamma = Math.hypot(1, Math.hypot(p.px, p.py) / (s.mass * C.c));
        const t = s.charge * this.bTesla * dt / (2 * gamma * s.mass);
        const rot = 2 * t / (1 + t * t);
        const tx = p.px + p.py * t, ty = p.py - p.px * t;
        const newPx = p.px + ty * rot, newPy = p.py - tx * rot;
        p.px = newPx; p.py = newPy;
      }
      const v = velocityFromMomentum(s.mass, p.px, p.py);
      p.xNm += v.vx * dt / C.nm;
      p.yNm += v.vy * dt / C.nm;
      // Free Schrödinger phase; used only as a local semiclassical visualization.
      const eFree = (p.px * p.px + p.py * p.py) / (2 * s.mass);
      // p·(r-r_c) is measured relative to the moving centroid, hence +E t / ħ.
      p.phase = ((p.phase + eFree * dt / C.hbar) % (2 * Math.PI));
    }
    const f1 = this.forces();
    for (let i = 0; i < this.particles.length; i++) {
      this.particles[i].px += f1[i].fx * dt * 0.5;
      this.particles[i].py += f1[i].fy * dt * 0.5;
    }
    this.timeFs += dtFs;
  }

  // Safety: dt follows close approaches, relative speed and gyrofrequency.
  safeStep(maxFs) {
    let dt = Math.min(maxFs, 0.075);
    for (const p of this.particles) {
      const s = SPECIES[p.type], v = velocityFromMomentum(s.mass, p.px, p.py);
      if (this.bTesla && s.charge) {
        dt = Math.min(dt, 0.16 * v.gamma * s.mass / (Math.abs(s.charge * this.bTesla) * C.fs));
      }
    }
    const f = this.forces();
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i], m = SPECIES[p.type].mass;
      const a = Math.hypot(f[i].fx, f[i].fy) / m;
      const spanM = Math.max(this.softeningNm * C.nm, 0.05e-9);
      if (a) dt = Math.min(dt, Math.sqrt(spanM / a) / (9 * C.fs));
      for (let j = i + 1; j < this.particles.length; j++) {
        const q = this.particles[j];
        const vp = velocityFromMomentum(m, p.px, p.py);
        const vq = velocityFromMomentum(SPECIES[q.type].mass, q.px, q.py);
        const d = Math.max(Math.hypot(p.xNm - q.xNm, p.yNm - q.yNm) * C.nm, spanM);
        const rel = Math.hypot(vp.vx - vq.vx, vp.vy - vq.vy);
        if (rel) dt = Math.min(dt, d / rel / (12 * C.fs));
      }
    }
    return Math.max(1e-7, dt);
  }

  advance(requestFs) {
    let left = clamp(finite(requestFs), 0, 2);
    let n = 0;
    while (left > 1e-10 && n++ < 1600) {
      const dt = Math.min(left, this.safeStep(left));
      this.integrate(dt);
      left -= dt;
    }
    return { elapsedFs: requestFs - left, limited: left > 1e-10, steps: n };
  }

  energy() {
    let kinetic = 0, potential = 0;
    const a2 = (this.softeningNm * C.nm) ** 2;
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i], s = SPECIES[p.type];
      const gamma = velocityFromMomentum(s.mass, p.px, p.py).gamma;
      // More stable than (gamma-1)*m*c*c at low speeds.
      const z = Math.hypot(p.px, p.py) / (s.mass * C.c);
      kinetic += s.mass * C.c * C.c * z * z / (gamma + 1);
      for (let j = i + 1; j < this.particles.length; j++) {
        const q = this.particles[j];
        const r2 = ((p.xNm - q.xNm) * C.nm) ** 2 + ((p.yNm - q.yNm) * C.nm) ** 2 + a2;
        potential += C.k * s.charge * SPECIES[q.type].charge / Math.sqrt(r2);
      }
    }
    return { kinetic, potential, total: kinetic + potential };
  }

  electricAt(xNm, yNm) {
    let ex = 0, ey = 0, potential = 0;
    const a2 = (this.softeningNm * C.nm) ** 2;
    for (const p of this.particles) {
      const q = SPECIES[p.type].charge;
      if (!q) continue;
      const dx = (xNm - p.xNm) * C.nm, dy = (yNm - p.yNm) * C.nm;
      const r2 = dx * dx + dy * dy + a2;
      ex += C.k * q * dx / Math.pow(r2, 1.5);
      ey += C.k * q * dy / Math.pow(r2, 1.5);
      potential += C.k * q / Math.sqrt(r2);
    }
    return { ex, ey, potential };
  }

  packet(p) {
    const s = SPECIES[p.type];
    const elapsed = Math.max(0, this.timeFs - p.birthFs);
    const sigma = freePacketSigma(s.mass, this.sigma0Nm, elapsed);
    const tau = C.hbar * elapsed * C.fs / (2 * s.mass * (this.sigma0Nm * C.nm) ** 2);
    return { sigma, tau };
  }

  // Expected single-particle number density, in nm^-2.
  densityAt(p, xNm, yNm) {
    const { sigma } = this.packet(p);
    const d2 = (xNm - p.xNm) ** 2 + (yNm - p.yNm) ** 2;
    return Math.exp(-d2 / (2 * sigma ** 2)) / (2 * Math.PI * sigma ** 2);
  }

  // Real part of <0|Psi_hat_s(x)|1_psi>, modeled by a free nonrelativistic
  // Schrödinger field amplitude transported along the classical centroid.
  // NOT an interacting QED field calculation.
  fieldAt(p, xNm, yNm) {
    const { sigma, tau } = this.packet(p);
    const dx = xNm - p.xNm, dy = yNm - p.yNm;
    const dr2 = dx * dx + dy * dy;
    const phase = (p.px * dx + p.py * dy) * C.nm / C.hbar +
      dr2 / (4 * this.sigma0Nm ** 2) * tau / (1 + tau ** 2) -
      Math.atan(tau) + p.phase;
    const envelope = Math.exp(-dr2 / (4 * sigma ** 2)) / (Math.sqrt(2 * Math.PI) * sigma);
    return envelope * Math.cos(phase);
  }

  describe(p) {
    const s = SPECIES[p.type], v = velocityFromMomentum(s.mass, p.px, p.py);
    const mom = Math.hypot(p.px, p.py);
    const z = mom / (s.mass * C.c);
    const energy = s.mass * C.c * C.c * z * z / (v.gamma + 1);
    return {
      ...v, speedKmS: Math.hypot(v.vx, v.vy) / 1000, beta: Math.hypot(v.vx, v.vy) / C.c,
      momentum: mom, wavelengthNm: mom > 0 ? C.h / mom / C.nm : Infinity,
      kineticEV: energy / C.eV, sigmaNm: this.packet(p).sigma
    };
  }
}
