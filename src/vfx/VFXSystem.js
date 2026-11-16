import * as THREE from 'three';
import {scene} from '../scene.js';
import {mat} from '../materials.js';
export const particles=[];
export function burst(position,color=0xffc45c,count=16){
  for(let i=0;i<count;i++){const p=new THREE.Mesh(new THREE.IcosahedronGeometry(.055+Math.random()*.06,0),mat(color,.3));p.position.copy(position);scene.add(p);particles.push({mesh:p,vel:new THREE.Vector3((Math.random()-.5)*.22,Math.random()*.22,(Math.random()-.5)*.22),life:.55});}
}
export const combatFx=[];
export function addFx(mesh,life,kind='fade'){
  scene.add(mesh);combatFx.push({mesh,life,max:life,kind,startY:mesh.position.y});return mesh;
}
export function throwProjectile(mesh,velocity,life=1.05,spin=0,gravity=0){
  scene.add(mesh);combatFx.push({mesh,life,max:life,kind:'projectile',velocity:velocity.clone(),spin,gravity,startY:mesh.position.y});return mesh;
}
export function rootSnareEffect(target){
  const base=target.position.clone().add(new THREE.Vector3(0,.08,0));
  const greenMat=new THREE.MeshBasicMaterial({color:0x65b85f,transparent:true,opacity:.96,depthWrite:false});
  for(let i=0;i<8;i++){
    const a=i*Math.PI/4, points=[];
    const radius=.18+(i%3)*.1;
    points.push(base.clone().add(new THREE.Vector3(Math.cos(a)*.08,0,Math.sin(a)*.08)));
    points.push(base.clone().add(new THREE.Vector3(Math.cos(a)*.35,.28,Math.sin(a)*.35)));
    points.push(base.clone().add(new THREE.Vector3(Math.cos(a)*radius,.62,Math.sin(a)*radius)));
    points.push(base.clone().add(new THREE.Vector3(Math.cos(a)*.58,.9,Math.sin(a)*.58)));
    const root=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),16,.075,7,false),greenMat.clone());
    addFx(root,1.8,'fade');
  }
  for(let i=0;i<5;i++){
    const leaf=new THREE.Mesh(new THREE.ConeGeometry(.13,.42,6),new THREE.MeshBasicMaterial({color:0x9bdb78,transparent:true,opacity:.95,depthWrite:false}));
    leaf.position.copy(base).add(new THREE.Vector3(Math.cos(i*1.256)*.42,.48,Math.sin(i*1.256)*.42));leaf.rotation.z=Math.cos(i*1.256)*.8;addFx(leaf,1.8,'fade');
  }
}
export function hitBurst(target,type){
  const color=type==='ult'?0xffd36c:type==='skill'?0x76e4d2:0xff9eb5;
  burst(target.position.clone().add(new THREE.Vector3(0,target.position.y+1.25,0)),color,type==='ult'?42:type==='skill'?26:15);
  const flash=new THREE.Mesh(new THREE.SphereGeometry(type==='ult'?.75:.42,16,12),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.55}));flash.position.copy(target.position).add(new THREE.Vector3(0,1.3,0));scene.add(flash);combatFx.push({mesh:flash,life:.22,max:.22,kind:'flash'});
}
export function updateVfx(dt){
  for(let i=combatFx.length-1;i>=0;i--){const fx=combatFx[i];fx.life-=dt;const t=1-Math.max(0,fx.life)/fx.max;if(fx.kind==='ring'||fx.kind==='grow'){fx.mesh.scale.setScalar(1+t*(fx.kind==='ring'?2.2:1.35));fx.mesh.material.opacity=Math.max(0,fx.life/fx.max)*.9;}else if(fx.kind==='drop'){fx.mesh.position.y=fx.startY-4.5*t;fx.mesh.rotation.x+=dt*.18;fx.mesh.material.opacity=Math.max(0,fx.life/fx.max)*.98;}else if(fx.kind==='projectile'){fx.velocity.y+=((fx.gravity||0)*dt);fx.mesh.position.addScaledVector(fx.velocity,dt);fx.mesh.rotation.y+=dt*fx.spin;fx.mesh.rotation.x+=dt*fx.spin*.35;fx.mesh.material.opacity=Math.max(0,fx.life/fx.max)*.98;}else{fx.mesh.material.opacity=Math.max(0,fx.life/fx.max)*.95;}if(fx.life<=0){scene.remove(fx.mesh);fx.mesh.geometry.dispose();fx.mesh.material.dispose();combatFx.splice(i,1);}}
  for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.life-=dt;p.mesh.position.addScaledVector(p.vel,dt*8);p.mesh.scale.multiplyScalar(.97);if(p.life<=0){scene.remove(p.mesh);p.mesh.geometry.dispose();p.mesh.material.dispose();particles.splice(i,1);}}
}
// Make bound visuals of a logical projectile fade out quickly (called when it hits).
export function freezeFx(meshes){
  for(const fx of combatFx){
    if(meshes.includes(fx.mesh)){fx.life=Math.min(fx.life,.12);fx.max=Math.min(fx.max,.12);if(fx.velocity)fx.velocity.set(0,0,0);fx.gravity=0;}
  }
}
