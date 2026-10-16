import { HC, SPECIES } from './catalog.js';
import { energy, norm } from './field-physics.js';
import { evaluate, ADVANCED } from './experiments.js';

const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
export class FieldRenderer {
 constructor(canvas,lab){
  this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});
  this.layer=document.createElement('canvas');this.layerCtx=this.layer.getContext('2d');
  this.lab=lab;this.advanced=null;this.advancedValue=0;this.observations=[];
  this.precision='balanced';this.colorScale='log';this.width=0;this.height=0;this.dpr=1;
  this.selected=null;this.lastDraw=0;
 }
 setExperiment(id,value){this.advanced=id;this.advancedValue=value;this.lastDraw=0}
 resize(){
  const b=this.canvas.getBoundingClientRect(),w=Math.max(80,Math.round(b.width)),h=Math.max(70,Math.round(b.height));
  const dpr=Math.min(2,window.devicePixelRatio||1);
  if(this.width===w&&this.height===h&&this.dpr===dpr&&this.lastQuality===this.precision)return;
  this.width=w;this.height=h;this.dpr=dpr;this.lastQuality=this.precision;
  this.canvas.width=Math.round(w*dpr);this.canvas.height=Math.round(h*dpr);
  this.ctx.setTransform(dpr,0,0,dpr,0,0);
  const cells={fast:108,balanced:185,precise:320}[this.precision]||185;
  const scale=Math.min(1,cells/w);
  this.layer.width=Math.max(50,Math.round(w*scale));this.layer.height=Math.max(36,Math.round(h*scale));
 }
 hsv(h){
  h=(h%360+360)%360;const c=.85;const x=(1-Math.abs((h/60)%2-1))*c;
  const rgb=h<60?[c,x,0]:h<120?[x,c,0]:h<180?[0,c,x]:h<240?[0,x,c]:h<300?[x,0,c]:[c,0,x];
  return rgb.map(z=>Math.round((z+.11)*255));
 }
 compress(v){
  const a=clamp(Math.abs(v),0,1);
  const scaled=this.colorScale==='linear'?a:this.colorScale==='exp'?a*a:Math.log1p(16*a)/Math.log(17);
  return scaled;
 }
 components(){
  const components=[];
  for(const p of this.lab.fields){
   const s=SPECIES[p.type],hasValence=['p','n','ap','an'].includes(p.type);
   if(hasValence){
    const anti=p.type.startsWith('a');
    const quarks=p.type.endsWith('p')?(anti?['au','au','ad']:['u','u','d']):
                   (anti?['au','ad','ad']:['u','d','d']);
    // Illustration of valence SU(3) content and a nonperturbative gluon cloud.
    // NOT resolved QCD nucleon wavefunction or orbital trajectories.
    const offsets=[[.65,0],[-.33,.57],[-.33,-.57]];
    quarks.forEach((type,j)=>components.push({kind:'valence',type,x:p.x+offsets[j][0],y:p.y+offsets[j][1],
       sigma:.92,parent:p,source:false,brightness:1}));
    components.push({kind:'gluonsea',type:'g1',x:p.x,y:p.y,sigma:2.05,parent:p,source:true,brightness:.58});
   }else components.push({kind:'free',type:p.type,x:p.x,y:p.y,parent:p,
     sigma:this.lab.packetSigma,source:false,brightness:1});
  }
  for(const f of this.lab.sources)components.push({kind:'source',type:f.type,
     x:f.x,y:f.y,sigma:1.7,source:true,brightness:1});
  return components;
 }
 draw(ts=0){
  const fps={fast:20,balanced:28,precise:36}[this.precision]||28;
  if(ts&&ts-this.lastDraw<1000/fps)return;
  this.lastDraw=ts;
  this.resize();
  if(this.advanced){this.drawAdvanced();return;}
  const ctx=this.ctx,w=this.width,h=this.height;
  ctx.fillStyle='#080b12';ctx.fillRect(0,0,w,h);
  const grd=ctx.createRadialGradient(w*.52,h*.43,0,w*.52,h*.43,w*.65);
  grd.addColorStop(0,'#111a2a');grd.addColorStop(1,'#080b12');ctx.fillStyle=grd;ctx.fillRect(0,0,w,h);
  const W=this.layer.width,H=this.layer.height,view=this.lab.widthFm,viewY=view*h/w;
  const img=this.layerCtx.createImageData(W,H),px=img.data;
  for(let i=0;i<px.length;i+=4){px[i]=5;px[i+1]=8;px[i+2]=13;px[i+3]=255}
  for(const o of this.components()){
   const s=SPECIES[o.type],E=o.parent?energy(o.parent):0,p=o.parent;
   const age=p?Math.max(0,this.lab.clock-p.birth):0;
   const s0=o.sigma;
   const gradLong=E>0?s.mass*s.mass/(E*E*E):0;
   const gradTrans=E>0?1/E:0;
   const l=HC*age*gradLong/(2*s0*s0),t=HC*age*gradTrans/(2*s0*s0);
   const sl=clamp(s0*Math.hypot(1,l),s0,1e100),st=clamp(s0*Math.hypot(1,t),s0,1e100);
   const radius=Math.min(view*1.2,3.9*Math.max(sl,st));
   const xmin=Math.max(0,Math.floor((o.x-radius+view/2)/view*W));
   const xmax=Math.min(W-1,Math.ceil((o.x+radius+view/2)/view*W));
   const ymin=Math.max(0,Math.floor((viewY/2-o.y-radius)/viewY*H));
   const ymax=Math.min(H-1,Math.ceil((viewY/2-o.y+radius)/viewY*H));
   if(xmax<xmin||ymax<ymin)continue;
   const pc=p?norm(p):0;
   const u=pc>0?p.px/pc:1,v=pc>0?p.py/pc:0;
   const λ=pc>0?2*Math.PI*HC/pc:Infinity;
   const resolved=λ>=2.3*view/W;
   const posColor=this.hsv(s.colorHue),negColor=this.hsv((s.colorHue+33)%360);
   const faded=(this.selected!==null&&o.parent&&o.parent.id!==this.selected)?.38:1;
   for(let j=ymin;j<=ymax;j++){
    const y=(.5-(j+.5)/H)*viewY,dy=y-o.y;
    for(let i=xmin;i<=xmax;i++){
     const x=((i+.5)/W-.5)*view,dx=x-o.x;
     const dl=dx*u+dy*v,dt=-dx*v+dy*u;
     const rr=dl*dl/(sl*sl)+dt*dt/(st*st);
     if(rr>55)continue;
     let ampl=Math.exp(-rr/4);
     let signed=1;
     if(o.kind==='free'&&resolved&&p){
      const wave=this.lab.fieldValue(p,x,y);
      signed=wave<0?-1:1;ampl=Math.min(1,Math.abs(wave));
     }else if(o.kind==='valence'||o.kind==='source'||o.kind==='gluonsea'){
       signed=Math.cos((dl+dt*.4)/Math.max(.7,s0))<0?-1:1;
     }
     const strength=this.compress(ampl)*.48*o.brightness*faded;
     if(strength<.002)continue;
     const rgb=signed<0?negColor:posColor;
     const z=(j*W+i)*4;
     px[z]=Math.min(255,px[z]+rgb[0]*strength);
     px[z+1]=Math.min(255,px[z+1]+rgb[1]*strength);
     px[z+2]=Math.min(255,px[z+2]+rgb[2]*strength);
    }
   }
  }
  this.layerCtx.putImageData(img,0,0);
  ctx.imageSmoothingEnabled=true;
  ctx.globalCompositeOperation='screen';ctx.drawImage(this.layer,0,0,w,h);ctx.globalCompositeOperation='source-over';
  const unit=view>=1e15?(view/1e15).toPrecision(2)+' m':view>=1e6?(view/1e6).toPrecision(2)+' nm':view.toPrecision(2)+' fm';
  this.caption('görünüm genişliği '+unit,15,h-17);
  if(this.lab.fields.some(p=>['p','n','ap','an'].includes(p.type)))this.caption('u/d valans + gluon denizi: QCD şeması',15,30);
 }
 caption(str,x,y){const c=this.ctx;c.font='12px ui-monospace,monospace';c.fillStyle='#8397ac';c.fillText(str,x,y)}
 drawAdvanced(){
  const ctx=this.ctx,w=this.width,h=this.height;
  ctx.fillStyle='#0b1019';ctx.fillRect(0,0,w,h);
  const exp=ADVANCED.find(x=>x.id===this.advanced);
  if(!exp)return;
  const e=evaluate(exp.id,this.advancedValue);
  const padX=Math.max(30,w*.08),left=padX,right=w-padX;
  const top=Math.max(65,h*.22),bottom=h-Math.max(54,h*.18),plotH=Math.max(1,bottom-top);
  const sample=(i)=>{const x=e.domain[0]+(e.domain[1]-e.domain[0])*i/256;
    return {x:left+(right-left)*i/256,y:bottom-clamp(e.sampleCurve(x),0,1)*plotH}};
  ctx.strokeStyle='#203349';ctx.lineWidth=1;
  for(let k=0;k<=4;k++){
    const y=top+k*plotH/4;ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(right,y);ctx.stroke();
  }
  ctx.strokeStyle='#86c4e8';ctx.lineWidth=2.5;ctx.beginPath();
  for(let i=0;i<=256;i++){const v=sample(i);if(i===0)ctx.moveTo(v.x,v.y);else ctx.lineTo(v.x,v.y)}
  ctx.stroke();
  const fraction=clamp((this.advancedValue-e.domain[0])/(e.domain[1]-e.domain[0]),0,1);
  const spot=sample(Math.round(fraction*256));
  ctx.setLineDash([3,6]);ctx.strokeStyle='#ddba81';ctx.beginPath();ctx.moveTo(spot.x,top);ctx.lineTo(spot.x,bottom);ctx.stroke();
  ctx.setLineDash([]);ctx.fillStyle='#e3c48c';ctx.beginPath();ctx.arc(spot.x,spot.y,5,0,2*Math.PI);ctx.fill();
  ctx.font='600 15px system-ui';ctx.fillStyle='#d5e8f4';ctx.fillText(exp.name+' · '+exp.year, left, 37);
  ctx.font='12px system-ui';ctx.fillStyle='#aec0d2';
  ctx.fillText(exp.param+' = '+this.advancedValue+' '+exp.unit, left, 56);
  ctx.font='700 18px system-ui';ctx.fillStyle='#e9f3fc';
  ctx.fillText('Sonuç: '+Number(e.value).toPrecision(5)+' '+e.unit,left,h-27);
  ctx.font='11px ui-monospace,monospace';ctx.fillStyle='#7891a8';
  ctx.fillText(String(e.domain[0]),left,bottom+17);ctx.fillText(String(e.domain[1]),right-40,bottom+17);
 }
}
