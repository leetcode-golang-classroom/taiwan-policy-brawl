// Centralised tuning values (spec: values must be managed in one place).
export const chargeDurations={basic:.22,skill:.62,ult:1.05};

export const ARENA={halfX:7,halfZ:5};
export const AIRBORNE_BONUS=4;          // extra damage when the attacker is airborne
// I-key exclusive defense. Projectiles/homing are fully blocked; melee/area/dash are reduced by `reduction`.
// cooldown starts when the guard ends. layers: characters whose barrier breaks after N absorbed hits.
// PHASE 12: raising the guard has a startup (not protective yet), then the active guard, then a recovery (no actions) after it drops.
// duration = startup + active.
export const DEFENSE={duration:1.5,cooldown:6,reduction:.7,knockbackMult:.3,moveMult:.4,layers:{'bubble':3},startup:.08,recovery:.2};

// Unified skill data (spec 6.2). type: melee | projectile | homing | area | dash
// range    = max reach (melee/area/dash-hit) or max flight distance (projectile/homing)
// speed    = flight speed (units/s); radius = projectile collision radius
// knockback= horizontal push; launch = upward velocity; stun = seconds
const SKILL_DEFAULTS={
  basic:{name:'basic',type:'melee',damage:9,range:2.5,speed:0,cooldown:.34,radius:0,knockback:.78,launch:0,stun:.18,tracking:false,blockable:true,stepIn:0},
  skill:{name:'skill',type:'melee',damage:19,range:5.2,speed:0,cooldown:3.4,radius:0,knockback:1.85,launch:3.8,stun:.58,tracking:false,blockable:true,stepIn:1.0},
  ult:{name:'ult',type:'area',damage:36,range:8.5,speed:0,cooldown:9,radius:0,knockback:2.65,launch:5.4,stun:.82,tracking:false,blockable:true,stepIn:0}
};
// Per-character overrides. Characters not listed use the defaults.
const SKILL_OVERRIDES={
  // AI 基礎建設: seven GPU beams converge (instant area hit). 交通捷運四通八達: metro lines from every direction launch the target.
  mech:{basic:{name:'AI 基礎建設',type:'area',range:7.5,damage:10,cooldown:.6,knockback:.9,launch:0,stun:.25},skill:{name:'交通捷運四通八達',type:'area',range:8,damage:19,knockback:2.8,launch:6,stun:.8,stepIn:0}},
  leopard:{basic:{name:'都市縫合',type:'area',range:6,knockback:1.55,launch:4.4,stun:.58},skill:{type:'projectile',speed:9.4,range:7,radius:.9}},
  // 乾坤一擲: a giant die; damage = points (1-6) x `damage`. 紅中旋風: three red-dragon tiles spiral in and knock the target left, right, then up/back.
  admiral:{basic:{name:'乾坤一擲',type:'projectile',dice:true,damage:3,cooldown:.9,speed:9,range:7,radius:1.3,knockback:3.6,launch:2.5,stun:.5},
    skill:{name:'紅中旋風',type:'projectile',damage:7,speed:8.8,range:7,radius:.8,tracking:true,trackRange:12,turnRate:9,
      volley:[{wait:0,angle:-1.1,knockback:2.2,launch:0},{wait:.22,angle:1.1,knockback:2.2,launch:0},{wait:.44,angle:0,knockback:3.4,launch:6.5}]},ult:{type:'projectile',speed:8.2,range:8.5,radius:1.3}},
  // 開卷有益 / SoR 教學 / 百年樹人: all instant area hits (the books, words, pyramid light and vines are presentation).
  mage:{basic:{name:'開卷有益',type:'area',range:7.5,damage:10,cooldown:.6,knockback:.9,launch:0,stun:.25},skill:{name:'SoR 教學',type:'area',range:8,damage:19,knockback:2.4,launch:3.5,stun:.7,stepIn:0},ult:{name:'百年樹人',range:8,knockback:1.6,launch:10,stun:1.1}},
  cleric:{basic:{range:3.1},skill:{name:'神的啟示',type:'area',range:8,damage:20,knockback:3.4,launch:7.2,stun:.9,stepIn:0},ult:{name:'火箭工程',type:'area',range:8,knockback:1.2,launch:11,stun:1.1}},
  // 紫氣東來: a dragon-shaped qi blast; knockback follows the projectile's heading at the moment it hits.
  yu:{basic:{name:'乾坤之動',damage:6,range:2.6,knockback:.5,cooldown:.7},skill:{name:'紫氣東來',type:'projectile',damage:19,range:11,speed:12,radius:1.1,knockback:3.4,launch:2.2,stun:.6,stepIn:0},ult:{name:'百川匯海'}},
  // 生育大改革 / 市警大升級 / 警局長照護: instant area hits (figures, slaps, gunfire and crowds are presentation).
  bubble:{basic:{name:'生育大改革',type:'area',range:7.5,damage:10,cooldown:.6,knockback:.9,launch:0,stun:.25},skill:{name:'市警大升級',type:'area',range:8,damage:24,knockback:2.2,launch:3,stun:.7,stepIn:0},ult:{name:'警局長照護',range:8,knockback:2,launch:6,stun:1}},
  brawler:{basic:{name:'重拳出擊',type:'projectile',speed:10,range:6.5,radius:.85},skill:{type:'dash',range:2.3,dashSpeed:16,dashMax:4.5,stepIn:0}},
  nun:{basic:{type:'projectile',speed:9.2,range:7,radius:.9},
    // 電光火球 (spec 6.2): fully replaces the old excavator skill. Real projectile, blockable, strong knockback, no launch.
    skill:{name:'電光火球',type:'projectile',damage:10,range:15,speed:12,cooldown:5,radius:1.2,knockback:5,launch:0,stun:.45,tracking:false,blockable:true,stepIn:0},ult:{name:'神之震怒',type:'area',range:8,knockback:6,launch:6.5,stun:1}}
};
export function getSkill(id,tier){
  return {...SKILL_DEFAULTS[tier],...(SKILL_OVERRIDES[id]?.[tier]||{}),tier,id};
}
export const cooldownFor=(charId,tier)=>getSkill(charId,tier).cooldown;   // per-character cooldown (電光火球 has 5s)
export const cooldownDurations={basic:SKILL_DEFAULTS.basic.cooldown,skill:SKILL_DEFAULTS.skill.cooldown,ult:SKILL_DEFAULTS.ult.cooldown};

