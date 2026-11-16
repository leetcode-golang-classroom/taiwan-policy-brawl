import {$} from '../utils/dom.js';
import {roster} from '../roster.js';

let activePick='player';
let onSelect=()=>{};
const picked={player:roster[0],cpu:roster[1]};
function refreshPickUI(){
  $('#pick-player').classList.toggle('active',activePick==='player');
  $('#pick-cpu').classList.toggle('active',activePick==='cpu');
  $('#pick-hint').textContent=activePick==='player'?'目前選擇：我方角色':'目前選擇：對手 CPU';
  $('#roster-list').querySelectorAll('[data-roster]').forEach(card=>{
    const id=card.dataset.roster;
    card.classList.toggle('player-picked',picked.player.id===id);
    card.classList.toggle('cpu-picked',picked.cpu.id===id);
    card.classList.toggle('selected',picked.player.id===id||picked.cpu.id===id);
    card.setAttribute('aria-pressed',String(picked.player.id===id||picked.cpu.id===id));
    card.querySelector('.roster-check').textContent=(picked.player.id===id?'P1 ':'')+(picked.cpu.id===id?'P2':'');
  });
  $('#roster-detail').innerHTML=`<b>P1 我方：${picked.player.name}　VS　P2 對手：${picked.cpu.name}</b><span><i>意象</i> ${picked.player.symbols||picked.player.style}</span><span><i>意象</i> ${picked.cpu.symbols||picked.cpu.style}</span>`;
}
function replaceFighter(side,profile){
  const isPlayer=side==='player';
  picked[side]=profile;onSelect(side,profile);
  $('#'+(isPlayer?'player':'cpu')+'-icon').textContent=profile.icon;
  $('#'+(isPlayer?'player':'cpu')+'-name').textContent=profile.name;
  if(isPlayer){$('#skill-basic').textContent=profile.basic;$('#skill-special').textContent=profile.skill;$('#skill-ultimate').textContent=profile.ult;$('#skill-defense').textContent=profile.defense;$('#player-style').textContent=profile.style;}
  refreshPickUI();
}
function renderRoster(){
  const list=$('#roster-list');
  list.innerHTML=roster.map(r=>`<button class="roster-card" data-roster="${r.id}" aria-pressed="false"><span class="roster-avatar" style="--fighter:${'#'+r.primary.toString(16).padStart(6,'0')}">${r.icon}</span><span class="roster-copy"><b>${r.name}</b><small>${r.code}</small><small class="policy-symbols" aria-label="角色意象">${r.symbols||r.style}</small></span><span class="roster-check"></span></button>`).join('');
  list.querySelectorAll('[data-roster]').forEach(button=>button.addEventListener('click',()=>{
    const profile=roster.find(r=>r.id===button.dataset.roster);
    if(!profile)return;
    replaceFighter(activePick,profile);
    activePick=activePick==='player'?'cpu':'player';
    refreshPickUI();
  }));
}
export function initRosterPicker(selectCallback){
onSelect=selectCallback;
$('#pick-player').addEventListener('click',()=>{activePick='player';refreshPickUI();});
$('#pick-cpu').addEventListener('click',()=>{activePick='cpu';refreshPickUI();});
renderRoster();
refreshPickUI();
}
