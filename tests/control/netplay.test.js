import test from 'node:test';
import assert from 'node:assert/strict';
import {startNetSession,requestStart} from '../../src/net/netplay.js';
import {applyRemoteCommand} from '../../src/systems/playerControl.js';
import {stepWorld} from '../../src/systems/index.js';
import {makeWorld,fighterOf} from '../helpers.js';

// In-memory peer pair (reliable + fast channel both delivered synchronously).
function pair(){
  const mk=()=>({h:[],c:[],closed:false});
  const A=mk(),B=mk();
  const peer=(me,other)=>({send:m=>other.h.forEach(f=>f(JSON.parse(JSON.stringify(m)))),sendFast:m=>other.h.forEach(f=>f(JSON.parse(JSON.stringify(m)))),onMessage:f=>me.h.push(f),onClose:f=>me.c.push(f),close:()=>{if(me.closed)return;me.closed=true;me.c.forEach(f=>f());if(!other.closed){other.closed=true;other.c.forEach(f=>f());}}});
  return [peer(A,B),peer(B,A)];
}
function setup(){
  const [pa,pb]=pair(),H=makeWorld({p:'mech',c:'leopard'}),G=makeWorld({p:'mech',c:'leopard'});
  const hs=startNetSession(H.world,pa,'host',{getKeys:()=>({}),onEnd(){}}),gs=startNetSession(G.world,pb,'guest',{getKeys:()=>({}),onEnd(){}});
  return {H,G,hs,gs};
}
const tick=(w,n,dt=1/60)=>{for(let i=0;i<n;i++)stepWorld(w.world,dt,{});};

test('online: both seats are human (no AI) and the remote seat follows forwarded move + commands', ()=>{
  const {H,G,hs,gs}=setup();
  requestStart(G.world);   // guest asks, host starts both
  assert.ok(H.world.match.running&&G.world.match.running);
  const hid=fighterOf(H.world,'cpu'),x0=H.world.get(hid,'transform').x;
  H.world.net.remoteMove={x:-1,z:0};tick(H,30);   // guest (cpu seat) holds left on the host's copy
  assert.ok(H.world.get(hid,'transform').x<x0-1);
  applyRemoteCommand(H.world,{k:'j'});assert.equal(H.world.get(hid,'intent').jump,true);
  applyRemoteCommand(H.world,{k:'a',v:'skill'});assert.equal(H.world.get(hid,'intent').attack,'skill');
  hs.end('x');gs.end('x');
});
test('online: host decides round end and the guest follows; guest never ends a round itself', ()=>{
  const {H,G,hs,gs}=setup();requestStart(H.world);
  H.world.get(fighterOf(H.world,'cpu'),'health').hp=0;   // KO on the host
  tick(H,2);assert.equal(H.world.match.playerRounds,0,'scoring waits for the KO cinematic');assert.equal(G.world.match.phase,'KO_TRIGGER','guest follows the KO');
  tick(H,60*4.6);
  assert.equal(H.world.match.playerRounds,1);
  assert.equal(G.world.match.playerRounds,1);assert.ok(G.world.match.roundTransition>0);
  hs.end('x');gs.end('x');
  const T=setup();requestStart(T.H.world);T.G.world.get(fighterOf(T.G.world,'player'),'health').hp=0;tick(T.G,60*4);
  assert.equal(T.G.world.match.playerRounds,0);assert.equal(T.G.world.match.cpuRounds,0);
  T.hs.end('x');T.gs.end('x');
});
test('online: disconnect ends the session and restores vs-CPU state', ()=>{
  const {H,hs,gs}=setup();
  assert.ok(H.world.net);hs.end('bye');assert.equal(H.world.net,null);gs.end('x');
  assert.equal(H.world.get(fighterOf(H.world,'cpu'),'energy').regen,.8);
});
test('online 2-0: host KO twice; guest sees one ROUND_RESULT then one MATCH_VICTORY, never a duplicate score', ()=>{
  const {H,G,hs,gs}=setup();requestStart(H.world);
  const ends=[];G.world.events.on('matchEnd',e=>ends.push(e));const rounds=[];G.world.events.on('roundEnd',e=>rounds.push(e));
  try{const ko=()=>{H.world.get(fighterOf(H.world,'cpu'),'health').hp=0;for(let i=0;i<60*12&&H.world.match.roundNumber===(ko.n||1)&&H.world.match.phase!=='MATCH_VICTORY';i++){tick(H,1);tick(G,1);}ko.n=(ko.n||1)+1;};
  ko();assert.equal(G.world.match.playerRounds,1);assert.equal(ends.length,0,'1-0 is not a match win');
  for(let i=0;i<60*4&&H.world.match.roundNumber<2;i++){tick(H,1);tick(G,1);}
  for(let i=0;i<60*4&&!H.world.match.running;i++){tick(H,1);tick(G,1);}   // wait for round 2 to actually start (hp resets at round start)
  ko();tick(G,60);
  assert.equal(H.world.match.phase,'MATCH_VICTORY');assert.equal(G.world.match.phase,'MATCH_VICTORY');
  assert.equal(G.world.match.playerRounds,2);assert.equal(ends.length,1);assert.equal(ends[0].winner,'player');assert.equal(rounds.length,1);
  }finally{hs.end('x');gs.end('x');}
});
