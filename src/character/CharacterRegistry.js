// Registry of GLB-backed fighters. A fighter only switches from the procedural placeholder to a real model
// when its metadata.json says status:"ready" AND fighter.glb loads; otherwise the placeholder stays (never blocks startup).
export const ASSET_ROOT='assets/characters';
// roster id -> asset folder (public/assets/characters/<dir>/fighter.glb|metadata.json|thumbnail.png)
export const CHARACTER_ASSETS={
  mech:{dir:'character-01',code:'01'},
  leopard:{dir:'character-02',code:'02'},
  admiral:{dir:'character-03',code:'03'},
  mage:{dir:'character-04',code:'04'},
  cleric:{dir:'character-05',code:'05'},
  brawler:{dir:'character-06',code:'06'},
  nun:{dir:'character-07',code:'07'},
  yu:{dir:'character-08',code:'08'},
  bubble:{dir:'character-09',code:'09'}
};
// Canonical animation names (spec 6.1) and accepted aliases found in third-party GLBs.
export const CLIPS=['Idle','WalkForward','WalkBackward','WalkLeft','WalkRight','Run','Dash','DodgeLeft','DodgeRight','Jump','Landing','Punch','Kick','Skill','Ultimate','Block','Hit','Knockback','Fall','GetUp','Victory'];
export const CLIP_ALIASES={Idle:['idle','stand'],WalkForward:['walk','walk_forward','walkforward'],WalkBackward:['walk_back','walkbackward','walk_backward'],WalkLeft:['strafe_left','walk_left'],WalkRight:['strafe_right','walk_right'],Run:['run'],Dash:['dash','sprint'],DodgeLeft:['dodge_left'],DodgeRight:['dodge_right'],Jump:['jump'],Landing:['land','landing'],Punch:['punch','attack'],Kick:['kick'],Skill:['skill','skill_attack'],Ultimate:['ultimate','ult'],Block:['block','guard','defend'],Hit:['hit','hit_reaction'],Knockback:['knockback'],Fall:['fall'],GetUp:['getup','get_up'],Victory:['victory','win']};
export const baseUrl=()=>{try{return import.meta.env?.BASE_URL||'./';}catch{return './';}};
export const assetUrl=(id,file,base=baseUrl())=>{const a=CHARACTER_ASSETS[id];return a?`${base}${ASSET_ROOT}/${a.dir}/${file}`:null;};
export const hasAssetSlot=id=>!!CHARACTER_ASSETS[id];
// Resolve a canonical clip name against the clips in a loaded GLB (exact, then case-insensitive alias match).
export function findClip(clips,name){
  const want=[name,...(CLIP_ALIASES[name]||[])].map(s=>s.toLowerCase());
  return clips.find(c=>want.includes(c.name.toLowerCase()))||null;
}
