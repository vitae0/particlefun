import { C, SPECIES } from './constants.js';
import { ParticleLab } from './physics.js';
import { LabRenderer } from './renderer.js';

const $ = id => document.getElementById(id);
const lab = new ParticleLab();
const renderer = new LabRenderer($('labCanvas'), lab);
let running = true, placing = false, lastPreset = 'hydrogen', slowAlert = false;
let frameCounter = 0, previousFrame = 0;

const fmt = (n, digits = 2) => {
  if (!Number.isFinite(n)) return '—';
  if (Math.abs(n) < 1e-15) return '0';
  if (Math.abs(n) >= 1e5 || Math.abs(n) < .001) return n.toExponential(2);
  return n.toLocaleString('tr-TR', { maximumFractionDigits: digits });
};
function flash(msg, isError = false) {
  const node = $('message'); node.textContent = msg; node.style.color = isError ? '#f5a0a0' : '#a5d5e5';
}
function chosen() { return lab.particles.find(p => p.id === renderer.selectedId) || null; }
function setSelected(p) {
  renderer.selectedId = p?.id ?? null;
  if (p) {
    const d = lab.describe(p);
    $('inputX').value = fmt(p.xNm, 3).replaceAll('.', '').includes(',') ? p.xNm.toFixed(3) : p.xNm.toFixed(3);
    $('inputY').value = p.yNm.toFixed(3);
    $('inputVx').value = (d.vx / 1000).toFixed(2);
    $('inputVy').value = (d.vy / 1000).toFixed(2);
  }
  refresh();
}
function setRunning(value) {
  running = Boolean(value);
  $('playPause').textContent = running ? 'Ⅱ' : '▶';
  $('playPause').setAttribute('aria-label', running ? 'Simülasyonu duraklat' : 'Simülasyonu başlat');
  $('canvasStatus').textContent = running ? '● ÇALIŞIYOR' : 'Ⅱ DURAKLATILDI';
}
function seed(name) {
  lab.clear();
  lab.bTesla = 0;
  $('bField').value = '0';
  $('bValue').textContent = '0 T';
  if (name === 'hydrogen') {
    lab.add('proton', 0, 0);
    lab.add('electron', -8, 0, 0, -177);
    flash('Klasik e⁻–p⁺ Coulomb dinamiği. Gerçek atomik orbital değildir.');
  } else if (name === 'repel') {
    lab.add('electron', -9, -2, 270, 25);
    lab.add('electron', 9, 2, -270, -25);
    flash('Aynı işaretli yüklerin elektrostatik saçılması.');
  } else if (name === 'pair') {
    lab.add('electron', -8, -1, 170, 0);
    lab.add('positron', 8, 1, -170, 0);
    flash('e⁻ ve e⁺ birbirini çeker. Anihilasyon bu modelin dışında.');
  } else if (name === 'magnetic') {
    lab.bTesla = 2800;
    $('bField').value = '2800';
    $('bValue').textContent = '2800 T';
    lab.add('electron', -5, 0, 3000, 0);
    lab.add('proton', 8, 2, 0, -300);
    flash('Dış B alanı Lorentz kuvveti üretir; manyetik alan iş yapmaz.');
  } else {
    flash('Boş sahne. Soldan parçacık ekleyin veya tuvale yerleştirin.');
  }
  lab.rebaseline();
  lastPreset = name;
  renderer.selectedId = lab.particles.length ? lab.particles[lab.particles.length - 1].id : null;
  const p = chosen();
  if (p) {
    const d = lab.describe(p);
    $('inputX').value = p.xNm;
    $('inputY').value = p.yNm;
    $('inputVx').value = (d.vx / 1000).toFixed(2);
    $('inputVy').value = (d.vy / 1000).toFixed(2);
  }
  setRunning(name !== 'empty');
  refresh();
}
function refreshSpecies() {
  const s = SPECIES[$('species').value];
  $('speciesFacts').replaceChildren();
  for (const txt of [s.symbol, 'm = ' + s.mass.toExponential(3) + ' kg', 'q = ' + fmt(s.charge / C.e, 0) + ' e']) {
    const span = document.createElement('span'); span.textContent = txt; $('speciesFacts').appendChild(span);
  }
}
function refresh() {
  $('timeMetric').innerHTML = fmt(lab.timeFs) + ' <small>fs</small>';
  const energy = lab.energy();
  $('energyMetric').innerHTML = fmt(energy.total / C.eV, 3) + ' <small>eV</small>';
  const baseline = Math.abs(lab.referenceEnergy);
  const drift = baseline < 1e-26 ? null : (energy.total - lab.referenceEnergy) / baseline * 100;
  $('driftMetric').innerHTML = (drift === null ? '—' : fmt(drift, 3)) + ' <small>%</small>';
  $('countBadge').textContent = lab.particles.length + ' PARTICLES';
  const p = chosen();
  if (p) {
    const s = SPECIES[p.type], d = lab.describe(p);
    $('selectedDetails').innerHTML =
      '<div class="selected-summary"><span class="selected-symbol" style="color:' + s.color + '">' + s.symbol + '</span><div><strong>' + s.label +
      ' #' + p.id + '</strong><small>m = ' + s.mass.toExponential(4) + ' kg</small></div></div>' +
      '<div class="detail-row"><span>Yük</span><strong>' + fmt(s.charge / C.e, 0) + ' e</strong></div>' +
      '<div class="detail-row"><span>Konum (nm)</span><strong>' + fmt(p.xNm) + ', ' + fmt(p.yNm) + '</strong></div>' +
      '<div class="detail-row"><span>Hız (km/s)</span><strong>' + fmt(d.speedKmS) + '</strong></div>' +
      '<div class="detail-row"><span>v/c</span><strong>' + fmt(d.beta, 6) + '</strong></div>' +
      '<div class="detail-row"><span>Kinetik enerji</span><strong>' + fmt(d.kineticEV, 4) + ' eV</strong></div>' +
      '<div class="detail-row"><span>de Broglie λ</span><strong>' + fmt(d.wavelengthNm, 4) + ' nm</strong></div>' +
      '<div class="detail-row"><span>Dalga paketi σ</span><strong>' + fmt(d.sigmaNm) + ' nm</strong></div>';
  } else $('selectedDetails').innerHTML = '<p>Bilgi görmek için bir parçacık seç.</p>';
  $('applyVelocity').disabled = !p;
  $('removeParticle').disabled = !p;

  const list = $('particleList'); list.replaceChildren();
  if (!lab.particles.length) list.textContent = 'Henüz parçacık yok.';
  for (const item of lab.particles) {
    const s = SPECIES[item.type];
    const b = document.createElement('button'); b.type = 'button'; b.className = 'particle-item';
    b.setAttribute('aria-pressed', String(item.id === renderer.selectedId));
    const dot = document.createElement('span'); dot.className = 'particle-dot'; dot.style.background = s.color;
    const title = document.createElement('span'); title.textContent = s.symbol + ' · ' + s.label;
    const no = document.createElement('small'); no.textContent = '#' + item.id;
    b.append(dot, title, no); b.addEventListener('click', () => setSelected(item));
    list.appendChild(b);
  }
  const rel = $('interactions'); rel.replaceChildren();
  const heading = document.createElement('h3'); heading.textContent = 'İkili elektrostatik ilişkiler'; rel.appendChild(heading);
  let pairs = 0;
  for (let i = 0; i < lab.particles.length && pairs < 8; i++) for (let j = i + 1; j < lab.particles.length && pairs < 8; j++) {
    const a = lab.particles[i], b = lab.particles[j];
    const qa = SPECIES[a.type].charge, qb = SPECIES[b.type].charge;
    if (!qa || !qb) continue;
    pairs++;
    const row = document.createElement('div'); row.className = 'interaction-line';
    const nm = Math.hypot(a.xNm - b.xNm, a.yNm - b.yNm);
    const first = document.createElement('span'); first.textContent = '#' + a.id + ' ↔ #' + b.id + ' · ' + fmt(nm) + ' nm';
    const second = document.createElement('span'); second.textContent = qa * qb < 0 ? 'Çekim' : 'İtme';
    row.append(first, second); rel.appendChild(row);
  }
  if (!pairs) {
    const empty = document.createElement('div'); empty.className = 'interaction-line';
    empty.textContent = 'Yüklü parçacık çifti bulunmuyor.'; rel.appendChild(empty);
  }
  if (lab.particles.some(p => lab.describe(p).beta > 0.1) && renderer.mode !== 'particle') {
    flash('Uyarı: Schrödinger dalga yaklaşımı v > 0.1c için güvenilir değildir.', true);
  }
}
function setMode(mode) {
  renderer.mode = mode;
  for (const b of document.querySelectorAll('.mode-btn')) {
    b.classList.toggle('active', b.dataset.mode === mode);
    b.setAttribute('aria-pressed', String(b.dataset.mode === mode));
  }
  const notes = {
    particle: ['CLASSICAL ELECTRODYNAMICS / SOFTENED', 'Relativistik momentum + düzenlenmiş Coulomb kuvveti + dış manyetik alan. Radyasyon, gecikme ve reaksiyonlar modellenmez.'],
    wave: ['QUANTUM PROBABILITY / GAUSSIAN', 'Her parçacık için normalize Gauss dalga paketi |ψ|² çizilir. Genişleme serbest Schrödinger çözümüdür; etkileşen merkezler yarı-klasik taşınır. Girişim, spin ve dolaşıklık hesaplanmaz.'],
    field: ['SECOND QUANTIZATION / ONE-PARTICLE', 'Seçili parçacığın tek-parçacık Schrödinger alan genliğinin Re⟨0|Ψ̂(x)|1ψ⟩ kesiti gösterilir. Klasik E alanı ayrı bir katmandır; bu tam QED hesabı değildir.']
  };
  $('canvasModeLabel').textContent = notes[mode][0];
  $('modeExplanation').textContent = notes[mode][1];
  renderer.draw(); refresh();
}
$('addForm').addEventListener('submit', e => {
  e.preventDefault();
  try {
    const p = lab.add($('species').value, $('inputX').value, $('inputY').value, $('inputVx').value, $('inputVy').value);
    setSelected(p); flash(SPECIES[p.type].label + ' #' + p.id + ' yerleştirildi.');
  } catch (err) { flash(err.message, true); }
});
$('placeMode').addEventListener('click', () => {
  placing = !placing; $('placeMode').setAttribute('aria-pressed', String(placing));
  $('placeMode').textContent = placing ? '✓ Tıklayarak yerleştirme açık' : '◎ Tuvale tıklayarak yerleştir';
});
$('labCanvas').addEventListener('click', e => {
  const rect = $('labCanvas').getBoundingClientRect();
  const x = e.clientX - rect.left, y = e.clientY - rect.top;
  if (placing) {
    const w = renderer.toWorld(x, y);
    try {
      const p = lab.add($('species').value, w.xNm, w.yNm, $('inputVx').value, $('inputVy').value);
      setSelected(p); flash('Parçacık tuvale yerleştirildi.');
    } catch (err) { flash(err.message, true); }
  } else setSelected(renderer.hitTest(x, y));
});
$('species').addEventListener('change', refreshSpecies);
$('playPause').addEventListener('click', () => setRunning(!running));
$('step').addEventListener('click', () => {
  setRunning(false); const result = lab.advance(0.25);
  if (result.elapsedFs > 0) renderer.recordTrails();
  refresh(); renderer.draw();
});
$('restart').addEventListener('click', () => seed(lastPreset));
$('applyVelocity').addEventListener('click', () => {
  const p = chosen();
  if (!p) return;
  try {
    lab.setVelocity(p.id, $('inputVx').value, $('inputVy').value);
    flash('#' + p.id + ' için hız güncellendi. Enerji referansı yenilendi.'); refresh();
  } catch (err) { flash(err.message, true); }
});
$('removeParticle').addEventListener('click', () => {
  const p = chosen(); if (!p) return;
  lab.remove(p.id); setSelected(lab.particles[0] || null); flash('Parçacık kaldırıldı.');
});
document.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
document.querySelectorAll('[data-preset]').forEach(b => b.addEventListener('click', () => seed(b.dataset.preset)));
$('bField').addEventListener('input', e => {
  lab.bTesla = Number(e.target.value); $('bValue').textContent = lab.bTesla + ' T'; lab.rebaseline();
});
$('softening').addEventListener('input', e => {
  lab.softeningNm = Number(e.target.value); $('softValue').textContent = lab.softeningNm.toFixed(2) + ' nm'; lab.rebaseline();
});
$('packetWidth').addEventListener('input', e => {
  lab.sigma0Nm = Number(e.target.value); $('sigmaValue').textContent = lab.sigma0Nm.toFixed(2) + ' nm';
});
$('showE').addEventListener('change', e => { renderer.showElectric = e.target.checked; });
$('showTrails').addEventListener('change', e => { renderer.showTrails = e.target.checked; });
$('labCanvas').addEventListener('keydown', e => {
  if (e.key === 'Escape') { placing = false; $('placeMode').setAttribute('aria-pressed', 'false'); $('placeMode').textContent = '◎ Tuvale tıklayarak yerleştir'; }
  if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setRunning(!running); }
});
function animate(ts) {
  const dt = previousFrame ? Math.min((ts - previousFrame) / 1000, 0.06) : 0;
  previousFrame = ts;
  if (running && dt > 0) {
    const result = lab.advance(Math.min(1.6, dt * 12 * Number($('simSpeed').value)));
    if (result.elapsedFs > 0) renderer.recordTrails();
    if (result.limited && !slowAlert) { flash('Yakın etkileşimde güvenli adım sınırına ulaşıldı; fiziksel zaman yavaşlatıldı.', true); slowAlert = true; }
  }
  renderer.draw();
  if (frameCounter++ % 7 === 0) refresh();
  requestAnimationFrame(animate);
}
refreshSpecies();
seed('hydrogen');
setMode('particle');
if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) setRunning(false);
requestAnimationFrame(animate);
