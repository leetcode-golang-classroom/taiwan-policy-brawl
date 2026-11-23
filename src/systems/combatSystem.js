import {DEFENSE,AIR,COMBO_STEPS,AIRBORNE_BONUS,ARENA,COMBO,KNOCK,WEIGHT,HIT,HIT_REACT,ATTACK_TIME,ACTIVE_TIME,HITSTOP,getSkill} from '../config.js';
import {normalize,clamp,horizontalLength} from '../ecs/math.js';
import {Dash} from '../ecs/components.js';
import {opponentOf} from '../ecs/entities.js';
import {applyDefense} from './defenseSystem.js';
import {spawnProjectile} from './projectileSystem.js';
import {registerComboHit} from './comboSystem.js';

export const bodyCenter=(world,id)=>{const t=world.get(id,'transform');return {x:t.x,y:t.y+1.15,z:t.z};};
const forwardOf=t=>({x:Math.sin(t.rotY),y:0,z:Math.cos(t.rotY)});
export function face(world,id,targetId){
  const a=world.get(id,'transform'),b=world.get(targetId,'transform');
  a.rotY=Math.atan2(b.x-a.x,b.z-a.z);
}
export function clampToArena(t){t.x=clamp(t.x,-ARENA.halfX,ARENA.halfX);t.z=clamp(t.z,-ARENA.halfZ,ARENA.halfZ);if(t.y<0)t.y=0;}

// Applies HP loss. Returns the damage ACTUALLY dealt (clamped by remaining HP). Never touches visuals.
export function damage(world,targetId,amount,sourceId){
  const h=world.get(targetId,'health'),before=h.hp;
  h.hp=Math.max(0,h.hp-amount);
  const dealt=before-h.hp;
  const e=world.get(sourceId,'energy');e.value=Math.min(100,e.value+amount*e.gain);
  const st=world.get(targetId,'status');
  st.hitReact=HIT.reactTime;st.hitSide=world.get(sourceId,'fighter').side==='player'?1:-1;st.stun=HIT.baseStun;
  return dealt;
}

