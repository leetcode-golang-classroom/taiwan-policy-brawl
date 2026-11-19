import * as THREE from 'three';
import {mat,toonMat,toonRamp,floorMat,gold,dark,skin,white,black} from '../materials.js';

// Model props for character "bubble" (layers: base props, outfit, signature silhouette).
export function buildBubble({root,body,head,hair,add,makeCap,accentMat,bodyMat,hairMat,weapon}){
    // 白髮平頭: short white flat-top (long locks hidden) + grey stubble around the mouth and chin
    hairMat.color.set(0xf2f2f6);hair.visible=true;hair.scale.set(1.1,.8,1.08);
    root.children.forEach(c=>{if(c!==hair&&c.material===hairMat&&c.position.y>1.95&&c.geometry?.type!=='BoxGeometry')c.visible=false;});
    const stub=toonMat(0x8f8f98),faceZ=(x,y)=>.489*Math.sqrt(Math.max(.05,1-(x/.54)**2-((y-2.12)/.56)**2))+.01;
    for(let i=0;i<70;i++){
      const r1=Math.abs(Math.sin(i*12.9898)*43758.5453)%1,r2=Math.abs(Math.sin(i*78.233)*12345.678)%1;
      const y=1.6+r1*.4,half=.17+(y-1.6)*.55+Math.min(0,(y-1.82))*0,x=(r2*2-1)*Math.min(.3,half);   // jaw/chin/moustache area
      const m=add(new THREE.BoxGeometry(.035,.035,.02),stub,[x,y,faceZ(x,y)]);m.castShadow=false;
    }
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
