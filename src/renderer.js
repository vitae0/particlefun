import { SPECIES } from './constants.js';

const between = (v, min, max) => Math.max(min, Math.min(max, v));

export class LabRenderer {
  constructor(canvas, lab) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.lab = lab;
    this.mode = 'particle';
    this.selectedId = null;
    this.showElectric = true;
    this.showTrails = true;
    this.width = 1;
    this.height = 1;
    this.worldWidthNm = 52;
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const w = Math.max(1, rect.width), h = Math.max(1, rect.height);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (w === this.width && h === this.height && this.dpr === dpr) return;
    this.width = w; this.height = h; this.dpr = dpr;
    this.canvas.width = Math.round(w * dpr); this.canvas.height = Math.round(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  toScreen(xNm, yNm) {
    const scale = this.width / this.worldWidthNm;
    return { x: this.width / 2 + xNm * scale, y: this.height / 2 - yNm * scale };
  }
  toWorld(x, y) {
    const scale = this.width / this.worldWidthNm;
    return { xNm: (x - this.width / 2) / scale, yNm: (this.height / 2 - y) / scale };
  }
  hitTest(x, y) {
    let best = null, bestD = 18;
    for (const p of this.lab.particles) {
      const pos = this.toScreen(p.xNm, p.yNm);
      const d = Math.hypot(pos.x - x, pos.y - y);
      if (d < bestD) { best = p; bestD = d; }
    }
    return best;
  }
  recordTrails() {
    for (const p of this.lab.particles) {
      p.trail.push([p.xNm, p.yNm]);
      if (p.trail.length > 140) p.trail.shift();
    }
  }

  grid() {
    const ctx = this.ctx, scale = this.width / this.worldWidthNm;
    ctx.fillStyle = '#091320'; ctx.fillRect(0, 0, this.width, this.height);
    const left = -this.worldWidthNm / 2, right = -left;
    const halfH = this.height / (2 * scale);
    for (const step of [1, 5]) {
      ctx.beginPath();
      ctx.lineWidth = step === 5 ? 0.85 : 0.5;
      ctx.strokeStyle = step === 5 ? 'rgba(117,158,191,.13)' : 'rgba(117,158,191,.047)';
      for (let x = Math.ceil(left / step) * step; x <= right; x += step) {
        const pos = this.toScreen(x, 0).x; ctx.moveTo(pos, 0); ctx.lineTo(pos, this.height);
      }
      for (let y = Math.ceil(-halfH / step) * step; y <= halfH; y += step) {
        const pos = this.toScreen(0, y).y; ctx.moveTo(0, pos); ctx.lineTo(this.width, pos);
      }
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(111,166,210,.28)';
    const o = this.toScreen(0, 0); ctx.beginPath(); ctx.moveTo(o.x, 0); ctx.lineTo(o.x, this.height);
    ctx.moveTo(0, o.y); ctx.lineTo(this.width, o.y); ctx.stroke();
  }

  waveMap() {
    if (!this.lab.particles.length) return;
    const ctx = this.ctx, step = 8;
    const sigmaMap = this.mode === 'field' ? (this.lab.particles.find(p => p.id === this.selectedId) || this.lab.particles[0]) : null;
    let sigmaMax = 1;
    if (sigmaMap) sigmaMax = Math.sqrt(2 * Math.PI) * this.lab.packet(sigmaMap).sigma;
    for (let y = 0; y < this.height; y += step) {
      for (let x = 0; x < this.width; x += step) {
        const world = this.toWorld(x + step * 0.5, y + step * 0.5);
        if (this.mode === 'wave') {
          let rho = 0;
          for (const p of this.lab.particles) rho += this.lab.densityAt(p, world.xNm, world.yNm);
          const opacity = between((1 - Math.exp(-6 * rho)) * 0.82, 0, 0.85);
          if (opacity < 0.004) continue;
          ctx.fillStyle = 'rgba(87,188,244,' + opacity.toFixed(3) + ')';
        } else {
          const value = this.lab.fieldAt(sigmaMap, world.xNm, world.yNm) * sigmaMax;
          const opacity = between(Math.abs(value) * 0.87, 0, 0.85);
          if (opacity < 0.012) continue;
          ctx.fillStyle = value >= 0 ? 'rgba(92,206,247,' + opacity.toFixed(3) + ')' :
            'rgba(194,135,246,' + opacity.toFixed(3) + ')';
        }
        ctx.fillRect(x, y, step + 0.5, step + 0.5);
      }
    }
  }

  electricArrows() {
    if (!this.showElectric || !this.lab.particles.some(p => SPECIES[p.type].charge)) return;
    const ctx = this.ctx;
    const gap = 56;
    ctx.lineWidth = 1.1;
    ctx.strokeStyle = 'rgba(247,190,120,.52)';
    for (let y = gap; y < this.height - 12; y += gap) {
      for (let x = gap; x < this.width - 12; x += gap) {
        const w = this.toWorld(x, y);
        const e = this.lab.electricAt(w.xNm, w.yNm);
        const mag = Math.hypot(e.ex, e.ey);
        if (mag < 1e5) continue;
        const nx = e.ex / mag, ny = -e.ey / mag;
        const len = between(8 + Math.log10(1 + mag / 1e7) * 4, 7, 28);
        const x1 = x - nx * len / 2, y1 = y - ny * len / 2;
        const x2 = x + nx * len / 2, y2 = y + ny * len / 2;
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
        ctx.lineTo(x2 - nx * 5 + ny * 3, y2 - ny * 5 - nx * 3);
        ctx.moveTo(x2, y2); ctx.lineTo(x2 - nx * 5 - ny * 3, y2 - ny * 5 + nx * 3);
        ctx.stroke();
      }
    }
  }

  connections() {
    if (this.mode !== 'particle') return;
    const ctx = this.ctx;
    for (let i = 0; i < this.lab.particles.length; i++) {
      const a = this.lab.particles[i], qa = SPECIES[a.type].charge;
      if (!qa) continue;
      for (let j = i + 1; j < this.lab.particles.length; j++) {
        const b = this.lab.particles[j], qb = SPECIES[b.type].charge;
        if (!qb) continue;
        const ap = this.toScreen(a.xNm, a.yNm), bp = this.toScreen(b.xNm, b.yNm);
        ctx.strokeStyle = qa * qb < 0 ? 'rgba(115,199,184,.25)' : 'rgba(235,147,141,.22)';
        ctx.lineWidth = 1.1;
        ctx.setLineDash([3, 6]);
        ctx.beginPath(); ctx.moveTo(ap.x, ap.y); ctx.lineTo(bp.x, bp.y); ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }

  traces() {
    if (!this.showTrails || this.mode !== 'particle') return;
    const ctx = this.ctx;
    for (const p of this.lab.particles) {
      if (p.trail.length < 2) continue;
      ctx.save(); ctx.strokeStyle = SPECIES[p.type].color; ctx.globalAlpha = 0.4; ctx.lineWidth = 1.5;
      ctx.beginPath();
      p.trail.forEach(([x, y], i) => {
        const pos = this.toScreen(x, y);
        if (i === 0) ctx.moveTo(pos.x, pos.y); else ctx.lineTo(pos.x, pos.y);
      });
      ctx.stroke(); ctx.restore();
    }
  }

  markers() {
    const ctx = this.ctx;
    for (const p of this.lab.particles) {
      const s = SPECIES[p.type], { x, y } = this.toScreen(p.xNm, p.yNm);
      if (x < -50 || x > this.width + 50 || y < -50 || y > this.height + 50) continue;
      const selected = p.id === this.selectedId;
      const r = p.type === 'alpha' || p.type === 'proton' ? 10 : 8;
      ctx.save();
      if (selected) {
        ctx.strokeStyle = 'rgba(223,244,254,.62)'; ctx.lineWidth = 1;
        ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.arc(x, y, r + 9, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      }
      ctx.shadowBlur = 18; ctx.shadowColor = s.color;
      ctx.fillStyle = s.color; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0; ctx.fillStyle = '#08121b'; ctx.font = '700 10px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(s.charge ? (s.charge > 0 ? '+' : '−') : '0', x, y + .5);
      ctx.textAlign = 'left'; ctx.fillStyle = '#deedfa'; ctx.font = '600 11px system-ui';
      ctx.fillText(s.symbol + ' #' + p.id, x + r + 7, y - 7);
      if (selected) {
        const v = this.lab.describe(p);
        const length = between(v.speedKmS / 100, 0, 42);
        const mag = Math.hypot(v.vx, v.vy);
        if (mag && length > 2) {
          const dx = v.vx / mag, dy = -v.vy / mag;
          const x0 = x, y0 = y;
          const x1 = x + dx * (r + 8 + length), y1 = y + dy * (r + 8 + length);
          ctx.strokeStyle = '#d5f0ff'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1);
          ctx.lineTo(x1 - dx * 6 + dy * 3, y1 - dy * 6 - dx * 3);
          ctx.moveTo(x1, y1); ctx.lineTo(x1 - dx * 6 - dy * 3, y1 - dy * 6 + dx * 3);
          ctx.stroke();
        }
      }
      ctx.restore();
    }
  }

  draw() {
    this.resize();
    this.grid();
    if (this.mode !== 'particle') this.waveMap();
    this.connections();
    this.traces();
    this.electricArrows();
    this.markers();
  }
}
