import * as THREE from 'three';
import {burst,throwProjectile,addFx} from '../vfx/VFXSystem.js';

export function skillMech({fighter,target,forward,origin,center,right,projectile,mesh},type){
    if(type==='basic'){
      // A fan of recognizable GPU boards flies forward as a volley.
      for(let i=0;i<5;i++){
        const p=origin.clone().addScaledVector(forward,.55).addScaledVector(right,(i-2)*.34).add(new THREE.Vector3(0,(i%2)*.22,0));
        const v=forward.clone().multiplyScalar(9).addScaledVector(right,(i-2)*.7);
        const board=projectile(new THREE.BoxGeometry(.92,.16,.48),0x263b55,p,v,1.05,(i%2?3:-3));
        const chip=projectile(new THREE.BoxGeometry(.28,.07,.22),0x72df83,p.clone().add(new THREE.Vector3(0,.1,0)),v,1.05,(i%2?3:-3));
        chip.position.y+=.08;
        for(let fan=0;fan<2;fan++)projectile(new THREE.BoxGeometry(.08,.08,.32),0xd7b65c,p.clone().add(new THREE.Vector3(fan?-.35:.35,.02,0)),v,1.05,0);
      }
      burst(center,0x74e78b,28);
    } else if(type==='skill'){
      // Oversized green eye-like NVIDIA emblem rushes toward the opponent.
      const p=origin.clone().addScaledVector(forward,.8).add(new THREE.Vector3(0,.25,0));const v=forward.clone().multiplyScalar(7.8);
      projectile(new THREE.TorusGeometry(.82,.2,12,40),0x76d64b,p,v,1.25,5);
      projectile(new THREE.TorusGeometry(.43,.12,10,32),0x9be96e,p.clone().addScaledVector(forward,.06),v,1.25,-5);
      projectile(new THREE.SphereGeometry(.2,16,12),0x182b1d,p.clone().addScaledVector(forward,.12),v,1.25,4);
      projectile(new THREE.BoxGeometry(1.5,.12,.12),0x76d64b,p.clone().add(new THREE.Vector3(0,-.82,0)),v,1.25,0);
      burst(p,0x78e85c,24);
    } else {
      // Milk bottle and giant egg erupt from the ground and bounce toward the rival.
      const p= fighter.position.clone().addScaledVector(forward,1.1).add(new THREE.Vector3(0,.15,0));
      const bottle=projectile(new THREE.CylinderGeometry(.34,.48,1.55,16),0xf4f1df,p.clone().addScaledVector(right,-.62),forward.clone().multiplyScalar(4.8).add(new THREE.Vector3(0,5.8,0)),1.35,5,-10.5);
      projectile(new THREE.CylinderGeometry(.19,.19,.24,12),0x4e9fd4,bottle.position.clone().add(new THREE.Vector3(0,.85,0)),forward.clone().multiplyScalar(4.8).add(new THREE.Vector3(0,5.8,0)),1.35,5,-10.5);
      projectile(new THREE.SphereGeometry(.72,20,16),0xffe5a8,p.clone().addScaledVector(right,.65),forward.clone().multiplyScalar(5.2).add(new THREE.Vector3(0,6.2,0)),1.35,5,-10.5);
      burst(p,0xffe5a8,42);
    }
}
