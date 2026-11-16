import * as THREE from 'three';
import {burst,throwProjectile,addFx} from '../vfx/VFXSystem.js';

export function skillBrawler({fighter,target,forward,origin,center,right,projectile,mesh},type){
  if(type==='basic'){
    // 重拳出擊: a volley of red boxing gloves flies out of the punches toward the opponent.
    const v=forward.clone().multiplyScalar(10);
    for(let i=0;i<5;i++){
      const off=(i-2)*.38,p=origin.clone().addScaledVector(forward,.8+(i%2)*.3).addScaledVector(right,off).add(new THREE.Vector3(0,(i%2?.12:-.1),0));
      const vel=v.clone().addScaledVector(right,off*1.4).multiplyScalar(.9+(i%3)*.08);
      const glove=projectile(new THREE.SphereGeometry(.34,14,10),i%2?0xd8333f:0xe84c4c,p,vel,.9,0);glove.scale.set(1,.9,1.15);
      projectile(new THREE.CylinderGeometry(.2,.22,.24,12),0xf4f1ea,p.clone().addScaledVector(forward,-.3),vel,.9,0).rotation.x=Math.PI/2;   // white cuff
      projectile(new THREE.SphereGeometry(.12,8,6),0xffffff,p.clone().add(new THREE.Vector3(0,.2,.0)),vel,.9,0);                        // highlight
    }
    burst(origin.clone().addScaledVector(forward,.9),0xffd27a,22);
    return;
  }
  if(type==='skill'){
    // 風花雪月: a crowd of aunties pours out of the narrow 豆干厝 row-houses and drags the target into the alley.
    const tp=target.position.clone();
    const dirT=tp.clone().sub(fighter.position).setY(0);const len=Math.max(1,dirT.length());dirT.normalize();
    const side=new THREE.Vector3(dirT.z,0,-dirT.x);
    // the alley: two rows of narrow, tall house fronts with tiny roofs and lit windows, rising either side of the target
    for(const sd of [-1,1])for(let i=0;i<4;i++){
      const base=tp.clone().addScaledVector(side,sd*1.25).addScaledVector(dirT,(i-1.5)*.85);
      const h=1.5+(i%2)*.35;
      const wall=mesh(new THREE.BoxGeometry(.7,h,.7),[0xd9c7a3,0xc9d4c0,0xe0c4b5,0xcdbf9c][i],base.clone().add(new THREE.Vector3(0,h/2,0)),1.0,'grow');
      mesh(new THREE.ConeGeometry(.55,.35,4),0x9b4a3c,base.clone().add(new THREE.Vector3(0,h+.17,0)),1.0,'grow',{rotation:[0,Math.PI/4,0]});
      mesh(new THREE.BoxGeometry(.22,.26,.04),0xffe08a,base.clone().add(new THREE.Vector3(-sd*.02,h*.6,sd*0).addScaledVector(side,-sd*.36)),1.0,'grow');
    }
    // the aunties: permed hair, floral blouse, arms out; they run in from both sides and converge on the target
    for(let i=0;i<8;i++){
      const sd=i%2?1:-1,row=Math.floor(i/2);
      const start=tp.clone().addScaledVector(side,sd*(2.6+row*.4)).addScaledVector(dirT,(row-1.5)*.7).add(new THREE.Vector3(0,.55,0));
      const vel=tp.clone().add(new THREE.Vector3(0,.55,0)).sub(start).multiplyScalar(1/.7);
      const col=[0xe8789a,0xf0b84f,0x7bc27e,0xb48ad8][row];
      projectile(new THREE.CapsuleGeometry(.2,.45,4,8),col,start,vel,.9,0,0);
      projectile(new THREE.SphereGeometry(.2,10,8),0xffd2a9,start.clone().add(new THREE.Vector3(0,.5,0)),vel,.9,0,0);
      projectile(new THREE.SphereGeometry(.24,10,8),0x6b6b78,start.clone().add(new THREE.Vector3(0,.66,0)),vel,.9,0,0);   // permed hair
      projectile(new THREE.CapsuleGeometry(.07,.5,3,6),0xffd2a9,start.clone().add(new THREE.Vector3(0,.3,0)).addScaledVector(side,-sd*.2),vel,.9,0,0);   // reaching arm
    }
    mesh(new THREE.TorusGeometry(.9,.08,8,32),0xffe08a,tp.clone().add(new THREE.Vector3(0,.12,0)),.8,'ring',{rotation:[Math.PI/2,0,0]});
    return;
  }
  const medal=mesh(new THREE.TorusGeometry(.42,.12,10,28),0xffd65c,origin.clone().addScaledVector(forward,1.2).add(new THREE.Vector3(0,.25,0)),.8,'grow');
  medal.rotation.x=Math.PI/2;mesh(new THREE.BoxGeometry(.18,.65,.05),0xe34d55,medal.position.clone().add(new THREE.Vector3(-.14,-.6,0)),.8);
  mesh(new THREE.BoxGeometry(.18,.65,.05),0x3c75bf,medal.position.clone().add(new THREE.Vector3(.14,-.6,0)),.8);
  for(let i=0;i<8;i++)mesh(new THREE.SphereGeometry(.1,8,8),0xffd65c,center.clone().add(new THREE.Vector3(Math.cos(i)*.8,Math.sin(i)*.8,0)),.65);
}
