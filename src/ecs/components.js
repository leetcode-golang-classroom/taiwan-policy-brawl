// Component factories: PURE DATA ONLY (no methods, no Three.js, no DOM).
export const Transform=(x=0,z=0,rotY=0)=>({x,y:0,z,rotY});
export const Body=({moveSpeed=5,jumpPower=8.2}={})=>({vy:0,grounded:true,moveSpeed,jumpPower,movePhase:0,moving:false,moveFwd:0,moveSide:0});
export const Health=(max=100)=>({hp:max,max});
export const Energy=({regen=1,gain=.5}={})=>({value:0,regen,gain});
export const Fighter=({side,charId})=>({side,charId});
export const Status=()=>({stun:0,rootTrap:0,hitReact:0,hitSide:0,dodgeTimer:0,dodgeInvuln:0,dodgeCooldown:0,dodgeDir:{x:0,z:0},rushTimer:0,rushCooldown:0,rushDir:{x:0,z:0},hitDir:{x:0,z:0},hitPower:0,airHit:false,landTimer:0});
export const Attacker=()=>({cooldowns:{basic:0,skill:0,ult:0},charge:null,attackTime:0,attackStyle:null,phase:'idle',comboStep:0,comboWindow:0,comboHits:0});
// Control output. Control systems (player input / AI) write it, gameplay systems consume it.
export const Defense=()=>({active:false,timer:0,cooldown:0,layers:0});
export const Intent=()=>({moveX:0,moveZ:0,attack:null,jump:false,dodge:false,dodgeDir:null,defend:false,rush:null,lastTap:{code:null,time:-9}});
export const Brain=()=>({attackCd:1.2,skillCd:3.5,jumpCd:2.8});
export const Dash=({targetId,skill,remaining,onHit})=>({targetId,skill,remaining,onHit});
export const Projectile=({ownerId,targetId,skill,pos,dir,onHit})=>({ownerId,targetId,skill,pos:{...pos},dir:{...dir},onHit,travelled:0,evaded:false});
// Singleton match state (stored on world.match)
export const Match=()=>({running:false,ended:false,timeLeft:99,roundNumber:1,playerRounds:0,cpuRounds:0,roundTransition:0});
