import * as THREE from 'three';
import {burst,throwProjectile,addFx} from '../vfx/VFXSystem.js';

export function skillAdmiral({fighter,target,forward,origin,center,right,projectile,mesh},type){
    if(type==='basic'){
      // A complete row of upright mahjong tiles slides forward like a moving wall.
      for(let i=0;i<9;i++){
        const spread=(i-4)*.34;const p=origin.clone().addScaledVector(forward,.55).addScaledVector(right,spread).add(new THREE.Vector3(0,-.42,0));
        const v=forward.clone().multiplyScalar(8.5);
        projectile(new THREE.BoxGeometry(.3,.5,.16),0xf7f0d8,p,v,1.05,(i%2?1:-1)*2);
        projectile(new THREE.BoxGeometry(.2,.31,.025),0xb83e45,p.clone().addScaledVector(forward,.09),v,1.05,(i%2?1:-1)*2);
      }
      mesh(new THREE.TorusGeometry(1.05,.08,8,32),0xffd36c,center.clone(),.65,'ring');
    } else {
    // Mahjong attacks visibly throw the exact named tile count: 3 for Pong-Pong, 13 for Qing-Yi-Se.
    const count=type==='skill'?3:13;
    const right=new THREE.Vector3(Math.cos(fighter.rotation.y),0,-Math.sin(fighter.rotation.y));
    const tileFace=type==='skill'?0xb83e45:0x277b58;
    for(let i=0;i<count;i++){
      const spread=(i-(count-1)/2)*(count===3?.42:.22);
      const pos=origin.clone().addScaledVector(forward,.65+Math.floor(i/7)*.16).addScaledVector(right,spread).add(new THREE.Vector3(0,.12+(i%4)*.11,0));
      const tile=new THREE.Mesh(new THREE.BoxGeometry(.34,.46,.15),new THREE.MeshBasicMaterial({color:0xf5f0d9,transparent:true,opacity:.98,depthWrite:false}));
      tile.position.copy(pos);tile.rotation.y=fighter.rotation.y+(i%2-.5)*.18;tile.rotation.z=(i%3-1)*.12;
      const face=new THREE.Mesh(new THREE.BoxGeometry(.22,.30,.018),new THREE.MeshBasicMaterial({color:tileFace,transparent:true,opacity:.98,depthWrite:false}));
      face.position.copy(pos).addScaledVector(forward,.087);face.rotation.y=fighter.rotation.y;throwProjectile(tile,forward.clone().multiplyScalar(8.2).add(right.clone().multiplyScalar((i-(count-1)/2)*.12)).add(new THREE.Vector3(0,(i%3-1)*.35,0)),.92,(i%2?1:-1)*5);throwProjectile(face,forward.clone().multiplyScalar(8.2).add(right.clone().multiplyScalar((i-(count-1)/2)*.12)).add(new THREE.Vector3(0,(i%3-1)*.35,0)),.92,(i%2?1:-1)*5);
    }
    mesh(new THREE.TorusGeometry(type==='skill'?.75:1.35,.09,8,32),0xffd36c,center.clone().add(new THREE.Vector3(0,.1,0)),.75,'ring');
    }
}
