import * as THREE from 'three';
import {mat,toonMat,gold,dark} from '../materials.js';

// 04 lecturer: bald head, round glasses, charcoal lecturer's jacket over a white shirt and tie, grey trousers,
// polished leather shoes. Props: a telescopic pointer (教鞭, spins/glows while charging) and a thick English textbook.
const SUIT=0x3b4252, TROUSER=0x4a5060, LEATHER=0x2a1a12;
export function buildMage({root,body,head,hair,add,limbs,parts,weapon}){
  hair.visible=false;   // bald
  body.material=toonMat(SUIT);
  for(const a of [limbs[0],limbs[2]]){
    a.material=toonMat(SUIT);
    const cuff=new THREE.Mesh(new THREE.CylinderGeometry(.14,.14,.05,12),toonMat(0xf4f0e6));cuff.position.set(0,-.3,0);a.add(cuff);   // shirt cuff
  }
  // trousers + polished leather shoes (shoe = first child of each leg; add a heel and a gloss highlight)
  for(const l of [limbs[1],limbs[3]]){
    l.material=toonMat(TROUSER);
    l.children[0].material=toonMat(LEATHER);
    const heel=new THREE.Mesh(new THREE.BoxGeometry(.26,.06,.2),toonMat(0x120a06));heel.position.set(0,-.2,-.04);l.add(heel);
    const gloss=new THREE.Mesh(new THREE.SphereGeometry(.05,8,6),mat(0xb99a88,.2,.6));gloss.position.set(0,-.55,.24);gloss.scale.set(1.4,.5,1);l.add(gloss);
  }
  // lecturer's jacket: long front skirt of the coat + lapels + pocket square
  add(new THREE.BoxGeometry(.98,.5,.5),toonMat(SUIT),[0,.98,0]);
  add(new THREE.BoxGeometry(.2,.62,.07),toonMat(0x2b303c),[-.2,1.45,.44],[0,0,-.12]);
  add(new THREE.BoxGeometry(.2,.62,.07),toonMat(0x2b303c),[.2,1.45,.44],[0,0,.12]);
  add(new THREE.BoxGeometry(.12,.07,.03),toonMat(0xd05a5a),[.3,1.5,.49]);        // pocket square
  add(new THREE.BoxGeometry(.075,.075,.03),gold,[-.28,1.52,.49]);               // lecturer's badge
  // round glasses
  for(const x of [-.18,.18])add(new THREE.TorusGeometry(.13,.025,7,20),dark,[x,2.13,.43]);
  add(new THREE.BoxGeometry(.08,.025,.025),dark,[0,2.13,.44]);
  // telescopic pointer in the right hand
  const ptr=weapon(add(new THREE.CylinderGeometry(.018,.025,1.5,8),mat(0xc9ced6,.35,.6),[.82,1.3,.3],[.5,0,-.08]),{axis:'y',speed:1.4,glow:0xffd68b});
  const tip=new THREE.Mesh(new THREE.SphereGeometry(.045,8,6),toonMat(0xd05a5a));tip.position.y=.76;ptr.add(tip);
  // thick English textbook held in the left hand
  const book=new THREE.Group();book.position.set(-.78,1.2,.38);book.rotation.set(-.35,.25,.2);root.add(book);
  book.add(new THREE.Mesh(new THREE.BoxGeometry(.5,.62,.1),toonMat(0x8d3d50)));
  const pg=new THREE.Mesh(new THREE.BoxGeometry(.44,.56,.08),toonMat(0xf6efd8));pg.position.set(.02,0,0);book.add(pg);
  const lab=new THREE.Mesh(new THREE.BoxGeometry(.3,.1,.02),toonMat(0xe8c15a));lab.position.set(0,.16,.06);book.add(lab);
}
