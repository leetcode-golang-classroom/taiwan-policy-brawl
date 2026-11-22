import test from 'node:test';
import assert from 'node:assert/strict';
import {moveFromKeys,pressMoveKey,pressAttack} from '../../src/systems/playerControl.js';
import {aiControl} from '../../src/systems/aiControl.js';
import {RUSH,PHASES,chargeDurations,ATTACK_TIME} from '../../src/config.js';
import {startedWorld,step,arrange,record,hp} from '../helpers.js';

const near=(a,b,e=1e-6)=>Math.abs(a-b)<e;

test('WASD is camera-relative: W goes into the screen whatever the camera yaw', ()=>{
  assert.deepEqual(moveFromKeys({KeyW:true,camYaw:0}),{x:0,z:-1});
  const m=moveFromKeys({KeyW:true,camYaw:Math.PI/2});   // camera on the +x side looks toward -x
  assert.ok(near(m.x,-1)&&near(m.z,0));
  const d=moveFromKeys({KeyW:true,KeyD:true,camYaw:1.1});assert.ok(near(Math.hypot(d.x,d.z),1));
});
test('movement is described relative to the opponent: forward / back / strafe / diagonal', ()=>{
  const w=startedWorld();arrange(w,{dist:5});const b=w.world.get(w.player,'body');   // P1 faces +x
  step(w.world,.1,{KeyD:true});assert.ok(near(b.moveFwd,1)&&near(b.moveSide,0));
  step(w.world,.1,{KeyA:true});assert.ok(near(b.moveFwd,-1));                       // backing away
  step(w.world,.1,{KeyW:true});assert.ok(Math.abs(b.moveFwd)<.2&&b.moveSide<-.95);   // strafe left (facing re-aims a little as we move)
  step(w.world,.1,{KeyS:true});assert.ok(b.moveSide>.95);                       // strafe right
  step(w.world,.1,{KeyD:true,KeyW:true});assert.ok(b.moveFwd>.5&&b.moveSide<-.6);   // diagonal = both
  step(w.world,.05,{});assert.equal(b.moving,true,'releasing the keys coasts to a stop instead of freezing instantly');
  step(w.world,.4,{});assert.equal(b.moving,false);assert.equal(b.moveFwd,0);
});
test('double-tapping a direction key triggers a rush; a slow second tap does not', ()=>{
  const w=startedWorld();const it=w.world.get(w.player,'intent');
  assert.equal(pressMoveKey(w.world,'player','KeyD',{KeyD:true}),false);
  step(w.world,.1);assert.equal(pressMoveKey(w.world,'player','KeyD',{KeyD:true}),true);assert.deepEqual(it.rush,{x:1,z:0});
  it.rush=null;step(w.world,RUSH.doubleTap+.2);
  assert.equal(pressMoveKey(w.world,'player','KeyD',{KeyD:true}),false);
  assert.equal(pressMoveKey(w.world,'player','KeyJ',{}),false,'only WASD counts');
  step(w.world,.1);assert.equal(pressMoveKey(w.world,'player','KeyA',{KeyA:true}),false,'different key is not a double tap');
});
test('rush: fast burst of speed*duration, then a cooldown; no invulnerability', ()=>{
  const w=startedWorld();arrange(w,{dist:9});const t=w.world.get(w.player,'transform'),s=w.world.get(w.player,'status');
  const rushes=record(w.world,'rush'),x0=t.x;
  w.world.get(w.player,'intent').rush={x:1,z:0};step(w.world,.05);
  assert.equal(rushes.length,1);assert.equal(s.dodgeInvuln,0);
  step(w.world,RUSH.duration+.1);
  assert.ok(near(t.x-x0,RUSH.speed*RUSH.duration,.45),'moved ~speed*duration, got '+(t.x-x0));
  assert.ok(RUSH.speed>2.5*w.world.get(w.player,'body').moveSpeed,'a rush is far faster than walking');
  w.world.get(w.player,'intent').rush={x:1,z:0};step(w.world,.05);assert.equal(rushes.length,1,'cooldown blocks an immediate second rush');
  step(w.world,RUSH.cooldown+.1);w.world.get(w.player,'intent').rush={x:1,z:0};step(w.world,.05);assert.equal(rushes.length,2);
});
test('rush is refused / cancelled while charging, stunned or guarding, and never leaves the arena', ()=>{
  const w=startedWorld();const s=w.world.get(w.player,'status'),t=w.world.get(w.player,'transform');arrange(w,{dist:9});
  pressAttack(w.world,'player','skill');step(w.world,.05);
  w.world.get(w.player,'intent').rush={x:1,z:0};step(w.world,.05);assert.equal(s.rushTimer,0,'no rush while charging');
  const v=startedWorld();arrange(v,{dist:9});const vs=v.world.get(v.player,'status');
  v.world.get(v.player,'intent').rush={x:1,z:0};step(v.world,.05);assert.ok(vs.rushTimer>0);
  vs.stun=.3;step(v.world,.03);assert.equal(vs.rushTimer,0,'a stun cancels the rush');
  const e=startedWorld();e.world.get(e.cpu,'brain').attackCd=1e9;const et=e.world.get(e.player,'transform');
  for(let i=0;i<12;i++){e.world.get(e.player,'intent').rush={x:-1,z:-1};step(e.world,RUSH.cooldown+RUSH.duration);}
  assert.ok(et.x>=-7&&et.z>=-5);
});
test('the CPU can rush to close a long gap (and not when close)', ()=>{
  const far=startedWorld();far.world.rng=()=>0;far.world.get(far.cpu,'transform').x=6;far.world.get(far.player,'transform').x=-6;
  aiControl(far.world,1/60);assert.ok(far.world.get(far.cpu,'intent').rush,'rushes toward the player');
  assert.ok(far.world.get(far.cpu,'intent').rush.x<0);
  const near2=startedWorld();near2.world.rng=()=>0;arrange(near2,{dist:2});near2.world.get(near2.cpu,'status').stun=0;
  aiControl(near2.world,1/60);assert.equal(near2.world.get(near2.cpu,'intent').rush,null);
});
test('attack has six phases in order and the hit lands on the strike -> impact boundary', ()=>{
  const w=startedWorld({p:'leopard'});arrange(w,{dist:1.7});const seq=[];let hpAtImpact=null;
  w.world.events.on('phase',e=>{if(e.id===w.player){seq.push(e.phase);if(e.phase==='impact')hpAtImpact=hp(w,'cpu');}});
  pressAttack(w.world,'player','basic');step(w.world,.9);
  assert.deepEqual(seq,['windup','charge','strike','impact','recovery','idle']);
  assert.equal(hpAtImpact,100-9,'damage is already applied on the first impact tick');
  assert.equal(w.world.get(w.player,'attacker').phase,'idle');
});
test('phase timings add up: windup+charge+strike = charge time, impact+recovery = attack time', ()=>{
  for(const tier of ['basic','skill','ult']){
    assert.ok(PHASES.windup[tier]+PHASES.strike[tier]<chargeDurations[tier],tier+': charge phase has positive length');
    assert.ok(PHASES.impact[tier]<ATTACK_TIME[tier],tier+': recovery has positive length');
  }
  const w=startedWorld({p:'yu'});arrange(w,{dist:2.4});w.world.get(w.player,'energy').value=100;
  const times={};w.world.events.on('phase',e=>{if(e.id===w.player)times[e.phase]=w.world.time;});
  pressAttack(w.world,'player','ult');step(w.world,1.6);
  assert.ok(Math.abs((times.impact-times.windup)-chargeDurations.ult)<.03,'time to impact == ult charge time (unchanged balance)');
});
test('different skills use different phases poses data (tier is reported on every phase event)', ()=>{
  const w=startedWorld({p:'yu'});arrange(w,{dist:2.4});const tiers=new Set();
  w.world.events.on('phase',e=>{if(e.id===w.player&&e.phase!=='idle')tiers.add(e.tier);});
  pressAttack(w.world,'player','basic');step(w.world,.7);
  pressAttack(w.world,'player','skill');step(w.world,1);
  assert.deepEqual([...tiers].sort(),['basic','skill']);
});
test('a hit records the push direction and a strength that grows with damage', ()=>{
  const run=(id,tier)=>{const w=startedWorld({p:id});arrange(w,{dist:1.5});w.world.get(w.player,'energy').value=100;
    pressAttack(w.world,'player',tier);step(w.world,1.2);return w.world.get(w.cpu,'status');};
  const basic=run('yu','basic'),ult=run('yu','ult');
  assert.ok(basic.hitDir.x>.9,'pushed away from the attacker (+x)');
  assert.ok(ult.hitPower>basic.hitPower&&ult.hitPower<=1&&basic.hitPower>0);
});
test('launched target gets a landing reaction (hard land event + landTimer + brief stun)', ()=>{
  const w=startedWorld({p:'leopard'});arrange(w,{dist:1.5});const lands=record(w.world,'land');
  const st=w.world.get(w.cpu,'status');
  pressAttack(w.world,'player','basic');step(w.world,.45);
  assert.equal(st.airHit,true,'launched');
  for(let i=0;i<200&&!lands.length;i++)step(w.world,1/60);
  assert.equal(lands.length,1);assert.equal(lands[0].hard,true);assert.ok(st.landTimer>0);assert.equal(st.airHit,false);
  step(w.world,.6);assert.equal(st.landTimer,0);
});
test('a normal jump landing is not a hard landing', ()=>{
  const w=startedWorld();const lands=record(w.world,'land');w.world.get(w.player,'intent').jump=true;step(w.world,1.5);
  assert.equal(lands.length,1);assert.equal(lands[0].hard,false);assert.equal(w.world.get(w.player,'status').landTimer,0);
});
test('inertia: speed ramps up, never exceeds the maximum, and decays after release (no instant stop)', ()=>{
  const w=startedWorld();arrange(w,{dist:9});const b=w.world.get(w.player,'body');
  step(w.world,1/60,{KeyD:true});assert.ok(b.vx>0&&b.vx<b.moveSpeed*.5,'first frame is not full speed');
  step(w.world,.5,{KeyD:true});assert.ok(near(b.vx,b.moveSpeed));
  step(w.world,1/60,{});assert.ok(b.vx>0&&b.vx<b.moveSpeed,'coasting');
  const x=w.world.get(w.player,'transform').x;step(w.world,.5,{});assert.ok(w.world.get(w.player,'transform').x>x-1e-9);assert.equal(b.vx,0);
});
test('reversing direction takes time (turns through zero), it does not teleport the velocity', ()=>{
  const w=startedWorld();arrange(w,{dist:9});const b=w.world.get(w.player,'body');
  step(w.world,.5,{KeyD:true});step(w.world,.03,{KeyA:true});
  assert.ok(b.vx>0,'still moving forward right after pressing the opposite key');
  step(w.world,.5,{KeyA:true});assert.ok(near(b.vx,-b.moveSpeed));
});
test('facing turns toward the opponent at a limited rate', ()=>{
  const w=startedWorld();arrange(w,{dist:5});const t=w.world.get(w.player,'transform');
  t.rotY=-Math.PI/2;step(w.world,1/60,{});
  assert.ok(Math.abs(t.rotY-(-Math.PI/2))<.3,'one frame turns only a fraction of 180 degrees');
  step(w.world,.5,{});assert.ok(near(t.rotY,Math.PI/2,1e-3)||near(t.rotY,-3*Math.PI/2,1e-3));
});
test('rush: ramps up, then brakes during a short recovery (no input) before walking resumes', ()=>{
  const w=startedWorld();arrange(w,{dist:9});const b=w.world.get(w.player,'body'),s=w.world.get(w.player,'status');
  w.world.get(w.player,'intent').rush={x:1,z:0};step(w.world,1/60);
  assert.ok(b.vx>0&&b.vx<RUSH.speed,'accelerating, not instantly at rush speed');
  step(w.world,RUSH.duration+.02,{KeyD:true});assert.ok(s.rushRecover>0,'recovery after the burst');
  step(w.world,.05,{KeyD:true});assert.ok(b.vx<RUSH.speed,'braking while the key is held: recovery ignores input');
});
