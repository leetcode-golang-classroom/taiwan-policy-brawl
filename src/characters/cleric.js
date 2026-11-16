import * as THREE from 'three';
import {mat,toonMat,toonRamp,floorMat,gold,dark,skin,white,black} from '../materials.js';

// Model props for character "cleric" (layers: base props, outfit, signature silhouette).
export function buildCleric({root,body,head,hair,add,makeCap,accentMat,bodyMat,hairMat,weapon}){
    add(new THREE.BoxGeometry(.55,.68,.12),dark,[0,1.35,-.48]);
    add(new THREE.BoxGeometry(.4,.035,.025),accentMat,[0,1.55,-.405]);
    add(new THREE.BoxGeometry(.4,.035,.025),accentMat,[0,1.38,-.405]);
    weapon(add(new THREE.TorusGeometry(.16,.025,6,20),accentMat,[0,2.58,0],[Math.PI/2,0,0]),{axis:'z',speed:2,glow:0xfff1a8});   // holy halo
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
