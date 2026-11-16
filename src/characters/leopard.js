import * as THREE from 'three';
import {mat,toonMat,gold,dark} from '../materials.js';

// 02 forest guardian, redesigned as a leopard: tan fur with dark rosettes, round ears, muzzle and whiskers,
// paws, and a long curled tail (parts.tail, swayed by the presentation layer). Tree / worker / ocean skills are unchanged.
const FUR=0xd9a548, FUR_DARK=0x5b3a1d, CREAM=0xf3e3bd;
export function buildLeopard({root,body,head,hair,add,limbs,parts,weapon,hairMat}){
  hairMat.color.set(0x7a5528);                       // mane-coloured fringe
  body.material=toonMat(FUR);body.scale.set(1.08,1.08,1.0);
  head.material=toonMat(0xe3b85a);head.scale.set(1.18,1.02,1.08);   // broad feline head
  // ears + muzzle + nose + whiskers
  for(const s of [-1,1]){
    add(new THREE.SphereGeometry(.2,14,10),toonMat(FUR),[s*.36,2.6,-.02],[0,0,s*-.3],[1,1,.55]);
    add(new THREE.SphereGeometry(.11,10,8),toonMat(0xd98a88),[s*.36,2.6,.04],[0,0,s*-.3],[1,1,.4]);
    for(let i=0;i<3;i++)add(new THREE.BoxGeometry(.42,.012,.012),toonMat(0xffffff),[s*.5,2.0+(i-1)*.045,.5],[0,s*(.25),(i-1)*.18*s]);
  }
  add(new THREE.SphereGeometry(.21,14,10),toonMat(CREAM),[0,1.97,.52],[0,0,0],[1.3,.8,.8]);
  add(new THREE.SphereGeometry(.06,10,8),toonMat(0x3a2a2a),[0,2.04,.66],[0,0,0],[1.3,.8,.8]);
  // rosette spots on torso sides/back and on the limbs
  let seed=11;const rnd=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
  for(let i=0;i<22;i++){
    const a=Math.PI*.55+rnd()*Math.PI*1.9,y=1.0+rnd()*.6;   // skip the front (covered by the vest)
    add(new THREE.SphereGeometry(.07+rnd()*.04,8,6),toonMat(FUR_DARK),[Math.sin(a)*.45,y,Math.cos(a)*.45],[0,a,0],[1,.8,.3]);
  }
  for(const l of limbs){
    l.material=toonMat(FUR);
    for(let i=0;i<3;i++){const sp=new THREE.Mesh(new THREE.SphereGeometry(.05,8,6),toonMat(FUR_DARK));sp.position.set((i-1)*.07,.14-i*.12,.12);sp.scale.set(1,1,.35);l.add(sp);}
  }
  for(const l of [limbs[1],limbs[3]]){const paw=new THREE.Mesh(new THREE.SphereGeometry(.2,10,8),toonMat(FUR_DARK));paw.position.set(0,-.34,.08);paw.scale.set(1.1,.55,1.4);l.add(paw);}
  // tail: four tapered segments, each rotated a little further so it curls up
  const tail=new THREE.Group();tail.position.set(0,.95,-.42);root.add(tail);let cur=tail;
  for(let i=0;i<4;i++){
    const seg=new THREE.Group();seg.rotation.x=.5;seg.position.z=i?-.32:0;cur.add(seg);
    const m=new THREE.Mesh(new THREE.CylinderGeometry(.075-i*.008,.09-i*.008,.34,8),toonMat(i===3?FUR_DARK:FUR));m.position.z=-.17;m.rotation.x=Math.PI/2;seg.add(m);
    cur=seg;
  }
  parts.tail=tail;
  // worker vest + litter grabber (kept from the original); the grabber ring glows
  add(new THREE.BoxGeometry(.72,.82,.11),mat(0xe0c94f),[0,1.3,.39]);
  add(new THREE.BoxGeometry(.16,.82,.025),mat(0x3d7552),[-.22,1.3,.455]);
  add(new THREE.BoxGeometry(.16,.82,.025),mat(0x3d7552),[.22,1.3,.455]);
  add(new THREE.CylinderGeometry(.025,.035,1.0,8),dark,[.78,1.1,.1],[0,0,-.12]);
  weapon(add(new THREE.TorusGeometry(.11,.025,6,16),gold,[.84,1.62,.1],[Math.PI/2,0,0]),{axis:'z',speed:2.5,glow:0x8eea9a});
}
