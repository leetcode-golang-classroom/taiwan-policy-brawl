import test from 'node:test';
import assert from 'node:assert/strict';
import {pressAttack} from '../../src/systems/playerControl.js';
import {cooldownFor,INPUT_BUFFER} from '../../src/config.js';
import {startedWorld,step,arrange,record} from '../helpers.js';

const setup=(opts)=>{const w=startedWorld(opts);arrange(w,{dist:1.8});return w;};

test('a J pressed just before the cooldown ends is buffered and fires by itself', ()=>{
  const w=setup(),a=w.world.get(w.player,'attacker'),starts=record(w.world,'chargeStart');
  pressAttack(w.world,'player','basic');step(w.world,1/60);
  assert.equal(starts.length,1);
  a.cooldowns.basic=INPUT_BUFFER*.5;a.charge=null;a.attackTime=0;          // cooldown about to end
  pressAttack(w.world,'player','basic');step(w.world,1/60);
  assert.equal(starts.length,1,'still on cooldown: not started yet');
  assert.ok(a.buffer,'input remembered');
  step(w.world,INPUT_BUFFER);
  assert.equal(starts.length,2,'started as soon as the cooldown ended');
  assert.equal(a.buffer,null,'buffer consumed');
});
test('a press made too early expires instead of firing late', ()=>{
  const w=setup(),a=w.world.get(w.player,'attacker'),starts=record(w.world,'chargeStart');
  a.cooldowns.skill=1;pressAttack(w.world,'player','skill');
  step(w.world,.5);assert.equal(a.buffer,null,'expired');
  step(w.world,1);assert.equal(starts.length,0,'no late skill');
});
test('an expired L never fires after energy fills up later', ()=>{
  const w=setup(),starts=record(w.world,'chargeStart'),not=record(w.world,'ultNotReady');
  pressAttack(w.world,'player','ult');step(w.world,1/60);
  assert.equal(not.length,1);
  w.world.get(w.player,'energy').value=100;step(w.world,1);
  assert.equal(starts.length,0);
});
test('mashing one key never starts the same attack twice at once', ()=>{
  const w=setup(),starts=record(w.world,'chargeStart');
  for(let i=0;i<10;i++){pressAttack(w.world,'player','basic');step(w.world,1/60);}
  assert.equal(starts.length,1,'single charge; later presses collapse into one buffer slot');
});
test('J J J chains into three combo steps when each press is buffered', ()=>{
  const w=setup(),steps=record(w.world,'chargeStart'),a=w.world.get(w.player,'attacker');
  const seen=[];w.world.events.on('chargeStart',()=>seen.push(a.charge.comboStep));
  const cd=cooldownFor('mech','basic');
  for(let t=0;t<2.5;t+=1/60){
    if(t%.1<1/60)pressAttack(w.world,'player','basic');   // keep mashing J
    step(w.world,1/60);
  }
  assert.deepEqual(seen.slice(0,3),[1,2,3]);
  assert.ok(cd>0);
});
