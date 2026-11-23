import test from 'node:test';
import assert from 'node:assert/strict';
import {pressAttack,pressJump} from '../../src/systems/playerControl.js';
import {airFor,comboStepsFor,COMBO_STEPS,AIR} from '../../src/config.js';
import {roster} from '../../src/roster.js';
import {startedWorld,step,arrange,record,hp} from '../helpers.js';

test('every character has its own route data (launcher present, cancel only from the launcher into K/L)',()=>{
  for(const r of roster){
    const st=comboStepsFor(r.id),air=airFor(r.id);
    assert.equal(st.length,3,r.id);assert.ok(st[2].launch>0,`${r.id} launcher`);
    assert.deepEqual([...st[2].cancels],['K','L'],r.id);assert.ok(!st[0].cancels.includes('L'),r.id);
    assert.ok(air.maxHits>=3&&air.slamDamage>AIR.slamDamage-3,`${r.id} air`);
  }
  assert.ok(new Set(roster.map(r=>JSON.stringify(airFor(r.id)))).size>=7,'routes are individual, not copies');
});
// Scripted route per character: J J J (press on each hit) -> launcher -> chase -> air J -> air K slam.
for(const r of roster){
  test(`${r.id}: ground chain -> launcher -> chase -> air combo -> slam finisher`,()=>{
    const w=startedWorld({p:r.id,c:'cleric'});arrange(w,{dist:1.8});
    const W=w.world,cpu=w.cpu,cb=W.get(cpu,'body'),cs=W.get(cpu,'status');
    const keep=()=>{cs.dodgeCooldown=1e9;W.get(cpu,'defense').cooldown=1e9;};
    const hits=record(W,'hit'),launch=record(W,'comboHit'),chases=record(W,'chase'),slams=record(W,'slamLand');
    const mine=()=>hits.filter(h=>h.attackerId===w.player);
    for(let i=0;i<3;i++){keep();const n=mine().length;pressAttack(W,'player','basic');for(let f=0;f<90&&mine().length<n+1;f++){keep();step(W,1/60);}}
    assert.equal(mine().length,3,'J1-J3 connect');
    assert.equal(launch.filter(e=>e.step===3).length,1,'launcher fires');
    assert.ok(!cb.grounded,'victim airborne');
    pressJump(W,'player');step(W,.3);
    assert.ok(chases.length>=1,'chase dash');
    // air combo (the victim is held in the juggle window)
    const hold=()=>{keep();const t=W.get(cpu,'transform');if(t.y<1.2){t.y=2;cb.grounded=false;cb.vy=2;}cs.stun=Math.max(cs.stun,.9);cs.airHit=true;
      const pt=W.get(w.player,'transform'),pb=W.get(w.player,'body');if(pt.y<1.2){pt.y=2;pb.grounded=false;pb.vy=1;}};
    const before=mine().length;
    for(let i=0;i<3;i++){hold();pressAttack(W,'player','basic');step(W,.45);}
    assert.ok(mine().length>before,'air hits connect');
    hold();W.get(cpu,'status').airHits=Math.max(1,W.get(cpu,'status').airHits);pressAttack(W,'player','skill');
    for(let f=0;f<150&&!slams.length;f++){if(f<140)hold();step(W,1/60);}   // the juggle holds both fighters up until the K connects, then the slam falls on its own
    step(W,.5);
    assert.equal(slams.length,1,'slam lands');
    assert.ok(hp(w,'cpu')<100);
  });
}
