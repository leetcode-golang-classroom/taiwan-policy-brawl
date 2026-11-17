import * as THREE from 'three';
import {mat,toonMat,toonRamp,floorMat,gold,dark,skin,white,black} from '../materials.js';

// Model props for character "cleric" (layers: base props, outfit, signature silhouette).
export function buildCleric({root,body,head,hair,add,makeCap,accentMat,bodyMat,hairMat,limbs,weapon}){
    add(new THREE.BoxGeometry(.55,.68,.12),dark,[0,1.35,-.48]);
    add(new THREE.BoxGeometry(.4,.035,.025),accentMat,[0,1.55,-.405]);
    add(new THREE.BoxGeometry(.4,.035,.025),accentMat,[0,1.38,-.405]);
    weapon(add(new THREE.TorusGeometry(.16,.025,6,20),accentMat,[0,2.58,0],[Math.PI/2,0,0]),{axis:'z',speed:2,glow:0xfff1a8});   // holy halo
    // Bible held in the right hand: dark cover, gold cross, pages and spine (spins/glows while charging).
    const bible=weapon(add(new THREE.BoxGeometry(.34,.46,.1),mat(0x2b1a12),[.62,1.0,.42],[0,.3,.1]),{axis:'y',speed:1.5,glow:0xffe9a0});
    add(new THREE.BoxGeometry(.3,.42,.07),mat(0xf5ecd0),[.64,1.0,.45],[0,.3,.1]);
    add(new THREE.BoxGeometry(.04,.2,.02),gold,[.6,1.02,.49],[0,.3,.1]);
    add(new THREE.BoxGeometry(.12,.035,.02),gold,[.6,1.06,.49],[0,.3,.1]);
    // Full-length robe: flared white skirt to the floor, gold hem, purple sash, wide sleeves.
    const robe=mat(0xeee9df);
    // Robe stops just above the ground: a single steady skirt, so the legs and boots stepping underneath stay readable.
    add(new THREE.CylinderGeometry(.5,.8,1.05,24),robe,[0,.84,0]);
    add(new THREE.TorusGeometry(.8,.035,6,32),gold,[0,.32,0],[Math.PI/2,0,0]);
    add(new THREE.TorusGeometry(.52,.07,8,24),mat(0x6a3f91),[0,1.06,0],[Math.PI/2,0,0]);
    add(new THREE.BoxGeometry(.2,.95,.05),mat(0x6a3f91),[0,.8,.6],[.2,0,0]);
    for(const side of [-1,1]){add(new THREE.CylinderGeometry(.17,.27,.7,14),robe,[side*.6,1.2,.04],[0,0,side*-.45]);add(new THREE.TorusGeometry(.25,.03,6,16),gold,[side*.73,.9,.07],[Math.PI/2,0,side*-.45]);}
    // Cleric-inspired ceremonial robe: high collar, stole and cross emblem.
    add(new THREE.BoxGeometry(.84,.92,.09),mat(0xeee9df),[0,1.26,.37]);
    add(new THREE.BoxGeometry(.18,.76,.07),mat(0x6a3f91),[-.2,1.3,.44],[0,0,.12]);
    add(new THREE.BoxGeometry(.18,.76,.07),mat(0x6a3f91),[.2,1.3,.44],[0,0,-.12]);
    add(new THREE.BoxGeometry(.08,.28,.045),gold,[0,1.55,.49]);
    add(new THREE.BoxGeometry(.23,.07,.045),gold,[0,1.61,.49]);
    add(new THREE.SphereGeometry(.055,10,8),mat(0xeee9df),[0,2.48,0]);
    add(new THREE.SphereGeometry(.1,10,8),gold,[0,2.58,.12]);
    for(const side of [-1,1]) add(new THREE.SphereGeometry(.14,10,8),white,[side*.22,2.45,-.08],[0,0,side*.5],[1,1.8,.35]);
}
