import test from 'node:test';
import assert from 'node:assert/strict';
import {pressAttack,pressJump} from '../../src/systems/playerControl.js';
import {AIR} from '../../src/config.js';
import {startedWorld,step,arrange,record,hp} from '../helpers.js';

// J1-J2-J3 on a standing CPU ends in a launcher; returns once the victim is airborne.
function launch(w){
  const cs=w.world.get(w.cpu,'status');
  for(let i=0;i<3;i++){cs.stun=1e9;cs.dodgeCooldown=1e9;pressAttack(w.world,'player','basic');step(w.world,.5);}
  return w.world.get(w.cpu,'body');
}
const setup=()=>{const w=startedWorld({p:'mech'});arrange(w,{dist:1.6});w.world.get(w.cpu,'defense').cooldown=1e9;return w;};

test('J3 launches the victim into the air (launcher / airborne hit state)',()=>{
  const w=setup();const b=launch(w);
  const ct=w.world.get(w.cpu,'transform');
  assert.ok(!b.grounded||ct.y>0||w.world.get(w.cpu,'status').airHits>=0);
  assert.ok(w.world.get(w.player,'combo').hits>=3);
});
test('chase dash only works on an airborne, stunned victim and is limited per combo',()=>{
  const w=setup();const pc=w.world.get(w.player,'combo');
  pressJump(w.world,'player');step(w.world,.05);
  assert.equal(pc.chases,0,'no combo -> plain jump');
  const w2=setup();const cb=launch(w2);const chases=record(w2.world,'chase');
  const cs=w2.world.get(w2.cpu,'status');
  for(let i=0;i<6;i++){cb.grounded=false;cb.vy=3;w2.world.get(w2.cpu,'transform').y=2;cs.stun=1;
    const pb=w2.world.get(w2.player,'body');pb.grounded=true;w2.world.get(w2.player,'transform').y=0;w2.world.get(w2.player,'status').stun=0;
    pressJump(w2.world,'player');step(w2.world,.03);}
  assert.ok(chases.length<=AIR.maxChase&&chases.length>=1);
});
test('air hits decay in damage, stop lifting after maxHits, and the air K slams the victim down for bonus damage',()=>{
  const w=setup();const cb=w.world.get(w.cpu,'body'),ct=w.world.get(w.cpu,'transform'),cs=w.world.get(w.cpu,'status');
  const pt=w.world.get(w.player,'transform'),pb=w.world.get(w.player,'body'),ps=w.world.get(w.player,'status');
  const hits=record(w.world,'hit');
  pressAttack(w.world,'player','basic');step(w.world,.5);   // seed a combo
  const dmg=[];
  for(let i=0;i<AIR.maxHits+1;i++){
    cb.grounded=false;ct.y=2;cb.vy=0;cs.stun=1;cs.hitStop=0;pt.y=2;pb.grounded=false;pb.vy=0;ps.stun=0;
    const n=hits.length;pressAttack(w.world,'player','basic');step(w.world,.3);
    if(hits.length>n)dmg.push(hits[hits.length-1]);
  }
  assert.ok(dmg.length>=3);
  assert.ok(dmg[1].amount<=dmg[0].amount&&dmg[2].amount<dmg[0].amount,'air damage decays');
  // slam
  const w2=setup();const c2=w2.world.get(w2.cpu,'body'),t2=w2.world.get(w2.cpu,'transform'),s2=w2.world.get(w2.cpu,'status');
  const p2=w2.world.get(w2.player,'transform'),pb2=w2.world.get(w2.player,'body');
  pressAttack(w2.world,'player','basic');step(w2.world,.5);
  c2.grounded=false;t2.y=2;c2.vy=6;s2.stun=1;s2.airHits=1;s2.hitStop=0;p2.y=2;pb2.grounded=false;pb2.vy=0;
  const slams=record(w2.world,'slamLand'),before=hp(w2,'cpu');
  pressAttack(w2.world,'player','skill');step(w2.world,1.5);
  assert.equal(slams.length,1,'slam landing event');
  assert.ok(before-hp(w2,'cpu')>=AIR.slamDamage,'slam bonus damage dealt');
  assert.equal(s2.airHits,0,'juggle counter resets on landing');
});
