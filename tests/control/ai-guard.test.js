import test from 'node:test';
import assert from 'node:assert/strict';
import {pressAttack} from '../../src/systems/playerControl.js';
import {DEFENSE} from '../../src/config.js';
import {startedWorld,step,record,seeded} from '../helpers.js';

const place=w=>{const pt=w.world.get(w.player,'transform'),ct=w.world.get(w.cpu,'transform');pt.x=-1.2;pt.z=0;pt.rotY=Math.PI/2;ct.x=1;ct.z=0;};

test('CPU sometimes lands a PERFECT guard against a visible melee charge (never reading input)',()=>{
  let perfect=0,normal=0;
  for(let seed=1;seed<=40;seed++){
    const w=startedWorld({p:'brawler',c:'cleric',rng:seeded(seed)});place(w);
    const hits=record(w.world,'hit');
    pressAttack(w.world,'player','skill');step(w.world,1.2);
    for(const h of hits.filter(h=>h.attackerId===w.player)){if(h.perfect)perfect++;else if(h.reduced||h.blocked)normal++;}
  }
  assert.ok(perfect>=1,`perfect guards: ${perfect}`);
});
test('CPU counters after a block: J out of the guard, with a chance roll (not every time)',()=>{
  let counters=0;const N=30;
  for(let seed=1;seed<=N;seed++){
    const w=startedWorld({p:'cleric',c:'cleric',rng:seeded(seed)});place(w);
    const d=w.world.get(w.cpu,'defense');d.active=true;d.timer=1;d.startup=0;d.counter=DEFENSE.counterWindow;d.durability=DEFENSE.durability;
    const ev=record(w.world,'guardCounter');step(w.world,.4);if(ev.length)counters++;
  }
  assert.ok(counters>=5&&counters<N,`counters ${counters}/${N}`);
});
