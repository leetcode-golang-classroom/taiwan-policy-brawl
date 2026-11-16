import * as THREE from 'three';
import {burst,throwProjectile,addFx} from '../vfx/VFXSystem.js';

export function skillLeopard({fighter,target,forward,origin,center,right,projectile,mesh},type){
    if(type==='basic'){
      // 豹之撲擊：蹬地起跳的塵土與速度線；爪痕在命中時由 vfxEvents 的 hit 事件補上。
      burst(origin.clone().add(new THREE.Vector3(0,.15,0)),0xd8c08a,22);
      for(let i=0;i<5;i++){
        const line=mesh(new THREE.BoxGeometry(.04,.04,1.3),0xfff0b8,origin.clone().addScaledVector(forward,.9).addScaledVector(right,(i-2)*.28).add(new THREE.Vector3(0,.55+(i%2)*.3,0)),.3);
        line.rotation.y=fighter.rotation.y;
      }
    } else if(type==='skill'){
      // 工人隊伍由施招者前方衝出，形成可見的集體撞擊。
      for(let i=0;i<5;i++){
        const p=origin.clone().addScaledVector(forward,.55).addScaledVector(right,(i-2)*.48).add(new THREE.Vector3(0,.25,0));
        const v=forward.clone().multiplyScalar(9.4).add(new THREE.Vector3(0,.7+(i%2)*.25,0)).addScaledVector(right,(i-2)*.25);
        const body=projectile(new THREE.CapsuleGeometry(.19,.62,4,8),0xf0bd4f,p,v,1.05,(i%2?2:-2),-1.8);
        const head=projectile(new THREE.SphereGeometry(.2,12,10),0xffd2a9,p.clone().add(new THREE.Vector3(0,.52,0)),v,1.05,(i%2?2:-2),-1.8);
        projectile(new THREE.BoxGeometry(.36,.08,.08),0x9ca8b5,p.clone().add(new THREE.Vector3(.2,.18,0)),v,1.05,2,-1.8);
      }
      for(let i=0;i<5;i++)mesh(new THREE.ConeGeometry(.22,.7,6),0x75bd68,center.clone().add(new THREE.Vector3((i-2)*.8,.35,-.75)),.85,'grow');
      burst(center,0xffd06b,32);
    } else {
      // Ultimate: successive rolling ocean swells surge from the tree spirit toward the opponent.
      for(let wave=0;wave<4;wave++){
        const pts=[];for(let j=0;j<=20;j++){const t=j/20;pts.push(new THREE.Vector3((t-.5)*6,Math.sin(t*Math.PI*2+wave*.55)*.32+wave*.12,.7+wave*.72));}
        const curve=new THREE.CatmullRomCurve3(pts);
        const waveMesh=mesh(new THREE.TubeGeometry(curve,48,.16+wave*.025,9,false),wave%2?0x48c9ee:0x8beaff,center.clone(),1.35,'fade',{opacity:.95});waveMesh.rotation.y=fighter.rotation.y;
        const forward=new THREE.Vector3(Math.sin(fighter.rotation.y),0,Math.cos(fighter.rotation.y));const right=new THREE.Vector3(Math.cos(fighter.rotation.y),0,-Math.sin(fighter.rotation.y));
        for(let j=0;j<9;j++){
          const t=j/8;const foamPos=center.clone().addScaledVector(right,(t-.5)*5.8).addScaledVector(forward,.7+wave*.72).add(new THREE.Vector3(0,Math.sin(t*Math.PI*2+wave*.55)*.32+.25+wave*.12,0));
          mesh(new THREE.SphereGeometry(.12+Math.random()*.08,8,7),0xe8fbff,foamPos,1.0,'grow');
        }
      }
      const surge=center.clone().add(new THREE.Vector3(Math.sin(fighter.rotation.y)*2.4,.25,Math.cos(fighter.rotation.y)*2.4));
      mesh(new THREE.TorusGeometry(2.2,.12,9,40),0x4ac9f0,surge,1.1,'ring');
      burst(center,0x65d9ff,48);
    }
}
