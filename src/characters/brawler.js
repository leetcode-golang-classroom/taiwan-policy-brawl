import * as THREE from 'three';
import {mat,toonMat,toonRamp,floorMat,gold,dark,skin,white,black} from '../materials.js';

// Model props for character "brawler" (layers: base props, outfit, signature silhouette).
export function buildBrawler({root,body,head,hair,add,makeCap,accentMat,bodyMat,hairMat,weapon}){
    add(new THREE.SphereGeometry(.28,12,10),accentMat,[0,1.84,-.02],[0,0,0],[1,.55,.65]);
    add(new THREE.BoxGeometry(.2,.62,.12),gold,[.48,1.28,.02],[0,0,-.5]);
    add(new THREE.BoxGeometry(.2,.62,.12),gold,[-.48,1.28,.02],[0,0,.5]);
    // Muscular nightlife raconteur: broad shoulders, sleeveless shirt, gold chain and open floral jacket.
    body.scale.set(1.42,1.12,1.1);
    for(const side of [-1,1]){
      add(new THREE.SphereGeometry(.27,14,12),skin,[side*.56,1.48,.02],[0,0,side*.2],[1.25,1,.9]);
      add(new THREE.BoxGeometry(.22,.72,.12),mat(0x9c4d36),[side*.38,1.35,.4],[0,0,side*-.16]);
    }
    add(new THREE.TorusGeometry(.32,.035,7,28),gold,[0,1.77,.42],[Math.PI/2,0,0]);
    add(new THREE.SphereGeometry(.08,10,8),gold,[0,1.45,.49]);
    add(new THREE.BoxGeometry(.78,.18,.08),mat(0xeee0c4),[0,1.82,.02]);
    weapon(add(new THREE.TorusGeometry(.22,.06,8,24),gold,[.72,1.42,.18],[Math.PI/2,0,0]),{axis:'z',speed:1.5,glow:0xffbd69});   // barbell ring
    add(new THREE.BoxGeometry(.13,.3,.05),mat(0xf1d56a),[.72,1.18,.2]);
}
