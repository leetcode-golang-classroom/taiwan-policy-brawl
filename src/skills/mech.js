import * as THREE from 'three';
import {burst,delay,throwProjectile,addFx} from '../vfx/VFXSystem.js';

export function skillMech({fighter,target,forward,origin,center,right,projectile,mesh},type){
    if(type==='basic'){
      // AI 基礎建設: seven NVIDIA GPU cards pop out of the ground around the opponent, then keep firing green beams from seven different angles that converge on them.
      const tp=target.position.clone(),aim=tp.clone().add(new THREE.Vector3(0,1.15,0)),Y=new THREE.Vector3(0,1,0);
      const cards=[];
      for(let i=0;i<7;i++){
        const a=i/7*Math.PI*2+.3,dir=new THREE.Vector3(Math.sin(a),0,Math.cos(a)),base=tp.clone().addScaledVector(dir,3.2);
        const yaw=Math.atan2(-dir.x,-dir.z),face=new THREE.Vector3(-dir.x,0,-dir.z);
        const g=(geo,color,off,rot=[0,0,0])=>{const m=mesh(geo,color,base.clone().add(off),1.4,'fade');m.rotation.set(...rot);m.rotation.y+=yaw;return m;};
        g(new THREE.BoxGeometry(.2,1.0,1.1),0x1d2b3c,new THREE.Vector3(0,.65,0),[0,0,0]);                                           // PCB / shroud
        g(new THREE.BoxGeometry(.06,.5,.7),0x76d64b,face.clone().multiplyScalar(.12).add(new THREE.Vector3(0,.72,0)));                // green accent panel
        for(const dz of [-.28,.28])g(new THREE.CylinderGeometry(.2,.2,.05,16),0x0e1520,face.clone().multiplyScalar(.14).add(new THREE.Vector3(0,.5,0)).addScaledVector(new THREE.Vector3(-face.z,0,face.x),dz),[0,0,Math.PI/2]);   // fans
        mesh(new THREE.TorusGeometry(.5,.05,6,20),0xb9936a,base.clone().add(new THREE.Vector3(0,.08,0)),.6,'ring',{rotation:[Math.PI/2,0,0]});   // upheaval ring
        burst(base.clone().add(new THREE.Vector3(0,.3,0)),0x9b7a52,10);
        cards.push(base.clone().add(new THREE.Vector3(0,.95,0)));
      }
      const fire=(i)=>{const from=cards[i],len=from.distanceTo(aim);
        const beam=mesh(new THREE.CylinderGeometry(.08,.08,len,8),i%2?0x9bff6f:0x76d64b,from.clone().lerp(aim,.5),.2,'fade');
        beam.quaternion.setFromUnitVectors(Y,aim.clone().sub(from).normalize());
        mesh(new THREE.SphereGeometry(.18,8,6),0xe9ffd8,from.clone(),.18,'grow');};
      for(let r=0;r<3;r++)for(let i=0;i<7;i++)delay(()=>{fire(i);if(i===6)burst(aim,0x9bff6f,16);},120+r*260+i*30);   // repeated sweeps of seven beams
      burst(aim,0x74e78b,20);
    } else if(type==='skill'){
      // 交通捷運四通八達: metro line segments (red/blue/green/orange/brown) rush in from every direction and blast the opponent away.
      const tp=target.position.clone(),lines=[0xe3002c,0x0070bd,0x008659,0xf8b61c,0xc48c31,0xa0d443];
      const rays=12,carLen=1.5,cars=4;
      for(let r=0;r<rays;r++){
        const a=r/rays*Math.PI*2+.13,dir=new THREE.Vector3(Math.cos(a),0,Math.sin(a)),color=lines[r%lines.length],v=dir.clone().multiplyScalar(-14),yaw=Math.atan2(dir.x,dir.z);
        mesh(new THREE.BoxGeometry(.5,.04,9),color,tp.clone().addScaledVector(dir,4.5).add(new THREE.Vector3(0,.05,0)),1.1,'fade').rotation.y=yaw;   // lit track
        for(let c=0;c<cars;c++){
          const p=tp.clone().addScaledVector(dir,7+c*(carLen+.12)).add(new THREE.Vector3(0,.85,0));
          projectile(new THREE.BoxGeometry(.95,.95,carLen),0xf2f4f7,p,v,.8,0).rotation.y=yaw;
          projectile(new THREE.BoxGeometry(1.0,.2,carLen+.02),color,p.clone().add(new THREE.Vector3(0,-.1,0)),v,.8,0).rotation.y=yaw;
          projectile(new THREE.BoxGeometry(.98,.26,carLen*.8),0x7fd6ff,p.clone().add(new THREE.Vector3(0,.2,0)),v,.8,0).rotation.y=yaw;
          if(c===0)projectile(new THREE.SphereGeometry(.14,8,6),0xfff7b0,p.clone().addScaledVector(dir,-carLen*.5).add(new THREE.Vector3(0,-.1,0)),v,.8,0);
        }
      }
      mesh(new THREE.TorusGeometry(1.4,.12,8,36),0xffffff,tp.clone().add(new THREE.Vector3(0,.12,0)),1.1,'ring',{rotation:[Math.PI/2,0,0]});
      mesh(new THREE.TorusGeometry(1.4,.12,8,36),0xf8b61c,tp.clone().add(new THREE.Vector3(0,.12,0)),1.4,'ring',{rotation:[Math.PI/2,0,0]});
      mesh(new THREE.SphereGeometry(1.5,20,14),0xe9fbff,tp.clone().add(new THREE.Vector3(0,1.2,0)),.7,'grow',{opacity:.5});
      burst(tp.clone().add(new THREE.Vector3(0,1,0)),0xffffff,50);
    } else {
      // Milk bottle and giant egg erupt from the ground and bounce toward the rival.
      const p= fighter.position.clone().addScaledVector(forward,1.1).add(new THREE.Vector3(0,.15,0));
      const bottle=projectile(new THREE.CylinderGeometry(.34,.48,1.55,16),0xf4f1df,p.clone().addScaledVector(right,-.62),forward.clone().multiplyScalar(4.8).add(new THREE.Vector3(0,5.8,0)),1.35,5,-10.5);
      projectile(new THREE.CylinderGeometry(.19,.19,.24,12),0x4e9fd4,bottle.position.clone().add(new THREE.Vector3(0,.85,0)),forward.clone().multiplyScalar(4.8).add(new THREE.Vector3(0,5.8,0)),1.35,5,-10.5);
      projectile(new THREE.SphereGeometry(.72,20,16),0xffe5a8,p.clone().addScaledVector(right,.65),forward.clone().multiplyScalar(5.2).add(new THREE.Vector3(0,6.2,0)),1.35,5,-10.5);
      burst(p,0xffe5a8,42);
    }
}
