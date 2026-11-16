import * as THREE from 'three';
import {mat,toonMat,gold,dark,white} from '../materials.js';

// 01 AI promoter, redesigned as a blue retro-robot hero (Mega-Man-style visual language):
// armored body/limbs, helmet with crest, arm cannon, mechanical legs, and a golden Buddhist 卍 on the chest plate.
const BLUE=0x2f6fd6, DEEP=0x1f4fa8, LIGHT=0x6db8ff, CYAN=0x7df3ff;

// Buddhist 卍 (counter-clockwise, hooks: top→left, left→down, bottom→right, right→up) built from boxes.
// Coordinates are given as seen by the viewer; the character faces +z so world x is mirrored.
export function addManji(add,material,[cx,cy,cz],L=.2,w=.07){
  const bars=[[0,0,w,2*L],[0,0,2*L,w],[-L/2,L-w/2,L,w],[-L+w/2,-L/2,w,L],[L/2,-L+w/2,L,w],[L-w/2,L/2,w,L]];
  return bars.map(([x,y,bw,bh])=>add(new THREE.BoxGeometry(bw,bh,.05),material,[cx-x,cy+y,cz]));
}
export function buildMech({root,body,head,hair,add,limbs,parts,weapon}){
  hair.visible=false;
  body.material=toonMat(BLUE);
  const [armL,legL,armR,legR]=limbs;
  for(const a of [armL,armR])a.material=toonMat(BLUE);
  for(const l of [legL,legR]){
    l.material=toonMat(DEEP);
    const knee=new THREE.Mesh(new THREE.BoxGeometry(.34,.17,.32),toonMat(LIGHT));knee.position.set(0,.06,.04);l.add(knee);   // knee guard follows the leg
    const shin=new THREE.Mesh(new THREE.BoxGeometry(.1,.3,.06),toonMat(CYAN));shin.position.set(0,-.12,.17);l.add(shin);        // mechanical shin light
  }
  // helmet: dome, ear pads, crest fin, visor rim
  add(new THREE.SphereGeometry(.58,24,16,0,Math.PI*2,0,Math.PI*.56),toonMat(BLUE),[0,2.2,-.02]);
  for(const x of [-.56,.56])add(new THREE.CylinderGeometry(.15,.15,.12,14),toonMat(CYAN),[x,2.12,0],[0,0,Math.PI/2]);
  add(new THREE.BoxGeometry(.09,.42,.55),toonMat(LIGHT),[0,2.78,-.06],[-.15,0,0]);
  add(new THREE.BoxGeometry(.74,.075,.1),toonMat(CYAN),[0,2.4,.43]);
  // chest plate with the 卍 mark
  add(new THREE.BoxGeometry(.86,.88,.13),toonMat(BLUE),[0,1.3,.47]);
  add(new THREE.BoxGeometry(.86,.07,.14),toonMat(LIGHT),[0,1.7,.47]);
  add(new THREE.BoxGeometry(.86,.07,.14),toonMat(LIGHT),[0,.9,.47]);
  addManji(add,gold,[0,1.3,.55]);
  for(const x of [-.6,.6])add(new THREE.SphereGeometry(.2,14,10),toonMat(LIGHT),[x,1.66,0]);   // shoulder armor
  // arm cannon on the right forearm: barrel + glowing muzzle ring
  const cannon=new THREE.Mesh(new THREE.CylinderGeometry(.17,.2,.42,14),toonMat(DEEP));cannon.position.set(0,-.3,.06);armR.add(cannon);
  const muzzle=new THREE.Mesh(new THREE.TorusGeometry(.17,.045,8,18),toonMat(CYAN));muzzle.position.set(0,-.52,.06);muzzle.rotation.x=Math.PI/2;armR.add(muzzle);
  weapon(muzzle,{axis:'z',speed:0,glow:CYAN});
  // AI promoter kit: glowing GPU board (spins while charging), stylized dome and fresh-milk carton.
  const gpu=new THREE.Group();gpu.position.set(-.72,1.22,.12);root.add(gpu);
  const board=new THREE.Mesh(new THREE.BoxGeometry(.5,.42,.1),toonMat(0x183a2b));gpu.add(board);
  const chip=new THREE.Mesh(new THREE.BoxGeometry(.34,.26,.045),toonMat(0x76d96b));chip.position.set(0,.01,.07);gpu.add(chip);
  for(let i=0;i<4;i++){const f=new THREE.Mesh(new THREE.BoxGeometry(.035,.12,.025),toonMat(0xffc15c));f.position.set(-.16+i*.105,.01,.1);gpu.add(f);}
  weapon(chip,{axis:'z',speed:0,glow:0x76d96b});
  parts.weapons.push({obj:gpu,axis:'y',speed:.9});
  add(new THREE.SphereGeometry(.42,20,12,0,Math.PI*2,0,Math.PI/2),mat(0xb7d9e9,.3,.15),[.68,1.7,-.02]);
  add(new THREE.BoxGeometry(.34,.52,.28),white,[.7,.92,.16]);
  add(new THREE.BoxGeometry(.22,.08,.02),mat(0x3c83bf),[.7,1.05,.31]);
  add(new THREE.CylinderGeometry(.06,.06,.05,8),white,[.7,1.21,.16]);
}
