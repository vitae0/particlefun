import { HC, SPECIES } from './catalog.js';
import { energy, norm } from './field-physics.js';

// Overlays signed single-particle envelopes for ALL occupied species.
// This is a field-amplitude visualization, not a numerical QFT expectation value.
export class FieldRenderer {
  constructor(canvas,lab){
    this.canvas=canvas;this.lab=lab;this.ctx=canvas.getContext('2d',{alpha:false});
    this.layer=document.createElement('canvas');
    this.layerCtx=this.layer.getContext('2d',{willReadFrequently:false});
    this.selected=null;this.width=0;this.height=0;this.dpr=1;
    this.lastDraw=0;
  }
  xy(x,y){return {x:this.width*(.5+x/this.lab.widthFm),y:this.height*(.5-y/this.lab.widthFm)}}
  world(px,py){return {x:(px/this.width-.5)*this.lab.widthFm,y:(.5-py/this.height)*this.lab.widthFm}}
  resize(){
    const b=this.canvas.getBoundingClientRect();
    const w=Math.max(250,Math.round(b.width)),h=Math.max(200,Math.round(b.height));
    const dpr=Math.min(2,window.devicePixelRatio||1);
    if(this.width===w&&this.height===h&&this.dpr===dpr)return;
    this.width=w;this.height=h;this.dpr=dpr;
    this.canvas.width=Math.round(w*dpr);this.canvas.height=Math.round(h*dpr);
    this.ctx.setTransform(dpr,0,0,dpr,0,0);
    const fac=Math.max(1,w/198,h/128);
    this.layer.width=Math.max(92,Math.ceil(w/fac));
    this.layer.height=Math.max(80,Math.ceil(h/fac));
  }
  // Color for charge conjugate pairs is 180 degrees apart.
  rgb(h){
    h=((h%360)+360)%360;
    const c=0.72,m=.14;
    const z=(1-Math.abs((h/60)%2-1))*c;
    const b=h<60?[c,z,0]:h<120?[z,c,0]:h<180?[0,c,z]:h<240?[0,z,c]:h<300?[z,0,c]:[c,0,z];
    return b.map(t=>Math.round(255*(t+m)));
  }
  draw(ts=0){
    if(ts && ts-this.lastDraw<33)return;
    this.lastDraw=ts;
    this.resize();
    const ctx=this.ctx,w=this.width,h=this.height;
    ctx.fillStyle='#070b12';ctx.fillRect(0,0,w,h);
    // diffuse vignette background
    const glow=ctx.createRadialGradient(w*.5,h*.48,5,w*.5,h*.48,w*.69);
    glow.addColorStop(0,'#111c2b');glow.addColorStop(1,'#080d15');
    ctx.fillStyle=glow;ctx.fillRect(0,0,w,h);
    const tw=this.layer.width,th=this.layer.height;
    const image=this.layerCtx.createImageData(tw,th),data=image.data;
    for(let i=0;i<data.length;i+=4){data[i]=8;data[i+1]=13;data[i+2]=22;data[i+3]=255;}
    const worldW=this.lab.widthFm,worldH=worldW*h/w;
    // Field amplitudes from different species overlay as radiance, not coherent quantum amplitudes.
    for(const p of this.lab.fields){
      const species=SPECIES[p.type];
      const hue=(species.colorHue + (p.type.length*13)%19)%360;
      const [r,g,b]=this.rgb(hue);
      const selected=this.selected===null||this.selected===p.id;
      const blend=selected?.96:.38;
      const vel=norm(p)/energy(p),delta=this.lab.clock-p.birth;
      const ell=species.mass**2/energy(p)**3;
      const transverse=1/energy(p);
      const sigmaL=this.lab.packetSigma*Math.hypot(1,HC*delta*ell/(2*this.lab.packetSigma**2));
      const sigmaT=this.lab.packetSigma*Math.hypot(1,HC*delta*transverse/(2*this.lab.packetSigma**2));
      const radius=Math.min(Math.max(sigmaL,sigmaT)*3.8,worldW*1.4);
      const xa=Math.max(0,Math.floor((p.x-radius+worldW/2)/worldW*tw));
      const xb=Math.min(tw-1,Math.ceil((p.x+radius+worldW/2)/worldW*tw));
      const ya=Math.max(0,Math.floor((worldH/2-(p.y+radius))/worldH*th));
      const yb=Math.min(th-1,Math.ceil((worldH/2-(p.y-radius))/worldH*th));
      const wavelength=norm(p)>0?2*Math.PI*HC/norm(p):Infinity;
      const spatialCell=worldW/tw;
      const resolved=wavelength>=2.4*spatialCell;
      for(let j=ya;j<=yb;j++){
        const y=(.5-(j+.5)/th)*worldH;
        for(let i=xa;i<=xb;i++){
          const x=((i+.5)/tw-.5)*worldW;
          const dx=x-p.x,dy=y-p.y;
          const dist2=(dx*dx+dy*dy)/Math.max(sigmaL*sigmaL,sigmaT*sigmaT);
          if(dist2>50)continue;
          // High-frequency carrier is hidden if under-resolved to avoid fake interference.
          const v=this.lab.fieldValue(p,x,y);
          const amplitude=resolved?Math.abs(v):Math.exp(-.25*dist2)*.67;
          const alpha=Math.min(.8,amplitude*.51*blend);
          if(alpha<.003)continue;
          const n=(j*tw+i)*4;
          // Additive radiance mixing visually preserves overlapping field colors.
          data[n]=Math.min(255,data[n]+r*alpha);
          data[n+1]=Math.min(255,data[n+1]+g*alpha);
          data[n+2]=Math.min(255,data[n+2]+b*alpha);
        }
      }
    }
    this.layerCtx.putImageData(image,0,0);
    ctx.imageSmoothingEnabled=true;
    ctx.globalCompositeOperation='screen';
    ctx.drawImage(this.layer,0,0,w,h);
    ctx.globalCompositeOperation='source-over';
    // A small labeled measurement scale. No absolute coordinate readout.
    ctx.strokeStyle='#8d9bb2';ctx.lineWidth=1.6;
    const nm=5;const pixels=nm/worldW*w;
    ctx.beginPath();ctx.moveTo(23,h-29);ctx.lineTo(23+pixels,h-29);
    ctx.moveTo(23,h-33);ctx.lineTo(23,h-25);
    ctx.moveTo(23+pixels,h-33);ctx.lineTo(23+pixels,h-25);ctx.stroke();
    ctx.fillStyle='#8d9bb2';ctx.font='11px system-ui';
    ctx.fillText(nm+' fm',23,h-41);
  }
}
