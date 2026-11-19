import * as THREE from 'three';
import {mat,toonMat,toonRamp,floorMat,gold,dark,skin,white,black} from '../materials.js';

// Model props for character "yu" (layers: base props, outfit, signature silhouette).
export function buildYu({root,body,head,hair,add,makeCap,accentMat,bodyMat,hairMat,limbs,weapon}){
    // 大禹文官: flat ceremonial crown with bead tassels, layered blue-green court robe, jade tablet and the flood-control spade.
    const robe=mat(0x2f6f6a),robe2=mat(0x1d4a4f),jade=mat(0x8fd9b6);
    // 冕旒冠 sits on top of the hair (hair reaches y≈2.8): headband, hairpin, flat board and hanging bead strings front and back.
    add(new THREE.CylinderGeometry(.46,.5,.2,20),dark,[0,2.78,0]);                            // crown band over the hair
    add(new THREE.CylinderGeometry(.03,.03,1.3,8),gold,[0,2.8,0],[0,0,Math.PI/2]);          // hairpin (笄)
    add(new THREE.BoxGeometry(1.1,.07,.8),dark,[0,2.93,0]);                                   // mian board (冕板)
    add(new THREE.BoxGeometry(1.14,.025,.84),gold,[0,2.89,0]);                                // gold trim under the board
    for(const z of [.46,-.46])for(let i=0;i<9;i++){const x=-.48+i*.12;add(new THREE.CylinderGeometry(.008,.008,.42,4),gold,[x,2.7,z]);add(new THREE.SphereGeometry(.035,8,6),jade,[x,2.49,z]);add(new THREE.SphereGeometry(.025,8,6),gold,[x,2.62,z]);}   // 旒 bead strings
    // 蛋形頭: replace the round skull with an egg-shaped one (full below, narrower toward the crown)
    head.visible=false;
    const eggPts=[];for(let i=0;i<=28;i++){const t=-1+i/14,y=t*.64,r=Math.max(.001,.5*Math.sqrt(Math.max(0,1-t*t))*(1-.17*t));eggPts.push(new THREE.Vector2(r,y));}
    const eggMat=toonMat(0xffd6c2);eggMat.side=THREE.DoubleSide;
    add(new THREE.LatheGeometry(eggPts,32),eggMat,[0,2.12,0],[0,0,0],[1,1,.97]);
    // 法令紋: nasolabial folds running from the nose wings down past the mouth corners
    const wr=toonMat(0xb27f68),faceZ=(x,y)=>.489*Math.sqrt(Math.max(.05,1-(x/.54)**2-((y-2.12)/.56)**2))+.045;
    for(const sd of [-1,1])for(const [x,y,len] of [[.14,1.99,.15],[.17,1.93,.12],[.2,1.87,.1]]){const m=add(new THREE.BoxGeometry(len,.016,.016),wr,[sd*x,y,faceZ(sd*x,y)],[0,0,sd*-1.0]);m.castShadow=false;}
    add(new THREE.BoxGeometry(.86,1.0,.1),robe,[0,1.25,.4]);                                  // robe front
    add(new THREE.BoxGeometry(.2,.96,.11),gold,[0,1.25,.44]);                                 // central embroidered band
    add(new THREE.BoxGeometry(.9,.12,.12),robe2,[0,1.7,.42],[0,0,0]);                       // cross-collar
    add(new THREE.BoxGeometry(.8,.14,.12),mat(0x7a2e2e),[0,.95,.43]);                        // red sash
    add(new THREE.BoxGeometry(.9,1.0,.08),robe2,[0,1.2,-.42]);                                // robe back
    // 古代長袖袍: wide hanging sleeves on both arms (with a gold cuff) and a floor-length open skirt.
    for(const arm of [limbs[0],limbs[2]]){
      arm.material=toonMat(0x2f6f6a);
      const sleeve=new THREE.Mesh(new THREE.CylinderGeometry(.19,.36,.74,14,1,true),toonMat(0x2f6f6a));sleeve.material.side=THREE.DoubleSide;sleeve.position.y=0;sleeve.castShadow=true;arm.add(sleeve);
      const cuff=new THREE.Mesh(new THREE.CylinderGeometry(.36,.36,.07,14,1,true),gold);cuff.material=gold.clone();cuff.material.side=THREE.DoubleSide;cuff.position.y=.35;arm.add(cuff);
    }
    const skirt=add(new THREE.CylinderGeometry(.5,.8,.95,18,1,true),robe,[0,.62,0]);skirt.material=skirt.material.clone();skirt.material.side=THREE.DoubleSide;
    add(new THREE.CylinderGeometry(.8,.8,.06,18,1,true),gold,[0,.16,0]).material.side=THREE.DoubleSide;   // hem trim
    add(new THREE.BoxGeometry(.5,.26,.06),gold,[0,1.3,-.48]);                                 // back emblem
    add(new THREE.BoxGeometry(.14,.5,.05),jade,[-.72,1.15,.2],[0,0,-.15]);                   // jade tablet (笏板)
    // 禹's spade (鍤): long shaft with a broad blade. spinning weapon.
    add(new THREE.CylinderGeometry(.04,.04,1.7,8),mat(0x8a6a3d),[.82,1.1,.1],[0,0,-.1]);
    weapon(add(new THREE.BoxGeometry(.38,.5,.05),mat(0xb9c2cc,.4,.6),[.88,.25,.1],[0,0,-.1]),{axis:'y',speed:2,glow:0x9dc7ef});
}
