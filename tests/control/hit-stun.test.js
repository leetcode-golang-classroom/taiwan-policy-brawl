import test from 'node:test';
import assert from 'node:assert/strict';
import {pressAttack,pressDefend} from '../../src/systems/playerControl.js';
import {resolveHit} from '../../src/systems/combatSystem.js';
import {getSkill,HIT} from '../../src/config.js';
import {startedWorld,step,arrange} from '../helpers.js';

const setup=()=>{const w=startedWorld({p:'cleric',c:'cleric'});arrange(w,{dist:1.5});const cs=w.world.get(w.cpu,'status');cs.stun=0;cs.dodgeCooldown=1e9;w.world.get(w.cpu,'defense').cooldown=1e9;return w;};

test('a normal (non-launching) hit stuns 0.25-0.4 s; every hit stays under the global cap', ()=>{
  const w=setup();resolveHit(w.world,w.player,w.cpu,getSkill('cleric','basic'));
  const s=w.world.get(w.cpu,'status').stun;assert.ok(s>=.25&&s<=.4,`basic stun ${s}`);
  for(const tier of ['skill','ult']){
    const x=setup();resolveHit(x.world,x.player,x.cpu,getSkill('cleric',tier));
    assert.ok(x.world.get(x.cpu,'status').stun<=HIT.maxStun);
  }
});
test('a stunned fighter cannot attack or defend; a buffered press fires once the stun ends', ()=>{
  const w=setup(),a=w.world.get(w.cpu,'attacker'),st=w.world.get(w.cpu,'status'),it=w.world.get(w.cpu,'intent');
  st.stun=.1;it.attack='basic';step(w.world,1/60);
  assert.equal(a.charge,null,'cannot start while stunned');
  step(w.world,.12);assert.ok(a.charge||a.attackTime>0,'buffered press executed after the stun');
});
test('stun is recomputed per hit, capped, and always ends', ()=>{
  const w=setup(),st=w.world.get(w.cpu,'status');
  for(let i=0;i<30;i++){resolveHit(w.world,w.player,w.cpu,getSkill('cleric','ult'));w.world.get(w.cpu,'health').hp=100;}
  assert.ok(st.stun<=HIT.maxStun);
  st.hitStop=0;step(w.world,HIT.maxStun+1);assert.equal(st.stun,0);
});
