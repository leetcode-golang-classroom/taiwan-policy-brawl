import {DEFENSE,AIR,AI,ARENA,RUSH,getSkill} from '../config.js';
import {fighterOf,opponentOf} from '../ecs/entities.js';
import {dist as dist3} from '../ecs/math.js';
import {actionLocked} from './actionSystem.js';

// Would standing at (x,z) put the fighter against an arena wall? (AI keeps `AI.wallMargin` away from it.)
const nearWall=(x,z)=>Math.abs(x)>ARENA.halfX-AI.wallMargin||Math.abs(z)>ARENA.halfZ-AI.wallMargin;
const between=(world,lo,hi)=>lo+world.rng()*(hi-lo);
// Is the player about to land (or currently landing) a hit on the CPU?  `imminent`: the strike frame is < 0.3 s away.
function playerThreat(world,id,pid,dist){
  const pa=world.get(pid,'attacker');
  if(pa.active)return {kind:'melee',imminent:true};
  if(pa.charge){const left=pa.charge.duration-pa.charge.time;if(dist<AI.dodgeRange)return {kind:'charge',imminent:left<.3};}
  const t=world.get(id,'transform');
  for(const j of world.query('projectile')){const pr=world.get(j,'projectile');
    if(pr.targetId===id&&dist3(pr.pos,{x:t.x,y:t.y+1.15,z:t.z})<AI.projectileWarn)return {kind:'projectile',imminent:true};}
  return null;
}
// CONTROL (CPU): reads world state, writes the CPU's Intent component. Uses world.rng and world.time (combat clock) only,
// so it is deterministic per seed and unaffected by frame rate. Frozen by hit stop like every other fighter.
export function aiControl(world,dt){
  if(world.net)return;   // online match: both sides are human
  const m=world.match;
  const id=fighterOf(world,'cpu');if(id===undefined)return;
  const it=world.get(id,'intent');it.moveX=0;it.moveZ=0;
  if(!m.running||m.ended||world.get(id,'status').frozen)return;   // hit stop: the CPU cannot start or finish anything
  const pid=opponentOf(world,id),now=world.time;
  const t=world.get(id,'transform'),p=world.get(pid,'transform'),s=world.get(id,'status'),b=world.get(id,'body'),brain=world.get(id,'brain'),a=world.get(id,'attacker');
  const ps=world.get(pid,'status'),pa=world.get(pid,'attacker'),d=world.get(id,'defense'),e=world.get(id,'energy');
  const dx=p.x-t.x,dy=p.y-t.y,dz=p.z-t.z,dist=Math.hypot(dx,dy,dz),hd=Math.hypot(dx,dz)||1,ux=dx/hd,uz=dz/hd;
  const charId=world.get(id,'fighter').charId;
  const sb=getSkill(charId,'basic'),ss=getSkill(charId,'skill'),su=getSkill(charId,'ult');
  const reachOf=k=>k.type==='dash'?k.range+k.dashMax*.7:Math.min(k.range*.8,AI.rangedMax);
  const basicReach=sb.type==='melee'?AI.meleeBasic:reachOf(sb);
  const skillReach=ss.type==='melee'?AI.meleeSkill:reachOf(ss);
  const ultReach=Math.min(su.range*AI.ultReachMul,AI.rangedMax+2);
  const ranged=sb.type!=='melee';
  const pref=ranged?Math.min(AI.rangedPref,basicReach*.75):AI.chaseStop;   // distance it likes to fight at
  const busy=!!a.charge||!!d?.active;

  // ---- perception with reaction delay -------------------------------------------------------------------
  const threat=playerThreat(world,id,pid,dist);
  if(threat&&!brain.threat){brain.threat=true;brain.reacted=false;brain.reactAt=now+between(world,AI.reactMin,AI.reactMax);}
  else if(!threat){brain.threat=false;}
  const incoming=!!threat&&threat.imminent;
  if(brain.threat&&!brain.reacted&&now>=brain.reactAt&&!busy){
    brain.reacted=true;   // ONE decision per threat, not one roll per frame
    if(world.rng()<AI.reactChance){
      const canDodge=s.dodgeCooldown<=0&&b.grounded,canGuard=!!d&&d.cooldown<=0&&d.recovery<=0&&b.grounded;
      const wantDodge=world.rng()<AI.dodgePref;
      if((wantDodge&&canDodge)||(!canGuard&&canDodge)){it.dodge=true;it.dodgeDir={x:-ux,z:-uz};}
      else if(canGuard){
        // Perfect guard: the strike frame of a visible charge is predictable, so the CPU sometimes waits and raises the guard
        // just before it lands (as a skilled human would). It only ever reads the player's on-screen action, never its input.
        const left=threat.kind==='charge'?pa.charge.duration-pa.charge.time:-1;
        const lead=DEFENSE.startup+DEFENSE.perfect*.5;
        if(left>lead&&world.rng()<AI.perfectChance)brain.guardAt=now+left-lead+between(world,-AI.perfectJitter,AI.perfectJitter);
        else it.defend=true;
      }
    }
  }

  if(brain.guardAt!=null){   // the planned perfect-guard press
    if(!threat&&!pa.charge&&!pa.active)brain.guardAt=null;     // the attack was cancelled: stand down
    else if(now>=brain.guardAt){brain.guardAt=null;if(!busy&&s.stun<=0)it.defend=true;}
  }
  // ---- guard counter: right after a successful block, sometimes cancel the guard into a boosted J ----
  if(d?.active&&d.counter>0){
    if(brain.counterAt==null)brain.counterAt=world.rng()<AI.counterChance?now+between(world,AI.counterMin,AI.counterMax):Infinity;
    if(now>=brain.counterAt&&dist<basicReach+.3){brain.counterAt=null;it.attack='basic';return;}
  }else brain.counterAt=null;
  // ---- juggle: the CPU also chases a launched opponent, air-combos and finishes with a slam (limits live in resolveHit / startChase) ----
  const cb=world.get(id,'combo'),pbody=world.get(pid,'body');
  const juggling=cb.hits>0&&cb.targetId===pid&&!pbody.grounded&&p.y>AIR.minHeight&&ps.stun>0;
  if(!juggling)brain.airAt=null;
  else{
    if(brain.airAt==null)brain.airAt=now+between(world,.12,.25);   // reads the launch first, like a human would
    if(now>=brain.airAt&&!busy&&!actionLocked(world,id)){
      if(b.grounded){if(cb.chases<AIR.maxChase)it.jump=true;}   // chase dash (movementSystem turns SPACE into a chase)
      else if(dist<basicReach+.5){
        const fin=ps.airHits>=AIR.maxHits-1||(ps.airHits>=2&&world.rng()<.3);
        if(fin&&a.cooldowns.skill<=0&&t.y>AIR.minHeight){it.attack='skill';brain.recoverUntil=now+between(world,AI.recoverMin,AI.recoverMax);}
        else it.attack='basic';
      }
    }
    return;
  }
  // ---- positioning: approach / keep distance / circle (never just stand there, never chase forever) --------
  if(!a.charge&&a.attackTime<=0)brain.chain=false;
  const recovering=now<brain.recoverUntil&&!brain.chain;   // a chosen combo follow-up is not a back-off
  // circle the opponent; flip direction every strafeMin..strafeMax s, and whenever the way ahead runs into a wall
  const circle=()=>{
    brain.mode='strafe';
    if(now>=brain.strafeUntil){brain.strafeDir=world.rng()<.5?-1:1;brain.strafeUntil=now+between(world,AI.strafeMin,AI.strafeMax);}
    const ahead=()=>nearWall(t.x-uz*brain.strafeDir*1.2,t.z+ux*brain.strafeDir*1.2);
    if(ahead()){brain.strafeDir*=-1;brain.strafeUntil=now+between(world,AI.strafeMin,AI.strafeMax);}
    if(ahead()){   // cornered: head back toward the middle of the arena
      const l=Math.hypot(t.x,t.z)||1;it.moveX=-t.x/l*AI.strafeSpeed;it.moveZ=-t.z/l*AI.strafeSpeed;return;
    }
    it.moveX=-uz*brain.strafeDir*AI.strafeSpeed;it.moveZ=ux*brain.strafeDir*AI.strafeSpeed;
  };
  if(s.stun<=0&&s.rootTrap<=0){
    // melee CPUs close in until the basic is actually in reach (stopping short of it would mean never attacking)
    if(dist>(ranged?pref+.4:pref+.1)&&!recovering){
      brain.mode='approach';
      const speed=(dist>AI.farDist?AI.farSpeed:AI.nearSpeed)/5;
      it.moveX=ux*speed;it.moveZ=uz*speed;
    } else if((ranged&&dist<pref-1)||(recovering&&dist<basicReach*.9)){
      // keep range / back off after attacking - but never retreat into a wall: circle away from it instead
      const bx=t.x-ux*1.2,bz=t.z-uz*1.2;
      if(!nearWall(bx,bz)){brain.mode='retreat';it.moveX=-ux*AI.retreatSpeed;it.moveZ=-uz*AI.retreatSpeed;}
      else circle();
    } else circle();
  }
  // close a long gap with a quick rush (rate per second so it does not depend on the frame rate)
  if(!recovering&&dist>RUSH.aiMinDist&&b.grounded&&s.rushCooldown<=0&&!a.charge&&world.rng()<RUSH.aiRate*dt)it.rush={x:ux,z:uz};
  brain.jumpCd-=dt;
  if(brain.jumpCd<=0&&dist>AI.jumpMin&&dist<AI.jumpMax&&b.grounded&&world.rng()<AI.jumpChance){it.jump=true;brain.jumpCd=4+world.rng()*3;}

  // ---- attacks --------------------------------------------------------------------------------------------
  // think cooldowns run faster while the player is stunned or recovering (punish), never while it is attacking us
  const punish=ps.stun>0||(pa.attackTime>0&&!pa.charge&&!pa.active);
  const tick=dt*(punish?AI.punishBoost:1);
  brain.attackCd-=tick;brain.skillCd-=tick;
  if(busy||actionLocked(world,id))return;
  // combo follow-up: once per confirmed hit the CPU rolls to chain J->J or cancel into K; otherwise it backs off. Whiffs never chain.
  if(!a.hitConfirmed)brain.rolled=false;
  else if(!brain.rolled&&!a.charge&&a.attackTime>0){
    brain.rolled=true;
    if(a.attackStyle==='basic'&&a.comboStep>=1&&a.comboStep<3&&dist<basicReach&&world.rng()<AI.chainChance){brain.chain=true;it.attack='basic';return;}
    if(a.attackStyle==='basic'&&a.cooldowns.skill<=0&&brain.skillCd<=0&&dist<skillReach&&world.rng()<AI.cancelSkillChance){brain.chain=false;brain.skillCd=3.2+world.rng()*1.2;brain.recoverUntil=now+between(world,AI.recoverMin,AI.recoverMax)+.2;it.attack='skill';return;}
    brain.chain=false;
  }
  if(recovering)return;                 // attack -> recovery: no new attack until the back-off is over
  if(incoming&&!brain.reacted)return;   // do not blindly attack into the player's strike frame while still reading it
  // ultimate: energy full AND the real cooldown ready; a short think delay so it is not an instant reflex
  if(e.value>=100&&a.cooldowns.ult<=0){
    if(brain.ultAt===null)brain.ultAt=now+between(world,AI.ultThinkMin,AI.ultThinkMax);
    if(now>=brain.ultAt&&dist<ultReach){brain.ultAt=null;brain.recoverUntil=now+between(world,AI.recoverMin,AI.recoverMax)+.4;it.attack='ult';return;}
  } else brain.ultAt=null;
  if(dist<basicReach&&brain.attackCd<=0&&a.cooldowns.basic<=0){
    brain.attackCd=1+world.rng()*.5;brain.recoverUntil=now+between(world,AI.recoverMin,AI.recoverMax);it.attack='basic';
  } else if(dist<skillReach&&brain.skillCd<=0&&a.cooldowns.skill<=0){
    brain.skillCd=3.2+world.rng()*1.2;brain.recoverUntil=now+between(world,AI.recoverMin,AI.recoverMax)+.2;it.attack='skill';
  }
}
