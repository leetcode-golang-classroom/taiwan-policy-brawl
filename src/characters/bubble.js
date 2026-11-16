import * as THREE from 'three';
import {mat,toonMat,toonRamp,floorMat,gold,dark,skin,white,black} from '../materials.js';

// Model props for character "bubble" (layers: base props, outfit, signature silhouette).
export function buildBubble({root,body,head,hair,add,makeCap,accentMat,bodyMat,hairMat,weapon}){
    add(new THREE.BoxGeometry(.5,.62,.1),dark,[0,1.28,-.48]);
    add(new THREE.BoxGeometry(.36,.04,.025),accentMat,[0,1.5,-.41]);
    add(new THREE.SphereGeometry(.16,12,10),gold,[0,1.84,.38]);
    // Family-planning campaign salesperson: bright sales vest, product sample case and discreet red package icon.
    add(new THREE.BoxGeometry(.82,.88,.1),mat(0x8b526b),[0,1.28,.38]);
    add(new THREE.BoxGeometry(.22,.88,.04),mat(0xf0d7e1),[-.2,1.28,.45]);
    add(new THREE.BoxGeometry(.22,.88,.04),mat(0xf0d7e1),[.2,1.28,.45]);
    add(new THREE.BoxGeometry(.48,.56,.18),mat(0xf2eee8),[.72,1.02,.06]);
    add(new THREE.BoxGeometry(.34,.12,.025),mat(0xc84c57),[.72,1.2,.16]);
    weapon(add(new THREE.TorusGeometry(.13,.025,6,20),mat(0xc84c57),[.72,.94,.17],[Math.PI/2,0,0]),{axis:'z',speed:2,glow:0xe8b6dc});   // ribbon ring
    add(new THREE.SphereGeometry(.07,10,8),mat(0xc84c57),[.72,.94,.18]);
    add(new THREE.BoxGeometry(.64,.74,.1),mat(0xf4eee8),[.72,1.18,.14]);
    add(new THREE.BoxGeometry(.48,.12,.025),mat(0x8e5b9b),[.72,1.43,.205]);
    add(new THREE.TorusGeometry(.15,.035,7,20),mat(0xc85a7a),[.72,1.08,.22],[Math.PI/2,0,0]);
    add(new THREE.SphereGeometry(.1,10,8),mat(0xc85a7a),[.72,1.08,.24]);
}