// ---- Gameplay constants shared by systems (kept here so balance is tuned in one place) ----
// PHASE 12 dodge: invuln for the first `invuln` s, vulnerable recovery until `duration`. The body SLIDES `slide` s (not a teleport).
// attackAfter: attacks (counter-attacks) are locked for this long after the dodge starts; a press just before it is buffered.
export const DODGE={duration:.68,invuln:.42,cooldown:1.1,slide:.2,attackAfter:.5,defaultDistance:2.1,
  distance:{mech:2.55,leopard:2.25,admiral:1.9,mage:2.35,cleric:2.2,brawler:2.0,nun:1.9,yu:2.15,'bubble':2.2}};
// 乾坤之動 (08 basic): a tai-chi stance that reflects incoming attacks for `duration` seconds after it is released.
export const REFLECT={duration:.5,charId:'yu'};
// maxStun: hit stun is re-computed (not summed) on every hit and can never exceed this, so nobody is stun-locked forever.
export const HIT={reactTime:.38,baseStun:.28,airborneThreshold:.25,maxStun:1.4};
export const GRAVITY=20;
export const ATTACK_TIME={basic:.32,skill:.48,ult:.72};
// Six-phase attack (spec 3.3): windup -> charge -> strike | impact (hit / launch frame) -> recovery -> idle.
// windup+charge+strike = chargeDurations[tier] (so total time-to-hit is unchanged); impact+recovery = ATTACK_TIME[tier].
export const PHASES={windup:{basic:.05,skill:.1,ult:.15},strike:{basic:.04,skill:.06,ult:.08},impact:{basic:.05,skill:.07,ult:.1}};
// Quick rush (double-tap a direction): short, fast, grounded, no invulnerability (that is the dodge's job).
export const RUSH={duration:.24,speed:13,cooldown:.7,doubleTap:.28,aiRate:.6,aiMinDist:4.5,accel:140,endDecel:100,recovery:.1};   // accel: ramp up to speed; endDecel/recovery: braking + short no-input recovery after the burst
export const HIT_REACT={landTime:.32,powerRef:36,airborneSpin:.9};
// J1 -> J2 -> J3 per-step data (Phase 4). Index = comboStep-1.
//   chargeBonus: extra windup seconds   stun/launch: extra hit stun / upward launch applied by the step (0 = skill's own)
//   stepIn: advance on release so the chain keeps up with the knocked-back target
//   cancels: what a LANDED hit of this step may cancel into (J = next J ignoring cooldown, K = skill, L = ultimate at full energy)
export const COMBO_STEPS=Object.freeze([
  Object.freeze({chargeBonus:0,   stun:0,   launch:0,   stepIn:0,   cancels:Object.freeze(['J','K'])}),
  Object.freeze({chargeBonus:0,   stun:.42, launch:0,   stepIn:.75, cancels:Object.freeze(['J','K'])}),
  Object.freeze({chargeBonus:.12, stun:.62, launch:3.3, stepIn:.75, cancels:Object.freeze(['K','L'])}),
]);
export const COMBO={window:.92,steps:COMBO_STEPS};
export const SKILL_ENERGY_BONUS=8;
// forward lunge while an attack animation plays: units/second (per character, per tier)
export const LUNGE={mech:{skill:5.5,default:1.2},yu:{skill:5.5,default:1.2}};
export const MATCH={roundTime:99,transition:2.8,maxRounds:3,winsNeeded:2};
export const AI={chaseStop:2.15,farDist:4,nearSpeed:1.05,farSpeed:2.15,meleeBasic:2.45,meleeSkill:4.4,rangedMax:6,
  jumpMin:2.8,jumpMax:6,jumpChance:.035,dodgeRange:7,defendRange:5.5,projectileWarn:4.5,
  // PHASE 14 rhythm. reaction: the CPU notices a threat only after reactMin..reactMax seconds (a J's 0.22 s charge is too fast to react to,
  // a K/L charge is not); it then rolls ONCE per threat (reactChance) and picks dodge (dodgePref) or guard.
  reactMin:.18,reactMax:.32,reactChance:.55,dodgePref:.6,
  recoverMin:.4,recoverMax:.8,            // after any attack the CPU backs off / circles for this long before pressing again
  wallMargin:1.2,strafeSpeed:.35,strafeMin:.5,strafeMax:1.3,rangedPref:4.2,retreatSpeed:.5,
  ultThinkMin:.4,ultThinkMax:1.1,ultReachMul:.8,   // delay between "energy full" and casting the ultimate
  punishBoost:1.5,
  chainChance:.55,cancelSkillChance:.3};   // after a confirmed J hit: chance to chain the next J / cancel into K (otherwise back off)                         // think cooldowns tick this much faster while the player is stunned / recovering

