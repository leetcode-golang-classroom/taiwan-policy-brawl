import test from 'node:test';
import assert from 'node:assert/strict';
import {AIR} from '../../src/config.js';
import {startedWorld,step,record} from '../helpers.js';

// The CPU has just launched P1 (combo running, P1 airborne and stunned) -> it chases, air-combos, and respects the limits.
test('CPU chases an airborne victim, air-combos and never exceeds the chase / air-hit limits',()=>{
  const w=startedWorld({p:'cleric',c:'cleric'});
  const ct=w.world.get(w.cpu,'transform'),pt=w.world.get(w.player,'transform'),pb=w.world.get(w.player,'body'),ps=w.world.get(w.player,'status');
  ct.x=-1;ct.z=0;pt.x=-3;pt.z=0;pt.y=2.2;pb.grounded=false;pb.vy=3;ps.stun=1.2;
  const cc=w.world.get(w.cpu,'combo');cc.hits=3;cc.targetId=w.player;
  const chases=record(w.world,'chase'),starts=record(w.world,'attackStart');
  w.world.get(w.player,'defense').cooldown=1e9;ps.dodgeCooldown=1e9;
  step(w.world,2.5);
  assert.ok(chases.length>=1,'CPU used a chase dash');
  assert.ok(chases.length<=AIR.maxChase,'chase limit respected');
  assert.ok(starts.some(e=>e.attackerId===w.cpu),'CPU attacked in the air');
  assert.ok(ps.airHits<=AIR.maxHits+1);
});
test('CPU does not chase a grounded victim',()=>{
  const w=startedWorld({p:'cleric',c:'cleric'});
  const cc=w.world.get(w.cpu,'combo');cc.hits=3;cc.targetId=w.player;
  const chases=record(w.world,'chase');step(w.world,1);
  assert.equal(chases.length,0);
});
