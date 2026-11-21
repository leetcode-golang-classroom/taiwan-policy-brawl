import * as THREE from 'three';
import {burst} from '../vfx/VFXSystem.js';

// 08 大禹: 紫氣東來 (skill) and 百川匯海 (ult) have signature visuals; basic uses the generic effect.
// 乾坤之動: a spinning yin-yang disc appears before the fighter; it reflects whatever comes at it.
export function taiChiDisc(mesh,pos,yaw,life=.55,scale=1){
  const mk=(geo,color,off)=>{const m=mesh(geo,color,pos.clone().add(off),life,'fade',{opacity:.95});m.rotation.order='YXZ';m.rotation.set(Math.PI/2,yaw,0);m.scale.multiplyScalar(scale);return m;};
  const fw=new THREE.Vector3(Math.sin(yaw),0,Math.cos(yaw)),rt=new THREE.Vector3(fw.z,0,-fw.x);
  mk(new THREE.CylinderGeometry(.85,.85,.05,32),0xf4f4f4,new THREE.Vector3());
  mk(new THREE.CylinderGeometry(.86,.86,.06,32,1,false,0,Math.PI),0x1a1a24,fw.clone().multiplyScalar(.01));
  mk(new THREE.CylinderGeometry(.43,.43,.07,24),0x1a1a24,rt.clone().multiplyScalar(.43).add(fw.clone().multiplyScalar(.02)));
  mk(new THREE.CylinderGeometry(.43,.43,.08,24),0xf4f4f4,rt.clone().multiplyScalar(-.43).add(fw.clone().multiplyScalar(.03)));
  mk(new THREE.CylinderGeometry(.12,.12,.09,16),0xf4f4f4,rt.clone().multiplyScalar(.43).add(fw.clone().multiplyScalar(.04)));
  mk(new THREE.CylinderGeometry(.12,.12,.09,16),0x1a1a24,rt.clone().multiplyScalar(-.43).add(fw.clone().multiplyScalar(.04)));
  mk(new THREE.TorusGeometry(.9,.05,8,36),0xffd36c,new THREE.Vector3());
}
function taiChi({fighter,forward,origin,mesh}){
  taiChiDisc(mesh,origin.clone().addScaledVector(forward,1.1),fighter.rotation.y,.55);
  burst(origin.clone().addScaledVector(forward,1.1),0xe9e9f5,12);
}
export function skillYu({fighter,target,forward,origin,right,mesh,projectile},type){
  if(type==='basic')return taiChi({fighter,forward,origin,mesh});
  if(type==='skill')return dragonQi({fighter,forward,origin,right,mesh,projectile});
  if(type==='ult')return riverSea({target,mesh,projectile});
}

