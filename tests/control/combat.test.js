import test from 'node:test';
import assert from 'node:assert/strict';
import {pressAttack,pressDodge} from '../../src/systems/playerControl.js';
import {getSkill,LUNGE,ATTACK_TIME} from '../../src/config.js';
import {resolveHit} from '../../src/systems/combatSystem.js';
import {spawnProjectile} from '../../src/systems/projectileSystem.js';
import {startedWorld,step,arrange,record,hp} from '../helpers.js';

const CHARS=['mech','leopard','admiral','mage','cleric','brawler','nun','yu','bubble'];
const fire=(w,tier)=>{pressAttack(w.world,'player',tier);if(tier==='ult')w.world.get(w.player,'energy').value=100;pressAttack(w.world,'player',tier);};

// Every character x every tier: damage lands inside range, nothing outside, exactly once, and the
// damage reported by the 'hit' event equals the real HP loss (damage numbers read this event).
for(const id of CHARS)for(const tier of ['basic','skill','ult']){
  const sk=getSkill(id,tier);
  const inside=Math.max(1.6,Math.min(sk.range-.8,sk.type==='dash'?5:sk.range*.8));
  // the attacker itself advances by stepIn + lunge during the attack, so add that to the 'safe' distance
  const lunge=(LUNGE[id]?.[tier]??LUNGE[id]?.default??0)*ATTACK_TIME[tier];
  const outside=Math.min(13.8,sk.range+sk.stepIn+lunge+(sk.type==='dash'?sk.dashMax:0)+3);
  test(`${id}/${tier} (${sk.type}): hits once inside range, misses outside`, ()=>{
    const a=startedWorld({p:id});arrange(a,{dist:inside});const hits=record(a.world,'hit');
    fire(a,tier);step(a.world,2.2);
    const lost=100-hp(a,'cpu'),nHits=sk.volley?.length||1;
    if(sk.dice){assert.ok(lost%sk.damage===0&&lost/sk.damage>=1&&lost/sk.damage<=6,'dice: damage = points x base');}
    else assert.equal(lost,sk.damage*nHits,'damage = skill damage (x volley stages)');
    assert.equal(hits.length,nHits,'exactly one hit per stage (no duplicate damage)');
    assert.equal(hits.reduce((n,h)=>n+h.amount,0),100-hp(a,'cpu'),'event amounts equal real HP loss');
    if(sk.range>=14)return;   // range exceeds the arena width: no out-of-range position exists
    const b=startedWorld({p:id});arrange(b,{dist:outside});
    fire(b,tier);step(b.world,2.2);
    assert.equal(hp(b,'cpu'),100,'no damage out of range');
    assert.equal(b.world.query('projectile').length,0,'projectile cleaned up after max range');
  });
}
test('projectile has flight time: not instant, hits after travelling', ()=>{
  const w=startedWorld({p:'mage'});arrange(w,{dist:6});const hits=record(w.world,'hit');
  fire(w,'basic');step(w.world,.3);                       // charge done, projectile just spawned
  assert.equal(w.world.query('projectile').length,1);assert.equal(hp(w,'cpu'),100);
  step(w.world,1);assert.equal(hits.length,1);
});
test('a dodging target is passed through by projectiles (no damage, evade reported once)', ()=>{
  const w=startedWorld({p:'mage'});arrange(w,{dist:5});const ev=record(w.world,'evade');
  w.world.get(w.cpu,'status').dodgeInvuln=5;
  fire(w,'basic');step(w.world,1.5);
  assert.equal(hp(w,'cpu'),100);assert.equal(ev.length,1);
});
test('melee hit on a dodging target is evaded', ()=>{
  const w=startedWorld({p:'leopard'});arrange(w,{dist:1.5});const ev=record(w.world,'evade');
  w.world.get(w.cpu,'status').dodgeInvuln=5;fire(w,'basic');step(w.world,.6);
  assert.equal(hp(w,'cpu'),100);assert.equal(ev.length,1);
});
test('straight projectile misses a target that sidestepped; cleric 神的啟示 (area) still hits and launches', ()=>{
  const run=(id,z)=>{const w=startedWorld({p:id});arrange(w,{dist:6});fire(w,id==='cleric'?'skill':'basic');
    step(w.world,.3);w.world.get(w.cpu,'transform').z=z;
    step(w.world,2.2);return hp(w,'cpu');};
  assert.ok(run('cleric',2.6)<100);
  assert.equal(run('mage',4),100);     // straight: flies past
});
test('dash attack moves the attacker toward the target, bounded by dashMax, then hits', ()=>{
  const w=startedWorld({p:'brawler'});arrange(w,{dist:5});const pt=w.world.get(w.player,'transform');const x0=pt.x;
  fire(w,'skill');step(w.world,1.5);
  assert.ok(pt.x>x0+1&&pt.x-x0<=4.6);assert.equal(hp(w,'cpu'),81);
});
test('knockback pushes away from the attacker but never out of the arena', ()=>{
  const w=startedWorld({p:'yu'});arrange(w,{dist:3});
  const ct=w.world.get(w.cpu,'transform');ct.x=6.9;w.world.get(w.player,'transform').x=3.9;
  w.world.get(w.player,'energy').value=100;fire(w,'ult');step(w.world,1.5);
  assert.ok(ct.x<=7&&ct.z>=-5&&ct.z<=5&&ct.y>=0);
});
test('strong hits launch the target upward, which then lands again', ()=>{
  const w=startedWorld({p:'leopard'});arrange(w,{dist:1.5});const b=w.world.get(w.cpu,'body');
  fire(w,'basic');step(w.world,.45);assert.ok(!b.grounded||b.vy>0);
  step(w.world,2);assert.ok(b.grounded&&w.world.get(w.cpu,'transform').y===0);
});
test('basic combo: step 3 stuns longer and launches', ()=>{
  const w=startedWorld({p:'yu'});arrange(w,{dist:1.5});const combos=record(w.world,'comboHit');
  for(let i=0;i<3;i++){pressAttack(w.world,'player','basic');step(w.world,.2);step(w.world,.5);w.world.get(w.cpu,'transform').x=-6.5+1.5;w.world.get(w.player,'attacker').cooldowns.basic=0;}
  assert.deepEqual(combos.map(c=>c.step),[1,2,3]);
});
test('KO ends the round, awards the win and keeps the best-of-three rules', ()=>{
  const w=startedWorld({p:'yu'});arrange(w,{dist:1.5});const re=record(w.world,'roundEnd'),me=record(w.world,'matchEnd');
  w.world.get(w.cpu,'health').hp=5;fire(w,'basic');step(w.world,.8);
  assert.equal(hp(w,'cpu'),0);assert.equal(re.length,1);assert.equal(re[0].winner,'player');assert.equal(w.world.match.running,false);
  step(w.world,3);assert.equal(w.world.match.roundNumber,2);assert.equal(hp(w,'cpu'),100);assert.ok(w.world.match.running); // next round, HP reset
  arrange(w,{dist:1.5});w.world.get(w.cpu,'health').hp=5;w.world.get(w.cpu,'status').stun=1e9;fire(w,'basic');step(w.world,.8);
  assert.equal(me.length,1);assert.equal(me[0].winner,'player');assert.equal(w.world.match.playerRounds,2);
});
test('time-out awards the round to whoever has more HP', ()=>{
  const w=startedWorld();w.world.get(w.cpu,'health').hp=40;const re=record(w.world,'roundEnd');
  w.world.match.timeLeft=.05;step(w.world,.2);assert.equal(re[0].winner,'player');assert.equal(re[0].reason,'時間結束');
});
test('乾坤之動: reflect window turns a projectile back on its sender (reflector takes no damage)', ()=>{
  const w=startedWorld({p:'yu',c:'mage'});arrange(w,{dist:6});const ref=record(w.world,'reflect');
  w.world.get(w.player,'status').reflect=3;
  const mech=getSkill('mage','basic'),ct=w.world.get(w.cpu,'transform');
  spawnProjectile(w.world,{ownerId:w.cpu,targetId:w.player,skill:mech,pos:{x:ct.x-1,y:1.15,z:0},dir:{x:-1,y:0,z:0}});
  step(w.world,.5);
  assert.equal(ref.length,1,'reflected once');assert.equal(hp(w,'player'),100,'reflector undamaged');
  step(w.world,1.5);assert.ok(hp(w,'cpu')<100,'sender is hit by its own projectile');
});
test('乾坤之動: reflect window turns a melee hit back on its attacker', ()=>{
  const w=startedWorld({p:'yu',c:'leopard'});arrange(w,{dist:1.5});
  w.world.get(w.player,'status').reflect=3;
  resolveHit(w.world,w.cpu,w.player,getSkill('leopard','skill'));
  assert.equal(hp(w,'player'),100);assert.ok(hp(w,'cpu')<100);
});
