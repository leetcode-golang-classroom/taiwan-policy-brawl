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

// 紫氣東來: a dragon made of purple qi flies from the palms; the logical projectile (speed 12) does the hit test.
function dragonQi({fighter,forward,origin,right,mesh,projectile}){
  const v=forward.clone().multiplyScalar(12),life=1.15;
  const purples=[0xb06cff,0x8e4be0,0xd9a8ff,0xf1dcff];
  const head=origin.clone().addScaledVector(forward,1.1);
  // head: skull, snout, glowing eyes, horns and whiskers
  projectile(new THREE.SphereGeometry(.5,16,12),0xc58bff,head,v,life,0).scale.set(1,.9,1.25);
  projectile(new THREE.ConeGeometry(.3,.65,10),0xe3c4ff,head.clone().addScaledVector(forward,.7),v,life,0).rotation.x=Math.PI/2;
  for(const s of [-1,1]){
    projectile(new THREE.SphereGeometry(.09,8,6),0xffffff,head.clone().addScaledVector(forward,.35).addScaledVector(right,s*.28).add(new THREE.Vector3(0,.22,0)),v,life,0);
    const horn=projectile(new THREE.ConeGeometry(.08,.6,6),0xfff1b0,head.clone().addScaledVector(forward,-.1).addScaledVector(right,s*.25).add(new THREE.Vector3(0,.55,0)),v,life,0);
    horn.rotation.x=-.8;horn.rotation.z=s*.35;
    const whisker=projectile(new THREE.CylinderGeometry(.025,.025,1.1,5),0xf1dcff,head.clone().addScaledVector(forward,.8).addScaledVector(right,s*.5).add(new THREE.Vector3(0,-.15,0)),v,life,0);
    whisker.rotation.set(Math.PI/2,0,s*.7);
  }
  // serpentine body: tapering segments trailing behind, weaving side to side and up/down
  for(let k=1;k<=11;k++){
    const w=Math.sin(k*.9)*.55,h=Math.cos(k*.9)*.3,rad=.46*(1-k*.055);
    const p=head.clone().addScaledVector(forward,-k*.62).addScaledVector(right,w).add(new THREE.Vector3(0,h,0));
    projectile(new THREE.SphereGeometry(rad,12,10),purples[k%4],p,v,life,0);
    if(k%2===0)projectile(new THREE.ConeGeometry(.12,.35,5),0xfff1b0,p.clone().add(new THREE.Vector3(0,rad+.1,0)),v,life,0);   // dorsal spines
  }
  // a swirl of purple qi trailing the dragon
  for(let i=0;i<14;i++){
    const p=head.clone().addScaledVector(forward,-Math.random()*7).addScaledVector(right,(Math.random()-.5)*1.6).add(new THREE.Vector3(0,(Math.random()-.5)*1.2,0));
    projectile(new THREE.IcosahedronGeometry(.12+Math.random()*.1,0),purples[i%4],p,v.clone().multiplyScalar(.8+Math.random()*.3),.9,3);
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
