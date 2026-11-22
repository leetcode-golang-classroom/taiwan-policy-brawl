import {$} from '../utils/dom.js';
import {cooldownDurations,cooldownFor,DEFENSE} from '../config.js';
import {fighterOf} from '../ecs/entities.js';
import {localSide} from '../systems/playerControl.js';
import {rosterById} from '../roster.js';

export function setCooldownCard(key,remaining,total,readyLabel){
  const card=$('#card-'+key),wheel=$('#wheel-'+key),label=$('#cool-'+key);
  const active=remaining>0.015,ratio=Math.max(0,Math.min(1,remaining/total));
  card.classList.toggle('cooling',active);card.classList.toggle('available',!active&&readyLabel==='READY');
  wheel.style.setProperty('--cooldown-progress',`${ratio*100}%`);
  wheel.setAttribute('aria-label',active?`冷卻中，剩餘 ${remaining.toFixed(1)} 秒`:readyLabel);
  label.textContent=active?`冷卻 ${remaining.toFixed(1)}s`:(readyLabel==='READY'?'READY':readyLabel);
}
const lastHp={};
// Read-only view of the world -> DOM.
export function updateHud(world){
  const L=fighterOf(world,localSide(world)),P=fighterOf(world,'player'),C=fighterOf(world,'cpu'),m=world.match;   // L = the seat this browser controls (skill cards)
  const pa=world.get(L,'attacker'),ph=world.get(P,'health'),ch=world.get(C,'health'),pm=world.get(P,'energy').value,cm=world.get(C,'energy').value,lm=world.get(L,'energy').value;
  setCooldownCard('basic',pa.cooldowns.basic,cooldownDurations.basic,'READY');
  setCooldownCard('skill',pa.cooldowns.skill,cooldownFor(world.get(L,'fighter').charId,'skill'),'READY');
  setCooldownCard('ult',pa.cooldowns.ult,cooldownDurations.ult,lm>=100?'READY':`能量 ${Math.floor(lm)}%`);
  const pd=world.get(L,'defense');
  setCooldownCard('defense',pd.cooldown,DEFENSE.cooldown,'READY');
  $('#card-defense').classList.toggle('guarding',pd.active);
  if(pd.active)$('#cool-defense').textContent=pd.startup>0?'舉盾中…':`防禦中 ${pd.timer.toFixed(1)}s`;
  else if(pd.recovery>0)$('#cool-defense').textContent='收招中…';
  $('#combo-status').textContent=pa.comboWindow>0?'連段窗口 '+pa.comboStep+'/3':'連段：等待起手';
  $('#player-health').style.width=ph.hp/ph.max*100+'%';$('#cpu-health').style.width=ch.hp/ch.max*100+'%';
  for(const [k,h] of [['player',ph],['cpu',ch]]){
    const track=$('#'+k+'-health').parentElement,r=h.hp/h.max;
    track.classList.toggle('low',r<=.3&&h.hp>0);track.classList.toggle('critical',r<=.15&&h.hp>0);
    if(h.hp<(lastHp[k]??h.hp)){track.classList.remove('hurt');void track.offsetWidth;track.classList.add('hurt');}
    lastHp[k]=h.hp;
  }
  $('#player-meter').style.width=pm+'%';$('#cpu-meter').style.width=cm+'%';
  $('#player-hp-value').textContent=Math.ceil(ph.hp);$('#cpu-hp-value').textContent=Math.ceil(ch.hp);
  $('#player-meter-value').textContent=Math.floor(pm);$('#cpu-meter-value').textContent=Math.floor(cm);
  $('#player-status').textContent=ph.hp<=0?'KNOCKED OUT':`本局得分 ${m.playerRounds} 勝｜能量 ${Math.round(pm)}%`;
  $('#cpu-status').textContent=ch.hp<=0?'KNOCKED OUT':`本局得分 ${m.cpuRounds} 勝｜能量 ${Math.round(cm)}%`;
  $('#timer').textContent=Math.ceil(m.timeLeft);
  $('#round-label').textContent=`ROUND ${m.roundNumber} / 3　${m.playerRounds} : ${m.cpuRounds}`;
}
export function showCombatFeedback(side,kind){
  const node=$('#combat-feedback');const who=side==='player'?'P1':'P2';
  node.textContent=kind==='hit'?`${who}　被擊中！`:kind==='block'?`${who}　防禦成功！`:kind==='root'?`${who}　被老樹盤根纏住！`:`${who}　閃避成功！`;
  node.className=`combat-feedback ${kind} show`;
  void node.offsetWidth;
}
export function showMoveName(side,tier,charId){
  const profile=rosterById(charId);
  const moveName=tier==='ult'?profile.ult:tier==='skill'?profile.skill:profile.basic;
  const callout=$('#move-callout');
  callout.className='move-callout '+(side==='player'?'player-move':'cpu-move');
  $('#move-callout-type').textContent=(side==='player'?'PLAYER':'CPU')+' · '+(tier==='ult'?'必殺技':tier==='skill'?'特殊招式':'普通攻擊');
  $('#move-callout-name').textContent=moveName;
  void callout.offsetWidth;
  callout.classList.add('show');
}
