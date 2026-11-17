import * as THREE from 'three';
import {addFx} from '../vfx/VFXSystem.js';
import {signatureUltimate} from './index.js';

export function slashEffect(fighter,target,type,sink=[],{noBeam=false}={}){
  const id=fighter.userData.id;
  const forward=new THREE.Vector3(Math.sin(fighter.rotation.y),0,Math.cos(fighter.rotation.y));
  const start=fighter.position.clone().add(new THREE.Vector3(0,1.25,0));
  const reach=type==='ult'?2.5:type==='skill'?1.8:1.15;
  const center=start.clone().addScaledVector(forward,reach);
  const colors={mech:0xffbd4a,leopard:0x75d6c5,admiral:0x69c9e7,mage:0xffc4a5,cleric:0x79e6f2,brawler:0xffbd69,nun:0xffd18b,yu:0xffc56b,'bubble':0xe8b6dc};
  const color=colors[id]||0xffffff;
  if(type==='ult'||(id==='mech'&&type!=='ult')||(id==='leopard'&&type!=='ult')||(id==='admiral'&&type==='basic')||(id==='mage'&&type==='basic')||(id==='nun'&&type!=='ult')||(id==='brawler'&&type!=='ult')||(id==='cleric'&&type!=='basic')){signatureUltimate(fighter,target,type,sink);return;}
  const material=new THREE.MeshBasicMaterial({color,transparent:true,opacity:.96,depthWrite:false});
  if(id==='mech'){
    // Twin luminous rails and a heavy forward impact ring.
    for(const side of [-1,1]){const bar=new THREE.Mesh(new THREE.BoxGeometry(.13,.12,type==='ult'?4.8:2.8),material.clone());bar.position.copy(start).addScaledVector(forward,reach*.85);bar.position.x+=Math.cos(fighter.rotation.y)*side*.42;bar.position.z-=Math.sin(fighter.rotation.y)*side*.42;bar.rotation.y=fighter.rotation.y;addFx(bar,.42,'grow');}
    const ringMesh=new THREE.Mesh(new THREE.TorusGeometry(type==='ult'?1.25:.72,.09,8,32),material.clone());ringMesh.position.copy(center);ringMesh.rotation.x=Math.PI/2;addFx(ringMesh,.48,'grow');
  } else if(id==='nun'){
    // Two curling vine whips, with leaf-like bursts at their tips.
    for(const side of [-1,1]){const points=[];for(let i=0;i<=12;i++){const t=i/12;points.push(start.clone().addScaledVector(forward,t*(type==='ult'?4.2:2.7)).add(new THREE.Vector3(Math.sin(t*Math.PI*2+side)*(.25+t*.18),Math.sin(t*Math.PI)*.45,Math.cos(t*Math.PI*2+side)*(.2+t*.12))));}const vine=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),24,.055,7,false),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.95}));addFx(vine,.58,'fade');const leaf=new THREE.Mesh(new THREE.SphereGeometry(.2,10,8),material.clone());leaf.position.copy(points[12]);leaf.scale.set(.55,1.4,.35);addFx(leaf,.55,'grow');}
  } else if(id==='leopard'||id==='yu'||id==='bubble'){
    // A protective pink-gold support field that expands toward the target.
    const shield=new THREE.Mesh(new THREE.SphereGeometry(type==='ult'?1.45:.95,20,14),new THREE.MeshBasicMaterial({color,wireframe:true,transparent:true,opacity:.9}));shield.position.copy(start).addScaledVector(forward,1.05);addFx(shield,.62,'grow');
    const heartA=new THREE.Mesh(new THREE.SphereGeometry(.25,12,10),material.clone());heartA.position.copy(center).add(new THREE.Vector3(-.16,.22,0));heartA.scale.set(1,1.2,.5);addFx(heartA,.5,'grow');
    const heartB=heartA.clone();heartB.position.x+=.32;addFx(heartB,.5,'grow');
  } else {
    // A clearly visible cyan targeting beam and pulsing tech rings.
    if(!noBeam){const end=target.position.clone().add(new THREE.Vector3(0,1.2,0));const mid=start.clone().lerp(end,.5);const beam=new THREE.Mesh(new THREE.CylinderGeometry(type==='ult'?.25:.13,type==='ult'?.25:.13,start.distanceTo(end),12),material.clone());beam.position.copy(mid);beam.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),end.sub(start).normalize());addFx(beam,.32,'fade');
    const reticle=new THREE.Mesh(new THREE.TorusGeometry(type==='ult'?.85:.5,.055,7,32),material.clone());reticle.position.copy(target.position).add(new THREE.Vector3(0,1.2,0));reticle.rotation.x=Math.PI/2;addFx(reticle,.55,'grow');}
  }
  if(type!=='basic'){
    const ringFx=new THREE.Mesh(new THREE.TorusGeometry(type==='ult'?2.0:1.25,.055,7,48),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.85,depthWrite:false}));ringFx.position.copy(fighter.position).add(new THREE.Vector3(0,.08,0));ringFx.rotation.x=Math.PI/2;addFx(ringFx,.65,'ring');
  }
}
