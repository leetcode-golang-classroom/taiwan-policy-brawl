import test from 'node:test';
import assert from 'node:assert/strict';
import {moveFromKeys,playerControl,pressAttack,pressJump,pressDodge} from '../../src/systems/playerControl.js';
import {startedWorld,step,arrange,record,hp} from '../helpers.js';

test('moveFromKeys: WASD maps to axes and diagonals are normalised', ()=>{
  assert.deepEqual(moveFromKeys({}),{x:0,z:0});
  assert.deepEqual(moveFromKeys({KeyD:true}),{x:1,z:0});
  assert.deepEqual(moveFromKeys({KeyW:true}),{x:0,z:-1});
  const d=moveFromKeys({KeyW:true,KeyD:true});assert.ok(Math.abs(Math.hypot(d.x,d.z)-1)<1e-9);
  assert.deepEqual(moveFromKeys({KeyA:true,KeyD:true}),{x:0,z:0});
});
test('playerControl writes the player Intent (and never the CPU one)', ()=>{
  const w=startedWorld();playerControl(w.world,{KeyD:true});
  assert.equal(w.world.get(w.player,'intent').moveX,1);assert.equal(w.world.get(w.cpu,'intent').moveX,0);
});
test('holding a direction moves the P1 entity in that direction, speed = moveSpeed', ()=>{
  const w=startedWorld();const t=w.world.get(w.player,'transform');const x0=t.x,z0=t.z;
  step(w.world,1,{KeyD:true});
  const b=w.world.get(w.player,'body'),d=t.x-x0;
  assert.ok(d<b.moveSpeed&&d>b.moveSpeed-.6,'accelerates, so slightly less than speed*time: '+d);   // ramp loss = v^2/(2*accel)
  assert.ok(Math.abs(b.vx-b.moveSpeed)<1e-6,'reaches (and never exceeds) the maximum speed');assert.ok(Math.abs(t.z-z0)<1e-6);
  assert.ok(w.world.get(w.player,'body').moving);
});
test('movement is blocked while stunned and while charging', ()=>{
  const w=startedWorld();const t=w.world.get(w.player,'transform');
  w.world.get(w.player,'status').stun=.5;const x0=t.x;step(w.world,.3,{KeyD:true});assert.equal(t.x,x0);
  step(w.world,.5);pressAttack(w.world,'player','skill');step(w.world,.1);
  const x1=t.x;step(w.world,.2,{KeyD:true});assert.equal(t.x,x1); // skill charge lasts .62s
});
test('fighters never leave the arena', ()=>{
  const w=startedWorld();step(w.world,6,{KeyA:true,KeyW:true});
  const t=w.world.get(w.player,'transform');assert.ok(t.x>=-7&&t.z>=-5);
});
test('jump: leaves the ground, lands again, only when grounded', ()=>{
  const w=startedWorld();const b=w.world.get(w.player,'body'),t=w.world.get(w.player,'transform');
  pressJump(w.world,'player');step(w.world,.1);assert.ok(!b.grounded&&t.y>0);
  const vy=b.vy;pressJump(w.world,'player');step(w.world,.02);assert.ok(b.vy<vy); // no double jump
  step(w.world,2);assert.ok(b.grounded&&t.y===0);
});
test('dodge grants brief invulnerability, moves along the pressed direction and has a cooldown', ()=>{
  const w=startedWorld();const s=w.world.get(w.player,'status'),t=w.world.get(w.player,'transform');const z0=t.z;
  pressDodge(w.world,'player',{KeyS:true});step(w.world,.02);
  assert.ok(s.dodgeInvuln>0&&t.z>z0&&t.z<z0+1.5,'sliding, not teleporting');step(w.world,.3);
  assert.ok(t.z>z0+1.5,'covers the dodge distance');
  const d1=s.dodgeCooldown;pressDodge(w.world,'player');step(w.world,.02);assert.ok(s.dodgeCooldown<=d1);
  step(w.world,.5);assert.equal(s.dodgeInvuln,0);
});
test('J starts a charge; the attack only lands after the charge time (wind-up)', ()=>{
  const w=startedWorld({p:'leopard'});arrange(w,{dist:1.7});const started=record(w.world,'chargeStart');
  pressAttack(w.world,'player','basic');step(w.world,.1);
  assert.equal(started.length,1);assert.equal(hp(w,'cpu'),100);   // still charging
  step(w.world,.3);assert.equal(hp(w,'cpu'),91);                   // released: 9 damage
});
test('attack cooldown: a second press after a WHIFF cannot cancel the recovery', ()=>{
  const w=startedWorld({p:'leopard'});arrange(w,{dist:9});      // out of range: the first J misses
  pressAttack(w.world,'player','basic');step(w.world,.31);
  pressAttack(w.world,'player','basic');step(w.world,.1);
  assert.equal(w.world.get(w.player,'attacker').charge,null);
  step(w.world,.5);assert.equal(hp(w,'cpu'),100);
});
test('ultimate needs 100% energy', ()=>{
  const w=startedWorld({p:'yu'});arrange(w,{dist:3});const nr=record(w.world,'ultNotReady');
  pressAttack(w.world,'player','ult');step(w.world,.1);assert.equal(nr.length,1);
  w.world.get(w.player,'energy').value=100;pressAttack(w.world,'player','ult');step(w.world,1.3);
  assert.equal(hp(w,'cpu'),64);assert.ok(w.world.get(w.player,'energy').value<100);
});
