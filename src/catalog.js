// Reference: PDG Review of Particle Physics 2025 (approximate masses).
// Masses are rest energies in MeV, lifetime in natural time fm/c, if known.
// Quark masses are scheme/scale dependent; neutrino mass eigenstates not represented.
export const HC = 197.3269804; // hbar*c in MeV fm
export const C = 299792458;
export const LIGHT_FM_PER_C = 1; // natural time unit
export const palette = {
  lepton: 196, neutrino: 161, quark: 31, gauge: 266,
  scalar: 53, hadron: 13
};
const catalog = {};
function item(id, name, family, mass, charge, opts={}) {
  catalog[id] = { id, name, family, mass, charge, anti: false, spin: .5,
    confined: false, lifetime: null, colorHue: palette[family], ...opts };
}
function pair(id, antiId, name, antiName, family, mass, charge, opts={}) {
  item(id,name,family,mass,charge,{ ...opts, antiId });
  item(antiId,antiName,family,mass,-charge,{ ...opts, anti: true, antiId:id,
    colorHue: (palette[family]+180)%360 });
}
// Charged leptons and antiparticles, total 6.
pair('e','ae','e⁻','e⁺','lepton',.51099895,-1,{ lifetime:null });
pair('mu','amu','μ⁻','μ⁺','lepton',105.6583755,-1,{ lifetime: 2.1969811e-6*C*1e15 });
pair('tau','atau','τ⁻','τ⁺','lepton',1776.86,-1,{ lifetime: 2.903e-13*C*1e15 });
// Flavor neutrinos are ultrarelativistic approximate flavor states; no measured flavor mass.
for (const [id,name] of [['ve','νe'],['vm','νμ'],['vt','ντ']]) {
  pair(id,'a'+id,name,'anti-'+name,'neutrino',0,0,{ massModel:'ultrarelativistic, not mass eigenstate' });
}
// 6 quark flavors, 6 antiquarks. All confined: never offered as isolated asymptotic states.
for (const [id,name,m,q] of [
 ['u','u',2.16,2/3],['d','d',4.67,-1/3],['s','s',93.4,-1/3],
 ['c','c',1273,2/3],['b','b',4183,-1/3],['t','t',172570,2/3]
]) pair(id,'a'+id,name,'anti-'+name,'quark',m,q,{confined:true,spin:.5,
  massModel:'quark mass: scheme/scale dependent'});
// Gauge bosons: eight SU(3) color-adjoint states, not eight independent observable gluons.
item('photon','γ · photon','gauge',0,0,{spin:1,selfConjugate:true});
for(let i=1;i<=8;i++) item('g'+i,'g'+i+' · gluon','gauge',0,0,
  { spin:1,confined:true, colorHue:33, colorIndex:i, selfConjugate:true });
item('Wp','W⁺','gauge',80369.2,1,{spin:1,lifetime: .095});
item('Wm','W⁻','gauge',80369.2,-1,{spin:1,lifetime: .095,
  anti:true,antiId:'Wp',colorHue:86});
catalog.Wp.antiId='Wm';
item('Z','Z⁰','gauge',91188,0,{spin:1,selfConjugate:true,lifetime:.079});
item('H','H⁰ · Higgs','scalar',125200,0,{spin:0,selfConjugate:true,lifetime:.048});
// Compound hadrons: effective particles, NOT nonperturbative QCD solutions.
pair('p','ap','proton','antiproton','hadron',938.27208816,1,{spin:.5});
pair('n','an','neutron','antineutron','hadron',939.56542052,0,
  {spin:.5,lifetime:879.4*C*1e15});
item('pi0','π⁰','hadron',134.9768,0,{spin:0,lifetime:8.43e-17*C*1e15,selfConjugate:true});
pair('pip','pim','π⁺','π⁻','hadron',139.57039,1,{spin:0,lifetime:2.6033e-8*C*1e15});
pair('Kp','Km','K⁺','K⁻','hadron',493.677,1,{spin:0,lifetime:1.238e-8*C*1e15});
// Species-specific hues; charge conjugation is EXACTLY a 180° rotation.
for(const [id,hue] of [
 ['e',200],['mu',223],['tau',247],
 ['ve',150],['vm',168],['vt',186],
 ['u',22],['d',43],['s',64],['c',83],['b',103],['t',122],
 ['p',17],['n',46],['pip',76],['Kp',100]
]){
  const x=catalog[id];if(!x)continue;
  x.colorHue=hue;
  if(x.antiId && catalog[x.antiId])catalog[x.antiId].colorHue=(hue+180)%360;
}
catalog.photon.colorHue=274;
catalog.Z.colorHue=299;
catalog.H.colorHue=54;
// Effective experimental composite objects. These are not elementary SM particles.
item('alpha','α²⁺ · helium nucleus','hadron',3727.379378,2,
  {spin:0,composite:true,colorHue:17});
item('gold','Au⁷⁹⁺ · gold nucleus','hadron',183473,79,
  {spin:1.5,composite:true,colorHue:47});
item('silver','Ag · silver atom','hadron',100.905*931.49410372,0,
  {spin:.5,composite:true,colorHue:110});
item('mercury','Hg · mercury atom','hadron',200.59*931.49410372,0,
  {spin:0,composite:true,colorHue:165});
export const SPECIES = Object.freeze(catalog);
export const GROUPS = Object.freeze([
 ['lepton','Yüklü leptonlar'],['neutrino','Nötrinolar'],
 ['quark','Kuarklar (hapsolmuş)'],['gauge','Ayar bozonları'],
 ['scalar','Higgs alanı'],['hadron','Bileşik hadronlar']
]);
export const IDS = Object.keys(SPECIES);
export const conserved = ids => ids.reduce((s,id)=>{
  const x = SPECIES[id];
  s.charge += x.charge;
  if(['p','n'].includes(id)) s.baryon++;
  if(['ap','an'].includes(id)) s.baryon--;
  for (const [l,nu,al,anu] of [['e','ve','ae','ave'],['mu','vm','amu','avm'],['tau','vt','atau','avt']]) {
    if (id === l || id === nu) s[l]++;
    if (id === al || id === anu) s[l]--;
  }
  return s;
}, {charge:0,baryon:0,e:0,mu:0,tau:0});
export function antiparticleOf(id) { return SPECIES[id]?.antiId || (SPECIES[id]?.selfConjugate ? id : null); }
