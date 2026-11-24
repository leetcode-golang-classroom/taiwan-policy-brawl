import {MATCH,KO,HIT_REACT,GRAVITY,airFor} from '../config.js';
import {SPAWN,fighterOf} from '../ecs/entities.js';
import {Status,Attacker,Brain,Defense} from '../ecs/components.js';
import {clearProjectiles} from './projectileSystem.js';

// Battle flow state machine (one field: match.phase). Round/match scoring only ever happens in endRound, guarded by this phase.
export const PHASE={FIGHT:'NORMAL_FIGHT',KO_TRIGGER:'KO_TRIGGER',KO_REPLAY:'KO_REPLAY',KO_FREEZE:'KO_FREEZE',DEFEAT:'DEFEAT_ANIMATION',ROUND_RESULT:'ROUND_RESULT',MATCH_VICTORY:'MATCH_VICTORY'};
export const isKoPhase=p=>p===PHASE.KO_TRIGGER||p===PHASE.KO_REPLAY||p===PHASE.KO_FREEZE||p===PHASE.DEFEAT;
const KO_STAGES=[[PHASE.KO_TRIGGER,KO.trigger],[PHASE.KO_REPLAY,KO.replay],[PHASE.KO_FREEZE,KO.freeze],[PHASE.DEFEAT,KO.defeat]];
const KO_TOTAL=KO_STAGES.reduce((s,[,d])=>s+d,0);
const setPhase=(world,phase)=>{const m=world.match;if(m.phase===phase)return false;m.phase=phase;world.events.emit('phase_change',{phase});return true;};

export function resetRound(world){
  clearProjectiles(world);
  const m=world.match;m.timeLeft=MATCH.roundTime;m.phase=PHASE.FIGHT;m.ko=null;m.lastHit=null;
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
  m.roundNumber=1;m.playerRounds=0;m.cpuRounds=0;m.roundTransition=0;m.ended=false;m.phase=PHASE.FIGHT;m.ko=null;
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
// The fatal blow: freeze the fight and start the KO cinematic. Fires at most once per round (phase leaves NORMAL_FIGHT).
// The round is NOT scored here; koSystem calls endRound when the cinematic is over.
export function triggerKO(world,winner){
  const m=world.match;
  if(!m.running||m.ended||m.phase!==PHASE.FIGHT)return false;
  m.running=false;   // actions stay as they are so the cinematic can show the lethal pose; they are cancelled when the defeat starts
  m.ko={winner,loser:winner==='player'?'cpu':'player',t:0,hit:m.lastHit};
  setPhase(world,PHASE.KO_TRIGGER);
  world.events.emit('ko',{winner,loser:m.ko.loser,hit:m.lastHit,roundNumber:m.roundNumber});
  return true;
}
// Defeat animation start: attacks end, the loser is thrown along the last hit's direction and then drops (hard landing = Down pose).
function knockOut(world){
  const m=world.match,k=m.ko;if(!k)return;
  cancelActions(world);
  const id=fighterOf(world,k.loser),b=world.get(id,'body'),st=world.get(id,'status'),K=KO.knock;
  let d=m.lastHit?.dir;
  if(!d||Math.hypot(d.x,d.z)<.01){const a=world.get(fighterOf(world,k.winner),'transform'),t=world.get(id,'transform'),l=Math.hypot(t.x-a.x,t.z-a.z)||1;d={x:(t.x-a.x)/l,z:(t.z-a.z)/l};}   // no recorded direction: away from the winner
  // Parabolic fly-out: launch speed + gravity fix the flight time T; horizontal speed is constant over T (kbConst), so the path is a true arc.
  const g=GRAVITY*airFor(world.get(id,'fighter').charId).juggleGravity,y=world.get(id,'transform').y;
  b.vy=Math.max(b.vy,K.launch);b.grounded=false;st.airHit=true;st.hitStop=0;st.stun=Math.max(st.stun,K.downStun);
  const T=(b.vy+Math.sqrt(b.vy*b.vy+2*g*y))/g;
  if(Math.hypot(d.x,d.z)>.01){st.kbVx=d.x*K.push/T;st.kbVz=d.z*K.push/T;st.kbTime=st.kbDur=T;st.kbConst=true;}
  k.knocked=true;
}
// The defeated fighter stays down (no getting up, no sliding back to idle) until the next round resets everything.
function holdDown(world){
  const k=world.match.ko;if(!k?.knocked)return;
  const id=fighterOf(world,k.loser),b=world.get(id,'body'),st=world.get(id,'status');
  if(b.grounded&&!st.airHit){st.landTimer=Math.max(st.landTimer,HIT_REACT.landTime);st.stun=Math.max(st.stun,.5);}
}
// Advances the KO timeline on the cinematic (real) clock. The guest only follows: scoring waits for the host's 'end'.
export function koSystem(world,dt){
  const m=world.match,k=m.ko;
  if(!k)return;
  if(!isKoPhase(m.phase)){holdDown(world);return;}   // round / match result: the loser stays down
  k.t+=dt;
  let acc=0,phase=PHASE.DEFEAT;
  for(const [p,d] of KO_STAGES){acc+=d;if(k.t<acc){phase=p;break;}}
  if(setPhase(world,phase)&&phase===PHASE.DEFEAT)knockOut(world);
  holdDown(world);
  if(k.t>=KO_TOTAL&&world.net?.role!=='guest')endRound(world,k.winner,'KO');
}
// Scores one round. Best of three: ONLY a second round win makes a match winner (round winner and match winner are different states:
// ROUND_RESULT + 'roundEnd' vs MATCH_VICTORY + 'matchEnd'). `remote` ({final}) is the host's verdict on a guest, so the two ends never decide it twice.
export function endRound(world,winner,reason='時間結束',remote=null){
  const m=world.match;
  if(m.ended||m.roundTransition>0||m.phase===PHASE.ROUND_RESULT||m.phase===PHASE.MATCH_VICTORY)return;
  if(!m.running&&!isKoPhase(m.phase))return;
  m.running=false;cancelActions(world);
  if(winner==='player')m.playerRounds++;else m.cpuRounds++;
  const final=remote?!!remote.final:(m.playerRounds>=MATCH.winsNeeded||m.cpuRounds>=MATCH.winsNeeded||m.roundNumber>=MATCH.maxRounds);   // maxRounds is only a safety net: a round always has a winner
  if(final){
    m.ended=true;m.roundTransition=0;setPhase(world,PHASE.MATCH_VICTORY);
    world.events.emit('matchEnd',{winner:m.playerRounds>m.cpuRounds?'player':'cpu',roundWinner:winner,reason,playerRounds:m.playerRounds,cpuRounds:m.cpuRounds});
    return;
  }
  m.roundTransition=MATCH.transition;setPhase(world,PHASE.ROUND_RESULT);
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
  if(ph.hp<=0||ch.hp<=0)triggerKO(world,ph.hp>0?'player':'cpu');
  else if(m.timeLeft<=0)endRound(world,ph.hp>=ch.hp?'player':'cpu','時間結束');
}
