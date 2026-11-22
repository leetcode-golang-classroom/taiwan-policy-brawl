import * as THREE from 'three';
import {burst,delay,throwProjectile} from '../vfx/VFXSystem.js';

const FIRE=[0xff4a1c,0xff8a1f,0xffc93c];
export function skillCleric({fighter,target,projectile,mesh},type){
    const ground=target.position.clone();
    if(type==='skill'){
      // 神的啟示: Tatun volcano erupts under the opponent, throwing them up in flames.
      mesh(new THREE.ConeGeometry(1.5,1.6,16),0x5a3b2a,ground.clone().add(new THREE.Vector3(0,.8,0)),1.0,'grow');
      mesh(new THREE.CylinderGeometry(.18,.9,6,14),0xff6a1f,ground.clone().add(new THREE.Vector3(0,3,0)),.9,'grow',{opacity:.7});
      const ring=mesh(new THREE.TorusGeometry(1.3,.12,8,32),0xff8a1f,ground.clone().add(new THREE.Vector3(0,.12,0)),.8,'ring');ring.rotation.x=Math.PI/2;
      for(let i=0;i<14;i++){
        const a=i*2.4,rock=new THREE.Mesh(i%2?new THREE.DodecahedronGeometry(.22):new THREE.SphereGeometry(.2,8,6),new THREE.MeshBasicMaterial({color:FIRE[i%3],transparent:true,opacity:.98,depthWrite:false}));
        rock.position.copy(ground).add(new THREE.Vector3(0,.5,0));
        throwProjectile(rock,new THREE.Vector3(Math.cos(a)*(1+i%3),7+(i%4)*1.2,Math.sin(a)*(1+i%3)),1.3,5,-9);
      }
      burst(ground.clone().add(new THREE.Vector3(0,.8,0)),0xff6a1f,40);
    } else {
      // 火箭工程: a rocket bursts out of the ground, rams the opponent into the sky and explodes.
      const base=ground.clone().add(new THREE.Vector3(0,1,0)),up=new THREE.Vector3(0,14,0);
      const part=(geo,color,off)=>{const m=projectile(geo,color,base.clone().add(off),up,.9,0);m.rotation.set(0,0,0);return m;};
      part(new THREE.CylinderGeometry(.42,.42,2.4,16),0xf2f2f2,new THREE.Vector3(0,0,0));
      part(new THREE.ConeGeometry(.42,1,16),0xd8353a,new THREE.Vector3(0,1.7,0));
      part(new THREE.CylinderGeometry(.43,.43,.3,16),0x2f6fd8,new THREE.Vector3(0,.4,0));
      for(let i=0;i<3;i++){const a=i*Math.PI*2/3,f=part(new THREE.BoxGeometry(.08,.8,.5),0xd8353a,new THREE.Vector3(Math.cos(a)*.5,-.9,Math.sin(a)*.5));f.rotation.y=-a;}
      part(new THREE.ConeGeometry(.35,1.8,12),0xffa22b,new THREE.Vector3(0,-2,0)).rotation.x=Math.PI;
      const ring=mesh(new THREE.TorusGeometry(1.6,.14,8,32),0xffc93c,ground.clone().add(new THREE.Vector3(0,.12,0)),.8,'ring');ring.rotation.x=Math.PI/2;
      burst(ground.clone().add(new THREE.Vector3(0,.6,0)),0xffc93c,36);
      // Sky explosion where the opponent is carried.
      const sky=ground.clone().add(new THREE.Vector3(0,8.5,0));
      delay(()=>{burst(sky,0xff4a1c,50);burst(sky,0xffc93c,40);},420);
    }
}
