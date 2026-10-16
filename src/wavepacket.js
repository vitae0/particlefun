import { HC, SPECIES } from './catalog.js';
import { energy, norm } from './field-physics.js';

// A *positive-frequency, narrow-momentum* single-particle Gaussian proxy.
// It is NOT a Dirac, gauge or interacting QFT solution.
//
// Momentum RMS width for a Gaussian sigma-position packet is ~ hbar/(2 sigma).
// Quadratic expansion of E(p) around its central momentum requires
// delta_p << E. We enforce delta_p/E <= 0.1 for this approximation.
// In particular a 2.1-fm 'electron wavefunction' at rest is outside this regime.
export const RELATIVE_MOMENTUM_WIDTH_MAX = .10;
export function safePacketWidth(p, requestedSigma) {
  const E = energy(p);
  if (!(E > 0) || !(requestedSigma > 0)) throw Error('Invalid packet energy or width');
  const minSigma = HC / (2 * E * RELATIVE_MOMENTUM_WIDTH_MAX);
  return {
    sigma0: Math.max(requestedSigma, minSigma),
    minSigma,
    substituted: requestedSigma < minSigma
  };
}
export function packetGeometry(p, requestedSigma, dt) {
  const E = energy(p),m=SPECIES[p.type].mass;
  const {sigma0,minSigma,substituted} = safePacketWidth(p, requestedSigma);
  const elapsed=Math.max(0,dt);
  const longitudinal = HC * elapsed * m*m / (2*sigma0*sigma0*E*E*E);
  const transverse = HC * elapsed / (2*sigma0*sigma0*E);
  const sigmaL=sigma0*Math.hypot(1,longitudinal);
  const sigmaT=sigma0*Math.hypot(1,transverse);
  // A normalized 3D Gaussian's PEAK probability scales as 1/(σL σT²).
  const peakProbabilityRatio=Math.min(1,sigma0**3/(sigmaL*sigmaT*sigmaT));
  return {sigma0,minSigma,substituted,sigmaL,sigmaT,longitudinal,
    transverse,peakProbabilityRatio};
}
export function packetAt(p, requestedSigma, dt, x,y,z=0){
  const g=packetGeometry(p,requestedSigma,dt);
  const px=p.px,py=p.py,pz=p.pz||0;
  const P=norm(p),ux=P?px/P:1,uy=P?py/P:0,uz=P?pz/P:0;
  const dx=x-p.x,dy=y-p.y,dz=z-(p.z||0);
  const along=dx*ux+dy*uy+dz*uz;
  const across2=Math.max(0,dx*dx+dy*dy+dz*dz-along*along);
  const exponent=along*along/(g.sigmaL*g.sigmaL)+
    across2/(g.sigmaT*g.sigmaT);
  // Relative brightness is bounded in [0,1]. Absolute 3D spatial
  // probability density integrates to one and has units fm^-3.
  const probability=Math.min(1,g.peakProbabilityRatio*Math.exp(-.5*exponent));
  const densityFm3=Math.exp(-.5*exponent)/
    (Math.pow(2*Math.PI,1.5)*g.sigmaL*g.sigmaT*g.sigmaT);
  const chirp=(.25/g.sigma0**2)*(
    g.longitudinal/(1+g.longitudinal**2)*along*along+
    g.transverse/(1+g.transverse**2)*across2);
  // Gouy/normalization phase for one longitudinal and two transverse axes.
  const phase=(px*dx+py*dy+pz*dz)/HC+chirp-
    .5*(Math.atan(g.longitudinal)+2*Math.atan(g.transverse))+(p.phase||0);
  return {probability, densityFm3, realAmplitude:Math.sqrt(probability)*Math.cos(phase),
    phase, geometry:g};
}
