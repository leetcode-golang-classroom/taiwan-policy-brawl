import test from 'node:test';
import assert from 'node:assert/strict';
import {pressAttack} from '../../src/systems/playerControl.js';
import {AI} from '../../src/config.js';
import {aiControl,classifyAi} from '../../src/systems/aiControl.js';
import {startedWorld,step,record,seeded} from '../helpers.js';

const place=(w,d)=>{const pt=w.world.get(w.player,'transform'),ct=w.world.get(w.cpu,'transform');pt.x=-d/2;pt.z=0;pt.rotY=Math.PI/2;ct.x=d/2;ct.z=0;};

test('CPU exposes a state from the spec list and uses several of them in a normal fight',()=>{
  const seen=new Set(),ALL=['Neutral','Approach','Attack','Defense','Punish','Chase','Recovery'];
  for(let seed=1;seed<=8;seed++){
    const w=startedWorld({p:'cleric',c:'cleric',rng:seeded(seed)});place(w,6);
    for(let i=0;i<600;i++){if(i%40===0)pressAttack(w.world,'player','basic');step(w.world,1/60);seen.add(w.world.get(w.cpu,'brain').state);}
  }
  for(const s of seen)assert.ok(ALL.includes(s),s);
  assert.ok(seen.size>=3,[...seen].join());
});
test('a CPU attack that whiffs puts it into Recovery (no instant re-attack)',()=>{
  const w=startedWorld({p:'cleric',c:'leopard',rng:seeded(3)});place(w,12);
  const b=w.world.get(w.cpu,'brain'),a=w.world.get(w.cpu,'attacker');
  a.attackTime=.2;a.hitConfirmed=false;aiControl(w.world,1/60);   // attack in progress
  a.attackTime=0;const t0=w.world.time;aiControl(w.world,1/60);
  assert.ok(b.recoverUntil>=t0+AI.whiffRecover-1e-6);assert.equal(classifyAi(w.world,w.cpu),'Recovery');
});
test('CPU punishes a visible whiff by the player',()=>{
  let punished=0;const N=30;
  for(let seed=1;seed<=N;seed++){
    const w=startedWorld({p:'cleric',c:'cleric',rng:seeded(seed)});place(w,2);
    const pa=w.world.get(w.player,'attacker');pa.attackTime=.3;pa.hitConfirmed=false;pa.charge=null;pa.active=null;
    const b=w.world.get(w.cpu,'brain');b.attackCd=5;b.skillCd=5;b.recoverUntil=0;
    aiControl(w.world,1/60);if(b.punished)punished++;
  }
  assert.ok(punished>=15&&punished<N,`punished ${punished}/${N}`);
});
test('CPU reacts to a charging ultimate more reliably than to a basic',()=>{
  const react=tier=>{let n=0;for(let seed=1;seed<=60;seed++){
    const w=startedWorld({p:'cleric',c:'cleric',rng:seeded(seed)});place(w,4);
    const pa=w.world.get(w.player,'attacker');pa.charge={tier,time:.2,duration:.9,comboStep:0};
    const it=w.world.get(w.cpu,'intent');
    for(let i=0;i<40;i++){w.world.time+=1/60;aiControl(w.world,1/60);if(it.dodge||it.defend)n++;}}return n;};
  assert.ok(react('ult')>react('basic'));
});
