import * as THREE from 'three';
import {CLIPS,findClip} from './CharacterRegistry.js';

// Pure state -> canonical clip selection (spec 6.2). Priority: one-shot reactions > attacks > movement, so a walk
// animation can never replace an unfinished attack. `u` is the read-only fighter state built in presentation/animation.js.
export function pickClip(u){
  if(u.victory)return 'Victory';
  if(u.koDown)return u.grounded&&!u.airHit?'Fall':'Knockback';   // KO: thrown out, then lying on the ground until the next round
  if(!u.grounded&&u.airHit)return 'Knockback';
  if(u.landTimer>0&&u.grounded)return 'Landing';
  if(u.hitReact>0)return 'Hit';
  if(u.stun>0)return 'Hit';
  if(u.dodgeTimer>0)return (u.dodgeDirection?.x??0)<0?'DodgeLeft':'DodgeRight';
  if(u.guarding)return 'Block';
  if(['windup','charge','strike','impact','recovery'].includes(u.phase)){
    const tier=(u.phase==='strike'||u.phase==='windup'||u.phase==='charge'?u.chargeStyle:u.attackStyle)||u.attackStyle||'basic';
    return tier==='ult'?'Ultimate':tier==='skill'?'Skill':'Punch';
  }
  if(!u.grounded)return 'Jump';
  if(u.rushTimer>0)return 'Dash';
  if(u.moving){
    if(Math.abs(u.moveSide)>Math.abs(u.moveFwd)&&Math.abs(u.moveSide)>.25)return u.moveSide<0?'WalkLeft':'WalkRight';
    return u.moveFwd<-.25?'WalkBackward':'WalkForward';
  }
  return 'Idle';
}
const ONE_SHOT=new Set(['Jump','Landing','Punch','Kick','Skill','Ultimate','Hit','Knockback','Fall','GetUp','DodgeLeft','DodgeRight','Victory']);
// Missing clips degrade gracefully (e.g. no WalkLeft -> WalkForward -> Idle).
const FALLBACK={WalkLeft:'WalkForward',WalkRight:'WalkForward',WalkBackward:'WalkForward',Run:'WalkForward',Dash:'Run',DodgeLeft:'Dash',DodgeRight:'Dash',Landing:'Idle',Kick:'Punch',Skill:'Punch',Ultimate:'Skill',Fall:'Knockback',GetUp:'Idle',Jump:'Idle',Block:'Idle',Hit:'Idle',Knockback:'Hit',Victory:'Idle',Punch:'Idle'};

export class CharacterAnimator{
  constructor(model,clips,{fade=.12}={}){
    this.mixer=new THREE.AnimationMixer(model);this.fade=fade;this.actions=new Map();this.current=null;
    for(const name of CLIPS){const c=findClip(clips,name);if(c){const a=this.mixer.clipAction(c);if(ONE_SHOT.has(name)){a.setLoop(THREE.LoopOnce,1);a.clampWhenFinished=true;}this.actions.set(name,a);}}
  }
  has(name){return this.actions.has(name);}
  resolve(name){while(name&&!this.actions.has(name))name=FALLBACK[name];return name||null;}
  play(name){
    const n=this.resolve(name);if(!n||n===this.current)return;
    const next=this.actions.get(n),prev=this.actions.get(this.current);
    next.reset().setEffectiveWeight(1).fadeIn(this.fade).play();
    if(prev)prev.fadeOut(this.fade);
    this.current=n;
  }
  update(u,dt){this.play(pickClip(u));this.mixer.update(dt);}
}
