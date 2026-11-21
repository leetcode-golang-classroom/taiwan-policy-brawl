import test from 'node:test';
import assert from 'node:assert/strict';
import {pickClip} from '../../src/character/CharacterAnimator.js';
import {findClip,assetUrl,CLIPS} from '../../src/character/CharacterRegistry.js';
const base={grounded:true,airHit:false,landTimer:0,hitReact:0,stun:0,dodgeTimer:0,guarding:false,phase:'idle',moving:false,moveFwd:0,moveSide:0,rushTimer:0};
test('movement clips',()=>{
  assert.equal(pickClip(base),'Idle');
  assert.equal(pickClip({...base,moving:true,moveFwd:1}),'WalkForward');
  assert.equal(pickClip({...base,moving:true,moveFwd:-1}),'WalkBackward');
  assert.equal(pickClip({...base,moving:true,moveSide:-1}),'WalkLeft');
});
test('attacks outrank walking',()=>{
  assert.equal(pickClip({...base,moving:true,moveFwd:1,phase:'strike',chargeStyle:'skill'}),'Skill');
  assert.equal(pickClip({...base,phase:'recovery',attackStyle:'ult'}),'Ultimate');
});
test('reactions and asset helpers',()=>{
  assert.equal(pickClip({...base,hitReact:.2,phase:'strike',chargeStyle:'ult'}),'Hit');
  assert.equal(findClip([{name:'Guard'}],'Block').name,'Guard');
  assert.equal(assetUrl('mech','fighter.glb','/x/'),'/x/assets/characters/character-01/fighter.glb');
  assert.equal(CLIPS.length,21);
});
