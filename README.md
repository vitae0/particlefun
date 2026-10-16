# ParticleFun · Field Laboratory

A deliberately minimal interface for exploring Standard Model **particle sectors, relativistic kinematics, overlapping single-particle field envelopes, conditional reactions, and conservation laws**.

**Scientific status:** This is not a first-principles Standard Model quantum-field simulation. That would require nonperturbative QCD, quantum electroweak amplitudes, spin representations and/or event-generator infrastructure far beyond this browser-based model. What is computed is specified below. No arbitrary 2D animation is passed off as exact physics.

## Run

```bash
git clone https://github.com/vitae0/particlefun.git
cd particlefun
python3 -m http.server 8080
# Visit http://localhost:8080
```

Zero third-party runtime dependencies. ES modules require HTTP, not `file://`. For regression tests: `npm test` (Node.js 20+). GitHub Actions runs syntax and physics tests on commits.

## Interface

- One visualization: **overlapping color-coded quantum-sector packet amplitudes**. No particle/wave/field tabs, trajectories, absolute position labels or meter-heavy sidebar.
- Choose species, initial kinetic energy in MeV (total energy for massless species), direction in degrees. Click **Ekle** to inject from the side, or click the canvas to choose the packet center without exposing numerical absolute coordinates.
- Antiparticles are **exactly complementary hues** to their particle partners. Different species receive distinct color families. Clicking active field chips emphasizes a single field without hiding all others.
- Choose among **29 named experiments** (QED, Breit–Wheeler, Møller/Bhabha/Compton, pair thresholds, electroweak decays, hadron decays, three-body decays and confinement limitations).
- **Koşullu çarpışmalar:** selected 2→2 channel triggers only after compatible incoming packets overlap. The simulation never claims a cross section or reaction probability. One-particle decay channels require an explicit click.
- Pause, one natural-time step, restart, clear and zoom are visible. A collapsible scientific-details panel holds limitations and assumptions.

## Species inventory

**46 catalog items**, comprising:
- Charged leptons e, μ, τ and all charge conjugates.
- Three neutrino flavor labels and three anti-flavors. Flavor states are *not* mass eigenstates; this model approximates them as ultrarelativistic massless sectors.
- All six quark flavors and antiquarks **for structural/reference purposes** (not free asymptotic particles).
- Gauge bosons: photon, eight SU(3) gluon basis labels, W+, W−, Z. Higgs scalar.
- Effective hadronic states: proton / antiproton, neutron / antineutron, π0, π± and K±.

**Confinement matters.** Free color-charged quarks and gluons cannot be inserted or propagated as observable asymptotic particles, hence those menu options are present but disabled. Proton and pion fields are effective composite approximations. Free quark and gluon dynamics or hadronization would require a genuine QCD engine.

Masses are approximate PDG values in MeV. Current quark masses have renormalization-scale/scheme dependence and must not be used as universal nonperturbative constituent masses. For all channels in this version, masses are fixed external parameters; running couplings and finite-width propagators are not evaluated.

## Computed physics: rigorous in a specified model

Internal units: `E [MeV]`, `p [MeV/c]`, `x [fm]`, `t [fm/c]`, `ℏc = 197.3269804 MeV fm`; `c = 1` in kinematic formulas.

### On-shell relativistic propagation

```text
E = sqrt(p_x² + p_y² + m²)
v_x/c = p_x / E,     v_y/c = p_y / E
K = E - m           (massive species)
E = K               (massless species, requiring E > 0)
r(t+dt) = r(t) + (p/E) dt
```

Within **free propagation**, exact relativistic energy and group velocity are used. No Coulomb force is integrated here. There is intentionally no fake general electrostatic force law applied to photons, quarks, unstable bosons or ultrarelativistic neutrinos. Scattering only happens in listed channels.

### Reaction kinematics

Each listed process is an explicitly **conditioned channel**. Its initial and final states must match exact particle IDs. The engine checks:
- Conserved total electric charge, baryon number and each charged-lepton-family number, assuming no flavor mixing.
- Total invariant energy `sqrt(s)` and final-state rest-mass threshold.
- Exact on-shell two-body outgoing momenta in the incoming center-of-momentum frame.
- Lorentz boost back to the laboratory frame with total **four-momentum conservation**.
- Three-body final states by two successive two-body decays with a sampled intermediate invariant mass. This is a valid kinematic phase-space point, **not** a sampled weak V−A matrix element or exact differential decay spectrum.

The outgoing azimuthal angle is uniformly sampled in the **2D demonstration plane** and does not reproduce measured 3D angular distributions. Sampled channel outcome is *not* weighted by a physical matrix element. Pair annihilation and Compton elastic channels therefore exhibit physically **allowed** four-momentum arrangements but not predictive event rates. No spontaneous decay lifetime simulation is enabled, so macroscopic muon/neutron lifetimes do not get silently accelerated into fictitious femtometer-scale lifetimes.

