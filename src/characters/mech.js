import * as THREE from 'three';
import {mat,toonMat,gold,dark,white} from '../materials.js';

// 01 AI promoter, redesigned as a blue retro-robot hero (Mega-Man-style visual language):
// armored body/limbs, helmet with crest, arm cannon, mechanical legs, and a golden Buddhist 卍 on the chest plate.
const LEATHER=0x15151a, SHINE=0x3a3a46, JEANS=0x23283a, SILVER=0xc9ced8;

// Buddhist 卍 (counter-clockwise, hooks: top→left, left→down, bottom→right, right→up) built from boxes.
// Coordinates are given as seen by the viewer; the character faces +z so world x is mirrored.
export function addManji(add,material,[cx,cy,cz],L=.2,w=.07){
  const bars=[[0,0,w,2*L],[0,0,2*L,w],[-L/2,L-w/2,L,w],[-L+w/2,-L/2,w,L],[L/2,-L+w/2,L,w],[L-w/2,L/2,w,L]];
  return bars.map(([x,y,bw,bh])=>add(new THREE.BoxGeometry(bw,bh,.05),material,[cx-x,cy+y,cz]));
}
export function buildMech({root,body,head,hair,add,limbs,parts,weapon}){
  // 01 reimagined as a man in a black leather jacket: jacket with popped collar and zipper, jeans, boots,
  // slicked-back hair, sunglasses, and the golden 卍 kept as a badge on the chest.
  hair.material=toonMat(0x0c0c10);
  body.material=toonMat(LEATHER);
  const [armL,legL,armR,legR]=limbs;
  for(const a of [armL,armR]){a.material=toonMat(LEATHER);
    const cuff=new THREE.Mesh(new THREE.CylinderGeometry(.15,.15,.08,10),toonMat(SHINE));cuff.position.set(0,-.26,0);a.add(cuff);
    const zip=new THREE.Mesh(new THREE.BoxGeometry(.03,.3,.03),toonMat(SILVER));zip.position.set(0,-.05,.13);a.add(zip);}
  for(const l of [legL,legR]){
    l.material=toonMat(JEANS);
    const boot=new THREE.Mesh(new THREE.CylinderGeometry(.18,.2,.2,10),toonMat(LEATHER));boot.position.set(0,-.18,0);l.add(boot);
  }
  // jacket: asymmetric front zipper, wide lapels, popped collar, shoulder epaulets, belt, hem
  add(new THREE.BoxGeometry(.9,.95,.12),toonMat(LEATHER),[0,1.3,.46]);
  add(new THREE.BoxGeometry(.04,.9,.03),toonMat(SILVER),[.12,1.3,.54],[0,0,-.1]);
  for(const x of [-1,1]){
    add(new THREE.BoxGeometry(.3,.62,.06),toonMat(SHINE),[x*.27,1.5,.54],[0,0,x*.35]);          // lapel
    add(new THREE.BoxGeometry(.3,.3,.1),toonMat(LEATHER),[x*.3,1.84,.1],[-.2,0,x*.2]);            // popped collar
    add(new THREE.BoxGeometry(.4,.07,.3),toonMat(SHINE),[x*.58,1.72,0],[0,0,x*.4]);               // epaulet
  }
  add(new THREE.BoxGeometry(.95,.08,.5),toonMat(SHINE),[0,.82,.3]);
  add(new THREE.BoxGeometry(.12,.08,.04),toonMat(SILVER),[0,.82,.56]);
  add(new THREE.CylinderGeometry(.5,.5,.1,20),toonMat(LEATHER),[0,.86,0]);
  // slicked-back hair and sunglasses
  add(new THREE.SphereGeometry(.56,20,14,0,Math.PI*2,0,Math.PI*.55),toonMat(0x0c0c10),[0,2.2,-.04]);
  add(new THREE.BoxGeometry(.78,.13,.08),toonMat(0x050507),[0,2.14,.5]);
  for(const x of [-.19,.19])add(new THREE.BoxGeometry(.3,.18,.07),toonMat(0x050507),[x,2.13,.52]);
  // golden 卍 badge on the chest
  add(new THREE.CylinderGeometry(.26,.26,.04,18),toonMat(SHINE),[0,1.3,.545],[Math.PI/2,0,0]);
  addManji(add,gold,[0,1.3,.58],.15,.05);
  // pointed index finger weapon-focus: a chain at the belt that glows when charging
  const chain=new THREE.Mesh(new THREE.TorusGeometry(.14,.025,6,16),toonMat(SILVER));chain.position.set(.66,.9,.25);chain.rotation.y=Math.PI/2;root.add(chain);
  weapon(chain,{axis:'x',speed:1,glow:0xffe9a0});
}