// 紫氣東來: a temple-style dragon (coiling body, maned head, horns, long whiskers, claws, flaming pearl) built entirely
// from light beams; the logical projectile (speed 12) does the hit test.
function dragonQi({fighter,forward,origin,right,mesh,projectile}){
  const v=forward.clone().multiplyScalar(12),life=1.15,UP=new THREE.Vector3(0,1,0),Y=UP;
  const cols=[0xb06cff,0xd9a8ff,0xf1dcff,0x8e4be0],gold=0xfff1b0;
  const head=origin.clone().addScaledVector(forward,1.6).add(new THREE.Vector3(0,.35,0));
  // local frame -> world: f forward, r right, u up
  const at=(f,r,u)=>head.clone().addScaledVector(forward,f).addScaledVector(right,r).addScaledVector(UP,u);
  const beam=(a,b,color,rad=.05)=>{
    const d=b.clone().sub(a),len=d.length();if(len<1e-3)return;
    const m=projectile(new THREE.CylinderGeometry(rad,rad,len,6),color,a.clone().lerp(b,.5),v,life,0);
    m.quaternion.setFromUnitVectors(Y,d.normalize());return m;
  };
  // polyline of beams through points (a curved whisker, horn, tail...)
  const line=(pts,color,rad)=>{for(let i=0;i<pts.length-1;i++)beam(pts[i],pts[i+1],color,rad);};
  // ---- body: an S-shaped centreline coiling up and down, drawn as a bundle of light strands that taper to the tail
  const N=26,spine=[];
  for(let k=0;k<=N;k++){
    const t=k/N;
    spine.push(at(-.5-k*.34,Math.sin(k*.5)*.5*(.4+t),Math.sin(k*.42)*.75*(.5+t*.6)-.1+Math.cos(k*.3)*.15));
  }
  for(let k=0;k<N;k++){
    const t=k/N,w=.62*(1-t*.88);                      // body half-thickness (tapering)
    for(let s=0;s<6;s++){                             // ring of strands around the body
      const ang=s/6*Math.PI*2+k*.35,off=new THREE.Vector3().addScaledVector(right,Math.cos(ang)*w).addScaledVector(UP,Math.sin(ang)*w);
      beam(spine[k].clone().add(off),spine[k+1].clone().add(off),cols[(s+k)%4],.035+.03*(1-t));
    }
    beam(spine[k],spine[k+1],0xffffff,.07*(1-t)+.03);   // bright core
    if(k%2===0){                                      // scales: cross-beams
      const l=spine[k].clone().addScaledVector(right,w*1.1),r=spine[k].clone().addScaledVector(right,-w*1.1);
      beam(l,r,cols[k%4],.03);
    }
    if(k%3===0&&k<N-3){                               // dorsal fin: a fan of short rays up the back
      for(let j=-1;j<=1;j++)beam(spine[k].clone().addScaledVector(UP,w),spine[k].clone().addScaledVector(UP,w+.55+Math.abs(j)*-.12).addScaledVector(forward,-.35+j*.25),gold,.03);
    }
  }
  // ---- claws: two pairs of legs along the body, each ending in three light talons
  for(const k of [6,14])for(const s of [-1,1]){
    const root=spine[k].clone().addScaledVector(right,s*.4).addScaledVector(UP,-.35);
    const knee=root.clone().addScaledVector(right,s*.55).addScaledVector(UP,-.35).addScaledVector(forward,.2);
    const paw=knee.clone().addScaledVector(right,s*.2).addScaledVector(UP,-.4).addScaledVector(forward,.35);
    line([root,knee,paw],0xd9a8ff,.05);
    for(let c=-1;c<=1;c++)beam(paw,paw.clone().addScaledVector(forward,.3).addScaledVector(right,s*.1+c*.12).addScaledVector(UP,-.18),gold,.03);
  }
  // ---- head: skull outline, upper jaw / snout, lower jaw, brow ridges, eyes
  line([at(-.4,0,.1),at(0,0,.45),at(.55,0,.4),at(1.1,0,.2),at(1.4,0,.05)],0xf1dcff,.07);       // skull to snout top
  line([at(-.4,0,.1),at(0,0,-.2),at(.7,0,-.3),at(1.3,0,-.15)],cols[0],.06);                      // lower jaw
  for(const s of [-1,1]){
    line([at(-.4,s*.35,.1),at(0,s*.45,.3),at(.6,s*.4,.3),at(1.2,s*.2,.1)],cols[1],.05);       // cheeks
    line([at(.4,s*.38,.42),at(.65,s*.3,.35)],0xffffff,.06);                                     // eyes (bright)
    line([at(.7,s*.18,.1),at(.78,s*.2,-.1)],0xffffff,.03);                                      // fangs
    // antler-like horns: two branching prongs sweeping back
    line([at(0,s*.2,.45),at(-.3,s*.35,.9),at(-.75,s*.4,1.3),at(-1.1,s*.35,1.45)],gold,.045);
    line([at(-.3,s*.35,.9),at(-.1,s*.5,1.25)],gold,.03);
    // long drifting whiskers
    line([at(1.2,s*.15,0),at(1.5,s*.7,-.1),at(.9,s*1.2,-.35),at(.1,s*1.5,-.2),at(-.7,s*1.6,-.55)],0xf1dcff,.025);
  }
  // mane: rays streaming back from the nape
  for(let i=0;i<14;i++){
    const a=(i/13-.5)*2.4,base=at(-.35,Math.sin(a)*.3,.3+Math.cos(a)*.25);
    beam(base,base.clone().addScaledVector(forward,-1.7-Math.random()*.8).addScaledVector(right,Math.sin(a)*1.1).addScaledVector(UP,.35+Math.cos(a)*.5),cols[i%4],.03);
  }
  // flaming pearl ahead of the snout, surrounded by radiating rays
  const pearl=at(2.1,0,.25);
  projectile(new THREE.SphereGeometry(.2,12,10),0xffffff,pearl,v,life,0);
  for(let i=0;i<10;i++){const a=i/10*Math.PI*2;beam(pearl,pearl.clone().addScaledVector(right,Math.cos(a)*.45).addScaledVector(UP,Math.sin(a)*.45),gold,.025);}
  // stray light motes trailing
  for(let i=0;i<14;i++){
    const p=head.clone().addScaledVector(forward,-Math.random()*7).addScaledVector(right,(Math.random()-.5)*1.6).add(new THREE.Vector3(0,(Math.random()-.5)*1.2,0));
    projectile(new THREE.IcosahedronGeometry(.07+Math.random()*.06,0),cols[i%4],p,v.clone().multiplyScalar(.8+Math.random()*.3),.9,3);
  }
  mesh(new THREE.TorusGeometry(.9,.07,8,28),0xd9a8ff,origin.clone().addScaledVector(forward,.6),.6,'ring',{rotation:[0,fighter.rotation.y,0]});
  burst(head,0xc58bff,30);
}

