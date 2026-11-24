import * as THREE from 'three';
import {clone as cloneSkinned} from 'three/examples/jsm/utils/SkeletonUtils.js';
import {loadCharacterAsset} from './CharacterLoader.js';
import {CharacterAnimator} from './CharacterAnimator.js';
import {closeShoulders} from './shoulders.js';
const KO_TUMBLE=new THREE.Euler();

// Upgrades a procedural fighter rig to a real skinned GLB, if one is shipped and ready.
// The procedural meshes stay as the fallback; they are only hidden once the GLB is in place.
export function attachRealModel(root,id){
  loadCharacterAsset(id).then(res=>{
    if(!res)return;
    const {gltf,meta}=res,model=cloneSkinned(gltf.scene);   // each fighter needs its own skeleton
    const placeholders=[...root.children];
    model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
    // Normalise to the game's fighter height and stand on the ground.
    const box=new THREE.Box3().setFromObject(model),h=box.max.y-box.min.y||1,s=(meta.height||2.4)/h;
    model.scale.setScalar(s);model.position.y=-box.min.y*s;model.rotation.y=meta.facingOffset||0;
    root.add(model);
    // keep VFX anchors (charge rig, aura, lights) visible; hide only the placeholder body parts
    const keep=new Set([root.userData.aura,root.userData.chargeRig,root.userData.glowLight]);
    for(const c of placeholders)if(!keep.has(c))c.visible=false;
    for(const l of root.userData.limbs)l.visible=false;
    root.userData.model=model;root.userData.modelAnimator=new CharacterAnimator(model,gltf.animations||[]);
    root.userData.bones={};model.traverse(o=>{if(o.isBone)root.userData.bones[o.name]=o;});root.userData.modelReady=true;
  });
}
// Called every frame from the presentation layer; no-op for placeholder fighters.
export function updateRealModel(f,u,dt){
  const a=f.userData.modelAnimator;if(a){a.update(u,dt);closeShoulders(f.userData.bones,f.userData.id);
    if(u.koDown&&!u.grounded&&f.userData.bones?.Hips)f.userData.bones.Hips.quaternion.setFromEuler(KO_TUMBLE.set(-(1.3+Math.PI*2)*u.koFlight,0,0));   // knocked out: the whole body tumbles backward and lands flat (= the Fall pose)
  }
  return !!a;
}
