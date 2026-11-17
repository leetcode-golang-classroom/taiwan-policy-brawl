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
  tick(H,2);
  assert.equal(H.world.match.playerRounds,1);
  assert.equal(G.world.match.playerRounds,1);assert.ok(G.world.match.roundTransition>0);
  hs.end('x');gs.end('x');
  const T=setup();requestStart(T.H.world);T.G.world.get(fighterOf(T.G.world,'player'),'health').hp=0;tick(T.G,3);
  assert.equal(T.G.world.match.playerRounds,0);assert.equal(T.G.world.match.cpuRounds,0);
  T.hs.end('x');T.gs.end('x');
});
test('online: disconnect ends the session and restores vs-CPU state', ()=>{
  const {H,hs,gs}=setup();
  assert.ok(H.world.net);hs.end('bye');assert.equal(H.world.net,null);gs.end('x');
  assert.equal(H.world.get(fighterOf(H.world,'cpu'),'energy').regen,.8);
});
