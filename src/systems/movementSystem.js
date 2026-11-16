import {DODGE,DEFENSE,RUSH} from '../config.js';
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
// Consumes intent.move / jump / dodge; handles facing and attack lunge.
export function movementSystem(world,dt){
  const m=world.match;if(!m.running||m.ended)return;
  for(const id of world.query('fighter','intent','transform','body','status','attacker')){
    const it=world.get(id,'intent'),t=world.get(id,'transform'),b=world.get(id,'body'),s=world.get(id,'status'),a=world.get(id,'attacker'),f=world.get(id,'fighter');
    const jumpReq=it.jump,dodgeReq=it.dodge,dodgeDir=it.dodgeDir,rushReq=it.rush;it.jump=false;it.dodge=false;it.dodgeDir=null;it.rush=null;
    const guarding=world.get(id,'defense')?.active;
    if(dodgeReq&&!guarding)performDodge(world,id,dodgeDir);
    if(jumpReq&&!guarding)jump(world,id);
    if(rushReq&&!guarding)performRush(world,id,rushReq);
    if(s.rushTimer>0&&(s.stun>0||s.rootTrap>0||a.charge||!b.grounded||s.dodgeTimer>0))s.rushTimer=0;
    const mag=Math.hypot(it.moveX,it.moveZ);
    b.moving=false;b.moveFwd=0;b.moveSide=0;
    let dirX=it.moveX,dirZ=it.moveZ;
    if(s.rushTimer>0){
      t.x+=s.rushDir.x*RUSH.speed*dt;t.z+=s.rushDir.z*RUSH.speed*dt;clampToArena(t);
      b.movePhase+=dt*(f.side==='player'?16:13);b.moving=true;dirX=s.rushDir.x;dirZ=s.rushDir.z;
    } else if(mag>0&&s.stun<=0&&s.rootTrap<=0&&!a.charge){
      const sp=b.moveSpeed*(guarding?DEFENSE.moveMult:1);t.x+=it.moveX*dt*sp;t.z+=it.moveZ*dt*sp;
      b.movePhase+=dt*(f.side==='player'?12:9);b.moving=true;
    }
    const opp=opponentOf(world,id);if(opp!==undefined)face(world,id,opp);
    if(b.moving){ // direction relative to the facing: +fwd toward the opponent, +side to the fighter's right (animation reads these)
      const l=Math.hypot(dirX,dirZ)||1,sr=Math.sin(t.rotY),cr=Math.cos(t.rotY);
      b.moveFwd=(dirX*sr+dirZ*cr)/l;b.moveSide=(-dirX*cr+dirZ*sr)/l;
    }
    if(a.attackTime>0){
      const l=LUNGE[f.charId];
      if(l){const sp=l[a.attackStyle]??l.default;t.x+=Math.sin(t.rotY)*dt*sp;t.z+=Math.cos(t.rotY)*dt*sp;}
    }
  }
}
