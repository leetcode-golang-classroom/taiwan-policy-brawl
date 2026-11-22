// Component factories: PURE DATA ONLY (no methods, no Three.js, no DOM).
export const Transform=(x=0,z=0,rotY=0)=>({x,y:0,z,rotY});
export const Body=({moveSpeed=5,jumpPower=8.2}={})=>({vy:0,grounded:true,moveSpeed,jumpPower,movePhase:0,moving:false,moveFwd:0,moveSide:0,chargeFwd:0,chargeSide:0,stepPhase:0,vx:0,vz:0,wasRush:false});
export const Health=(max=100)=>({hp:max,max});
export const Energy=({regen=1,gain=.5}={})=>({value:0,regen,gain});
export const Fighter=({side,charId})=>({side,charId});
export const Status=()=>({stun:0,rootTrap:0,hitReact:0,hitSide:0,dodgeTimer:0,dodgeInvuln:0,dodgeCooldown:0,dodgeDir:{x:0,z:0},rushTimer:0,rushCooldown:0,rushDir:{x:0,z:0},hitDir:{x:0,z:0},hitPower:0,airHit:false,landTimer:0,reflect:0,hitStop:0,frozen:false,kbVx:0,kbVz:0,kbTime:0,kbDur:0,rushRecover:0,dodgeBuf:null});
export const Attacker=()=>({cooldowns:{basic:0,skill:0,ult:0},charge:null,attackTime:0,attackStyle:null,phase:'idle',comboStep:0,comboWindow:0,comboHits:0,buffer:null,active:null,hitConfirmed:false});
// Combat state machine record (PHASE 1): current state name, entry time (world.time), expected duration, previous state.
export const FState=()=>({name:'Idle',prev:null,enteredAt:0,duration:0});
// Running combo of this fighter as the ATTACKER (PHASE 11): effective hits and total damage on one victim.
export const Combo=()=>({hits:0,damage:0,targetId:null,lastHit:-9});
// Control output. Control systems (player input / AI) write it, gameplay systems consume it.
export const Defense=()=>({active:false,timer:0,cooldown:0,layers:0,startup:0,recovery:0});
export const Intent=()=>({moveX:0,moveZ:0,attack:null,jump:false,dodge:false,dodgeDir:null,defend:false,rush:null,lastTap:{code:null,time:-9}});
// CPU decision state (PHASE 14): think cooldowns, the threat it is reacting to (with its reaction deadline), positioning mode.
export const Brain=()=>({attackCd:1.2,skillCd:3.5,jumpCd:2.8,threat:false,reactAt:0,reacted:false,mode:'approach',recoverUntil:0,strafeDir:1,strafeUntil:0,ultAt:null});
export const Dash=({targetId,skill,remaining,onHit})=>({targetId,skill,remaining,onHit});
export const Projectile=({ownerId,targetId,skill,pos,dir,onHit,wait=0,knockAngle=0,stage=0})=>({ownerId,targetId,skill,pos:{...pos},dir:{...dir},onHit,travelled:0,evaded:false,wait,knockAngle,stage});
// Singleton match state (stored on world.match)
export const Match=()=>({running:false,ended:false,timeLeft:99,roundNumber:1,playerRounds:0,cpuRounds:0,roundTransition:0});