// THE single entry point for every damaging hit (melee, area, projectile, dash).
// Order: dodge invulnerability -> defense modifier -> damage() -> knockback -> event.
export function resolveHit(world,attackerId,targetId,skill,{dir,onHit,reflected=false}={}){
  const st=world.get(targetId,'status'),tt=world.get(targetId,'transform'),at=world.get(attackerId,'transform');
  if(st.dodgeInvuln>0){world.events.emit('evade',{attackerId,targetId,skill});return false;}
  if(st.reflect>0&&!reflected){   // 乾坤之動: the attack is turned back on its sender (no damage to the reflector)
    world.events.emit('reflect',{attackerId,targetId,skill,projectileId:null});
    return resolveHit(world,targetId,attackerId,skill,{reflected:true});
  }
  const def=applyDefense(world,targetId,attackerId,skill);
  const roll=skill.dice?1+Math.floor(world.rng()*6):0;      // 乾坤一擲: damage = dice points x base damage
  const victimAir=tt.y>AIR.minHeight;
  const airHitsBefore=victimAir?st.airHits:0;
  const airMul=victimAir?Math.pow(AIR.decay,airHitsBefore):1;   // air damage decay
  const base=(skill.damage*(roll||1)+(at.y>HIT.airborneThreshold?AIRBORNE_BONUS:0))*airMul;
  const att0=world.get(attackerId,'attacker'),counter=att0?.counterBoost>0&&!def.blocked;   // GUARD COUNTER: boosted hit right after a block
  const amount=def.blocked?0:Math.max(1,Math.round(base*def.multiplier*(counter?DEFENSE.counterMul:1)));
  if(def.perfect&&!reflected){   // attacker is staggered, defender is rewarded
    const ast=world.get(attackerId,'status');ast.stun=Math.max(ast.stun,DEFENSE.perfectStun);ast.hitStop=Math.max(ast.hitStop,HITSTOP.skill);
    const ae=world.get(attackerId,'attacker');ae.active=null;ae.hitConfirmed=false;
    const de=world.get(targetId,'energy');de.value=Math.min(100,de.value+DEFENSE.perfectEnergy);
    st.hitStop=Math.max(st.hitStop,HITSTOP.skill);
  }
  const dealt=amount>0?damage(world,targetId,amount,attackerId):0;
  // knockback: direction of the attack, scaled by defense, kept inside the arena
  let d=dir?{x:dir.x,y:0,z:dir.z}:{x:tt.x-at.x,y:0,z:tt.z-at.z};
  if(horizontalLength(d)<.001)d=forwardOf(at);
  d=normalize(d);
  const kb=def.knockbackMult,body=world.get(targetId,'body');
  // PHASE 7: push velocity (decays to 0 over `dur`); applied by physicsSystem, so it respects hit stop, walls and the other fighter.
  const push=skill.knockback*kb/(WEIGHT[world.get(targetId,'fighter').charId]||1),dur=KNOCK.duration[skill.tier]||KNOCK.duration.basic;
  if(push>.001){st.kbVx=d.x*2*push/dur;st.kbVz=d.z*2*push/dur;st.kbTime=st.kbDur=dur;}
  body.vx=0;body.vz=0;   // a hit interrupts locomotion
  const juggleOver=victimAir&&airHitsBefore>=AIR.maxHits;   // chase limit reached: no more lifting, the victim falls
  const slam=dealt>0&&victimAir&&at.y>AIR.minHeight&&skill.tier==='skill'&&!def.reduced&&kb>0&&airHitsBefore>0;   // air K on a juggled victim = ground slam
  const launched=(skill.launch>0&&!def.reduced&&kb>0&&!juggleOver&&!slam)||(counter&&dealt>0&&!victimAir);
  if(counter&&dealt>0){att0.counterBoost=0;skill=skill.launch>=DEFENSE.counterLaunch?skill:{...skill,launch:DEFENSE.counterLaunch};}
  if(dealt>0){st.hitDir={x:d.x,z:d.z};st.hitPower=Math.min(1,dealt/HIT_REACT.powerRef);st.rushTimer=0;}   // reaction data: push direction + strength
  if(launched){body.vy=Math.max(body.vy,skill.launch*kb);body.grounded=false;st.airHit=true;st.stun=Math.max(st.stun,skill.stun);}
  else if(dealt>0)st.stun=Math.max(st.stun,skill.stun);
  if(dealt>0&&!def.blocked&&!def.reduced&&victimAir){   // PHASE 3 air combo: each air hit keeps the victim up (until maxHits), then they fall
    st.airHits=airHitsBefore+1;st.airHit=true;
    if(slam){body.vy=-AIR.slamSpeed;st.slamBy=attackerId;st.stun=Math.max(st.stun,AIR.slamStun);st.kbTime=0;st.kbVx=st.kbVz=0;}
    else if(!juggleOver&&!launched){body.vy=Math.max(body.vy,AIR.lift);st.stun=Math.max(st.stun,AIR.stun);}
  }
  else if(launched)st.airHits=0;   // a fresh launcher starts a new juggle counter
  let hitStop=0;
  if(dealt>0){   // PHASE 3: both sides freeze briefly; ult > skill/launch > basic
    hitStop=slam?AIR.slamHitStop:skill.tier==='ult'?HITSTOP.ult:(launched||skill.tier==='skill')?HITSTOP.skill:HITSTOP.basic;
    st.hitStop=Math.max(st.hitStop,hitStop);
    const ast=world.get(attackerId,'status');if(ast)ast.hitStop=Math.max(ast.hitStop,hitStop);
    if(!reflected){const aa=world.get(attackerId,'attacker');if(aa)aa.hitConfirmed=true;}   // enables combo cancel (PHASE 4)
  }
  if(dealt>0&&!def.blocked&&!def.reduced)registerComboHit(world,attackerId,targetId,dealt);   // defended hits do not count
  if(def.broken)st.stun=Math.max(st.stun,DEFENSE.breakStun);
  if(dealt>0)st.stun=Math.min(st.stun,HIT.maxStun);
  world.events.emit('hit',{attackerId,targetId,skill,roll,amount:dealt,blocked:def.blocked,reduced:!!def.reduced,launched,slam,perfect:!!def.perfect,broken:!!def.broken,counter,airHits:st.airHits,hitStop});
  if(dealt>0)onHit?.(dealt);
  return dealt>0;
}

// ---- dash (displacement) attacks: move at dashSpeed up to dashMax, hit once on arrival ----
export function dashSystem(world,dt){
  if(!world.match.running)return;
  for(const id of world.query('dash','transform')){
    const d=world.get(id,'dash'),a=world.get(id,'transform'),t=world.get(d.targetId,'transform');
    if(world.get(id,'status').frozen)continue;
    if(world.get(id,'status').stun>0){world.remove(id,'dash');continue;}
    const to={x:t.x-a.x,y:0,z:t.z-a.z},dist=horizontalLength(to);
    if(dist<=d.skill.range){world.remove(id,'dash');resolveHit(world,id,d.targetId,d.skill,{dir:to,onHit:d.onHit});continue;}
    if(d.remaining<=0){world.remove(id,'dash');continue;}
    const step=Math.min(d.skill.dashSpeed*dt,d.remaining,dist),n=normalize(to);
    a.x+=n.x*step;a.z+=n.z*step;clampToArena(a);d.remaining-=step;
    const att=world.get(id,'attacker');att.attackTime=Math.max(att.attackTime,.1);
  }
}

