import test from 'node:test';
import assert from 'node:assert/strict';
import {STATES,STATE_NAMES,canMove,canAttack,canDefend,canDodge,canCancel,deriveState} from '../../src/combat/fighterState.js';
import {pressAttack} from '../../src/systems/playerControl.js';
import {startedWorld,step,arrange,record} from '../helpers.js';

test('all 20 required states are declared with capability flags', ()=>{
  const need=['Idle','Walk','Run','Dash','Jump','AttackStartup','AttackActive','AttackRecovery','SkillStartup','SkillActive','SkillRecovery','Ultimate','Defense','Dodge','HitStun','Knockback','Airborne','Down','GetUp','Victory'];
  assert.deepEqual([...STATE_NAMES].sort(),need.sort());
  for(const n of need)for(const k of ['move','attack','defend','dodge'])assert.equal(typeof STATES[n][k],'boolean');
});
test('hit-stunned fighters cannot act; idle fighters can', ()=>{
  for(const k of [canMove,canAttack,canDefend,canDodge])assert.equal(k('HitStun'),false);
  for(const k of [canMove,canAttack,canDefend,canDodge])assert.equal(k('Idle'),true);
  assert.equal(canAttack('AttackRecovery'),true,'combo cancel window');
  assert.equal(canAttack('AttackStartup'),false);
  assert.equal(canCancel('Idle','Dodge'),true);
  assert.equal(canCancel('HitStun','AttackStartup'),false);
});
test('a J goes Idle -> AttackStartup -> AttackActive -> AttackRecovery -> Idle and records timing', ()=>{
  const w=startedWorld();arrange(w,{dist:1.8});
  const seq=[];w.world.events.on('stateChange',e=>{if(e.id===w.player)seq.push(e.to);});
  pressAttack(w.world,'player','basic');step(w.world,1.2);
  const i=seq.indexOf('AttackStartup');
  assert.deepEqual(seq.slice(i,i+4),['AttackStartup','AttackActive','AttackRecovery','Idle']);
  const fs=w.world.get(w.player,'fstate');
  assert.equal(fs.name,'Idle');assert.equal(fs.prev,'AttackRecovery');assert.ok(fs.enteredAt>0);
});
test('a stunned fighter is HitStun (Airborne when launched) and returns to Idle after the stun', ()=>{
  const w=startedWorld();arrange(w,{dist:5});
  const st=w.world.get(w.player,'status'),b=w.world.get(w.player,'body');
  st.stun=.3;step(w.world,1/60);assert.equal(w.world.get(w.player,'fstate').name,'HitStun');
  w.world.get(w.player,'transform').y=3;b.grounded=false;step(w.world,1/60);assert.equal(deriveState(w.world,w.player),'Airborne');
  w.world.get(w.player,'transform').y=0;b.vy=0;b.grounded=true;st.stun=0;st.landTimer=0;step(w.world,1/60);assert.equal(w.world.get(w.player,'fstate').name,'Idle');
});

test('landing after a hard launch goes Down then GetUp then Idle, and input stays locked until up',()=>{
  const w=startedWorld({p:'cleric',c:'mech'});arrange(w,{dist:2});
  const names=[];w.world.events.on('stateChange',e=>{if(e.id===w.cpu)names.push(e.to??e.name);});
  const st=w.world.get(w.cpu,'status'),b=w.world.get(w.cpu,'body'),t=w.world.get(w.cpu,'transform');
  t.y=2;b.grounded=false;b.vy=-8;st.airHit=true;st.stun=1;
  for(let i=0;i<120;i++){step(w.world,1/60);}
  const seq=names.filter((n,i)=>names.indexOf(n)>=0);
  assert.ok(seq.includes('Down')&&seq.includes('GetUp'),seq.join());
  assert.ok(seq.indexOf('Down')<seq.indexOf('GetUp'));
  assert.ok(!['Down','GetUp','HitStun','Airborne'].includes(w.world.get(w.cpu,'fstate').name));
});
