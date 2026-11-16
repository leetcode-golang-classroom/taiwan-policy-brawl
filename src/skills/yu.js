import * as THREE from 'three';
import {burst} from '../vfx/VFXSystem.js';

// 08 大禹: only the ultimate (百川匯海) has a signature visual; other tiers use the generic effect.
export function skillYu({fighter,target,mesh,projectile},type){
  if(type!=='ult')return;
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
