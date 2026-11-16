import * as THREE from 'three';
import {burst,throwProjectile,addFx} from '../vfx/VFXSystem.js';

export function skillCleric({fighter,target,forward,origin,center,right,projectile,mesh},type){
    // Angel descends in a vertical column of divine light.
    mesh(new THREE.CylinderGeometry(.12,.8,4.8,16),0xfff3c7,center.clone().add(new THREE.Vector3(0,1.4,0)),1.15,'grow',{opacity:.5});
    for(const side of [-1,1]){const wing=mesh(new THREE.SphereGeometry(.72,14,10),0xfff7e4,center.clone().add(new THREE.Vector3(side*.72,.9,-.1)),1.1,'grow');wing.scale.set(.55,1.25,.22);wing.rotation.z=side*-.48;for(let i=0;i<3;i++)mesh(new THREE.SphereGeometry(.17,10,8),0xffffff,center.clone().add(new THREE.Vector3(side*(.8+i*.22),.55-i*.15,-.12)),1.0);}
    mesh(new THREE.OctahedronGeometry(.35),0xffd76b,center.clone().add(new THREE.Vector3(0,1.7,0)),1.0);
}
