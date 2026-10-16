// 2022 CODATA recommended values (NIST); SI units throughout the engine.
export const C = Object.freeze({
  c: 299792458,
  h: 6.62607015e-34,
  hbar: 1.054571817e-34,
  e: 1.602176634e-19,
  epsilon0: 8.8541878188e-12,
  k: 1 / (4 * Math.PI * 8.8541878188e-12),
  nm: 1e-9,
  fs: 1e-15,
  eV: 1.602176634e-19
});

export const SPECIES = Object.freeze({
  electron: { label: 'Elektron', symbol: 'e⁻', mass: 9.1093837139e-31, charge: -C.e, color: '#67c8fa' },
  positron: { label: 'Pozitron', symbol: 'e⁺', mass: 9.1093837139e-31, charge: C.e, color: '#ff9b82' },
  proton: { label: 'Proton', symbol: 'p⁺', mass: 1.67262192595e-27, charge: C.e, color: '#efbb79' },
  neutron: { label: 'Nötron', symbol: 'n', mass: 1.67492750056e-27, charge: 0, color: '#b9b2d9' },
  muon: { label: 'Müon', symbol: 'μ⁻', mass: 1.883531627e-28, charge: -C.e, color: '#a89eff' },
  alpha: { label: 'Alfa çekirdeği', symbol: 'α²⁺', mass: 6.6446573357e-27, charge: 2 * C.e, color: '#7ce2bc' }
});
