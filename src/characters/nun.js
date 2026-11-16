import * as THREE from 'three';
import {mat,toonMat,toonRamp,floorMat,gold,dark,skin,white,black} from '../materials.js';

// Model props for character "nun" (layers: base props, outfit, signature silhouette).
export function buildNun({root,body,head,hair,add,makeCap,accentMat,bodyMat,hairMat,weapon}){
    add(new THREE.BoxGeometry(.62,.78,.1),dark,[0,1.3,-.48]);
    add(new THREE.BoxGeometry(.48,.035,.025),accentMat,[0,1.56,-.41]);
    add(new THREE.BoxGeometry(.48,.035,.025),accentMat,[0,1.38,-.41]);
    // 光明使者 (nun): white habit, white wimple and veil, large cross, rosary, glowing halo.
    const habit=mat(0xf7f4ee),linen=mat(0xffffff),trim=mat(0xb9d4f2);
    add(new THREE.BoxGeometry(.86,1.0,.1),habit,[0,1.25,.4]);                                  // white habit front
    add(new THREE.BoxGeometry(.5,.3,.1),trim,[0,1.62,.45]);                                   // white collar bib
    add(new THREE.BoxGeometry(.1,.46,.05),gold,[0,1.3,.5]);                                    // cross
    add(new THREE.BoxGeometry(.3,.09,.05),gold,[0,1.4,.5]);
    for(let i=0;i<7;i++){const a=i/6*Math.PI;add(new THREE.SphereGeometry(.035,8,6),mat(0xb8d8ff),[Math.cos(a)*.3,1.8-Math.sin(a)*.2,.47]);}   // rosary beads
    add(new THREE.CylinderGeometry(.4,.4,.12,16),linen,[0,2.38,0]);                            // coif band
    add(new THREE.SphereGeometry(.38,16,10,0,Math.PI*2,0,Math.PI/2),habit,[0,2.4,-.02]);        // white veil
    add(new THREE.BoxGeometry(.78,.9,.08),habit,[0,1.95,-.4],[.12,0,0]);                       // veil falling behind
    add(new THREE.BoxGeometry(.5,.1,.06),trim,[0,2.46,.3]);                                   // white headband
    add(new THREE.CylinderGeometry(.03,.03,1.5,8),gold,[.9,1.1,.2],[0,0,-.1]);                  // crosier staff
    weapon(add(new THREE.SphereGeometry(.17,14,10),mat(0xfff6c8),[.93,1.92,.2]),{axis:'y',speed:1.5,glow:0xfff1a8});            // light orb on the staff
}
