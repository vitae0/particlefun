# ParticleFun | Research Laboratory

A minimal, **single-screen scientific sandbox**: three-dimensional relativistic charge transport, conserved on-shell reaction kinematics, conditional QED processes, and **actual apparatus objects** (electrodes, magnets, screens and selected idealized quantum-optical detectors).

> **Physical status:** This is a hybrid of classical 3D electromagnetism, relativistic kinematics, narrow-band single-particle packet approximations and separate instrument-specific models. **It is not a complete interacting quantum-field theory solver.** Its different layers must not be confused.

## Run

```bash
git clone https://github.com/vitae0/particlefun.git
cd particlefun
python3 -m http.server 8080
# http://localhost:8080
```

No build tool or external JavaScript runtime dependency. For automated physics and UI regression checks use `npm test` (Node 20+).

## Workflow

The application opens in a **paused** configuration. Choosing an experiment resets its physical state and leaves it paused. The plotting canvas is intentionally bare, close to Matplotlib rather than a SaaS dashboard.

| Action | Control |
| --- | --- |
| Run / pause | **Space**, even when an input has focus; also ▶/Ⅱ |
| Forward one physical frame | → / forward button |
| Go back one recorded physical frame | ← / back button; restores positions, momenta, recorded measurements, RNG state and event schedulers |
| Slow / fast | toolbar ± |
| Pan in x/y | drag canvas |
| Zoom around cursor | mouse wheel |
| View 3D state at a different z | bottom **z section** slider |
| Select apparatus experiments | **Deney** menu |
| Select a particle/field, including one initially at rest | **Alan**, set kinetic energy **K=0**, then ＋ or click the canvas |
| Configure field plots / step size | **Görünüm** |

The physical state contains x/y/z coordinates, px/py/pz momentum components and genuine three-dimensional forces; the plot is a **two-dimensional cross-section**, not an orthographic 3D renderer. UI panels are paginated, with no body scrolling.

## Physics layers

### (A) Charged-particle motion in 3D

Internal units: position femtometres (fm), time fm/c, energy MeV and momentum MeV/c.

```text
E_i = sqrt(m_i² + p_ix² + p_iy² + p_iz²)
v_i/c = p_i / E_i

U_ij = α ℏc q_i q_j / sqrt(|r_i-r_j|² + a²)
F_i = -∂U/∂r_i + q_i(E_ext + v_i × B_ext)
```

The electric pair force is real **three-dimensional, softened, instantaneous Coulomb**. Uniform external fields, and prescribed piecewise-uniform E/B apparatus regions, use SI conversion. Relativistic Boris magnetic momentum rotation and adaptive electric kicks propagate charge trajectories. The magnetic force should not do work. Energy conservation in closed Coulomb-only cases is monitored relative to the initial state.

**Limitations:** The softening scale `a` changes the short-distance potential: `a` is not an electron radius. Retarded radiation fields, self-radiation, spin-orbit terms, Dirac dynamics, particle exchange statistics and full QED are absent. Classical trajectories of two close electrons are **not** a solution to quantum electron-electron scattering. Large detector apparatus use instrument-specific flight models instead of trying to integrate centimetres in femtometre-sized steps.

### (B) Electron packet visualization: corrected physics

The earlier raster produced identical expanding rings, especially for an electron **at rest**, for reasons unrelated to an observed electron structure:

- Requested Gaussian width `σ₀ ≈ 2.1 fm` was far below the reduced electron Compton scale `ℏ/(m_e c) ≈ 386.16 fm`.
- The old quadratic dispersion approximation was being evaluated far outside its narrow-momentum regime.
- The earlier packet carrier produced concentric **phase fringes**, not measured probability density.
- A 3D Gaussian normalization factor was omitted, allowing the peak to remain visually too bright while the packet spread.

The new **default charged-particle plot** is the calculated 3D softened **Coulomb scalar potential** sampled on the selected z-plane. This does not pretend to be an electron quantum wavefunction. Color magnitude may use linear/log/exponential *display* mappings.

Optional plots under **Görünüm** distinguish **relative `|ψ|²`** from **`Re ψ` phase diagnostics**. The latter is not a directly observable probability. To keep the Gaussian packet in the regime `Δp/E ≤ 0.1` appropriate for this approximation, its effective width is

```text
σ₀,eff = max(σ₀, ℏc/(0.2 E))
σ_L(t) = σ₀,eff sqrt(1 + [ℏc t m²/(2 σ₀,eff² E³)]²)
σ_T(t) = σ₀,eff sqrt(1 + [ℏc t/(2 σ₀,eff² E)]²)
ρ(x,t) = exp(-(x_L²/σ_L² + |x_T|²/σ_T²)/2)
         / [(2π)^(3/2) σ_L σ_T²]
```