For `γγ → e⁻e⁺`, two colliding photons need enough invariant mass to create the pair. Same-direction photons have `s=0`, even when both are individually energetic. Both situations have explicit blocked presets.

**32 registered processes** (including one correctly unavailable hadronizing Higgs channel) cover QED annihilation/scattering, high-energy lepton pair production, Compton, Z/W/H, pion/kaon/muon/tau and neutron beta-decay illustrations. Nothing not listed is assumed to take place automatically.

### Visualized packet amplitudes

For every incoming particle, a **2D paraxial scalar single-particle packet** is drawn. Its centroid is propagated by the relativistic group velocity. The carrier obeys the on-shell dispersion `ω=E/ℏ`. The Gaussian longitudinal and transverse widths are obtained from the Hessian of `E(p)=sqrt(m²+|p|²)` around each packet's central momentum:

```text
d²E/dp_parallel² = m² / E³
d²E/dp_perpendicular² = 1/E

σ_parallel(t) = σ₀ sqrt(1 + [ℏc t m²/(2 σ₀² E³)]²)
σ_perp(t)     = σ₀ sqrt(1 + [ℏc t/(2 σ₀² E)]²)
```

This **paraxial approximation is reliable only when the momentum spread is small compared to a scale over which the dispersion curvature changes.** It is NOT a solution to the Dirac equation, Maxwell equations, Proca equations, interacting Klein–Gordon field, quantum chromodynamics or a true many-body Fock-space evolution. The displayed real signed amplitude should not be identified with a measurement of the quantum field operator; e.g. `⟨1|φ̂|1⟩=0` for ordinary number states. The visualization is a wavepacket projection, not an interacting vacuum expectation value.

Packets from different species are **drawn with additive color blending**, not summed as mutually coherent scalar quantum wavefunctions. Carrier oscillations with wavelengths smaller than the screen resolution are **suppressed** rather than aliased into false interference patterns. Phase/time at very high energies can also be undersampled visually.

### Absent physics (explicit)

- Interacting QFT: Feynman amplitudes, perturbative matrix elements, loop corrections and running couplings.
- Real differential/total cross sections, selection/branching probabilities, physical sampling of 3D scattering angles.
- Spin, helicity/chirality, fermionic antisymmetrization, genuine many-body entanglement and quantum measurement.
- Real-space QCD gluon fields, color confinement dynamics, jets and hadronization.
- Decay lifetime sampling, radiative corrections and particle-width/virtual/off-shell propagation.
- Oscillating neutrino mass eigenstates with PMNS; exact neutrino rest masses.
- Electromagnetic radiation fields, renormalization, gauge fixing and finite spacetime-grid solvers.

For experimental predictions or particle-detector simulation, real HEP software should be integrated as a separately validated backend (e.g. **MadGraph5_aMC@NLO** for matrix elements, **Pythia8** for shower/hadronization, **Geant4** for detector transport, and **ROOT/HepMC** for event data). Such a backend has **not** been integrated here.

## Model validation

Run `npm test`. Tests validate:
- Complete fundamental-sector registry and particle/antiparticle charges/colors.
- Prohibition of free colored particles.
- On-shell relativistic dispersion and massless speed.
- Threshold/parallel-photon prohibitions.
- All supported experiments' electric-charge and baryon/lepton-number constraints.
- Four-momentum conservation in every allowed preset, including three-body decays and boosted Compton scattering.
- Explicit auto-collision condition, no spontaneous unlisted reactions, and finite packet amplitude.

Older 2D Newton/Coulomb/dot-based code was removed from the current branch, but is preserved in Git history.

## Sources

- [Particle Data Group 2025, Review of Particle Physics](https://pdg.lbl.gov/2025/)
- [PDG 2025 particle mass/decay listings](https://pdg.lbl.gov/2025/listings/particle_properties.html)
- [PDG 2025 Standard Model and QCD reviews](https://pdg.lbl.gov/2025/reviews/standard_model_and_related.html)
- [NIST fundamental constants](https://physics.nist.gov/cuu/Constants/)

## Current modules

```text
index.html                Minimal full-width laboratory
src/field.css             Responsive styling
src/catalog.js            Particle states, conjugation, confinement, PDG-based masses
src/field-physics.js      Natural-unit propagation and on-shell reaction kinematics
src/field-renderer.js     Layered complex-amplitude proxy field visualization
src/field-app.js          Presets, interaction controls, UI lifecycle
src/presets.js            29 physically scoped and explanatory experiments
tests/field.test.mjs      Catalog, threshold, conservation and simulation regression tests
.github/workflows/ci.yml Automated syntax and physics tests
```
