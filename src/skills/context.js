import * as THREE from 'three';
import {throwProjectile,addFx} from '../vfx/VFXSystem.js';

export function createSkillContext(fighter,target,sink=[]){
  const id=fighter.userData.id, forward=new THREE.Vector3(Math.sin(fighter.rotation.y),0,Math.cos(fighter.rotation.y));
  const origin=fighter.position.clone().add(new THREE.Vector3(0,1.1,0));
  const center=origin.clone().addScaledVector(forward,2.4);
  const right=new THREE.Vector3(Math.cos(fighter.rotation.y),0,-Math.sin(fighter.rotation.y));
  const projectile=(geo,color,pos,vel,life=1.05,spin=4,gravity=0)=>{const m=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color,transparent:true,opacity:.98,depthWrite:false}));m.position.copy(pos);m.rotation.y=fighter.rotation.y;throwProjectile(m,vel,life,spin,gravity);sink.push(m);return m;};
  const mesh=(geo,color,pos,life=1.05,kind='grow',opts={})=>{const m=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color,transparent:true,opacity:opts.opacity??.92,wireframe:opts.wireframe??false,depthWrite:false}));m.position.copy(pos);if(opts.rotation)m.rotation.set(...opts.rotation);if(opts.scale)m.scale.set(...opts.scale);addFx(m,life,kind);return m;};
  return {fighter,target,id,forward,origin,center,right,projectile,mesh};
}
