import { SPECIES, HC } from './catalog.js';
import { energy } from './field-physics.js';

// Scientific 2D section of a 3D state. No projection pretends to be an
// observed point position: colored scalar packet envelopes are an approximation.
export class ScientificRenderer {
 constructor(canvas,lab,random=Math.random){
  this.canvas=canvas;this.lab=lab;this.ctx=canvas.getContext('2d',{alpha:false});
  this.layer=document.createElement('canvas');this.layerCtx=this.layer.getContext('2d');
  this.camera={x:0,y:0,z:0,span:105};
  this.quality='medium';this.color='log';this.vectors=true;this.trails=true;
  this.width=1;this.height=1;this.last=0;this.dpr=1;
 }
 resize(){
  const b=this.canvas.getBoundingClientRect(),w=Math.max(150,Math.round(b.width)),h=Math.max(120,Math.round(b.height)),dpr=Math.min(2,window.devicePixelRatio||1);
  const nx={low:110,medium:190,high:320}[this.quality]||190,ny=Math.max(70,Math.round(nx*h/w));
  if(w===this.width&&h===this.height&&dpr===this.dpr&&this.layer.width===nx)return;
  this.width=w;this.height=h;this.dpr=dpr;this.canvas.width=Math.round(w*dpr);this.canvas.height=Math.round(h*dpr);
  this.layer.width=nx;this.layer.height=ny;this.ctx.setTransform(dpr,0,0,dpr,0,0);
 }
 screen(x,y){
  return {x:this.width*(.5+(x-this.camera.x)/this.camera.span),
    y:this.height*.5-(y-this.camera.y)*this.width/this.camera.span};
 }
 world(x,y){
  return {x:this.camera.x+(x/this.width-.5)*this.camera.span,
    y:this.camera.y+(.5-y/this.height)*this.camera.span};
 }
 zoom(factor,atX=this.width/2,atY=this.height/2){
  const before=this.world(atX,atY);
  this.camera.span=Math.min(1e19,Math.max(.05,this.camera.span*factor));
  const after=this.world(atX,atY);
  this.camera.x+=before.x-after.x;this.camera.y+=before.y-after.y;
  this.last=0;
 }
 pan(dx,dy){
  this.camera.x-=dx*this.camera.span/this.width;
  this.camera.y+=dy*this.camera.span/this.width;this.last=0;
 }
 tone(x){
  const a=Math.max(0,Math.min(1,x));
  return this.color==='linear'?a:this.color==='exp'?a*a:Math.log1p(12*a)/Math.log(13);
 }
 hue(h){
  h=((h%360)+360)%360;
  const u=h/60,c=.85,q=(1-Math.abs(u%2-1))*c;
  const rgb=u<1?[c,q,0]:u<2?[q,c,0]:u<3?[0,c,q]:u<4?[0,q,c]:u<5?[q,0,c]:[c,0,q];
  return rgb.map(v=>Math.round((v+.1)*255));
 }
 constituents(){
  const out=[];
  for(const p of this.lab.fields){
   let types=null;
   if(p.type==='p')types=['u','u','d'];
   if(p.type==='n')types=['u','d','d'];
   if(p.type==='ap')types=['au','au','ad'];
   if(p.type==='an')types=['au','ad','ad'];
   if(types){
    const offsets=[[.6,0,0],[-.3,.5,.2],[-.3,-.5,-.2]];
    types.forEach((type,k)=>out.push({type,x:p.x+offsets[k][0],y:p.y+offsets[k][1],z:(p.z||0)+offsets[k][2],sigma:.8,part:p,decor:true}));
    out.push({type:'g1',x:p.x,y:p.y,z:p.z||0,sigma:1.8,part:p,decor:true,level:.4});
   }else out.push({type:p.type,x:p.x,y:p.y,z:p.z||0,sigma:this.lab.packetSigma,part:p});
  }
  for(const s of this.lab.sources)out.push({type:s.type,x:s.x,y:s.y,z:s.z||0,sigma:1.2,decor:true,level:.65});
  return out;
 }
 drawField(){
  const ctx=this.ctx,W=this.layer.width,H=this.layer.height,w=this.width,h=this.height;
  const img=this.layerCtx.createImageData(W,H),px=img.data;
  for(let i=0;i<px.length;i+=4){px[i]=8;px[i+1]=13;px[i+2]=21;px[i+3]=255;}
  const span=this.camera.span,z=this.camera.z;
  for(const o of this.constituents()){
   const s=SPECIES[o.type];if(!s)continue;
   const delta=Math.abs(o.z-z),base=o.sigma;
   const part=o.part;
   const age=part?Math.min(1e12,Math.max(0,this.lab.clock-part.birth)):0;
   const E=part?energy(part):1,m=s.mass;
   const spread=m>0&&E>0?HC*age*m*m/(2*base*base*E**3):0;
   const wid=Math.min(1e20,base*Math.hypot(1,spread));
   const pixStep=span/W;
   const visual=Math.max(wid,pixStep*1.3);
   const bound=Math.min(span*1.4,4*visual);
   const za=Math.exp(-delta*delta/(4*wid*wid));
   if(za<.003)continue;
   const x0=Math.max(0,Math.floor((o.x-bound-this.camera.x)/span*W+W*.5));
   const x1=Math.min(W-1,Math.ceil((o.x+bound-this.camera.x)/span*W+W*.5));
   const y0=Math.max(0,Math.floor((.5+(this.camera.y-o.y-bound)/span*w/h)*H));
   const y1=Math.min(H-1,Math.ceil((.5+(this.camera.y-o.y+bound)/span*w/h)*H));
   if(x1<x0||y1<y0)continue;
   const rgb=this.hue(s.colorHue),inverse=this.hue((s.colorHue+180)%360);
   for(let j=y0;j<=y1;j++){
    const y=this.camera.y+(.5-(j+.5)/H)*span*h/w;
    for(let i=x0;i<=x1;i++){
     const x=this.camera.x+((i+.5)/W-.5)*span;
     const dr2=(x-o.x)**2+(y-o.y)**2;
     const envelope=Math.exp(-dr2/(4*visual*visual))*za;
     if(envelope<.004)continue;
     let phase=1;
     if(part&&!o.decor && wid>pixStep*1.5)phase=this.lab.fieldValue(part,x,y,z);
     else if(o.decor)phase=Math.cos((x-o.x)*.7+(y-o.y)*.55);
     const v=this.tone(envelope)*Math.min(1,Math.abs(phase))*(o.level||1)*.72;
     const rgbNow=phase<0?inverse:rgb;
     const n=(j*W+i)*4;
     px[n]=Math.min(255,px[n]+rgbNow[0]*v);
     px[n+1]=Math.min(255,px[n+1]+rgbNow[1]*v);
     px[n+2]=Math.min(255,px[n+2]+rgbNow[2]*v);
    }
   }
  }
  this.layerCtx.putImageData(img,0,0);
  ctx.globalCompositeOperation='screen';ctx.imageSmoothingEnabled=true;
  ctx.drawImage(this.layer,0,0,w,h);ctx.globalCompositeOperation='source-over';
 }
 drawAxes(){
  const c=this.ctx,span=this.camera.span,unit=span>=1e15?['m',1e15]:span>=1e6?['nm',1e6]:['fm',1];
  const magnitude=10**Math.floor(Math.log10(span/7)),tick=[1,2,5,10].find(v=>v*magnitude>=span/8)*magnitude;
  c.lineWidth=.6;c.strokeStyle='#55677a4b';c.fillStyle='#768c9f';c.font='10px ui-monospace,monospace';
  const left=this.world(0,0).x,right=this.world(this.width,0).x;
  for(let x=Math.ceil(left/tick)*tick;x<=right;x+=tick){
    const p=this.screen(x,0).x;c.beginPath();c.moveTo(p,0);c.lineTo(p,this.height);c.stroke();
    if(p>16&&p<this.width-60)c.fillText((x/unit[1]).toPrecision(3),p+3,this.height-8);
  }
  const bottom=this.world(0,this.height).y,top=this.world(0,0).y;
  for(let y=Math.ceil(bottom/tick)*tick;y<=top;y+=tick){
    const p=this.screen(0,y).y;c.beginPath();c.moveTo(0,p);c.lineTo(this.width,p);c.stroke();
    if(p>13&&p<this.height-22)c.fillText((y/unit[1]).toPrecision(3),4,p-3);
  }
  c.fillStyle='#9bb5c8';c.fillText('x, y ['+unit[0]+'] · z = '+(this.camera.z/unit[1]).toPrecision(3)+' '+unit[0],this.width-236,18);
 }
 drawDevices(){
  const c=this.ctx;
  const d=this.lab.apparatus?.devices||[];
  for(const a of d){
   c.strokeStyle='#d4bb8777';c.lineWidth=1.7;c.setLineDash([]);
   if(a.box){
    const top=this.screen((a.box.x||0)-(a.box.w||0)/2,(a.box.y||0)+(a.box.h||0)/2);
    const bot=this.screen((a.box.x||0)+(a.box.w||0)/2,(a.box.y||0)-(a.box.h||0)/2);
    c.strokeRect(top.x,top.y,bot.x-top.x,bot.y-top.y);
   }
   const X=(a.kind==='slits'?a.slitX:a.x);
   if(X!==undefined){
    const pos=this.screen(X,0).x;
    if(pos<0||pos>this.width)continue;
    if(a.kind==='slits'){
      const sep=a.separation||100,ap=a.aperture||40;
      c.setLineDash([]);c.beginPath();
      const screenH=this.camera.span*this.height/this.width/2;
      const intervals=[[-screenH,-sep/2-ap/2],[-sep/2+ap/2,sep/2-ap/2],[sep/2+ap/2,screenH]];
      intervals.forEach(([lo,hi])=>{
       if(hi<=lo)return;const y1=this.screen(X,lo).y,y2=this.screen(X,hi).y;c.moveTo(pos,y1);c.lineTo(pos,y2);
      });c.stroke();
     }else{
      c.setLineDash([5,5]);c.beginPath();c.moveTo(pos,0);c.lineTo(pos,this.height);c.stroke();
      c.setLineDash([]);
     }
   }
   if(a.kind==='slits'){
    // Born far-field fringe density drawn in the same XY instrument plane.
    const target=this.screen(a.x,0).x;if(target>=0&&target<=this.width){
      const ph=this.lab.fields.find(p=>p.type==='photon');
      if(ph){
        const lambda=2*Math.PI*HC/energy(ph),D=a.distance||1;
        const sep=a.separation||1,width=a.aperture||1;
        c.fillStyle='#95c6e9';
        for(let y=0;y<this.height;y+=3){
          const yy=this.world(0,y).y,theta=Math.atan2(yy,D),u=Math.PI*width*Math.sin(theta)/lambda,v=Math.PI*sep*Math.sin(theta)/lambda;
          const sinc=Math.abs(u)<1e-9?1:Math.sin(u)/u;
          const I=(sinc*Math.cos(v))**2;
          c.globalAlpha=Math.max(.08,I*.95);c.fillRect(target-3,y,6,3);
        }
        c.globalAlpha=1;
      }
    }
   }
   c.fillStyle='#9eafbc';c.font='10px ui-monospace,monospace';
   const labelX=a.box?this.screen((a.box.x||0)-(a.box.w||0)/2,(a.box.y||0)+(a.box.h||0)/2).x+4:
     this.screen(X||0,0).x+4;
   if(labelX>=0&&labelX<this.width-140)c.fillText(a.name||a.kind,labelX,48+(a.id%3)*12);
  }
 }
 drawVectors(){
  if(!this.vectors)return;
  const F=this.lab.transport?.forces();if(!F)return;
  const c=this.ctx;
  for(let i=0;i<this.lab.fields.length;i++){
   const p=this.lab.fields[i],f=F[i];
   const mag=Math.hypot(...f);
   if(!mag||Math.abs((p.z||0)-this.camera.z)>Math.max(this.lab.packetSigma*4,this.camera.span/200))continue;
   const pos=this.screen(p.x,p.y),dx=f[0]/mag,dy=-f[1]/mag;
   if(pos.x<-25||pos.x>this.width+25||pos.y<-25||pos.y>this.height+25)continue;
   const len=13;
   c.strokeStyle='#f5d199aa';c.lineWidth=1.4;c.beginPath();
   c.moveTo(pos.x,pos.y);c.lineTo(pos.x+len*dx,pos.y+len*dy);
   c.lineTo(pos.x+len*dx-5*dx+3*dy,pos.y+len*dy-5*dy-3*dx);
   c.moveTo(pos.x+len*dx,pos.y+len*dy);
   c.lineTo(pos.x+len*dx-5*dx-3*dy,pos.y+len*dy-5*dy+3*dx);c.stroke();
  }
 }
 drawTracks(){
  if(!this.trails)return;
  const c=this.ctx;
  for(const p of this.lab.fields){
   if(!Array.isArray(p.trail)||p.trail.length<2)continue;
   c.strokeStyle='hsla('+SPECIES[p.type].colorHue+',74%,69%,.48)';
   c.lineWidth=1;c.beginPath();let started=false;
   for(const v of p.trail){
    if(Math.abs((v.z||0)-this.camera.z)>Math.max(this.camera.span*.07,this.lab.packetSigma*4)){started=false;continue;}
    const pos=this.screen(v.x,v.y);
    if(!started){c.moveTo(pos.x,pos.y);started=true;}else c.lineTo(pos.x,pos.y);
   }
   c.stroke();
  }
 }
 draw(){
  this.resize();const c=this.ctx;
  c.fillStyle='#080c12';c.fillRect(0,0,this.width,this.height);
  this.drawAxes();this.drawField();this.drawDevices();this.drawTracks();this.drawVectors();
 }
}