// PHASE 2: a J/K/L press made while the fighter is busy (charging / on cooldown) is remembered this long (s), then discarded.
export const INPUT_BUFFER=.18;

// PHASE 3 hit stop (s): BOTH attacker and victim freeze their own timers (attack/stun/movement/AI) for this long on a damaging hit.
// Cooldowns, energy, the round clock, UI and projectiles keep running. Chosen by the hit: ult > skill/launch > basic.
export const HITSTOP={basic:.06,skill:.1,ult:.15};
// PHASE 5: Active window (s) during which a melee/area hitbox is live after the strike frame. One attack = one hit at most.
export const ACTIVE_TIME={basic:.08,skill:.1,ult:.12};

// PHASE 7 knockback: a hit sets a push VELOCITY that decays linearly to 0 over `duration` (total distance = skill.knockback * defense / weight),
// instead of teleporting the victim. Heavier fighters are pushed less. minSep keeps two grounded fighters from overlapping.
export const KNOCK={duration:{basic:.16,skill:.26,ult:.4},minSep:.8,sepHeight:1.4};
export const WEIGHT={mech:1.2,brawler:1.15,cleric:1,admiral:1,leopard:.95,nun:.9,yu:.9,mage:.85,bubble:.85};
// PHASE 8 locomotion: velocity chases the input direction at `accel` (also turns it), decays at `friction` with no input; speed is capped by body.moveSpeed.
export const MOVE={accel:42,friction:34,turnRate:16,moveEps:.3};

// PHASE 12: brief slow-motion after the local player successfully dodges (real seconds, time scale while it lasts).
export const SLOWMO={time:.35,scale:.35};
