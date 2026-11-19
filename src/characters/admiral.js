import * as THREE from 'three';
import {mat,toonMat,toonRamp,floorMat,gold,dark,skin,white,black} from '../materials.js';

// Model props for character "admiral" (layers: base props, outfit, signature silhouette).
export function buildAdmiral({root,body,head,hair,add,makeCap,accentMat,bodyMat,hairMat,limbs,weapon}){
    // Fleet admiral: white dress tunic over navy trousers, gold epaulettes and braid, ribbon bars, peaked cap with anchor badge.
    // Weapon: a 麻將尺 (the wooden bar used to push and stack mahjong walls).
    const WHITE=mat(0xf4f2ea),NAVY=mat(0x16233f),GOLD=gold;
    hairMat.color.set(0xf4f4f8);   // white hair showing under the cap
    hair.visible=true;
    // white 胡子: upturned moustache over the mouth, a goatee and short sideburns
    for(const x of [-1,1]){
      add(new THREE.SphereGeometry(.12,12,10),hairMat,[x*.1,2.04,.49],[0,0,x*-.35],[1.5,.55,.6]);
      add(new THREE.SphereGeometry(.07,10,8),hairMat,[x*.23,2.07,.47],[0,0,x*.5],[1.4,.5,.6]);
      add(new THREE.BoxGeometry(.06,.3,.1),hairMat,[x*.47,2.0,.12]);
    }
    add(new THREE.SphereGeometry(.17,12,10),hairMat,[0,1.8,.4],[.25,0,0],[1.2,1.3,.6]);
    body.scale.set(1.22,1.0,1.08);
    // peaked cap (replaces the generic one from the base rig: draw over it, taller)
    add(new THREE.CylinderGeometry(.43,.4,.2,20),WHITE,[0,2.58,0]);           // white crown
    add(new THREE.CylinderGeometry(.45,.45,.1,20),NAVY,[0,2.49,0]);           // dark band
    add(new THREE.CylinderGeometry(.455,.455,.03,20),GOLD,[0,2.545,0]);       // gold cord
    add(new THREE.CylinderGeometry(.34,.34,.05,18,1,false,0,Math.PI),NAVY,[0,2.435,.34],[Math.PI/2,0,0]);
    add(new THREE.BoxGeometry(.56,.04,.3),NAVY,[0,2.44,.36],[.12,0,0]);       // visor
    add(new THREE.BoxGeometry(.3,.025,.05),GOLD,[0,2.455,.5],[.12,0,0]);       // visor braid
    add(new THREE.SphereGeometry(.075,10,8),GOLD,[0,2.56,.43],[0,0,0],[1.2,1,.4]);   // badge
    add(new THREE.BoxGeometry(.035,.12,.02),NAVY,[0,2.56,.465]);add(new THREE.BoxGeometry(.1,.03,.02),NAVY,[0,2.58,.465]);   // anchor
    // tunic: white front panel, gold double-row buttons, collar, ribbon bars, epaulettes
    add(new THREE.BoxGeometry(.96,.78,.14),WHITE,[0,1.38,.4]);
    for(const sx of [-.12,.12])for(let i=0;i<4;i++)add(new THREE.SphereGeometry(.035,8,8),GOLD,[sx,1.67-i*.17,.5]);
    add(new THREE.BoxGeometry(.5,.1,.12),WHITE,[0,1.78,.37]);add(new THREE.BoxGeometry(.5,.03,.125),GOLD,[0,1.73,.375]);
    for(let i=0;i<3;i++)add(new THREE.BoxGeometry(.1,.045,.03),mat([0xd64b45,0x3c75bf,0xffd65c][i]),[-.3+i*.11,1.56,.485]);
    for(const side of [-1,1]){
      add(new THREE.BoxGeometry(.34,.07,.24),GOLD,[side*.52,1.72,0],[0,0,side*-.25]);
      for(let i=0;i<3;i++)add(new THREE.BoxGeometry(.3,.025,.2),NAVY,[side*.52,1.76,-.02+(i-1)*.06],[0,0,side*-.25]);
      add(new THREE.BoxGeometry(.04,.2,.04),GOLD,[side*.62,1.58,.04]);add(new THREE.BoxGeometry(.04,.2,.04),GOLD,[side*.66,1.5,.04]);
    }
    // sleeves: white with gold rank bands near the cuff
    for(const arm of [limbs[0],limbs[2]]){
      arm.material=toonMat(0xf4f2ea);
      for(let i=0;i<3;i++){const b=new THREE.Mesh(new THREE.CylinderGeometry(.145,.145,.03,12),toonMat(0xffd65c));b.position.y=-.2+i*.07;arm.add(b);}
    }
    // trousers: navy legs with a white stripe
    for(const leg of [limbs[1],limbs[3]])leg.material=toonMat(0x16233f);
    // 麻將尺: long lacquered bar, brass ends and tick marks, held upright in the right hand
    const ruler=weapon(add(new THREE.BoxGeometry(.1,1.25,.05),mat(0xb5793a),[.74,1.2,.2]),{axis:'y',speed:1.2,glow:0xffd65c});
    for(const y of [-.62,.62]){const cap=new THREE.Mesh(new THREE.BoxGeometry(.13,.07,.08),toonMat(0xffd65c));cap.position.y=y;ruler.add(cap);}
    for(let i=0;i<9;i++){const t=new THREE.Mesh(new THREE.BoxGeometry(i%3===1?.07:.05,.02,.01),toonMat(0x3a2412));t.position.set(0,-.5+i*.125,.03);ruler.add(t);}
}
