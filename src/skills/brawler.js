import * as THREE from 'three';
import {burst,throwProjectile,addFx} from '../vfx/VFXSystem.js';
import {humanQ,place,dispose,tween,later} from './bubble.js';

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
      mesh(new THREE.BoxGeometry(.22,.26,.04),0xff8fb8,base.clone().add(new THREE.Vector3(-sd*.02,h*.6,sd*0).addScaledVector(side,-sd*.36)),1.0,'grow');
      mesh(new THREE.SphereGeometry(.1,8,6),0xe02b2b,base.clone().add(new THREE.Vector3(0,h*.9,0)).addScaledVector(side,-sd*.4),1.0,'grow');   // red lantern
    }
    // the aunties: Q-version middle-aged ladies (grey perm, heavy rouge, red lipstick, tight floral dress, handbag and hanky).
    // They pour out of the alley mouth from both sides, converge on the target and flail at them.
    const V=(x,y,z)=>new THREE.Vector3(x,y,z);
    const dresses=[0xd8335f,0x8a4fc4,0xe58a2a,0x2f9d8f],figs=[];
    for(let i=0;i<8;i++){
      const sd=i%2?1:-1,row=Math.floor(i/2);
      const start=tp.clone().addScaledVector(side,sd*(2.6+row*.4)).addScaledVector(dirT,(row-1.5)*.7);start.y=0;
      const g=humanQ('aunt',{dress:dresses[row]});place(g,start,tp);figs.push(g);
      const {arms,legs}=g.userData.parts,to=tp.clone().setY(0),dir=to.clone().sub(start),len=Math.max(0,dir.length()-1.0);dir.normalize();
      burst(start.clone().add(V(0,.8,0)),0xffd0e0,6);
      tween(700,t=>{g.position.copy(start).addScaledVector(dir,len*t);legs[0].rotation.x=Math.sin(t*14)*.7;legs[1].rotation.x=-Math.sin(t*14)*.7;arms[0].rotation.x=-1.2*t;arms[1].rotation.x=-1.4*t;g.position.y=Math.abs(Math.sin(t*14))*.12;},()=>{
        legs.forEach(l=>l.rotation.x=0);tween(520,t=>{const w=Math.sin(t*16+i);arms[0].rotation.x=-1.2+w*.4;arms[1].rotation.x=-1.4-w*.4;g.position.y=0;});});
    }
    later(1400,()=>figs.forEach(dispose));
    mesh(new THREE.TorusGeometry(.9,.08,8,32),0xffe08a,tp.clone().add(new THREE.Vector3(0,.12,0)),.8,'ring',{rotation:[Math.PI/2,0,0]});
    return;
  }
  // 健身獎牌投擲: the medals hanging on his chest are yanked off and hurled at the opponent in a spinning fan.
  const chest=fighter.position.clone().add(new THREE.Vector3(0,1.55,0)).addScaledVector(forward,.45);
  const tp=target?target.position.clone().add(new THREE.Vector3(0,1.2,0)):chest.clone().addScaledVector(forward,6);
  const aim=tp.clone().sub(chest);const dist=Math.max(1.5,aim.length());aim.normalize();
  const FLIGHT=.5,speed=dist/FLIGHT;
  burst(chest,0xffd65c,18);
  for(let i=0;i<9;i++){
    const spread=(i-4)*.12,lift=((i%3)-1)*.1,vel=aim.clone().addScaledVector(right,spread).add(new THREE.Vector3(0,lift,0)).normalize().multiplyScalar(speed*(.92+(i%4)*.05));
    const start=chest.clone().addScaledVector(right,(i-4)*.07).add(new THREE.Vector3(0,((i%3)-1)*.08,0));
    const r=.2+(i%3)*.06;
    const disc=projectile(new THREE.CylinderGeometry(r,r,.05,22),i%2?0xffd65c:0xe8b84a,start,vel,.75,14,0);disc.rotation.x=Math.PI/2;
    projectile(new THREE.CylinderGeometry(r*.6,r*.6,.06,18),0xfff0a8,start,vel,.75,14,0).rotation.x=Math.PI/2;   // embossed centre
    projectile(new THREE.BoxGeometry(.06,.34,.02),i%2?0xe34d55:0x3c75bf,start.clone().addScaledVector(aim,-.28),vel,.75,0,0);   // trailing ribbon
  }
  mesh(new THREE.RingGeometry(.5,.62,28),0xffd65c,chest.clone().addScaledVector(aim,.4),.5,'ring',{rotation:[0,fighter.rotation.y,0]});
}
