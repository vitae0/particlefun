# ParticleFun · One-screen Field Laboratory

A one-screen, no-scroll physics sandbox for **Standard Model field-sector visualization, relativistic on-shell kinematics, naturally timed decays, QED cross-section-driven stochastic collisions**, and independent analytical historical / quantum-technology experiments.

> **Scientific scope:** This is **not** a first-principles, exact interacting Standard Model quantum field theory solver. The physics engine combines verified mass-shell and conservation calculations with a deliberately explicit semiclassical Gaussian wave-packet / beam-overlap approximation. Some partial cross sections are leading-order approximations; many channels remain unresolved. Results must not be treated as quantitative collider predictions.

## Run

```bash
git clone https://github.com/vitae0/particlefun.git
cd particlefun
python3 -m http.server 8080
# http://localhost:8080
```

No frontend build or third-party JS dependencies. Node.js 20+ for regression tests:

```bash
npm test
```

## One-page UI

No body scrollbar or panel scrollbar. A single laboratory grid fills the browser, with **expand-on-click menus**: **Alan**, **Deneyler**, **İleri**, **Olaylar**, **Model**. Entries paginate instead of using hidden scrolling regions.

**Always visible:** slower, play/pause, faster, single-step, advance to next physically sampled decay, restart, world scale, numerical precision and color-intensity mapping. More options appear within the canvas without redirecting to another page.

- **Scales:** 1 fm → 1 km (including 1 nm, 1 μm, 1 mm, 1 m).
- **Precision:** fast / balanced / precise. Controls packet rendering samples (108/185/320 pixels across) and kinetic substep target (1/0.35/0.08 fm/c respectively). **It does not turn an approximate QFT model into exact QFT.** Finite frame budgets can cap displayed physical-time progression.
- **Colors:** linear `|A|`, logarithmic `log(1+16|A|)/log(17)`, exponential `|A|²`. These are *display mappings*, never modifications of quantum probability.
- **Antimatter hues:** exact complementary 180° colors for every particle/antiparticle ID. Signed packet carrier uses hue-dependent tint without asserting that complex fields have directly measured negative intensity.
- **No point markers or absolute coordinate labels.** Overlapping wave packet textures occupy the canvas; tapping places a prepared packet without showing a fictitious exact physical position measurement.
- **Stochastic / expected toggle:** for scattering, choose random events weighted by calculated process cross section or show integrated encounter expectations with no scattering outcome. Measured-lifetime decays remain stochastic.
- **Events:** logged observed reactions, rejected thresholds and explicitly unresolved outgoing channels.

## Species

**46 reference entries**, including:
- All three charged leptons and antiparticles, neutrinos and antineutrinos.
- All six quark flavors and anti-flavors, plus **all eight gluon adjoint basis states**.
- Photon, W±, Z, Higgs scalar.
- Effective pion / kaon, proton / neutron and corresponding anti-hadrons.

**Quark and gluon fields are selectable as *localized, confined color-source textures***, **not free on-shell particles**. There is no gauge-invariant single gluon observability. An isolated quark or gluon cannot initiate a physical asymptotic scattering channel. The underlying color state is not evolved with SU(3) lattice gauge theory.

**Nucleons are visualized by constituent content:** `p≈uud + gluon cloud`, `n≈udd + gluon cloud`; antiparticles use conjugate content. The valence positions and gluon texture are **qualitative schematic markers**, not an actual computed proton/neutron bound-state wavefunction or a solved parton distribution. Nucleons remain on-shell *composite hadron* states for beta-decay kinematics.

Neutrinos are massless ultra-relativistic approximations by flavor, not massive mixing eigenstates. Quark masses are scale/scheme-dependent in PDG listings; confined source textures must not be interpreted using free current-quark masses as constituent dynamics.

## Automatic decays: physical time, not animation time

For unstable species with available lifetimes from Particle Data Group:

```text
proper waiting time u = - τ ln(U), U ~ Uniform(0,1)
lab waiting time Δt = γ u, γ = E/m
```

All time is internal `fm/c` (light travels 1 fm in 1 natural unit). The engine evolves at physically scaled time, and the **⏭ next decay** action advances to the actual sampled future event, potentially corresponding to microseconds for muons or hundreds of seconds for neutrons. It does not falsify particle lifetime for visibility.

