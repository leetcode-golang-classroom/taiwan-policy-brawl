import test from 'node:test';
import assert from 'node:assert/strict';
import {startedWorld,arrange,step,record,hp} from '../helpers.js';
import {pressAttack} from '../../src/systems/playerControl.js';
import {createReplayBuffer,recordFrame,clipFrames,applyClipTime,clipLength,timeScaleFor} from '../../src/presentation/koReplay.js';
import {createCameraRig,updateCameraRig} from '../../src/presentation/cameraDirector.js';
import {KO} from '../../src/config.js';

// Plays a real lethal J into a recording buffer the same way the game loop does (record after every logic step while fighting).
function lethal(){
  const w=startedWorld({p:'yu'});arrange(w,{dist:1.5});w.world.get(w.cpu,'health').hp=5;
  const buf=createReplayBuffer(120);let impact=null;
  w.world.events.on('ko',()=>{recordFrame(buf,w.world);impact=w.world.time;});
  pressAttack(w.world,'player','basic');
  for(let i=0;i<60&&!impact;i++){step(w.world,1/60);if(w.world.match.phase==='NORMAL_FIGHT')recordFrame(buf,w.world);}
  return {w,buf,impact};
}
test('last hit is recorded with attacker, target, damage, direction and position', ()=>{
  const {w}=lethal(),h=w.world.match.lastHit;
  assert.equal(h.attackerId,w.player);assert.equal(h.targetId,w.cpu);assert.equal(h.tier,'basic');
  assert.ok(h.amount>0&&h.dir&&Math.abs(Math.hypot(h.dir.x,h.dir.z)-1)<1e-6&&h.pos.y>0&&h.charId==='yu');
  assert.equal(w.world.match.ko.hit,h);
});
test('replay clip ends on the lethal frame and covers about KO.clip seconds', ()=>{
  const {buf,impact}=lethal(),clip=clipFrames(buf,KO.clip);
  assert.equal(clip[clip.length-1].time,impact);assert.ok(clipLength(clip)<=KO.clip+1e-9&&clipLength(clip)>.2);
});
test('replaying rewinds only the animation state: no HP, energy, score, combo or event changes', ()=>{
  const {w,buf}=lethal(),clip=clipFrames(buf,KO.clip),ev=[];
  for(const n of ['hit','comboHit','roundEnd','matchEnd','ko','attackStart'])w.world.events.on(n,e=>ev.push(n));
  const before=JSON.stringify([hp(w,'cpu'),w.world.get(w.player,'energy').value,w.world.get(w.player,'combo'),w.world.match.playerRounds,w.world.match.cpuRounds]);
  const x1=w.world.get(w.cpu,'transform').x;
  for(let t=0;t<=1;t+=.1)applyClipTime(w.world,clip,clip[0].time+t*clipLength(clip));
  assert.equal(JSON.stringify([hp(w,'cpu'),w.world.get(w.player,'energy').value,w.world.get(w.player,'combo'),w.world.match.playerRounds,w.world.match.cpuRounds]),before);
  assert.deepEqual(ev,[]);
  applyClipTime(w.world,clip,clip[0].time);   // rewound to the first clip frame: attacker was not yet at the impact pose
  const ph0=w.world.get(w.player,'attacker').phase;applyClipTime(w.world,clip,clip[clip.length-1].time);
  assert.ok(Number.isFinite(w.world.get(w.cpu,'transform').x)&&Math.abs(w.world.get(w.cpu,'transform').x-x1)<2);
  assert.ok(typeof ph0==='string');
});
test('time scales: slow-mo replay ~0.25-0.3x, freeze 0, fighters normal outside the KO', ()=>{
  const clipLen=KO.clip;
  assert.equal(timeScaleFor('NORMAL_FIGHT').logic,1);assert.equal(timeScaleFor('ROUND_RESULT').anim,1);
  const r=timeScaleFor('KO_REPLAY',clipLen);assert.equal(r.logic,0);assert.ok(r.anim>.2&&r.anim<.35,'replay anim scale '+r.anim);
  const f=timeScaleFor('KO_FREEZE',clipLen);assert.equal(f.logic,0);assert.equal(f.anim,0);
  assert.equal(timeScaleFor('MATCH_VICTORY').vfx,1);
});
test('defeat: the loser is thrown, lands hard, and stays down for the rest of the result screens', ()=>{
  const w=startedWorld({p:'yu'});arrange(w,{dist:1.5});w.world.get(w.cpu,'health').hp=0;
  const b=w.world.get(w.cpu,'body'),st=w.world.get(w.cpu,'status');
  step(w.world,KO.trigger+KO.replay+KO.freeze+.1);assert.ok(!b.grounded||b.vy>0,'airborne once the defeat starts');
  step(w.world,KO.defeat);assert.equal(w.world.match.phase,'ROUND_RESULT');
  step(w.world,1);assert.ok(b.grounded&&w.world.get(w.cpu,'transform').y===0&&st.landTimer>0,'still down on the ground');
  assert.equal(hp(w,'cpu'),0);
});
test('camera director: KO focus overrides framing and releases cleanly', ()=>{
  const w=startedWorld(),rig=createCameraRig();
  for(let i=0;i<60;i++)updateCameraRig(rig,w.world,1/60);
  rig.ko={x:3,y:1.2,z:0,radius:6.8,yaw:.2,pitch:-.5};
  for(let i=0;i<240;i++)updateCameraRig(rig,w.world,1/60);
  assert.ok(Math.abs(rig.radius-6.8)<.1&&Math.abs(rig.fx-3)<.05);
  rig.ko=null;for(let i=0;i<600;i++)updateCameraRig(rig,w.world,1/60);
  assert.ok(rig.radius>=12&&Math.abs(rig.fx)<2&&Math.abs(rig.yawOff)<.02,'back to the fight camera');
});

test('KO fly-out is a parabola: constant horizontal speed, gravity-shaped height, one landing', ()=>{
  const w=startedWorld({p:'yu'});arrange(w,{dist:1.5});w.world.get(w.cpu,'health').hp=0;
  const t=w.world.get(w.cpu,'transform'),b=w.world.get(w.cpu,'body');
  step(w.world,KO.trigger+KO.replay+KO.freeze+.05);
  const xs=[],ys=[];
  for(let i=0;i<90&&!(b.grounded&&ys.length>3);i++){step(w.world,1/60);xs.push(t.x);ys.push(t.y);}
  const air=ys.findIndex((y,i)=>i>2&&y<=0)||ys.length;
  assert.ok(Math.max(...ys)>.6,'goes up');assert.ok(b.grounded&&t.y===0,'lands');
  const n=Math.max(4,air-1),dx=xs.slice(1,n).map((x,i)=>x-xs[i]);
  assert.ok(Math.max(...dx)-Math.min(...dx)<.02,'horizontal speed constant while airborne');
  const peak=ys.indexOf(Math.max(...ys));assert.ok(peak>3&&peak<n-2,'apex in the middle of the flight');
  assert.ok(t.x-(-6.5+1.5)>2,'thrown away from the attacker (dist '+(t.x+5)+')');
});
