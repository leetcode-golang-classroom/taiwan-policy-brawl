import * as THREE from 'three';
import {mat,toonMat,gold,dark} from '../materials.js';

// 04 mage: layered robe, pointed hat with a star, glowing staff orb (spins/glows while charging),
// floating spell book (spins) and rune rings. Round glasses are kept from the lecturer design.
const ROBE=0x34408f, TRIM=0xe8c15a;
export function buildMage({root,body,head,hair,add,limbs,parts,weapon}){
  hair.visible=false;
  body.material=toonMat(ROBE);
  for(const a of [limbs[0],limbs[2]])a.material=toonMat(ROBE);
  // robe skirt + hem trim + belt
  add(new THREE.CylinderGeometry(.46,.8,1.15,22),toonMat(ROBE),[0,.72,0]);
  add(new THREE.CylinderGeometry(.8,.81,.09,22),toonMat(TRIM),[0,.2,0]);
  add(new THREE.CylinderGeometry(.47,.47,.1,18),toonMat(TRIM),[0,1.02,0]);
  add(new THREE.BoxGeometry(.7,.14,.1),toonMat(0x5a3f94),[0,1.74,.42]);   // collar
  // wizard hat: brim, band, bent cone, star
  add(new THREE.CylinderGeometry(.74,.74,.06,24),toonMat(0x2a3270),[0,2.5,0]);
  add(new THREE.CylinderGeometry(.55,.58,.12,20),toonMat(TRIM),[0,2.56,0]);
  add(new THREE.ConeGeometry(.56,.95,20),toonMat(0x2a3270),[0,3.05,0],[0,0,.12]);
  add(new THREE.OctahedronGeometry(.12),gold,[0,2.58,.58]);
  // round glasses
  for(const x of [-.18,.18])add(new THREE.TorusGeometry(.13,.025,7,20),dark,[x,2.13,.43]);
  add(new THREE.BoxGeometry(.08,.025,.025),dark,[0,2.13,.44]);
  // staff in the left hand with a spinning, glowing orb
  add(new THREE.CylinderGeometry(.04,.055,1.75,8),mat(0x7a5530),[-.8,1.3,.15],[0,0,-.08]);
  const orb=add(new THREE.IcosahedronGeometry(.17,1),mat(0x8fd8ff),[-.84,2.22,.15]);
  weapon(orb,{axis:'y',speed:2.2,glow:0x7fd0ff});
  const orbRing=add(new THREE.TorusGeometry(.26,.025,6,24),gold,[-.84,2.22,.15],[Math.PI/3,0,0]);
  weapon(orbRing,{axis:'z',speed:3,glow:0xffe08a});
  // floating spell book (bobs and spins), plus two rune rings at the feet
  const book=new THREE.Group();book.position.set(.86,1.75,.22);root.add(book);
  const cover=new THREE.Mesh(new THREE.BoxGeometry(.5,.08,.38),toonMat(0x4a2c8c));book.add(cover);
  const pages=new THREE.Mesh(new THREE.BoxGeometry(.46,.07,.34),toonMat(0xf6efd8));pages.position.y=.05;book.add(pages);
  const rune=new THREE.Mesh(new THREE.TorusGeometry(.09,.015,6,14),toonMat(0xffe08a));rune.position.y=.1;rune.rotation.x=Math.PI/2;book.add(rune);
  book.rotation.x=.5;
  weapon(rune,{axis:'z',speed:0,glow:0xffe08a});
  parts.weapons.push({obj:book,axis:'y',speed:1.6,bob:.07});
  for(let i=0;i<2;i++)weapon(add(new THREE.TorusGeometry(.95+i*.22,.02,5,40),toonMat(0x9fb4ff),[0,.08,0],[Math.PI/2,0,0]),{axis:'z',speed:(i?-1:1)*.8,glow:0x9fb4ff});
}