Here `E` is total MeV energy, `m` the rest energy in MeV and `x_L,x_T` are displacements parallel/perpendicular to the momentum. The density has units fm⁻³ and integrates to 1 over all 3D space for this Gaussian model. Display intensity is `ρ/ρ(x_center,0)`, not ρ itself. Peak brightness therefore decreases as the wave packet spreads. This is **still** a scalar paraxial proxy, not the exact relativistic Dirac packet or interacting QFT solution. The enforced width is a **validity choice for the approximation**, not a universal strict law that forbids finer electron localization in quantum field theory.

For a stationary electron at the original `σ₀=2.1 fm`, the deprecated nonrelativistic formula predicted nearly **92 fm** width after only `1 fm/c`; that number arose in a physically invalid regime and must **not** be reported as a real electron prediction. The new narrow-band packet for the same electron begins near 1930 fm instead and spreads slowly for that short duration. It is necessarily far wider than a 100-fm plotting frame; use zoom to inspect an actual spatial density profile.

### (C) Reactions and particle catalogue

The Standard Model reference catalogue contains leptons/antileptons, neutrino flavor labels, quark flavors, photon, eight gluon color-basis entries, W±, Z and Higgs. Composite hadrons are effective on-shell particles for the reaction and transport engines; protons/neutrons are rendered with a **schematic** valence-quark plus gluon-cloud texture. **No resolved nonperturbative QCD wavefunction or parton shower is computed.** Quarks and gluons are confined colored sources, not free asymptotic particles.

Allowed 2→2 and 1→2/3 channels are checked for on-shell masses, thresholds, charge/lepton/baryon number and full **three-component four-momentum** conservation, followed by a Lorentz boost to the laboratory frame. Three-body phase space is kinematic, not a complete weak matrix element.

Where supplied, **measured particle lifetimes and PDG branching fractions** yield spontaneous decay times; missing channels are retained as **unresolved**, never invented as free quark jets. Selected scattering probabilities use Breit–Wheeler / Klein–Nishina / limited QED cross-section models and a **3D Gaussian overlap assumption**. The scattering-packet overlap model is an independently declared approximation and is **not** a fully self-consistent many-body QFT calculation. Not every possible process has a defined rate.

### (D) Integrated historical and instrument setups

Experiment descriptions in `src/live-scenes.js` instantiate actual sources, apparatus and detector planes in the **same** 3D world, rather than rendering detached educational charts:

- Coulomb repulsion (including electrons initially at exact rest), electron–positron attraction, off-axis scattering and z-separated charged particles.
- Rutherford alpha/gold scattering in 3D with detector plane.
- Thomson crossed fields, CRT deflection, Wien velocity selector, magnetic charge spectrometer.
- Stern–Gerlach macroscopic silver beam with a **paraxial spin-force approximation**. No exact atom-spin entanglement/collapse solver.
- Millikan oil-drop setups with real droplet mass, charge, gravity and **Stokes drag** in an analytical SI update. No Brownian motion/evaporation.
- Young double-slit and Mach–Zehnder: photon propagation to **in-scene** idealized detectors with Born sampling from analytical interference profiles. There is no spatial Maxwell PDE or QED optical scattering calculation.
- Selected Compton, pair creation, weak decays and other quantum/particle scenarios.

Long physical flights may be advanced to detector arrival through the instrument-specific fast-forward tool; unintegrated time is not silently counted. Instrument model limitations are shown in each scene's description.

## Tests and architecture

```text
src/catalog.js             particle reference entries and charges
src/field-physics.js       full on-shell 3D four-momentum, reaction states
src/transport3d.js         3D Coulomb/Lorentz transport and energy diagnostic
src/wavepacket.js          narrow-band Gaussian proxy and 3D normalization
src/scientific-renderer.js Coulomb potential, packet probability, phase, z-plane, grid
src/apparatus.js           E/B instrument volumes, measurement screens and idealized quantum devices
src/auto-events.js         partial QED cross sections and lifetime sampling
src/live-scenes.js         in-scene basic and historical experiments
src/research.js            minimal UI, rewind/snapshot and apparatus controls
tests/*.mjs                numerical invariant and interaction regression tests
```

GitHub Actions runs syntax checks and `npm test`. Passing the tests verifies **the stated models and invariants**, not that the application implements all of nature.

## References

- [NIST CODATA 2022 fundamental constants](https://physics.nist.gov/cuu/pdf/all.pdf)
- [Particle Data Group particle masses and decay data](https://pdg.lbl.gov/2025/listings/particle_properties.html)
- [Standard free-Gaussian-packet spreading formula](https://quantumlectures.org/en/chapters/postulates/lesson-5)

License has not yet been selected.