At each decay, a random channel is selected from approximate PDG branching fractions for **supported** channels. The missing branching fraction is **not** renormalized to 100% over implemented channels. If an unimplemented physical channel wins, the parent is removed from the observed sector and the initial four-momentum is kept in an **explicit unresolved-final-state accounting ledger**. In particular **H→bb̄** normally hadronizes; two free b quarks cannot be used as an observable final state, so this channel remains unresolved and honestly reported. Do not claim energy magically vanished or that outgoing gluon/quark jets have been accurately simulated.

Implemented 2- and 3-body kinematic channels include Z→ℓℓ, Z→νν, W±→ℓ±ν, H→γγ (rare), π→μν, π⁰→γγ, K→μν, μ→eνν, τ→μνν and neutron beta decay. **This is still not complete decay physics**: W/Z/H/τ/kaon other channels and realistic decay angular/spin correlations remain unimplemented.

## Automatic scattering: selected first-principles cross sections plus a stated beam model

The following cross sections (in `fm²`) are available:

1. **Breit–Wheeler** `γγ→ℓ⁺ℓ⁻` for e, μ, τ, exact unpolarized **lowest-order total QED** expression for real photons:

```text
β = sqrt(1 - 4m²/s),  r_l = α ℏc/m

σ_BW(s) = (πr_l²/2)(1-β²)
          [ (3-β⁴) ln((1+β)/(1-β)) - 2β(2-β²) ]
σ_BW(s)=0 if s≤4m².
```

2. **Klein–Nishina total** for `γe→γe` (and positron variant), using photon energy in the electron rest frame; below `ε ≲ 10⁻³`, the controlled Thomson expansion avoids cancellation.
3. **LO QED photon-exchange** `e⁺e⁻→μ⁺μ⁻,τ⁺τ⁻`, with the electron mass neglected in the matrix element, excluding electroweak Z resonances and corrections.
4. **High-energy leading-log** `e⁺e⁻→γγ` for `s>100m_e²`; otherwise automatically unavailable, rather than assigning an invented rate.
5. All other registered interactions (e.g. Møller, Bhabha without a physical angular acceptance and complete matrix elements) are cataloged for kinematics but **not automatically claimed to have a known probabilistic rate**.

The single-particle spatial packet density is modeled by a **normalized 3D Gaussian**, with fixed width `σ_p` at the interaction stage. We observe a 2D slice and explicitly assume the hidden z-offset is zero. The reaction hazard per unit laboratory natural time is modeled as:

```text
g_3D(r) = exp(-|r|²/(4σ_p²)) / (4πσ_p²)^(3/2)
λ_channel(t) = σ_channel(s) × v_Møller × g_3D(r(t))
P_event over Δt = 1 - exp( - Δt Σ_channels λ_channel )
```

Competing rates are sampled in proportion to their hazard. Numerical substeps integrate this exposure throughout a near encounter. A reaction is **not guaranteed** simply because two drawn waves overlap. Real collider luminosity requires actual three-dimensional beam preparation; these rates are predictive **only within this specified single-packet overlap model** and *not exact experimental probabilities*.

The **1000 independent trials** action samples the analytically integrated Gaussian crossing hazard across separate identically prepared crossings, without artificially raising the physics rate; one successful representative event may be displayed. Outcomes vary between runs.

### Final-state kinematics

For supported reactions, mass shell, charge, approximate flavor lepton and baryon number and **relativistic four-momentum** are enforced. Two-body outcomes are generated in the center of mass and Lorentz-boosted into the 2D lab plane. Three-body decays use sequential two-body phase-space generation. **Azimuthal scatter directions are sampled uniformly in 2D**, *not* from exact 3D quantum angular differential cross sections or helicity amplitudes. This is a known limitation despite correct four-momentum conservation.

There is no free-field photon emission during continuous propagation, no real-time dynamic gluon field, no QCD hadronization, no complete nonperturbative QFT and no actual detector transport.

## Visualization math

The colored scalar carrier is an approximate relativistic single-particle Gaussian wave-packet projection. Spatial centroid velocity is `v/c=p/E`, and the longitudinal/transverse packet broadening uses the curvature of `E(p)=sqrt(m²+|p|²)`. A full Dirac/Maxwell/Proca/Yang–Mills quantum-field equation is **not** integrated; spin, gauge fixing, interference between identical fermions, exchange statistics, entanglement, and QFT loop diagrams are absent. Under-resolved carrier oscillations are suppressed instead of being rendered as incorrect interference fringes.

