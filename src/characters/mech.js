import * as THREE from 'three';
import {mat,toonMat,gold,dark,white} from '../materials.js';

// 01 AI promoter: a handsome, athletic man with neat short hair, in a tailored navy suit and sporty details
// (white sneakers, side-stripe trousers, wristbands), with the golden 卍 kept as a small lapel badge.
const SUIT=0x1c2b4d, SUIT_DARK=0x121c33, SHINE=0x2f4372, SILVER=0xc9ced8, WHITE=0xf6f7fb, SKIN=0xffd6c2;

// Buddhist 卍 (counter-clockwise, hooks: top→left, left→down, bottom→right, right→up) built from boxes.
// Coordinates are given as seen by the viewer; the character faces +z so world x is mirrored.
export function addManji(add,material,[cx,cy,cz],L=.2,w=.07){
  const bars=[[0,0,w,2*L],[0,0,2*L,w],[-L/2,L-w/2,L,w],[-L+w/2,-L/2,w,L],[L/2,-L+w/2,L,w],[L-w/2,L/2,w,L]];
  return bars.map(([x,y,bw,bh])=>add(new THREE.BoxGeometry(bw,bh,.05),material,[cx-x,cy+y,cz]));
}
export function buildMech({root,body,head,hair,add,limbs,parts,weapon,accentMat,hairMat}){
  hairMat.color.set(0x15110f);                       // near-black short hair
  accentMat.color.set(SUIT_DARK);                    // base lapels / collar ring follow the suit colour
  body.material=toonMat(SUIT);
  const [armL,legL,armR,legR]=limbs;
  for(const a of [armL,armR]){
    a.material=toonMat(SUIT);
    a.children[0].material=toonMat(SKIN);                                                        // bare hand
    const band=new THREE.Mesh(new THREE.CylinderGeometry(.145,.145,.1,12),toonMat(WHITE));band.position.set(0,-.16,0);a.add(band);   // sport wristband
    const cuff=new THREE.Mesh(new THREE.CylinderGeometry(.145,.145,.03,12),toonMat(0xff6a3d));cuff.position.set(0,-.1,0);a.add(cuff);
  }
  for(const [i,l] of [[-1,legL],[1,legR]]){
    l.material=toonMat(SUIT);
    l.children[0].material=toonMat(WHITE);                                                       // white sneakers
    const sole=new THREE.Mesh(new THREE.BoxGeometry(.3,.05,.46),toonMat(0xff6a3d));sole.position.set(0,-.2,.1);l.add(sole);
    const stripe=new THREE.Mesh(new THREE.BoxGeometry(.03,.62,.04),toonMat(WHITE));stripe.position.set(i*.158,.0,0);l.add(stripe);   // track-suit side stripe
  }
  // short, tidy hair: hide the long side locks and add a swept-up front quiff and trimmed sideburns
  root.children.forEach(c=>{if(c.geometry?.type==='ConeGeometry'&&Math.abs(Math.abs(c.position.x)-.43)<.02&&Math.abs(c.position.y-2.08)<.02)c.visible=false;});
  const quiff=add(new THREE.SphereGeometry(.3,14,10),hairMat,[.06,2.76,.16],[-.35,0,-.2],[1.35,.62,1.15]);
  void quiff;
  for(const x of [-1,1])add(new THREE.BoxGeometry(.07,.2,.1),hairMat,[x*.47,2.1,.12]);
  // tailored jacket: structured shoulders, notch lapels, white shirt + tie from the base, buttons, pocket square
  for(const x of [-1,1]){
    add(new THREE.SphereGeometry(.2,12,10),toonMat(SUIT),[x*.5,1.74,0],[0,0,0],[1.15,.8,1]);    // broad athletic shoulders
    add(new THREE.BoxGeometry(.2,.62,.07),toonMat(SHINE),[x*.2,1.5,.45],[0,0,x*-.2]);             // lapel
    add(new THREE.SphereGeometry(.035,8,6),toonMat(SILVER),[x*.12,1.1,.47]);                      // buttons
  }
  add(new THREE.BoxGeometry(.2,.1,.05),toonMat(WHITE),[-.3,1.52,.48],[0,0,.15]);                  // pocket square
  add(new THREE.BoxGeometry(.9,.05,.45),toonMat(SUIT_DARK),[0,.9,.25]);                           // jacket hem shadow
  // small golden 卍 lapel badge
  add(new THREE.CylinderGeometry(.1,.1,.03,16),toonMat(SHINE),[.3,1.38,.48],[Math.PI/2,0,0]);
  addManji(add,gold,[.3,1.38,.5],.06,.02);
  // stopwatch on a lanyard at the hip: glows when charging
  const chain=new THREE.Mesh(new THREE.TorusGeometry(.14,.025,6,16),toonMat(SILVER));chain.position.set(.66,.9,.25);chain.rotation.y=Math.PI/2;root.add(chain);
  weapon(chain,{axis:'x',speed:1,glow:0xffe9a0});
}
