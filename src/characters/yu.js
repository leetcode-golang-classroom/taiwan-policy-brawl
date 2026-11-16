import * as THREE from 'three';
import {mat,toonMat,toonRamp,floorMat,gold,dark,skin,white,black} from '../materials.js';

// Model props for character "yu" (layers: base props, outfit, signature silhouette).
export function buildYu({root,body,head,hair,add,makeCap,accentMat,bodyMat,hairMat,weapon}){
    // 大禹文官: flat ceremonial crown with bead tassels, layered blue-green court robe, jade tablet and the flood-control spade.
    const robe=mat(0x2f6f6a),robe2=mat(0x1d4a4f),jade=mat(0x8fd9b6);
    add(new THREE.BoxGeometry(.9,.05,.5),dark,[0,2.62,0]);                                    // mian board (top)
    add(new THREE.CylinderGeometry(.36,.36,.14,16),dark,[0,2.5,0]);                           // crown band
    for(let i=0;i<7;i++){const x=-.36+i*.12;add(new THREE.CylinderGeometry(.008,.008,.34,4),gold,[x,2.42,.26]);add(new THREE.SphereGeometry(.03,8,6),jade,[x,2.24,.26]);}   // bead strings
    add(new THREE.BoxGeometry(.86,1.0,.1),robe,[0,1.25,.4]);                                  // robe front
    add(new THREE.BoxGeometry(.2,.96,.11),gold,[0,1.25,.44]);                                 // central embroidered band
    add(new THREE.BoxGeometry(.9,.12,.12),robe2,[0,1.7,.42],[0,0,0]);                       // cross-collar
    add(new THREE.BoxGeometry(.8,.14,.12),mat(0x7a2e2e),[0,.95,.43]);                        // red sash
    add(new THREE.BoxGeometry(.9,1.0,.08),robe2,[0,1.2,-.42]);                                // robe back
    add(new THREE.BoxGeometry(.5,.26,.06),gold,[0,1.3,-.48]);                                 // back emblem
    add(new THREE.BoxGeometry(.14,.5,.05),jade,[-.72,1.15,.2],[0,0,-.15]);                   // jade tablet (笏板)
    // 禹's spade (鍤): long shaft with a broad blade. spinning weapon.
    add(new THREE.CylinderGeometry(.04,.04,1.7,8),mat(0x8a6a3d),[.82,1.1,.1],[0,0,-.1]);
    weapon(add(new THREE.BoxGeometry(.38,.5,.05),mat(0xb9c2cc,.4,.6),[.88,.25,.1],[0,0,-.1]),{axis:'y',speed:2,glow:0x9dc7ef});
}
