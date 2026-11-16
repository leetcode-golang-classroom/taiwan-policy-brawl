import * as THREE from 'three';
import {burst,throwProjectile,addFx} from '../vfx/VFXSystem.js';

export function skillMage({fighter,target,forward,origin,center,right,projectile,mesh},type){
    if(type==='basic'){
      // Several mentor silhouettes send visible concentric sound waves toward the target.
      for(let i=0;i<4;i++){
        const p=origin.clone().addScaledVector(right,(i-1.5)*.72).addScaledVector(forward,.12);
        mesh(new THREE.CapsuleGeometry(.18,.72,4,8),0xe8c6a6,p.clone().add(new THREE.Vector3(0,.05,0)),1.15,'grow');
        mesh(new THREE.SphereGeometry(.2,12,10),0xf1d1b4,p.clone().add(new THREE.Vector3(0,.58,0)),1.15,'grow');
        mesh(new THREE.ConeGeometry(.2,.16,6),0x9a5b83,p.clone().add(new THREE.Vector3(0,.82,0)),1.15,'grow');
      }
      for(let i=0;i<4;i++){const ring=projectile(new THREE.TorusGeometry(.48+i*.27,.055,8,32),0xffc4a5,origin.clone().add(new THREE.Vector3(0,.55,0)),forward.clone().multiplyScalar(7.2+i*.45),.85,0);ring.rotation.y=fighter.rotation.y;}
      burst(center,0xffc4a5,26);
    } else if(type==='skill'){
      // SoR teaching: several separate books are thrown directly at the opponent.
      const right=new THREE.Vector3(Math.cos(fighter.rotation.y),0,-Math.sin(fighter.rotation.y));
      for(let i=0;i<5;i++){
        const pos=origin.clone().addScaledVector(forward,.55).addScaledVector(right,(i-2)*.22).add(new THREE.Vector3(0,.05+i*.13,0));
        const bookForward=forward.clone().multiplyScalar(7.6).add(right.clone().multiplyScalar((i-2)*.72)).add(new THREE.Vector3(0,(i-2)*.16,0));
        const cover=new THREE.Mesh(new THREE.BoxGeometry(.72,.12,.56),new THREE.MeshBasicMaterial({color:0x8d3d50,transparent:true,opacity:.98,depthWrite:false}));cover.position.copy(pos);cover.rotation.y=fighter.rotation.y;throwProjectile(cover,bookForward,1.05,(i%2?1:-1)*4);
        const pages=new THREE.Mesh(new THREE.BoxGeometry(.63,.10,.48),new THREE.MeshBasicMaterial({color:0xf5e9c9,transparent:true,opacity:.98,depthWrite:false}));pages.position.copy(pos).add(new THREE.Vector3(0,.105,0));pages.rotation.y=fighter.rotation.y;throwProjectile(pages,bookForward,1.05,(i%2?1:-1)*4);
        const spine=new THREE.Mesh(new THREE.BoxGeometry(.09,.15,.58),new THREE.MeshBasicMaterial({color:0xd7b66e,transparent:true,opacity:.98,depthWrite:false}));spine.position.copy(pos).addScaledVector(right,-.31);spine.rotation.y=fighter.rotation.y;throwProjectile(spine,bookForward,1.05,(i%2?1:-1)*4);
      }
      burst(center,0xffd68b,34);
    } else {
      // Ultimate: a colossal closed book drops vertically onto the target zone.
      const impact=target.position.clone().add(new THREE.Vector3(0,4.8,0));
      const cover=mesh(new THREE.BoxGeometry(3.8,.42,2.8),0x713447,impact,1.15,'drop');cover.rotation.y=fighter.rotation.y;
      const pages=mesh(new THREE.BoxGeometry(3.55,.22,2.58),0xf4e7c7,impact.clone().add(new THREE.Vector3(0,-.28,0)),1.15,'drop');pages.rotation.y=fighter.rotation.y;
      const spine=mesh(new THREE.BoxGeometry(.34,.48,2.82),0xd4ad62,impact.clone().add(new THREE.Vector3(-1.72,-.03,0)),1.15,'drop');spine.rotation.y=fighter.rotation.y;
      const shock=mesh(new THREE.TorusGeometry(1.8,.12,10,40),0xffd47a,target.position.clone().add(new THREE.Vector3(0,.12,0)),.9,'ring');shock.rotation.x=Math.PI/2;
      burst(target.position.clone().add(new THREE.Vector3(0,.8,0)),0xffd68b,42);
    }
}
