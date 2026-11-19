import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
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
    // 牧師穿著: black clerical suit, white tab collar, purple stole, gold pectoral cross.
    const BLACK=0x1b1b21,blk=toonMat(BLACK);
    body.material=blk;
    for(const arm of [limbs[0],limbs[2]]){arm.material=blk;const cuff=new THREE.Mesh(new THREE.CylinderGeometry(.14,.14,.05,12),toonMat(0xf4f0e6));cuff.position.set(0,-.3,0);arm.add(cuff);}
    for(const leg of [limbs[1],limbs[3]]){leg.material=blk;leg.children[0].material=toonMat(0x0c0c10);}   // black trousers and shoes
    add(new THREE.CylinderGeometry(.5,.66,.62,24),blk,[0,.98,0]);                                        // long suit-coat skirt
    add(new THREE.BoxGeometry(.84,.92,.09),blk,[0,1.26,.37]);                                            // black clerical shirt front
    add(new THREE.CylinderGeometry(.36,.36,.1,20),white,[0,1.62,0]);                                      // white collar band
    add(new THREE.BoxGeometry(.13,.13,.04),white,[0,1.6,.36]);                                           // tab
    add(new THREE.BoxGeometry(.16,.9,.06),mat(0x6a3f91),[-.26,1.2,.44],[0,0,.08]);                       // purple stole
    add(new THREE.BoxGeometry(.16,.9,.06),mat(0x6a3f91),[.26,1.2,.44],[0,0,-.08]);
    add(new THREE.BoxGeometry(.04,.2,.03),gold,[0,1.5,.5]);add(new THREE.BoxGeometry(.13,.04,.03),gold,[0,1.54,.5]);   // pectoral cross
    // 方形臉 + 厚嘴唇: a squared jaw block over the lower face, thick lips, short neat grey hair, no halo-style cap
    hair.visible=true;hairMat.color.set(0x3b3b42);hair.scale.set(1.1,.8,1.08);
    root.children.forEach(c=>{if(c!==hair&&c.material===hairMat&&c.position.y>1.95&&c.geometry?.type!=='BoxGeometry')c.visible=false;
      if(c.geometry?.type==='TorusGeometry'&&Math.abs(c.position.y-1.78)<.02)c.visible=false;                 // generic scarf
      if(c.geometry?.type==='SphereGeometry'&&Math.abs(c.position.y-1.99)<.01&&Math.abs(c.position.z-.493)<.01)c.visible=false;});   // small default mouth
    const skinMat=toonMat(0xffd6c2);
    head.visible=false;                                                                                   // the round skull is replaced by a squared head
    add(new RoundedBoxGeometry(1.0,1.02,.94,4,.1),skinMat,[0,2.12,0]);                                    // square face
    add(new RoundedBoxGeometry(.1,.2,.1,2,.03),skinMat,[-.52,2.08,0]);add(new RoundedBoxGeometry(.1,.2,.1,2,.03),skinMat,[.52,2.08,0]);   // ears
    const lip=0xc2566a;
    add(new THREE.BoxGeometry(.36,.075,.06),toonMat(lip),[0,1.9,.485]);                                     // upper lip
    add(new THREE.BoxGeometry(.32,.095,.06),toonMat(0xd06a7c),[0,1.82,.49]);                             // fuller lower lip
    add(new THREE.BoxGeometry(.3,.02,.03),toonMat(0x6e2c3a),[0,1.862,.5]);                              // mouth line
    // heavy brows to match the squared face
    for(const x of [-.19,.19])add(new THREE.BoxGeometry(.22,.05,.05),hairMat,[x,2.31,.46],[0,0,x<0?-.08:.08]);
}
