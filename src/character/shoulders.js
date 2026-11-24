// Shoulder closure for the skinned fighters. The shoulder pivot sits wider than the torso, so whenever an arm swings outward
// (victory poses, knockback, hit, dodge...) a gap opens between sleeve and body. Slide the shoulder bone toward the chest in
// proportion to how far the arm is abducted (rotation about z in the authored XYZ Euler convention), so arm and torso stay joined.
import * as THREE from 'three';
export const SHOULDER_INSET={default:.16,leopard:.24};   // skeleton units, tuned per model width
const ABDUCT_SOFT=.45,ABDUCT_MAX=1.1;
const E=new THREE.Euler();
export function closeShoulders(bones,id){
  if(!bones)return;
  const inset=SHOULDER_INSET[id]??SHOULDER_INSET.default;
  for(const [n,side] of [['UpperArmL',1],['UpperArmR',-1]]){
    const b=bones[n];if(!b)continue;
    b.userData.restX??=b.position.x;
    E.setFromQuaternion(b.quaternion,'XYZ');
    // keep arms closer to the torso: abduction past ABDUCT_SOFT is compressed, and never exceeds ABDUCT_MAX
    const z=Math.abs(E.z);
    if(z>ABDUCT_SOFT){E.z=Math.sign(E.z)*Math.min(ABDUCT_MAX,ABDUCT_SOFT+(z-ABDUCT_SOFT)*.45);b.quaternion.setFromEuler(E);}
    b.position.x=b.userData.restX-side*inset*Math.min(1,Math.abs(E.z)/1.1);
  }
}
export function resetShoulders(bones){for(const n of ['UpperArmL','UpperArmR'])if(bones?.[n]?.userData.restX!==undefined)bones[n].position.x=bones[n].userData.restX;}
