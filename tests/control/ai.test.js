import test from 'node:test';
import assert from 'node:assert/strict';
import {aiControl} from '../../src/systems/aiControl.js';
import {startedWorld,step,record,seeded,hp} from '../helpers.js';

const place=(w,dist)=>{const p=w.world.get(w.player,'transform'),c=w.world.get(w.cpu,'transform');p.x=-3;p.z=0;c.x=-3+dist;c.z=0;};

test('AI writes only the CPU intent and does nothing when the match is not running', ()=>{
  const w=startedWorld();place(w,8);w.world.match.running=false;aiControl(w.world,.016);
  const it=w.world.get(w.cpu,'intent');assert.equal(it.moveX,0);assert.equal(it.attack,null);
  assert.equal(w.world.get(w.player,'intent').moveX,0);
});
test('AI chases a distant player (moves toward, faster when far)', ()=>{
  const near=startedWorld();place(near,3);aiControl(near.world,.016);
  const far=startedWorld();place(far,8);aiControl(far.world,.016);
  const n=near.world.get(near.cpu,'intent'),f=far.world.get(far.cpu,'intent');
  assert.ok(n.moveX<0&&f.moveX<0);assert.ok(Math.abs(f.moveX)>Math.abs(n.moveX));
});
test('AI stops advancing when close and when stunned', ()=>{
  const w=startedWorld();place(w,1.5);aiControl(w.world,.016);assert.equal(w.world.get(w.cpu,'intent').moveX,0);
  place(w,6);w.world.get(w.cpu,'status').stun=1;aiControl(w.world,.016);assert.equal(w.world.get(w.cpu,'intent').moveX,0);
});
test('AI melee: attacks only when in reach and its think-cooldown is ready', ()=>{
  const w=startedWorld({c:'yu'});place(w,2);w.world.get(w.cpu,'brain').attackCd=0;aiControl(w.world,.016);
  assert.equal(w.world.get(w.cpu,'intent').attack,'basic');
  const x=startedWorld({c:'yu'});place(x,5.5);x.world.get(x.cpu,'brain').attackCd=0;x.world.get(x.cpu,'brain').skillCd=99;aiControl(x.world,.016);
  assert.equal(x.world.get(x.cpu,'intent').attack,null);
  const y=startedWorld({c:'yu'});place(y,2);y.world.get(y.cpu,'brain').attackCd=5;y.world.get(y.cpu,'brain').skillCd=99;aiControl(y.world,.016);
  assert.equal(y.world.get(y.cpu,'intent').attack,null);
});
test('AI uses its special at mid range', ()=>{
  const w=startedWorld({c:'yu'});place(w,4);const b=w.world.get(w.cpu,'brain');b.attackCd=99;b.skillCd=0;aiControl(w.world,.016);
  assert.equal(w.world.get(w.cpu,'intent').attack,'skill');
});
test('AI with projectile skills fires from range (not only in melee reach)', ()=>{
  const w=startedWorld({c:'mech'});place(w,5.5);w.world.get(w.cpu,'brain').attackCd=0;aiControl(w.world,.016);
  assert.equal(w.world.get(w.cpu,'intent').attack,'basic');
});
test('AI tries to dodge when the player is charging a move (rng-controlled)', ()=>{
  const w=startedWorld({rng:()=>0});place(w,4);w.world.get(w.player,'attacker').charge={tier:'skill',time:0,duration:.6};
  aiControl(w.world,.016);const it=w.world.get(w.cpu,'intent');assert.ok(it.dodge);assert.ok(it.dodgeDir.x>0); // away from player (player is at -x... cpu is at +x)
  const n=startedWorld({rng:()=>0.99});place(n,4);n.world.get(n.player,'attacker').charge={tier:'skill',time:0,duration:.6};
  aiControl(n.world,.016);assert.ok(!n.world.get(n.cpu,'intent').dodge);
});
test('AI will not queue a new attack while it is already charging', ()=>{
  const w=startedWorld({c:'yu'});place(w,2);w.world.get(w.cpu,'brain').attackCd=0;w.world.get(w.cpu,'attacker').charge={tier:'basic',time:0,duration:.2};
  aiControl(w.world,.016);assert.equal(w.world.get(w.cpu,'intent').attack,null);
});
test('CPU control is deterministic for a given seed', ()=>{
  const run=seed=>{const w=startedWorld({p:'yu',c:'mech',rng:seeded(seed)});const log=[];w.world.events.on('hit',e=>log.push([e.targetId,e.amount]));step(w.world,20);return JSON.stringify([log,hp(w,'player'),hp(w,'cpu')]);};
  assert.equal(run(3),run(3));
});
test('full AI-controlled duel keeps every invariant (bounds, finite numbers, HP range, single winner)', ()=>{
  for(const [p,c] of [['mech','nun'],['cleric','admiral'],['brawler','mage'],['yu','leopard']]){
    const w=startedWorld({p,c,rng:seeded(11)});
    // give P1 a scripted control so both sides fight: spam attacks toward the CPU
    const me=record(w.world,'matchEnd');
    for(let i=0;i<60*120&&!w.world.match.ended;i++){
      const it=w.world.get(w.player,'intent');it.moveX=.6;if(i%20===0)it.attack=['basic','skill','ult'][(i/20)%3|0];
      step(w.world,1/60);
      for(const id of w.world.query('transform')){const t=w.world.get(id,'transform');
        assert.ok(Number.isFinite(t.x+t.y+t.z+t.rotY));assert.ok(Math.abs(t.x)<=7+1e-6&&Math.abs(t.z)<=5+1e-6&&t.y>=0);}
      for(const id of w.world.query('health')){const h=w.world.get(id,'health');assert.ok(h.hp>=0&&h.hp<=h.max);}
    }
    assert.ok(w.world.match.ended,`${p} vs ${c} should finish within 2 minutes`);assert.equal(me.length,1);
  }
});
