import test from 'node:test';
import assert from 'node:assert/strict';
import {syncView} from '../../src/presentation/renderSync.js';

const mk=()=>{const obj={position:{x:0,y:0,z:0,set(x,y,z){this.x=x;this.y=y;this.z=z;}},rotation:{y:0},userData:{limbs:[]}};
  const t={x:0,y:0,z:0,rotY:0},world={match:{running:true},get:(id,c)=>c==='view'?{obj}:t};return {obj,t,world};};

test('a one-step dodge/knockback jump is glided, not popped',()=>{
  const {obj,t,world}=mk();syncView(world,1,1/60);
  t.x=2.1;syncView(world,1,1/60);
  assert.ok(obj.position.x<.5,'view stays near the old spot on the jump frame');
  let prev=obj.position.x;for(let i=0;i<30;i++){syncView(world,1,1/60);assert.ok(obj.position.x>=prev-1e-9);prev=obj.position.x;}
  assert.ok(Math.abs(obj.position.x-2.1)<.05,'view arrives at the logic position');
});
test('normal walking steps are not delayed and respawn snaps',()=>{
  const {obj,t,world}=mk();syncView(world,1,1/60);
  t.x=.1;syncView(world,1,1/60);assert.equal(obj.position.x,.1);
  t.x=-9;syncView(world,1,1/60);assert.equal(obj.position.x,-9);
});
