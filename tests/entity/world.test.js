import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../../src/ecs/world.js';
import {createFighter,fighterOf,opponentOf,SPAWN} from '../../src/ecs/entities.js';

test('create/add/get/has/remove components', ()=>{
  const w=new World();const id=w.create({a:{v:1}});
  assert.equal(w.get(id,'a').v,1);assert.ok(w.has(id,'a'));assert.ok(!w.has(id,'b'));
  w.add(id,'b',{v:2});assert.equal(w.get(id,'b').v,2);
  w.remove(id,'a');assert.ok(!w.has(id,'a'));
});
test('entity ids are unique and destroy removes every component', ()=>{
  const w=new World();const a=w.create({x:{},y:{}}),b=w.create({x:{}});
  assert.notEqual(a,b);w.destroy(a);
  assert.ok(!w.has(a,'x')&&!w.has(a,'y'));assert.deepEqual(w.query('x'),[b]);
  w.destroy(a); // destroying twice is harmless
});
test('query returns only entities that have ALL components', ()=>{
  const w=new World();const a=w.create({x:{},y:{}}),b=w.create({x:{}}),c=w.create({y:{}});
  assert.deepEqual(w.query('x','y'),[a]);assert.deepEqual(w.query('x').sort(),[a,b].sort());
  assert.deepEqual(w.query('nope'),[]);assert.ok(c);
});
test('query result is safe to mutate the world while iterating', ()=>{
  const w=new World();for(let i=0;i<5;i++)w.create({x:{}});
  for(const id of w.query('x'))w.destroy(id);
  assert.equal(w.query('x').length,0);
});
test('event bus delivers payloads and supports unsubscribe', ()=>{
  const w=new World();const got=[];const off=w.events.on('e',p=>got.push(p));
  w.events.emit('e',1);off();w.events.emit('e',2);assert.deepEqual(got,[1]);
});
test('P1 and CPU fighters are symmetric entities with the same component set', ()=>{
  const w=new World();const p=createFighter(w,{side:'player',charId:'mech'}),c=createFighter(w,{side:'cpu',charId:'leopard'});
  const names=id=>[...w.stores.keys()].filter(n=>w.has(id,n)).filter(n=>n!=='brain').sort();
  assert.deepEqual(names(p),names(c));
  assert.ok(w.has(c,'brain')&&!w.has(p,'brain'));        // only the CPU has an AI brain
  assert.equal(fighterOf(w,'player'),p);assert.equal(fighterOf(w,'cpu'),c);
  assert.equal(opponentOf(w,p),c);assert.equal(opponentOf(w,c),p);
});
test('fighters spawn at their side positions with full health', ()=>{
  const w=new World();const p=createFighter(w,{side:'player',charId:'admiral'});
  const t=w.get(p,'transform');assert.equal(t.x,SPAWN.player.x);assert.equal(t.z,SPAWN.player.z);
  assert.equal(w.get(p,'health').hp,100);assert.equal(w.get(p,'health').max,100);assert.equal(w.get(p,'energy').value,0);
});
test('components are plain serialisable data (no Three.js / DOM / functions)', ()=>{
  const w=new World();const p=createFighter(w,{side:'player',charId:'nun'});
  for(const [name,store] of w.stores){const data=store.get(p);
    if(data===undefined)continue;assert.doesNotThrow(()=>JSON.stringify(data),name);
    assert.ok(!Object.values(data).some(v=>typeof v==='function'),name);}
});
