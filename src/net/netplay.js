import {fighterOf,ENERGY} from '../ecs/entities.js';
import {applyRemoteCommand,moveFromKeys} from '../systems/playerControl.js';
import {startMatch,endRound,triggerKO,isKoPhase} from '../systems/roundSystem.js';

// Online match = host-authoritative hybrid. Both browsers run the full simulation (so every skill / VFX plays locally)
// with BOTH fighters human-driven: local keys + the peer's forwarded commands. The host then streams state snapshots
// (position, HP, energy, timers, round score) that the guest blends in, and decides KO / time-up. Host is P1 (left), guest is P2.
const SNAP_MS=50,MOVE_MS=50;

export function startNetSession(world,peer,role,{getKeys,onMessage,onEnd}){
  const local=role==='host'?'player':'cpu',remote=role==='host'?'cpu':'player';
  const net=world.net={role,local,remote,remoteMove:{x:0,z:0},send:m=>peer.send(m)};
  // Fair energy for both seats.
  for(const side of ['player','cpu'])Object.assign(world.get(fighterOf(world,side),'energy'),ENERGY.player);
  const timers=[];let ended=false;

  // --- outgoing ---
  let lastMove={x:9,z:9},lastSent=0;
  timers.push(setInterval(()=>{
    const mv=moveFromKeys(getKeys()),now=performance.now();
    if(Math.abs(mv.x-lastMove.x)>.01||Math.abs(mv.z-lastMove.z)>.01||now-lastSent>400){
      lastMove=mv;lastSent=now;peer.sendFast({t:'mv',x:+mv.x.toFixed(3),z:+mv.z.toFixed(3)});
    }
  },MOVE_MS));
  if(role==='host'){
    timers.push(setInterval(()=>peer.sendFast({t:'snap',...snapshot(world)}),SNAP_MS));
    const forward=final=>e=>peer.send({t:'end',winner:e.roundWinner||e.winner,reason:e.reason,pr:e.playerRounds,cr:e.cpuRounds,final});   // host verdict: match over or just a round
    world.events.on('ko',e=>peer.send({t:'ko',winner:e.winner}));   // guest plays the same cinematic; scoring still waits for 'end'
    world.events.on('roundEnd',forward(false));world.events.on('matchEnd',forward(true));
  }

  // --- incoming ---
  peer.onMessage(m=>{
    switch(m.t){
      case 'mv':net.remoteMove.x=+m.x||0;net.remoteMove.z=+m.z||0;break;
      case 'cmd':applyRemoteCommand(world,m);break;
      case 'snap':if(role==='guest')applySnapshot(world,m);break;
      case 'ko':if(role==='guest')triggerKO(world,m.winner);break;
      case 'end':if(role==='guest'){   // snapshots may already carry the new score: rewind it so endRound counts exactly once
        const mt=world.match;mt.playerRounds=m.pr-(m.winner==='player'?1:0);mt.cpuRounds=m.cr-(m.winner==='cpu'?1:0);
        endRound(world,m.winner,m.reason,{final:!!m.final});}break;
      case 'start':startMatch(world);break;
      case 'reqStart':if(role==='host'){startMatch(world);peer.send({t:'start'});}break;
      default:onMessage?.(m);
    }
  });
  const end=reason=>{
    if(ended)return;ended=true;
    for(const t of timers)clearInterval(t);
    world.net=null;
    Object.assign(world.get(fighterOf(world,'cpu'),'energy'),ENERGY.cpu);
    for(const side of ['player','cpu']){const it=world.get(fighterOf(world,side),'intent');it.moveX=it.moveZ=0;}
    peer.close();onEnd?.(reason);
  };
  peer.onClose(()=>end('對手已離線'));
  return {end,peer};
}

// Either seat asks for a (re)start; the host is the one that actually starts it.
export function requestStart(world){
  const n=world.net;if(!n)return false;
  if(n.role==='host'){startMatch(world);n.send({t:'start'});}else n.send({t:'reqStart'});
  return true;
}

const r3=v=>Math.round(v*1000)/1000;
function snapshot(world){
  const f=side=>{
    const id=fighterOf(world,side),t=world.get(id,'transform'),b=world.get(id,'body'),s=world.get(id,'status'),a=world.get(id,'attacker');
    return {x:r3(t.x),y:r3(t.y),z:r3(t.z),r:r3(t.rotY),vy:r3(b.vy),g:b.grounded?1:0,hp:r3(world.get(id,'health').hp),en:r3(world.get(id,'energy').value),st:r3(s.stun),rt:r3(s.rootTrap),cd:[a.cooldowns.basic,a.cooldowns.skill,a.cooldowns.ult].map(r3),
      dt:r3(s.dodgeTimer),di:r3(s.dodgeInvuln),dx:r3(s.dodgeDir.x),dz:r3(s.dodgeDir.z),rs:r3(s.rushTimer),ah:s.airHit?1:0,an:s.airHits,lt:r3(s.landTimer),df:world.get(id,'defense')?.active?1:0};
  };
  const m=world.match;
  return {p:f('player'),c:f('cpu'),m:{tl:r3(m.timeLeft),n:m.roundNumber,pr:m.playerRounds,cr:m.cpuRounds}};
}
// Blend the host's state in: small drift is eased out, big drift (teleport, new round) snaps.
function applySnapshot(world,s){
  if(isKoPhase(world.match.phase))return;   // the KO cinematic drives both fighters locally; the host's 'end' message settles the score
  for(const [side,d] of [['player',s.p],['cpu',s.c]]){
    const id=fighterOf(world,side);if(id===undefined||!d)continue;
    const t=world.get(id,'transform'),b=world.get(id,'body'),st=world.get(id,'status'),a=world.get(id,'attacker');
    const err=Math.hypot(d.x-t.x,d.z-t.z),k=err>1.6?1:.4;
    t.x+=(d.x-t.x)*k;t.z+=(d.z-t.z)*k;t.y+=(d.y-t.y)*(Math.abs(d.y-t.y)>1?1:.5);
    let dr=d.r-t.rotY;dr=Math.atan2(Math.sin(dr),Math.cos(dr));t.rotY+=dr*.5;
    b.vy=d.vy;b.grounded=!!d.g;
    // local-only status the position snapshot used to miss: a stale dodge / airborne flag leaves the fighter tilted on one screen only
    if(Math.abs(st.dodgeTimer-d.dt)>.1||(d.dt<=0)!==(st.dodgeTimer<=0)){st.dodgeTimer=d.dt;st.dodgeInvuln=d.di;st.dodgeDir={x:d.dx,z:d.dz};}
    if((d.rs>0)!==(st.rushTimer>0))st.rushTimer=d.rs;
    st.airHit=!!d.ah;st.airHits=d.an;if(Math.abs(st.landTimer-d.lt)>.15)st.landTimer=d.lt;
    const df=world.get(id,'defense');if(df&&df.active&&!d.df){df.active=false;df.timer=0;df.startup=0;df.layers=0;}   // only release a stuck guard; raising one needs its layer setup
    world.get(id,'health').hp=d.hp;world.get(id,'energy').value=d.en;
    if(Math.abs(st.stun-d.st)>.15)st.stun=d.st;
    st.rootTrap=d.rt;
    a.cooldowns.basic=d.cd[0];a.cooldowns.skill=d.cd[1];a.cooldowns.ult=d.cd[2];
  }
  const m=world.match;m.timeLeft=s.m.tl;m.roundNumber=s.m.n;m.playerRounds=s.m.pr;m.cpuRounds=s.m.cr;
}
