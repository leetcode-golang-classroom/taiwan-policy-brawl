import * as THREE from 'three';
import {burst,throwProjectile,addFx} from '../vfx/VFXSystem.js';

export function skillBubble({fighter,target,forward,origin,center,right,projectile,mesh},type){
    mesh(new THREE.BoxGeometry(1.8,2.1,.12),0xf4eee8,center.clone().add(new THREE.Vector3(0,.15,0)),1.0,'grow');
    mesh(new THREE.TorusGeometry(.55,.07,8,28),0xc85a83,center.clone().add(new THREE.Vector3(0,.15,.12)),1.0,'ring');
    for(let i=0;i<3;i++){mesh(new THREE.SphereGeometry(.22,12,10),0xd88aaa,center.clone().add(new THREE.Vector3((i-1)*.52,-.45,.2)),.9);mesh(new THREE.TorusGeometry(.17,.035,7,20),0x8b5c9f,center.clone().add(new THREE.Vector3((i-1)*.52,-.45,.2)),.9);}
}
