import * as THREE from 'three';
import {scene} from '../scene.js';
import {mat,toonMat,toonRamp,floorMat,gold,dark,skin,white,black} from '../materials.js';
import {characterBuilders} from './index.js';

export function makeFighter(profile){
  const {id='mech',name,primary,secondary,accent,kind,icon='✦'}=profile;
  const root=new THREE.Group();
  const bodyMat=toonMat(primary), accentMat=toonMat(accent), hairMat=toonMat(secondary), bootMat=toonMat(0x25263d), faceMat=toonMat(0xffd6c2);
  const body=new THREE.Mesh(new THREE.CapsuleGeometry(.43,.65,5,10),bodyMat); body.position.y=1.25; body.castShadow=true;root.add(body);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.52,32,24),faceMat);head.position.y=2.12;head.scale.set(1.04,1.08,.94);head.castShadow=true;root.add(head);
  const hair=new THREE.Mesh(new THREE.SphereGeometry(.54,24,16,0,Math.PI*2,0,Math.PI*.68),hairMat);hair.position.set(0,2.31,-.015);hair.scale.set(1.1,.9,1);hair.castShadow=true;root.add(hair);
  // Neat, side-swept candidate hairstyle: polished rather than spiky fantasy hair.
  for(let i=0;i<3;i++){const lock=new THREE.Mesh(new THREE.SphereGeometry(.19,16,12),hairMat);lock.position.set(-.22+i*.19,2.43,.34);lock.scale.set(1.15,.42,.55);lock.rotation.z=-.18+i*.12;lock.castShadow=true;root.add(lock);}
  // Layered anime bangs and side locks create a hand-designed Japanese game-character silhouette.
  for(let i=0;i<5;i++){const bang=new THREE.Mesh(new THREE.ConeGeometry(.13,.34,5),hairMat);bang.position.set(-.32+i*.16,2.31,.405);bang.rotation.z=Math.PI+(i-2)*.12;bang.rotation.x=-.12;bang.castShadow=true;root.add(bang);}
  for(const side of [-1,1]){const lock=new THREE.Mesh(new THREE.ConeGeometry(.12,.48,6),hairMat);lock.position.set(side*.43,2.08,.12);lock.rotation.z=side*-.18;lock.rotation.x=.18;lock.castShadow=true;root.add(lock);}
  const eyeWhite=toonMat(0xfffbf6), eyeMat=toonMat(0x25233c), irisMat=toonMat(0x416d9d), highlightMat=new THREE.MeshBasicMaterial({color:0xffffff});
  for(const x of [-.19,.19]){
    const sclera=new THREE.Mesh(new THREE.SphereGeometry(.105,16,12),eyeWhite);sclera.position.set(x,2.13,.455);sclera.scale.set(.88,1.18,.38);root.add(sclera);
    const iris=new THREE.Mesh(new THREE.SphereGeometry(.073,16,12),irisMat);iris.position.set(x,2.125,.49);iris.scale.set(.82,1.18,.42);root.add(iris);
    const pupil=new THREE.Mesh(new THREE.SphereGeometry(.043,12,10),eyeMat);pupil.position.set(x,2.12,.512);pupil.scale.set(.82,1.15,.42);root.add(pupil);
    const glint=new THREE.Mesh(new THREE.SphereGeometry(.022,8,8),highlightMat);glint.position.set(x-.018,2.158,.532);root.add(glint);
    const brow=new THREE.Mesh(new THREE.BoxGeometry(.17,.035,.035),hairMat);brow.position.set(x,2.285,.43);brow.rotation.z=x<0?-.12:.12;root.add(brow);
  }
  const mouth=new THREE.Mesh(new THREE.SphereGeometry(.035,10,8),toonMat(0x9b5362));mouth.position.set(0,1.99,.493);mouth.scale.set(1.35,.48,.35);root.add(mouth);
  for(const x of [-.31,.31]){const blush=new THREE.Mesh(new THREE.SphereGeometry(.065,10,8),new THREE.MeshBasicMaterial({color:0xf39a9b,transparent:true,opacity:.42}));blush.position.set(x,2.02,.415);blush.scale.set(1,.45,.18);root.add(blush);}
  const scarf=new THREE.Mesh(new THREE.TorusGeometry(.29,.09,8,24),accentMat);scarf.position.y=1.78;scarf.rotation.x=Math.PI/2;root.add(scarf);
  const armGeo=new THREE.CapsuleGeometry(.13,.48,4,8), legGeo=new THREE.CapsuleGeometry(.16,.42,4,8);
  const limbs=[];
  for(const side of [-1,1]){
    const arm=new THREE.Mesh(armGeo,bodyMat);arm.position.set(side*.52,1.35,.02);arm.rotation.z=side*-.45;arm.castShadow=true;root.add(arm);limbs.push(arm);
    const fist=new THREE.Mesh(new THREE.SphereGeometry(.18,12,10),accentMat);fist.position.set(side*.59,1.08,.08);root.add(fist);
    const leg=new THREE.Mesh(legGeo,bootMat);leg.position.set(side*.23,.48,0);leg.castShadow=true;root.add(leg);limbs.push(leg);
    const boot=new THREE.Mesh(new THREE.SphereGeometry(.2,12,8),accentMat);boot.position.set(side*.23,.22,.1);boot.scale.set(1.2,.55,1.5);root.add(boot);
  }
  // A tiny emblem and a floating nameplate.
  const emblem=new THREE.Mesh(new THREE.OctahedronGeometry(.17),gold);emblem.position.set(0,1.25,.43);root.add(emblem);
  const aura=new THREE.Mesh(new THREE.TorusGeometry(.66,.025,6,32),accentMat);aura.rotation.x=Math.PI/2;aura.position.y=.06;root.add(aura);
  // Charge is expressed through a rotating weapon/energy focus, never a trembling torso.
  const chargeRig=new THREE.Group();chargeRig.position.set(.78,1.48,.28);chargeRig.visible=false;root.add(chargeRig);
  const chargeHalo=new THREE.Mesh(new THREE.TorusGeometry(.24,.035,8,32),new THREE.MeshBasicMaterial({color:accent,transparent:true,opacity:.95}));chargeHalo.rotation.x=Math.PI/2;chargeRig.add(chargeHalo);
  const chargeCore=new THREE.Mesh(new THREE.OctahedronGeometry(.15,1),new THREE.MeshToonMaterial({color:0xfff0a8,gradientMap:toonRamp,emissive:accent,emissiveIntensity:.45}));chargeRig.add(chargeCore);
  for(let i=0;i<3;i++){const shard=new THREE.Mesh(new THREE.TetrahedronGeometry(.075),new THREE.MeshBasicMaterial({color:accent}));const a=i*Math.PI*2/3;shard.position.set(Math.cos(a)*.34,Math.sin(a)*.34,0);chargeRig.add(shard);}

  const glowLight=new THREE.PointLight(accent,0,6,2);glowLight.position.copy(chargeRig.position);root.add(glowLight);   // intensity animated by the presentation layer

  const add=(geo,material,pos,rot=[0,0,0],scale=[1,1,1])=>{const toonMaterial=material?.isMeshStandardMaterial?toonMat(material.color):material;const m=new THREE.Mesh(geo,toonMaterial);m.position.set(...pos);m.rotation.set(...rot);m.scale.set(...scale);m.castShadow=true;root.add(m);return m;};
  // Candidate-professional outfit layer: shirt, tie, tailored lapels, pocket square and rosette.
  // These are stylized low-poly details, keeping the Q-style silhouette readable in the arena.
  const shirtMat=mat(0xfff8ec,.48), tieMat=mat(secondary,.4), trimMat=mat(0xe8e1d5,.55);
  add(new THREE.BoxGeometry(.25,.62,.055),shirtMat,[0,1.37,.405]);
  add(new THREE.ConeGeometry(.105,.24,4),shirtMat,[0,1.72,.435],[0,0,Math.PI]);
  add(new THREE.BoxGeometry(.105,.43,.065),tieMat,[0,1.39,.455]);
  add(new THREE.ConeGeometry(.085,.15,4),tieMat,[0,1.67,.46],[0,0,Math.PI]);
  for(const side of [-1,1]){
    const lapel=add(new THREE.BoxGeometry(.16,.58,.07),accentMat,[side*.16,1.47,.43],[0,0,side*-.24],[1,1,1]);
    add(new THREE.SphereGeometry(.035,8,8),gold,[side*.34,1.48,.48]);
  }
  add(new THREE.BoxGeometry(.16,.055,.035),trimMat,[-.25,1.22,.455]);
  add(new THREE.SphereGeometry(.105,12,10),gold,[.29,1.58,.46],[0,0,0],[1,1,.35]);
  add(new THREE.SphereGeometry(.055,10,8),accentMat,[.29,1.58,.49],[0,0,0],[1,1,.4]);
  const makeCap=(color=0xf0c75e)=>{
    add(new THREE.CylinderGeometry(.36,.36,.08,16),dark,[0,2.48,0]);
    add(new THREE.SphereGeometry(.34,16,10,0,Math.PI*2,0,Math.PI/2),mat(color,.55),[0,2.48,0]);
    add(new THREE.BoxGeometry(.42,.055,.22),mat(color),[0,2.43,.22]);
  };
  // Weapon registry (spec 7): spinning/glowing props. The presentation layer rotates them while charging and lights them up with the glow level.
  const parts={weapons:[],tail:null};
  const weapon=(mesh,{axis='y',speed=1,glow=accent}={})=>{
    if(mesh.material&&'emissive' in mesh.material){mesh.material=mesh.material.clone();mesh.material.emissive.set(glow);mesh.material.emissiveIntensity=0;}
    parts.weapons.push({obj:mesh,axis,speed});return mesh;
  };
  characterBuilders[id]?.({root,body,head,hair,add,makeCap,accentMat,bodyMat,hairMat,limbs,parts,weapon});
  if(['mage','brawler'].includes(id)){hair.visible=false;root.children.forEach(part=>{if(part.position.y>2.38&&part.position.y<2.48&&part.geometry?.type==='SphereGeometry')part.visible=false;});}
  root.userData={id,name,kind,icon,limbs,parts,body,head,aura,chargeRig,glowLight,chargeHalo,chargeCore,baseY:0,attackTime:0,hitFlash:0,velocityY:0,grounded:true,jumpPhase:0,movePhase:0,stun:0,rootTrap:0,hitReact:0,dodgeTimer:0,dodgeInvuln:0,dodgeCooldown:0,dodgeDirection:new THREE.Vector3(),moveSpeed:profile.moveSpeed||5,jumpPower:kind==='heavy'||kind==='engineer'?7.5:8.2};
  scene.add(root);return root;
}