Field colors refer to rendering channels, not directly observable complex field operator eigenvalues. Conjugate colors are a visualization convention, not a Standard Model law.

## Experiments

**29 basic presets:** leptons, photons, energetic pair production, Compton/Breit–Wheeler, π/W/Z/H/μ/τ/n decay and explicit forbidden threshold experiments.

**18 separate, independently analytical historical and quantum-device experiments** in the **İleri** menu, with adjustable parameters and a plotted expected response:

| Topic | Experiment | Physics actually computed |
| --- | --- | --- |
| Interference | Young double slit | Fraunhofer sinc² × cos² fringe profile + Born detector sample |
| Historical | Einstein photoelectric effect | Kmax=max(0,hν−φ) |
| Spin | Stern–Gerlach | cos²(θ/2) single-spin measurement probability |
| Electron matter waves | Davisson–Germer | de Broglie wavelength and elementary Bragg condition |
| Coulomb scattering | Rutherford | sin⁻⁴(θ/2) angular differential shape with finite-angle cut |
| Interference | Mach–Zehnder | cos²(φ/2) output probability |
| Interferometry | Michelson | ideal monochromatic phase fringe |
| Foundations | Bell–CHSH singlet | ideal quantum correlation E(a,b)=−V cos(a−b), max 2√2V |
| Quantum mechanics | Square barrier tunneling | stationary 1D exact transmission coefficient |
| Superconducting devices | DC SQUID | 2Ic|cos(πΦ/Φ0)| ideal critical-current envelope |
| Superconducting devices | AC Josephson | f = 2eV/h; **1 μV→0.48359785 MHz** |
| Two-level quantum | Rabi oscillations | driven two-level transition probability |
| Atomic clocks | Ramsey interferometry | ideal phase-dependent fringe |
| Quantum optics | Hong–Ou–Mandel | two-photon indistinguishability coincidence dip |
| Quantum information | BB84 | intercept-resend QBER=f/4 |
| Condensed matter | Integer quantum Hall | Gxy=νe²/h |
| Spectroscopy | Zeeman splitting | μ_B B characteristic splitting scale |
| Foundations | Aharonov–Bohm | Δφ=2πΦ/(h/e) ideal loop phase |

These analytical device experiments **are not implicitly running inside the interacting Standard Model collision engine**. Their exact/idealized equations are in `src/experiments.js` and their stated idealizations appear inside the app.

## Project structure

```text
index.html                 One-screen, scroll-free grid
src/laboratory.css         Responsive controls and expandable panels
src/laboratory.js          Unified UI, experiments, expected/stochastic modes
src/catalog.js             Standard Model inventory / conjugation / hadron references
src/field-physics.js       On-shell propagation and energy-momentum conservation
src/auto-events.js         PDG lifetimes, branching and QED scattering hazards
src/field-renderer.js      Composited textures, nucleon valence + gluon cloud, plots
src/presets.js             29 basic particle-process scenarios
src/experiments.js         18 analytical historic/quantum devices
tests/field.test.mjs       Baseline mass-shell/conservation tests
tests/auto-events.test.mjs Extended lifetime/rate/experiment tests
.github/workflows/ci.yml  GitHub Actions validation
```

## Sources and cautions

- [Particle Data Group 2025 particle data](https://pdg.lbl.gov/2025/listings/particle_properties.html).
- [2025 PDG summary tables](https://pdg.lbl.gov/2025/tables/contents_tables.html).
- [Breit–Wheeler original two-photon cross-section review](https://www.sciencedirect.com/science/article/abs/pii/S0370157309002518).
- [NIST: Klein–Nishina total cross section](https://srd.nist.gov/NSRDS/NSRDS-NBS29.pdf).
- [NIST CODATA fundamental constants](https://physics.nist.gov/cuu/Constants/).

For genuine precision event generation and detector simulation, integrate validated external HEP engines and data standards (MadGraph5_aMC@NLO / Pythia8 / Geant4 / HepMC / ROOT). This repo does not claim those capabilities.

**License:** Not yet selected.
