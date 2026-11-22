// Pose cross-fade (Phase 9). The procedural animator writes an absolute target pose every frame, so a state change
// (walk -> idle, idle -> windup, hit -> recover) would snap limbs from one pose to the next. This low-pass filter keeps
// the previous *displayed* pose and eases it toward the new target: exponential, frame-rate independent, and fast in
// combat states so attack poses still land on their Active frame. Pure (no three import) so it is unit-testable.
export const BLEND={idle:16,move:20,combat:60,reaction:45,dodge:30,snapAngle:2.6};   // 1/s rates; snapAngle = jump so large it is a teleport, not a pose change

export function blendRate(u){
  if(u.hitReact>0||u.stun>0||u.landTimer>0||(!u.grounded&&u.airHit))return BLEND.reaction;
  if(u.dodgeTimer>0)return BLEND.dodge;
  if(u.phase&&u.phase!=='idle')return BLEND.combat;
  if(u.guarding)return BLEND.combat;
  return u.moving?BLEND.move:BLEND.idle;
}
const AX=['x','y','z'];
function nodes(u){return[u.body,u.head,...(u.limbs||[])];}

export function blendPose(u,dt,store){
  const k=1-Math.exp(-blendRate(u)*dt),list=nodes(u);
  if(!store.nodes||store.nodes.length!==list.length)store.nodes=list.map(()=>null);
  list.forEach((n,i)=>{
    if(!n)return;
    const tgt={r:AX.map(a=>n.rotation[a]),p:AX.map(a=>n.position[a])},prev=store.nodes[i];
    if(!prev){store.nodes[i]=tgt;return;}
    // a respawn / round reset or a flip larger than snapAngle is not blended
    const big=tgt.r.some((v,j)=>Math.abs(v-prev.r[j])>BLEND.snapAngle);
    for(let j=0;j<3;j++){
      if(!big){prev.r[j]+=(tgt.r[j]-prev.r[j])*k;prev.p[j]+=(tgt.p[j]-prev.p[j])*k;}
      else{prev.r[j]=tgt.r[j];prev.p[j]=tgt.p[j];}
      n.rotation[AX[j]]=prev.r[j];n.position[AX[j]]=prev.p[j];
    }
  });
}

// Walk <-> rush blend (0 = walking, 1 = full sprint). The rush is a boolean in the logic layer; the animator needs a
// continuous weight so stride, lean and arm swing ease in/out instead of flipping on one frame. Fast up (the rush only
// lasts RUSH.duration), slower down so the braking frames still read as a sprint settling.
export const RUN_BLEND={up:24,down:9};
export function stepRunBlend(cur,rushing,dt){
  const tgt=rushing?1:0,k=1-Math.exp(-(rushing?RUN_BLEND.up:RUN_BLEND.down)*dt),v=cur+(tgt-cur)*k;
  return v<.001?0:v>.999?1:v;
}

// Rush braking pose. w (0..1) is the decaying runBlend while the rush is over and the fighter is not yet walking again
// (the logic layer's no-input recovery). Torso leans back, the lead foot slides out, arms come forward for balance.
// Rotations are about x: negative swings a hanging limb forward, positive leans the torso forward.
export const BRAKE={lean:-.24,leadLeg:-.6,trailLeg:.25,arms:-.45,drop:.05};
export function brakePose(w){
  const k=Math.max(0,Math.min(1,w));
  return{bodyX:BRAKE.lean*k,legL:BRAKE.leadLeg*k,legR:BRAKE.trailLeg*k,arms:BRAKE.arms*k,drop:BRAKE.drop*k};
}
