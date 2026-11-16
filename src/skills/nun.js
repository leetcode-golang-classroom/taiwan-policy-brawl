import * as THREE from 'three';
import {burst,throwProjectile,addFx} from '../vfx/VFXSystem.js';

export function skillNun({fighter,target,forward,origin,center,right,projectile,mesh},type){
    if(type==='basic'){
      // 乾坤大挪移: a storm of bank notes bursts out and flies at the opponent, then blankets them.
      const p=origin.clone().addScaledVector(forward,.7);const v=forward.clone().multiplyScalar(9.2);
      const cols=[0x6fcf7a,0x4fb36a,0xcfe8a0,0xf2d36b];
      for(let i=0;i<34;i++){
        const o=p.clone().addScaledVector(right,(Math.random()-.5)*1.6).add(new THREE.Vector3(0,(Math.random()-.3)*1.1,0));
        const spread=new THREE.Vector3((Math.random()-.5)*2.2,(Math.random()-.3)*1.6,(Math.random()-.5)*1.4);
        const n=projectile(new THREE.BoxGeometry(.5,.02,.26),cols[i%4],o,v.clone().multiplyScalar(.75+Math.random()*.5).add(spread),1.0,6+Math.random()*6,-1);
        n.rotation.set(Math.random()*6,fighter.rotation.y,Math.random()*6);
      }
      // Notes settle over the target.
      const tp=target.position.clone();
      for(let i=0;i<26;i++){
        const o=tp.clone().add(new THREE.Vector3((Math.random()-.5)*2.2,1.2+Math.random()*1.6,(Math.random()-.5)*2.2));
        const n=projectile(new THREE.BoxGeometry(.5,.02,.26),cols[i%4],o,new THREE.Vector3((Math.random()-.5)*.6,-1.3-Math.random()*.6,(Math.random()-.5)*.6),1.5,5);
        n.rotation.set(Math.random()*6,Math.random()*6,Math.random()*6);
      }
      mesh(new THREE.TorusGeometry(.9,.06,6,28),0x6fcf7a,tp.clone().add(new THREE.Vector3(0,.08,0)),1.1,'ring',{rotation:[Math.PI/2,0,0]});
      burst(p,0xf2d36b,28);
    } else if(type==='skill'){
      // 電光火球: a crackling energy ball leaves the hands and flies at speed 12 (the logical projectile does the hit test).
      const p=origin.clone().addScaledVector(forward,1.0);const v=forward.clone().multiplyScalar(12);
      projectile(new THREE.SphereGeometry(.52,20,16),0xff8a2a,p,v,1.4,3);                 // fire core
      projectile(new THREE.SphereGeometry(.78,16,12),0xffd34d,p.clone(),v,1.4,-2);         // glow shell
      projectile(new THREE.IcosahedronGeometry(.95,1),0x9fe8ff,p.clone(),v,1.4,6);         // electric lattice
      for(let i=0;i<4;i++){const a=i*Math.PI/2;projectile(new THREE.BoxGeometry(.06,.06,1.3),0xeaffff,p.clone().add(new THREE.Vector3(Math.cos(a)*.55,Math.sin(a)*.55,0)),v,1.4,0).rotation.z=a;}
      burst(p,0x9fe8ff,26);
    } else {
      // 神之震怒: a colossal divine fist falls from the sky onto the opponent and smashes them away.
      const tp=target.position.clone();const sky=tp.clone().add(new THREE.Vector3(0,8,0));const v=new THREE.Vector3(0,-14,0);
      projectile(new THREE.BoxGeometry(2.1,1.5,1.9),0xffe9b0,sky,v,.55,0);                     // palm/back of the fist
      for(let i=0;i<4;i++)projectile(new THREE.BoxGeometry(.48,.9,.7),0xf6d78c,sky.clone().add(new THREE.Vector3(-.78+i*.52,-.95,.55)),v,.55,0);   // curled fingers
      projectile(new THREE.BoxGeometry(.55,.5,1.1),0xf6d78c,sky.clone().add(new THREE.Vector3(1.2,-.25,.45)),v,.55,0);                           // thumb
      projectile(new THREE.CylinderGeometry(.6,.9,3.5,12),0xfff4c8,sky.clone().add(new THREE.Vector3(0,2.5,-.2)),v,.55,0);                       // forearm of light
      projectile(new THREE.CylinderGeometry(.25,1.4,9,16,1,true),0xfff1a8,sky.clone().add(new THREE.Vector3(0,2,0)),v,.55,0);                    // divine light beam
      // Impact: shockwaves, debris, and a flash of light.
      for(let i=0;i<2;i++)mesh(new THREE.TorusGeometry(1.2,.14,8,36),i?0xffd34d:0xffffff,tp.clone().add(new THREE.Vector3(0,.1,0)),.9+i*.3,'ring',{rotation:[Math.PI/2,0,0]});
      for(let i=0;i<12;i++)mesh(new THREE.DodecahedronGeometry(.15+Math.random()*.12),0xf6e3a0,tp.clone().add(new THREE.Vector3((Math.random()-.5)*3,Math.random()*.6,(Math.random()-.5)*3)),.8);
      burst(tp,0xfff1a8,46);
    }
}
