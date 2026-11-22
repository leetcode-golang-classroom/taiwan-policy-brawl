import {AI,RUSH,getSkill} from '../config.js';
import {fighterOf,opponentOf} from '../ecs/entities.js';
import {dist as dist3} from '../ecs/math.js';

// CONTROL (CPU): reads world state, writes the CPU's Intent component. Uses world.rng so tests can seed it.
export function aiControl(world,dt){
  if(world.net)return;   // online match: both sides are human
  const m=world.match;
  const id=fighterOf(world,'cpu');if(id===undefined)return;
  const it=world.get(id,'intent');it.moveX=0;it.moveZ=0;
  if(!m.running||m.ended||world.get(id,'status').frozen)return;   // hit stop: the CPU cannot start or finish anything
  const pid=opponentOf(world,id);
  const t=world.get(id,'transform'),p=world.get(pid,'transform'),s=world.get(id,'status'),b=world.get(id,'body'),brain=world.get(id,'brain'),a=world.get(id,'attacker');
  const dx=p.x-t.x,dy=p.y-t.y,dz=p.z-t.z,dist=Math.hypot(dx,dy,dz),hd=Math.hypot(dx,dz)||1;
  if(dist>AI.chaseStop&&s.stun<=0&&s.rootTrap<=0){
    const speed=(dist>AI.farDist?AI.farSpeed:AI.nearSpeed)/5;
    it.moveX=dx/hd*speed;it.moveZ=dz/hd*speed;
  }
  // close a long gap with a quick rush (rate per second so it does not depend on the frame rate)
  if(dist>RUSH.aiMinDist&&b.grounded&&s.rushCooldown<=0&&!a.charge&&world.rng()<RUSH.aiRate*dt)it.rush={x:dx/hd,z:dz/hd};
  brain.jumpCd-=dt;
  if(brain.jumpCd<=0&&dist>AI.jumpMin&&dist<AI.jumpMax&&b.grounded&&world.rng()<AI.jumpChance){it.jump=true;brain.jumpCd=4+world.rng()*3;}
  brain.attackCd-=dt;brain.skillCd-=dt;
  if(world.get(pid,'attacker').charge&&dist<AI.dodgeRange&&s.dodgeCooldown<=0&&world.rng()<AI.dodgeChance){it.dodge=true;it.dodgeDir={x:-dx/hd,z:-dz/hd};}
  // defend: when the opponent is winding up a nearby attack or a projectile is about to arrive
  const d=world.get(id,'defense');
  if(d&&!it.dodge&&!d.active&&d.cooldown<=0&&!a.charge&&world.rng()<AI.defendRate*dt){
    const pc=world.get(pid,'attacker').charge;
    let threat=!!pc&&dist<AI.defendRange;
    if(!threat)for(const j of world.query('projectile')){const pr=world.get(j,'projectile');if(pr.targetId===id&&dist3(pr.pos,{x:t.x,y:t.y+1.15,z:t.z})<AI.projectileWarn){threat=true;break;}}
    if(threat)it.defend=true;
  }
  if(a.charge||d?.active)return;
  const charId=world.get(id,'fighter').charId;
  const sb=getSkill(charId,'basic'),ss=getSkill(charId,'skill');
  const reachOf=k=>k.type==='dash'?k.range+k.dashMax*.7:Math.min(k.range*.8,AI.rangedMax);
  const basicReach=sb.type==='melee'?AI.meleeBasic:reachOf(sb);
  const skillReach=ss.type==='melee'?AI.meleeSkill:reachOf(ss);
  if(dist<basicReach&&brain.attackCd<=0){brain.attackCd=1+world.rng()*.5;it.attack='basic';}
  else if(dist<skillReach&&brain.skillCd<=0){brain.skillCd=3.2+world.rng()*1.2;it.attack='skill';}
}
