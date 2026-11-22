import {DODGE,DEFENSE,RUSH,MOVE} from '../config.js';
import {LUNGE} from '../config.js';
import {opponentOf} from '../ecs/entities.js';
import {normalize,horizontalLength} from '../ecs/math.js';
import {face,clampToArena} from './combatSystem.js';

export function jump(world,id){
  const b=world.get(id,'body'),s=world.get(id,'status');
  if(!world.match.running||!b.grounded||s.rootTrap>0)return false;
  b.vy=b.jumpPower;b.grounded=false;
  world.events.emit('jump',{id});return true;
}
// direction: {x,z} or null (null = sidestep perpendicular to the opponent)
export function performDodge(world,id,direction){
  const s=world.get(id,'status'),b=world.get(id,'body'),t=world.get(id,'transform'),f=world.get(id,'fighter');
  if(!world.match.running||s.dodgeCooldown>0||!b.grounded||s.rootTrap>0)return false;
  let move=direction?{x:direction.x,y:0,z:direction.z}:{x:0,y:0,z:0};
  if(horizontalLength(move)<.001){
    const o=world.get(opponentOf(world,id),'transform');
    const toward=normalize({x:o.x-t.x,y:0,z:o.z-t.z});move={x:-toward.z,y:0,z:toward.x};
  }
  move=normalize(move);
  s.dodgeDir={x:move.x,z:move.z};s.dodgeTimer=DODGE.duration;s.dodgeInvuln=DODGE.invuln;s.dodgeCooldown=DODGE.cooldown;
  s.stun=0;s.hitReact=0;b.movePhase=0;
  const from={x:t.x,z:t.z},d=DODGE.distance[f.charId]||DODGE.defaultDistance;
  t.x+=move.x*d;t.z+=move.z*d;
  world.events.emit('dodge',{id,from,to:{x:t.x,z:t.z},dir:move});
  return true;
}
// Quick rush (double-tap): fast grounded burst along `direction` (world xz, normalised here).
export function performRush(world,id,direction){
  const s=world.get(id,'status'),b=world.get(id,'body'),a=world.get(id,'attacker');
  if(!world.match.running||!direction||!b.grounded)return false;
  if(s.rushCooldown>0||s.rushTimer>0||s.stun>0||s.rootTrap>0||s.dodgeTimer>0||a.charge||world.get(id,'defense')?.active)return false;
  const d=normalize({x:direction.x,y:0,z:direction.z});if(horizontalLength(d)<.001)return false;
  s.rushDir={x:d.x,z:d.z};s.rushTimer=RUSH.duration;s.rushCooldown=RUSH.cooldown;
  world.events.emit('rush',{id,dir:{x:d.x,z:d.z}});return true;
}
function turnToward(world,id,targetId,dt){
  const a=world.get(id,'transform'),b=world.get(targetId,'transform');
  const want=Math.atan2(b.x-a.x,b.z-a.z);
  let d=want-a.rotY;d=Math.atan2(Math.sin(d),Math.cos(d));   // shortest signed angle
  const maxTurn=MOVE.turnRate*dt;a.rotY+=Math.abs(d)<=maxTurn?d:Math.sign(d)*maxTurn;
}
// Consumes intent.move / jump / dodge; handles facing and attack lunge.
export function movementSystem(world,dt){
  const m=world.match;if(!m.running||m.ended)return;
  for(const id of world.query('fighter','intent','transform','body','status','attacker')){
    const it=world.get(id,'intent'),t=world.get(id,'transform'),b=world.get(id,'body'),s=world.get(id,'status'),a=world.get(id,'attacker'),f=world.get(id,'fighter');
    if(s.frozen)continue;   // hit stop: no movement; jump/dodge/rush requests stay queued in the intent
    const jumpReq=it.jump,dodgeReq=it.dodge,dodgeDir=it.dodgeDir,rushReq=it.rush;it.jump=false;it.dodge=false;it.dodgeDir=null;it.rush=null;
    const guarding=world.get(id,'defense')?.active;
    if(dodgeReq&&!guarding)performDodge(world,id,dodgeDir);
    if(jumpReq&&!guarding)jump(world,id);
    if(rushReq&&!guarding)performRush(world,id,rushReq);
    if(s.rushTimer>0&&(s.stun>0||s.rootTrap>0||a.charge||!b.grounded||s.dodgeTimer>0))s.rushTimer=0;
    const mag=Math.hypot(it.moveX,it.moveZ);
    // rush just ended -> short braking/recovery during which move input is ignored
    if(b.wasRush&&s.rushTimer<=0&&s.stun<=0)s.rushRecover=RUSH.recovery;
    b.wasRush=s.rushTimer>0;
    // PHASE 8: velocity chases a target velocity. Input -> accelerate (this also turns the heading smoothly);
    // no input / busy -> friction. Rush ramps up fast and brakes hard. Hits zero the velocity (see resolveHit).
    const guard=guarding?DEFENSE.moveMult:1,sp=b.moveSpeed*guard;
    const canWalk=s.stun<=0&&s.rootTrap<=0&&!a.charge&&s.rushRecover<=0;
    let tvx=0,tvz=0,rate=s.rushRecover>0?RUSH.endDecel:MOVE.friction;
    const rushing=s.rushTimer>0,walking=!rushing&&mag>0&&canWalk;
    if(rushing){tvx=s.rushDir.x*RUSH.speed;tvz=s.rushDir.z*RUSH.speed;rate=RUSH.accel;}
    else if(walking){tvx=it.moveX*sp;tvz=it.moveZ*sp;rate=MOVE.accel;}
    const ex=tvx-b.vx,ez=tvz-b.vz,el=Math.hypot(ex,ez),maxd=rate*dt;
    if(el<=maxd){b.vx=tvx;b.vz=tvz;}else{b.vx+=ex/el*maxd;b.vz+=ez/el*maxd;}
    t.x+=b.vx*dt;t.z+=b.vz*dt;clampToArena(t);
    const speed=Math.hypot(b.vx,b.vz);
    b.moving=speed>MOVE.moveEps||walking;b.moveFwd=0;b.moveSide=0;   // held input counts even in the instant of a turn-around
    if(b.moving){
      const base=f.side==='player'?12:9;
      b.movePhase+=dt*(rushing?base*1.33:base*Math.min(1.2,Math.max(.4,speed/b.moveSpeed)));   // stride follows the real speed (no skating)
    }
    // While charging the fighter stays planted, but held move input still drives small footwork (animation reads chargeFwd/chargeSide/stepPhase).
    b.chargeFwd=0;b.chargeSide=0;
    if(a.charge&&mag>0&&s.stun<=0&&s.rootTrap<=0){const sr=Math.sin(t.rotY),cr=Math.cos(t.rotY);b.chargeFwd=(it.moveX*sr+it.moveZ*cr)/mag;b.chargeSide=(-it.moveX*cr+it.moveZ*sr)/mag;b.stepPhase+=dt*9;}
    // facing: snap while attacking, otherwise turn toward the opponent at a limited rate (no 180 degree flip in one frame)
    const opp=opponentOf(world,id);
    if(opp!==undefined){if(a.charge||a.attackTime>0)face(world,id,opp);else turnToward(world,id,opp,dt);}
    if(b.moving){ // direction relative to the facing: +fwd toward the opponent, +side to the fighter's right. Held input wins; while coasting use the velocity.
      const dirX=rushing?s.rushDir.x:walking?it.moveX:b.vx,dirZ=rushing?s.rushDir.z:walking?it.moveZ:b.vz;
      const l=Math.hypot(dirX,dirZ)||1,sr=Math.sin(t.rotY),cr=Math.cos(t.rotY);
      b.moveFwd=(dirX*sr+dirZ*cr)/l;b.moveSide=(-dirX*cr+dirZ*sr)/l;
    }
    if(a.attackTime>0){
      const l=LUNGE[f.charId];
      if(l){const sp=l[a.attackStyle]??l.default;t.x+=Math.sin(t.rotY)*dt*sp;t.z+=Math.cos(t.rotY)*dt*sp;}
    }
  }
}