// 百川匯海: rivers pour in from every side and converge on the opponent, then the water rises and swallows them.
function riverSea({target,mesh,projectile}){
  const tp=target.position.clone();
  const blues=[0x2f8fd8,0x4fb4ea,0x8fdcff,0xe9fbff];
  // Rivers pour in from every side and converge on the opponent.
  const rivers=8;
  for(let r=0;r<rivers;r++){
    const a=r/rivers*Math.PI*2+Math.random()*.3,dir=new THREE.Vector3(Math.cos(a),0,Math.sin(a));
    const v=dir.clone().multiplyScalar(-9);
    for(let k=0;k<9;k++){
      const w=Math.sin(k*.9+r)*.35,side=new THREE.Vector3(-dir.z,0,dir.x).multiplyScalar(w);
      const p=tp.clone().addScaledVector(dir,6.5+k*.55).add(side).add(new THREE.Vector3(0,.35+(k%3)*.12,0));
      const seg=projectile(new THREE.BoxGeometry(.8,.3,1.1),blues[(k+r)%4],p,v,.8,0);
      seg.rotation.y=-a+Math.PI/2;
    }
  }
  // The water rises and swallows the opponent.
  mesh(new THREE.CylinderGeometry(1.3,1.5,3.4,24),0x3b9ee0,tp.clone().add(new THREE.Vector3(0,1.7,0)),1.7,'grow',{opacity:.7});
  mesh(new THREE.SphereGeometry(1.7,22,16),0x56b9ee,tp.clone().add(new THREE.Vector3(0,1.2,0)),1.6,'grow',{opacity:.55});
  mesh(new THREE.TorusGeometry(1.4,.12,8,36),0xe9fbff,tp.clone().add(new THREE.Vector3(0,.12,0)),1.2,'ring',{rotation:[Math.PI/2,0,0]});
  mesh(new THREE.TorusGeometry(1.4,.12,8,36),0x8fdcff,tp.clone().add(new THREE.Vector3(0,.12,0)),1.5,'ring',{rotation:[Math.PI/2,0,0]});
  burst(tp.clone().add(new THREE.Vector3(0,1,0)),0x8fdcff,50);
}
