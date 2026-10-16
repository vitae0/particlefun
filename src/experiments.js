// Independent analytic quantum-device and historical-experiment models.
// These are NOT dynamics of the Standard Model packet layer.
const PI=Math.PI;
const sinc=x=>Math.abs(x)<1e-10?1:Math.sin(x)/x;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export const ADVANCED=Object.freeze([
 {id:'young',group:'Tarihsel',name:'Young çift yarık',year:'1801',param:'Yarık uzaklığı · nm',min:.3,max:2,step:.05,value:.9,unit:'nm',detail:'Fraunhofer çift yarık: I(θ) ∝ sinc²(π a sinθ/λ) cos²(π d sinθ/λ). Tek parçacık olayları Born dağılımından örneklenir.'},
 {id:'photoelectric',group:'Tarihsel',name:'Fotoelektrik etki',year:'1905',param:'Frekans · 10¹⁵ Hz',min:.1,max:2,step:.05,value:.7,unit:'PHz',detail:'Einstein eşitliği Kₘₐₓ=max(0,hν−φ), φ=2.3 eV. Yoğunluk elektron başına foton enerjisini değiştirmez.'},
 {id:'stern',group:'Tarihsel',name:'Stern–Gerlach',year:'1922',param:'Analiz açısı · °',min:0,max:180,step:5,value:60,unit:'°',detail:'Spin-1/2, |↑z⟩ girişine göre P(↑θ)=cos²(θ/2). Tekil ölçüm iki çıkıştan birine düşer.'},
 {id:'davisson',group:'Tarihsel',name:'Davisson–Germer',year:'1927',param:'Elektron enerjisi · eV',min:20,max:300,step:5,value:54,unit:'eV',detail:'de Broglie λ=h/p; Bragg 2d sinθ=λ, sabit d=0.091 nm. Tek kristal/geliş açısı ayrıntıları bu basit düzlem modelinde yoktur.'},
 {id:'rutherford',group:'Tarihsel',name:'Rutherford saçılması',year:'1911',param:'En küçük açı · °',min:5,max:50,step:1,value:12,unit:'°',detail:'İnce hedef ve klasik noktasal Coulomb yaklaşımı: dσ/dΩ ∝ sin⁻⁴(θ/2). Enerji kaybı ve çekirdek form faktörü yoktur.'},
 {id:'mach',group:'Girişim',name:'Mach–Zehnder',year:'1892',param:'Faz farkı · rad',min:0,max:6.283,step:.05,value:1.57,unit:'rad',detail:'İdeal tek-foton interferometresi: P(D0)=cos²(φ/2), P(D1)=sin²(φ/2).'},
 {id:'michelson',group:'Girişim',name:'Michelson interferometresi',year:'1881',param:'Kol farkı · nm',min:0,max:1200,step:20,value:275,unit:'nm',detail:'Monokromatik 550 nm ışık: ideal görünürlükte girişim I ∝ cos²(2πΔL/λ).'},
 {id:'bell',group:'Kuantum temelleri',name:'Bell–CHSH singlet',year:'1964',param:'Görünürlük V',min:0,max:1,step:.02,value:1,unit:'',detail:'Singlet E(a,b)=−V cos(a−b), ideal CHSH |S|=2√2 V. Bell yerel sınır |S|≤2.'},
 {id:'tunnel',group:'Kuantum aygıtları',name:'Kuantum tünelleme',year:'1928',param:'Bariyer genişliği · nm',min:.05,max:1.8,step:.05,value:.5,unit:'nm',detail:'1 eV elektron, 2 eV dikdörtgen bariyer, 1B durağan Schrödinger denkleminin tam T katsayısı.'},
 {id:'squid',group:'Kuantum aygıtları',name:'DC SQUID',year:'1964',param:'Akı · Φ/Φ₀',min:0,max:2,step:.025,value:.5,unit:'Φ₀',detail:'Simetrik, düşük özindüktanslı DC SQUID: I_c(Φ)=2I₀ |cos(πΦ/Φ₀)|. Termal gürültü ve asimetri yok.'},
 {id:'josephson',group:'Kuantum aygıtları',name:'AC Josephson',year:'1962',param:'Gerilim · μV',min:0,max:100,step:2,value:20,unit:'μV',detail:'Josephson ilişkisi f=2eV/h, 1 μV ↔ 483.59785 MHz. İdeal, kilitlenmesiz bağlantı.'},
 {id:'rabi',group:'Kuantum aygıtları',name:'Rabi osilasyonu',year:'1937',param:'Detuning · MHz',min:0,max:20,step:.5,value:2,unit:'MHz',detail:'İdeal sürülen iki seviyeli sistem: P_e(t)=Ω²/(Ω²+Δ²) sin²(√(Ω²+Δ²)t/2). Ω/(2π)=5 MHz, bozunma yok.'},
 {id:'ramsey',group:'Kuantum aygıtları',name:'Ramsey interferometrisi',year:'1949',param:'Detuning · kHz',min:-200,max:200,step:10,value:50,unit:'kHz',detail:'İdeal iki π/2 darbesi, 10 μs bekleme: P_e=(1+cos(2π δT))/2. Dekohorans yok.'},
 {id:'hom',group:'Kuantum optiği',name:'Hong–Ou–Mandel',year:'1987',param:'Gecikme · ps',min:-4,max:4,step:.1,value:.3,unit:'ps',detail:'İki özdeş tek-foton Gauss modu için normalleştirilmiş çakışma P_c=½[1−exp(−δt²/(2τ²))], τ=1 ps.'},
 {id:'bb84',group:'Kuantum bilgi',name:'BB84 anahtar dağıtımı',year:'1984',param:'Intercept oranı',min:0,max:1,step:.05,value:.5,unit:'',detail:'İdeal BB84 intercept-resend saldırısının sift edilmiş bit hata oranı QBER=¼ f. Bu tek başına güvenli anahtar hızı değildir.'},
 {id:'quantumHall',group:'Kuantum aygıtları',name:'Kuantum Hall iletkenliği',year:'1980',param:'Dolum ν',min:1,max:8,step:1,value:2,unit:'ν',detail:'İdeal tam sayı kuantum Hall: G_xy=ν e²/h; h/e²=25 812.80745 Ω.'},
 {id:'zeeman',group:'Spektroskopi',name:'Zeeman yarılması',year:'1896',param:'Manyetik alan · T',min:0,max:15,step:.25,value:5,unit:'T',detail:'Spin manyetik moment ölçeği ΔE≈μ_B B, μ_B=5.7883818×10⁻⁵ eV/T. Gerçek atom Landé g-faktörüne bağlıdır.'},
 {id:'ab',group:'Kuantum temelleri',name:'Aharonov–Bohm',year:'1959',param:'Akı · Φ/(h/e)',min:0,max:2,step:.025,value:.5,unit:'h/e',detail:'Vektör potansiyel çevrim fazı Δφ=qΦ/ħ, ideal elektron kolu için 2πΦ/(h/e).'}
]);
const sqrt=Math.sqrt;
export function evaluate(id,param){
 const p=Number(param),x=clamp(p,0,Infinity);
 const λ=.112; // nm e- with ~120 eV in ideal Young setup.
 let value=0,unit='%',description='',probability=null;
 let domain=[0,1],sampleCurve=z=>0;
 switch(id){
 case 'young': {
   domain=[-0.32,0.32];const width=.13,d=Math.max(.3,p);
   sampleCurve=z=>{const a=PI*width*Math.sin(z)/λ, b=PI*d*Math.sin(z)/λ;
     return Math.pow(sinc(a)*Math.cos(b),2);};
   value=sampleCurve(0);unit='I/I₀';description='Dalga boyu λ ≈ '+λ+' nm; merkez maksimumu = 1.';break;
 }
 case 'photoelectric': {
   const work=2.3,energyEV=4.135667696*p;
   value=Math.max(0,energyEV-work);unit='eV';
   domain=[0,2];sampleCurve=z=>Math.max(0,4.135667696*z-work)/7;
   description='hν = '+energyEV.toFixed(3)+' eV; '+(energyEV>work?'elektron çıkar':'eşik altında, fotoelektron yok');break;
 }
 case 'stern': {
   value=Math.cos(p*PI/360)**2;unit='P(↑)';
   domain=[0,180];sampleCurve=z=>Math.cos(z*PI/360)**2;
   probability=value;description='P(↑) = '+(100*value).toFixed(2)+'%; P(↓) = '+(100*(1-value)).toFixed(2)+'%';break;
 }
 case 'davisson': {
   const lambda=1.22639/Math.sqrt(p*(1+p/1022000)),ratio=lambda/(2*.091);
   value=lambda;unit='nm';domain=[20,300];sampleCurve=z=>1.22639/Math.sqrt(z*(1+z/1022000))/.28;
   description='λ = '+lambda.toFixed(4)+' nm; '+(ratio<=1?'Bragg θ ≈ '+(Math.asin(ratio)*180/PI).toFixed(1)+'°':'bu düzlem için Bragg açısı yok');break;
 }
 case 'rutherford': {
   domain=[5,170];
   sampleCurve=z=>Math.min(1,Math.pow(Math.sin(p*PI/360)/Math.sin(z*PI/360),4));
   value=1;unit='bağıl';description='θ_min = '+p+'° kesme açısıyla normalize edildi. İleri saçılma tekilliği çıkarıldı.';break;
 }
 case 'mach': {
   value=Math.cos(p/2)**2;unit='P(D0)';
   domain=[0,2*PI];sampleCurve=z=>Math.cos(z/2)**2;probability=value;
   description='D0: '+(100*value).toFixed(1)+'% / D1: '+(100*(1-value)).toFixed(1)+'%';break;
 }
 case 'michelson': {
   value=Math.cos(2*PI*p/550)**2;unit='I/I₀';domain=[0,1200];
   sampleCurve=z=>Math.cos(2*PI*z/550)**2;
   description='λ = 550 nm, ideal fringe contrast';break;
 }
 case 'bell': {
   value=2*Math.SQRT2*p;unit='|S|';
   domain=[0,1];sampleCurve=z=>2*Math.SQRT2*z/3;
   description='|S| = '+value.toFixed(3)+(value>2?' > 2 (yerel sınır aşımı)':' ≤ 2');break;
 }
 case 'tunnel': {
   domain=[.05,1.8];const barrier=z=>{
     const κ=Math.sqrt(1/.0380998212),s=Math.sinh(κ*z);
     return 1/(1+4*s*s/4);
   };
   value=barrier(p);unit='T';probability=value;sampleCurve=barrier;
   description='E=1 eV, U=2 eV; tünelleme olasılığı '+(value*100).toFixed(2)+'%';break;
 }
 case 'squid':{
   value=Math.abs(Math.cos(PI*p));unit='I_c/(2I₀)';
   domain=[0,2];sampleCurve=z=>Math.abs(Math.cos(PI*z));break;
 }
 case 'josephson':{
   value=483.5978484*p;unit='MHz';
   domain=[0,100];sampleCurve=z=>z/100;
   description='Josephson salınım frekansı '+value.toFixed(2)+' MHz';break;
 }
 case 'rabi':{
   const Ω=5,Δ=p,Ωr=Math.hypot(Ω,Δ);
   domain=[0,1];sampleCurve=z=>(Ω*Ω/(Ωr*Ωr))*Math.sin(PI*Ωr*z)**2;
   value=sampleCurve(.1);unit='P_e(0.1 μs)';
   probability=value;description='Ω_eff/(2π)='+Ωr.toFixed(2)+' MHz';break;
 }
 case 'ramsey':{
   value=(1+Math.cos(2*PI*p*.01))/2;unit='P_e';
   domain=[-200,200];sampleCurve=z=>(1+Math.cos(2*PI*z*.01))/2;
   probability=value;description='T = 10 μs; '+(100*value).toFixed(1)+'% uyarılmış durum';break;
 }
 case 'hom':{
   value=.5*(1-Math.exp(-p*p/2));unit='P_coinc';
   domain=[-4,4];sampleCurve=z=>.5*(1-Math.exp(-z*z/2))*2;
   probability=value;description='τ = 1 ps; çakışma = '+(100*value).toFixed(2)+'%';break;
 }
 case 'bb84':{
   value=p/4;unit='QBER';domain=[0,1];sampleCurve=z=>z;
   description='İdeal intercept-resend: QBER '+(100*value).toFixed(2)+'%';break;
 }
 case 'quantumHall':{
   value=p/25812.80745*1e6;unit='μS';
   domain=[1,8];sampleCurve=z=>z/8;
   description='Hall direnci R_xy = '+(25812.80745/p).toFixed(2)+' Ω';break;
 }
 case 'zeeman':{
   value=5.7883818e-5*p;unit='eV';
   domain=[0,15];sampleCurve=z=>z/15;
   description='ΔE ≈ '+value.toExponential(4)+' eV (μ_B B ölçeği)';break;
 }
 case 'ab':{
   value=2*PI*p;unit='rad';domain=[0,2];
   sampleCurve=z=>(1+Math.cos(2*PI*z))/2;
   description='Faz Δφ = '+value.toFixed(3)+' rad; ideal iki yol girişimi.';break;
 }
 default:throw Error('Bilinmeyen gelişmiş düzenek: '+id);
 }
 return {value,unit,description,probability,domain,sampleCurve};
}
export function sampleAdvanced(id,p,rng=Math.random){
 const v=evaluate(id,p);
 if(id==='bell'){
   const a=0,b=PI/4,c=-PI/4;
   const A=rng()<.5?1:-1;const B=rng()<((1-A*Math.cos(a-b))/2)?1:-1;
   return 'Singlet örneklemi (a=0°, b=45°): A='+A+', B='+B+'; E=-cos(45°).';
 }
 if(id==='young'){
   let max=1;for(let k=0;k<1500;k++){
     const θ=-.32+.64*rng();
     if(rng()*max<v.sampleCurve(θ))return 'Tek dedektör olayı: θ='+ (θ*180/PI).toFixed(2)+'°';
   }
   return 'Dedektör olayı elde edilemedi (örneklem sınırı).';
 }
 if(v.probability!==null)return 'Tekil Born örneklemi: '+(rng()<v.probability?'1 / üst / D0':'0 / alt / D1');
 return 'Analitik model güncellendi: '+v.value.toPrecision(5)+' '+v.unit;
}
