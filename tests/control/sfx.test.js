import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import manifest from '../../src/audio/combatSfxManifest.json' with {type:'json'};
import {CHARACTER_SFX,SFX_EVENT,SFX_RULES,CHARGE_LOOPS,paletteOf,idsFor} from '../../src/audio/sfxConfig.js';
import {initCombatAudio} from '../../src/audio/combatAudio.js';
import {roster} from '../../src/roster.js';
import {pressAttack} from '../../src/systems/playerControl.js';
import {startedWorld,step,arrange} from '../helpers.js';

const root=p=>fileURLToPath(new URL('../../'+p,import.meta.url));
const FIELDS=['attackSwingVariants','attackHitVariants','heavyHitVariants','chargeStart','chargeLoop','chargeFull','skillStart','skillProjectile','skillImpact','ultimateStart','ultimateCharge','ultimateRelease','ultimateImpact','ultimateExplosion','defense','perfectGuard','hitLight','hitHeavy','knockdown'];

test('every manifest sound has a source in the downloaded pack and a processed file in public/audio/combat', ()=>{
  for(const [id,e] of Object.entries(manifest)){
    assert.ok(fs.existsSync(root('public/audio/combat/'+e.dir+'/'+e.src.split('/').pop())),'processed file missing: '+id);
  }
  assert.ok(fs.existsSync(root('public/audio/combat/LICENSES.txt')));
});
test('all 9 characters define every field with existing sound ids', ()=>{
  assert.deepEqual(Object.keys(CHARACTER_SFX).sort(),roster.map(r=>r.id).sort());
  for(const [c,pal] of Object.entries(CHARACTER_SFX))for(const f of FIELDS){
    assert.ok(Array.isArray(pal[f])&&pal[f].length,c+'.'+f);
    for(const id of pal[f])assert.ok(manifest[id],`${c}.${f}: unknown sound ${id}`);
  }
  for(const l of Object.values(CHARGE_LOOPS))for(const c of Object.keys(CHARACTER_SFX))assert.ok(manifest[paletteOf(c)[l.field][0]].loop,c+' charge loop must be a baked loop');
  for(const r of Object.values(SFX_RULES))assert.ok(FIELDS.includes(r.field));
  assert.ok(idsFor(['mech','bubble']).length>12);
});
test('basic/heavy/skill/ult volumes follow the spec ranges', ()=>{
  const E=SFX_EVENT,R=SFX_RULES;
  assert.ok(R[E.ATTACK_HIT].vol[0]>=.65&&R[E.ATTACK_HIT].vol[1]<=.8);
  assert.ok(R[E.HEAVY_HIT].vol[0]>=.85&&R[E.HEAVY_HIT].vol[1]<=1);
  assert.ok(R[E.SKILL_IMPACT].vol[1]<=.9&&R[E.SKILL_START].vol[0]>=.75);
  assert.ok(R[E.ULTIMATE_IMPACT].vol[0]>=.9);assert.equal(R[E.ULTIMATE_IMPACT].pitchVar,0);
  assert.ok(R[E.ATTACK_SWING].vol[0]>=.4&&R[E.ATTACK_SWING].vol[1]<=.65);
});

// Record what the router would play (no AudioContext in node).
function rig(p='cleric'){
  const w=startedWorld({p});arrange(w,{dist:1.5});const cd=w.world.get(w.cpu,'defense');cd.cooldown=1e9;
  const log=[],loops=[];
  const sound={preload(){},stopAll(){},playVariant:(ids,o)=>{log.push({ids,...o});return {};},loop:(id,o)=>{const h={id,o,stopped:false,stop(){h.stopped=true;},setRate(){},setGain(){}};loops.push(h);return h;}};
  const update=initCombatAudio(w.world,sound);
  const frame=()=>{step(w.world,1/60);update();};
  return {...w,log,loops,frame,field:f=>log.filter(l=>l.ids===paletteOf(p)[f])};
}
test('J: swing is voiced before the hit; a hit voices ATTACK_HIT once, and a whiff never voices a hit', ()=>{
  const r=rig();pressAttack(r.world,'player','basic');
  const seq=[];for(let i=0;i<40;i++){const n=r.log.length;r.frame();for(const l of r.log.slice(n))seq.push([i,l.ids]);}
  const pal=paletteOf('cleric');
  const sw=seq.find(s=>s[1]===pal.attackSwingVariants),ht=seq.find(s=>s[1]===pal.attackHitVariants);
  assert.ok(sw&&ht,'swing and hit both played');assert.ok(sw[0]<=ht[0],'swing no later than the hit');
  assert.equal(seq.filter(s=>s[1]===pal.attackSwingVariants).length,1);assert.equal(seq.filter(s=>s[1]===pal.attackHitVariants).length,1);
  const m=rig();m.world.get(m.cpu,'transform').x+=8;   // out of range: whiff
  pressAttack(m.world,'player','basic');for(let i=0;i<40;i++)m.frame();
  assert.equal(m.field('attackSwingVariants').length,1);assert.equal(m.field('attackHitVariants').length+m.field('heavyHitVariants').length,0);
});
test('K: charge loop starts, charge-full fires once, loop stops on release; no loop survives', ()=>{
  const r=rig();pressAttack(r.world,'player','skill');
  for(let i=0;i<90;i++)r.frame();
  assert.equal(r.loops.length,1);assert.ok(r.loops[0].stopped,'loop stopped after release');
  assert.equal(r.field('chargeFull').length,1);assert.equal(r.field('chargeStart').length,1);
  assert.equal(r.field('skillStart').length,1);
});
test('K cancelled by stun: the charge loop is stopped', ()=>{
  const r=rig();pressAttack(r.world,'player','skill');
  for(let i=0;i<8;i++)r.frame();assert.ok(!r.loops[0].stopped);
  r.world.get(r.player,'attacker').charge=null;r.frame();   // interrupted charge
  assert.ok(r.loops[0].stopped);
});
test('L: ultimate layers play in order over several frames (start, release, impact, explosion)', ()=>{
  const r=rig();r.world.get(r.player,'energy').value=100;pressAttack(r.world,'player','ult');
  const t={};for(let i=0;i<120;i++){const n=r.log.length;r.frame();for(const l of r.log.slice(n)){const k=Object.entries(paletteOf('cleric')).find(([,v])=>v===l.ids)?.[0];if(k&&!(k in t))t[k]=i;}}
  for(const k of ['ultimateStart','chargeFull','ultimateRelease','ultimateImpact','ultimateExplosion'])assert.ok(k in t,k);
  assert.ok(t.ultimateStart<t.chargeFull&&t.chargeFull<=t.ultimateRelease&&t.ultimateRelease<=t.ultimateImpact);
  assert.equal(r.loops.filter(l=>l.o.priority===4).length,1);
  assert.ok(r.log.find(l=>l.ids===paletteOf('cleric').ultimateExplosion).delay>0,'explosion offset from impact');
});
