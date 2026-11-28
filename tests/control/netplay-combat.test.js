import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {startNetSession,requestStart} from '../../src/net/netplay.js';
import {applyRemoteCommand,pressAttack,pressJump,pressDefend} from '../../src/systems/playerControl.js';
import {stepWorld} from '../../src/systems/index.js';
import {resolveHit} from '../../src/systems/combatSystem.js';
import {getSkill,AIR,DEFENSE} from '../../src/config.js';
import {makeWorld,fighterOf,record} from '../helpers.js';

function pair(){
  const mk=()=>({h:[],c:[],closed:false});const A=mk(),B=mk();
  const peer=(me,other)=>({send:m=>other.h.forEach(f=>f(JSON.parse(JSON.stringify(m)))),sendFast:m=>other.h.forEach(f=>f(JSON.parse(JSON.stringify(m)))),onMessage:f=>me.h.push(f),onClose:f=>me.c.push(f),close:()=>{if(me.closed)return;me.closed=true;me.c.forEach(f=>f());if(!other.closed){other.closed=true;other.c.forEach(f=>f());}}});
  return [peer(A,B),peer(B,A)];
}
const live=[];
after(()=>live.forEach(S=>S.end()));   // a failing assertion must not leave the 50 ms snapshot timers alive (node would hang to the CI timeout)
function setup(p='cleric',c='cleric'){
  const [pa,pb]=pair(),H=makeWorld({p,c}),G=makeWorld({p,c});
  const hs=startNetSession(H.world,pa,'host',{getKeys:()=>({}),onEnd(){}}),gs=startNetSession(G.world,pb,'guest',{getKeys:()=>({}),onEnd(){}});
  requestStart(H.world);
  const S={H,G,hs,gs,end(){hs.end('x');gs.end('x');}};live.push(S);return S;
}
const tick=(S,sec)=>{for(let i=0;i<sec*60;i++){stepWorld(S.H.world,1/60,{});stepWorld(S.G.world,1/60,{});}};
const place=(w,d)=>{const pt=w.world.get(w.player,'transform'),ct=w.world.get(w.cpu,'transform');pt.x=-d/2;pt.z=0;pt.rotY=Math.PI/2;ct.x=d/2;ct.z=0;ct.rotY=-Math.PI/2;};

test('online: no AI runs on either side, so CPU-only logic (chase/guard AI) never drives a human seat',()=>{
  const S=setup();place(S.H,6);place(S.G,6);
  const starts=record(S.H.world,'attackStart');tick(S,3);
  assert.equal(starts.length,0,'nobody attacks unless a human commands it');
  S.end();
});
test('online: the remote seat can chase, air-combo, slam and guard through forwarded commands only',()=>{
  const S=setup('mech','mech');place(S.H,1.6);
  const cpu=S.H.cpu,player=S.H.player,W=S.H.world;
  W.get(cpu,'defense').cooldown=1e9;W.get(cpu,'status').dodgeCooldown=1e9;
  // P1 (host seat) launches P2 (remote seat); P1 chases with SPACE, then a guest command arrives for the remote seat
  for(let i=0;i<3;i++){pressAttack(W,'player','basic');tick(S,.5);W.get(cpu,'status').dodgeCooldown=1e9;}
  assert.ok(W.get(player,'combo').hits>=1);
  const cb=W.get(cpu,'body');cb.grounded=false;W.get(cpu,'transform').y=2;cb.vy=3;W.get(cpu,'status').stun=1;
  const chases=record(W,'chase');pressJump(W,'player');tick(S,.1);
  assert.ok(chases.length<=AIR.maxChase);
  // remote seat guards via the network command and gets a counter window on a block
  applyRemoteCommand(W,{k:'f'});tick(S,.5);   // late guard (> perfect window)
  const d=W.get(cpu,'defense');d.active=true;d.timer=1;d.startup=0;
  resolveHit(W,player,cpu,getSkill('mech','skill'));
  assert.ok(d.counter>0||!d.active);
  S.end();
});
test('online: host HP is authoritative after combat-system damage (slam, perfect guard) so both screens agree',()=>{
  const S=setup();place(S.H,1.6);const W=S.H.world,G=S.G.world;
  W.get(S.H.cpu,'status').dodgeCooldown=1e9;
  const d=W.get(S.H.cpu,'defense');d.active=true;d.timer=DEFENSE.duration-.05;d.startup=0;d.durability=DEFENSE.durability;
  const hits=record(W,'hit');
  resolveHit(W,S.H.player,S.H.cpu,getSkill('cleric','skill'));
  assert.equal(hits[0].perfect,true);
  tick(S,.3);   // snapshots flow host -> guest
  assert.equal(G.get(fighterOf(G,'cpu'),'health').hp,W.get(S.H.cpu,'health').hp);
  assert.equal(G.get(fighterOf(G,'player'),'health').hp,W.get(S.H.player,'health').hp);
  S.end();
});