// Start an attack. Instant types (melee/area) resolve now; projectile/homing/dash resolve later.
// opts.onHit(dealt) fires on every successful hit. Returns true if an instant hit landed.
export function attack(world,attackerId,tier,opts={}){
  const targetId=opponentOf(world,attackerId);
  const f=world.get(attackerId,'fighter'),at=world.get(attackerId,'transform'),att=world.get(attackerId,'attacker');
  const skill=getSkill(f.charId,tier);
  face(world,attackerId,targetId);
  const stepIn=skill.stepIn||(tier==='basic'?COMBO_STEPS[att.comboStep-1]?.stepIn||0:0);
  if(stepIn){const t=world.get(targetId,'transform');const d=normalize({x:t.x-at.x,y:0,z:t.z-at.z});at.x+=d.x*stepIn;at.z+=d.z*stepIn;clampToArena(at);}
  att.attackTime=ATTACK_TIME[tier];att.attackStyle=tier;
  const info={attackerId,targetId,tier,skill,projectileId:null};
  if(skill.type==='projectile'||skill.type==='homing'){
    const t=world.get(targetId,'transform');
    const dir=skill.type==='homing'?normalize({x:t.x-at.x,y:0,z:t.z-at.z}):forwardOf(at);
    const pos={x:at.x+dir.x*.6,y:at.y+1.1,z:at.z+dir.z*.6};
    if(skill.volley){   // several projectiles released together, each hitting one after another with its own knock direction
      info.projectileIds=skill.volley.map((st,i)=>spawnProjectile(world,{ownerId:attackerId,targetId,skill:{...skill,...st},pos,dir,onHit:opts.onHit,wait:st.wait||0,knockAngle:st.angle||0,stage:i}));
      info.projectileId=info.projectileIds[0];
    } else info.projectileId=spawnProjectile(world,{ownerId:attackerId,targetId,skill,pos,dir,onHit:opts.onHit});
    world.events.emit('attackStart',info);return false;
  }
  if(skill.type==='dash'){
    world.add(attackerId,'dash',Dash({targetId,skill,remaining:skill.dashMax,onHit:opts.onHit}));
    world.events.emit('attackStart',info);return false;
  }
  world.events.emit('attackStart',info);
  // PHASE 5: the hitbox opens now and stays live for ACTIVE_TIME; it resolves at most once (see tickActiveHitbox).
  att.active={skill,remaining:ACTIVE_TIME[tier]||ACTIVE_TIME.basic,onHit:opts.onHit};
  return tickActiveHitbox(world,attackerId,0);
}
// Melee/area hitbox. Live only while attacker.active exists: closes on hit/block/evade (one resolution per attack),
// on timeout, or when the attacker is interrupted (no hit once the animation was cancelled).
export function tickActiveHitbox(world,id,dt){
  const att=world.get(id,'attacker'),box=att?.active;if(!box)return false;
  if(world.get(id,'status').stun>0){att.active=null;return false;}
  const targetId=opponentOf(world,id),at=world.get(id,'transform'),t=world.get(targetId,'transform');
  if(Math.hypot(t.x-at.x,t.y-at.y,t.z-at.z)<=box.skill.range){
    att.active=null;
    return resolveHit(world,id,targetId,box.skill,{onHit:box.onHit});
  }
  box.remaining-=dt;if(box.remaining<=0)att.active=null;
  return false;
}

// PHASE 3 chase dash: during a combo, SPACE while the victim is juggled in the air glides the attacker up to them
// (a short fast burst, gravity off) so the air combo can continue. Limited to AIR.maxChase per combo.
export function startChase(world,id){
  const c=world.get(id,'combo'),b=world.get(id,'body'),s=world.get(id,'status');
  if(!c||c.hits<=0||!world.match.running||s.stun>0||s.chaseTimer>0||c.chases>=AIR.maxChase)return false;
  const tid=c.targetId,tt=world.get(tid,'transform'),tb=world.get(tid,'body');
  if(tid==null||tb.grounded||tt.y<=AIR.minHeight||world.get(tid,'status').stun<=0)return false;
  s.chaseTimer=AIR.chaseTime;c.chases++;b.grounded=false;b.vy=0;
  world.get(id,'attacker').attackTime=0;
  world.events.emit('chase',{id,targetId:tid,n:c.chases});return true;
}
export function chaseSystem(world,dt){
  for(const id of world.query('status','combo','transform','body')){
    const s=world.get(id,'status');if(s.chaseTimer<=0||s.frozen)continue;
    const c=world.get(id,'combo'),t=world.get(id,'transform'),b=world.get(id,'body'),tt=world.get(c.targetId??-1,'transform');
    if(!tt||s.stun>0){s.chaseTimer=0;continue;}
    s.chaseTimer=Math.max(0,s.chaseTimer-dt);b.vy=0;b.grounded=false;
    const dx=tt.x-t.x,dz=tt.z-t.z,dist=Math.hypot(dx,dz),dy=tt.y-t.y;
    if(dist>AIR.chaseRange){const step=Math.min(AIR.chaseSpeed*dt,dist-AIR.chaseRange);t.x+=dx/dist*step;t.z+=dz/dist*step;}
    t.y+=Math.sign(dy)*Math.min(Math.abs(dy),AIR.chaseSpeed*dt);
    clampToArena(t);
    if(dist<=AIR.chaseRange+.05&&Math.abs(dy)<.15)s.chaseTimer=0;
  }
}
