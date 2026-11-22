import {MATCH} from '../config.js';
import {SPAWN,fighterOf} from '../ecs/entities.js';
import {Status,Attacker,Brain,Defense} from '../ecs/components.js';
import {clearProjectiles} from './projectileSystem.js';

export function resetRound(world){
  clearProjectiles(world);
  const m=world.match;m.timeLeft=MATCH.roundTime;
  for(const id of world.query('fighter')){
    const side=world.get(id,'fighter').side,sp=SPAWN[side],t=world.get(id,'transform'),b=world.get(id,'body');
    const h=world.get(id,'health');h.hp=h.max;
    t.x=sp.x;t.z=sp.z;t.y=0;t.rotY=sp.rotY;b.vy=0;b.grounded=true;b.moving=false;
    world.add(id,'status',Status());world.add(id,'attacker',Attacker());world.add(id,'defense',Defense());
    world.remove(id,'dash');
    const it=world.get(id,'intent');it.moveX=it.moveZ=0;it.attack=null;it.jump=it.dodge=it.defend=false;it.dodgeDir=null;
    if(side==='cpu')world.add(id,'brain',Brain());
  }
}
export function startMatch(world){
  const m=world.match;
  m.roundNumber=1;m.playerRounds=0;m.cpuRounds=0;m.roundTransition=0;m.ended=false;
  for(const id of world.query('energy'))world.get(id,'energy').value=0;
  resetRound(world);m.running=true;
  world.events.emit('roundStart',{roundNumber:1});
}
// actionSystem stops while the match is not running, so anything still charging/attacking at the buzzer would stay frozen
// mid-phase (charge halo hanging in the air until the next resetRound, which never comes after the last round).
function cancelActions(world){
  for(const id of world.query('attacker')){
    const a=world.get(id,'attacker');
    a.charge=null;a.active=null;a.buffer=null;a.attackTime=0;a.comboWindow=0;a.phase='idle';
  }
}
export function endRound(world,winner,reason='時間結束'){
  const m=world.match;
  if(!m.running||m.ended||m.roundTransition>0)return;
  m.running=false;cancelActions(world);
  if(winner==='player')m.playerRounds++;else m.cpuRounds++;
  const final=m.playerRounds>=MATCH.winsNeeded||m.cpuRounds>=MATCH.winsNeeded||m.roundNumber>=MATCH.maxRounds;
  if(final){
    m.ended=true;m.roundTransition=0;
    world.events.emit('matchEnd',{winner:m.playerRounds>m.cpuRounds?'player':'cpu',roundWinner:winner,reason,playerRounds:m.playerRounds,cpuRounds:m.cpuRounds});
    return;
  }
  m.roundTransition=MATCH.transition;
  world.events.emit('roundEnd',{winner,reason,roundNumber:m.roundNumber,playerRounds:m.playerRounds,cpuRounds:m.cpuRounds});
}
export function roundSystem(world,dt){
  const m=world.match;
  if(m.roundTransition>0){
    m.roundTransition=Math.max(0,m.roundTransition-dt);
    if(m.roundTransition===0){m.roundNumber++;resetRound(world);m.running=true;world.events.emit('roundStart',{roundNumber:m.roundNumber});}
  }
  if(!m.running||m.ended)return;
  const ph=world.get(fighterOf(world,'player'),'health'),ch=world.get(fighterOf(world,'cpu'),'health');
  m.timeLeft-=dt;
  if(world.net?.role==='guest')return;   // the host decides KO / time-up and tells the guest
  if(ph.hp<=0||ch.hp<=0)endRound(world,ph.hp>0?'player':'cpu','KO');
  else if(m.timeLeft<=0)endRound(world,ph.hp>=ch.hp?'player':'cpu','時間結束');
}
