import * as THREE from 'three';
import {burst,throwProjectile,addFx} from '../vfx/VFXSystem.js';

export function skillLeopard({fighter,target,forward,origin,center,right,projectile,mesh},type){
    if(type==='basic'){
      // 都市縫合：兩排都市土牆從對手左右兩側合攏夾擊，接縫處留下縫線般的針腳。
      const T=target.position.clone(),sideRight=new THREE.Vector3(Math.cos(fighter.rotation.y),0,-Math.sin(fighter.rotation.y));
      const EARTH=[0xb08a5a,0x9c7648,0xc29a68,0x8a6a40];
      for(const side of [-1,1])for(let j=0;j<4;j++){
        const h=1.7+((j*7+(side>0?3:0))%4)*.22,depth=.95;
        const p=T.clone().addScaledVector(sideRight,side*3.1).addScaledVector(forward,(j-1.5)*depth).add(new THREE.Vector3(0,h/2,0));
        const v=sideRight.clone().multiplyScalar(-side*7.2);
        const wall=projectile(new THREE.BoxGeometry(.55,h,depth-.06),EARTH[(j+(side>0?1:0))%4],p,v,.5,0,0);wall.rotation.y=fighter.rotation.y;
        const cap=projectile(new THREE.BoxGeometry(.62,.1,depth),0x6e5231,p.clone().add(new THREE.Vector3(0,h/2+.05,0)),v,.5,0,0);cap.rotation.y=fighter.rotation.y;
        for(let k=0;k<2;k++){   // dark windows facing the opponent
          const win=projectile(new THREE.BoxGeometry(.04,.28,.26),0x2d2a26,p.clone().addScaledVector(sideRight,-side*.3).add(new THREE.Vector3(0,(k-.5)*.62+.1,0)),v,.5,0,0);win.rotation.y=fighter.rotation.y;
        }
      }
      for(let i=0;i<7;i++){   // stitch marks across the seam
        const st=mesh(new THREE.BoxGeometry(.9,.06,.06),0xf4ecd4,T.clone().addScaledVector(forward,(i-3)*.28).add(new THREE.Vector3(0,.9+(i%2)*.35,0)),.9,'fade');st.rotation.y=fighter.rotation.y;st.rotation.z=i%2?.5:-.5;
      }
      burst(T.clone().add(new THREE.Vector3(0,.3,0)),0xc9a773,26);
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
