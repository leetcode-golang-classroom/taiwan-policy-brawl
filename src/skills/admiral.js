import * as THREE from 'three';
import {burst,throwProjectile,addFx} from '../vfx/VFXSystem.js';

// ---- Visuals that follow the logical projectile every frame (so they stay exactly in sync with hit tests) ----
const PIPS={1:[[0,0]],2:[[-1,1],[1,-1]],3:[[-1,1],[0,0],[1,-1]],4:[[-1,1],[1,1],[-1,-1],[1,-1]],5:[[-1,1],[1,1],[0,0],[-1,-1],[1,-1]],6:[[-1,1],[1,1],[-1,0],[1,0],[-1,-1],[1,-1]]};
// opposite faces add up to 7: +z=1, -z=6, +x=2, -x=5, +y=3, -y=4
const FACES=[[1,[0,0,1]],[6,[0,0,-1]],[2,[1,0,0]],[5,[-1,0,0]],[3,[0,1,0]],[4,[0,-1,0]]];
// 乾坤一擲: a giant tumbling die.
export function buildDie(size=1.5){
  const g=new THREE.Group();
  g.add(new THREE.Mesh(new THREE.BoxGeometry(size,size,size),new THREE.MeshBasicMaterial({color:0xf7f3e6})));
  g.add(new THREE.Mesh(new THREE.BoxGeometry(size*1.04,size*1.04,size*1.04),new THREE.MeshBasicMaterial({color:0xffd36c,wireframe:true})));
  for(const [n,[x,y,z]] of FACES)for(const [u,v] of PIPS[n]){
    const pip=new THREE.Mesh(new THREE.CircleGeometry(size*.09,14),new THREE.MeshBasicMaterial({color:n===1?0xd0332f:0x1b1b22,side:THREE.DoubleSide}));
    const q=new THREE.Vector3(x,y,z),a=new THREE.Vector3(1,0,0),b=new THREE.Vector3(0,1,0);
    if(x){a.set(0,0,1);b.set(0,1,0);}else if(y){a.set(1,0,0);b.set(0,0,1);}
    pip.position.copy(q).multiplyScalar(size*.502).addScaledVector(a,u*size*.26).addScaledVector(b,v*size*.26);
    pip.lookAt(pip.position.clone().add(q));g.add(pip);
  }
  g.userData.update=(t)=>{g.rotation.set(t*9,t*6,t*3);};
  return g;
}
// 紅中旋風: a red-dragon (中) tile; the three tiles of a volley orbit the flight axis in a helix.
export function buildZhongTile(stage=0){
  const outer=new THREE.Group(),tile=new THREE.Group();outer.add(tile);
  tile.add(new THREE.Mesh(new THREE.BoxGeometry(.62,.84,.26),new THREE.MeshBasicMaterial({color:0xf5f0d9})));
  tile.add(new THREE.Mesh(new THREE.BoxGeometry(.5,.7,.03),new THREE.MeshBasicMaterial({color:0x2c8a57})).translateZ(.12));
  const red=new THREE.MeshBasicMaterial({color:0xd0332f});   // 「中」 drawn with bars
  for(const [w,h,x,y] of [[.3,.05,0,.12],[.3,.05,0,-.12],[.05,.29,-.15,0],[.05,.29,.15,0],[.05,.5,0,0]]){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,.03),red);m.position.set(x,y,.145);tile.add(m);}
  outer.userData.heading=true;
  outer.userData.update=(t)=>{
    const a=stage*Math.PI*2/3+t*11;
    tile.position.set(Math.cos(a)*.7,Math.sin(a)*.7,0);   // helix around the flight axis (local z follows heading)
    tile.rotation.set(0,0,a+Math.PI/2+t*4);
  };
  return outer;
}
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
