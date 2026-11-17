import {$} from '../utils/dom.js';
import {roster} from '../roster.js';
import {initPreview} from './preview.js';

const SIDE_LABEL={player:'P1 我方',cpu:'P2 對手 CPU'};
let active='player';
const picked={player:null,cpu:null};
const locked={player:false,cpu:false};
let preview,onEnter=()=>{};
let net=null;   // online match: {local,remote,send}; each seat only picks its own fighter

const other=s=>s==='player'?'cpu':'player';
function refreshPickUI(){
  $('#pick-player').classList.toggle('active',active==='player');
  $('#pick-cpu').classList.toggle('active',active==='cpu');
  $('#pick-hint').textContent=net?`線上對戰：你是 ${SIDE_LABEL[net.local].replace(' 對手 CPU','')}${locked[net.local]?'（已鎖定，等待對方）':''}${locked[net.remote]?'・對方已鎖定':''}`:`目前選擇：${SIDE_LABEL[active]}${locked[active]?'（已鎖定，點角色可重選）':''}`;
  for(const s of ['player','cpu'])$('#pick-'+s).disabled=!!net&&s!==net.local;
  preview.setActive(active);
  $('#roster-list').querySelectorAll('[data-roster]').forEach(card=>{
    const id=card.dataset.roster,p=picked.player?.id===id,c=picked.cpu?.id===id;
    card.classList.toggle('player-picked',p);card.classList.toggle('cpu-picked',c);card.classList.toggle('selected',p||c);
    card.classList.toggle('locked',(p&&locked.player)||(c&&locked.cpu));
    card.setAttribute('aria-pressed',String(p||c));
    card.querySelector('.roster-check').textContent=(p?'P1 ':'')+(c?'P2':'');
  });
  for(const s of ['player','cpu'])$('#preview-name-'+s).textContent=`${s==='player'?'P1':'P2'}：${picked[s]?picked[s].name:'尚未選擇'}${locked[s]?' ✓':''}`;
  const btn=$('#lock-button');
  btn.disabled=!picked[active]||locked[active];
  btn.textContent=!picked[active]?`請為 ${SIDE_LABEL[active]} 選擇角色`:locked[active]?'已鎖定，等待另一方':`鎖定 ${SIDE_LABEL[active]}：${picked[active].name}`;
  $('#roster-detail').innerHTML=['player','cpu'].map(s=>{const r=picked[s];return r?`<span><i>${s==='player'?'P1':'P2'}</i> <b style="display:inline">${r.name}</b>　J ${r.basic}・K ${r.skill}・L ${r.ult}・I ${r.defense}</span>`:`<span><i>${s==='player'?'P1':'P2'}</i> 尚未選擇</span>`;}).join('');
}
// Show the chosen fighters' names on the battle HUD.
function applyHud(side,profile){
  const k=side==='player'?'player':'cpu';
  $('#'+k+'-icon').textContent=profile.icon;$('#'+k+'-name').textContent=profile.name;
  if(side===(net?net.local:'player')){$('#skill-basic').textContent=profile.basic;$('#skill-special').textContent=profile.skill;$('#skill-ultimate').textContent=profile.ult;$('#skill-defense').textContent=profile.defense;}
  if(side==='player')$('#player-style').textContent=profile.style;
}
function renderRoster(){
  const list=$('#roster-list');
  list.innerHTML=roster.map(r=>`<button class="roster-card" data-roster="${r.id}" aria-pressed="false"><span class="roster-avatar" style="--fighter:${'#'+r.primary.toString(16).padStart(6,'0')}">${r.icon}</span><span class="roster-copy"><b>${r.name}</b><small>${r.code}</small><small class="policy-symbols" aria-label="角色意象">${r.symbols||r.style}</small></span><span class="roster-check"></span></button>`).join('');
  list.querySelectorAll('[data-roster]').forEach(button=>button.addEventListener('click',()=>{
    const profile=roster.find(r=>r.id===button.dataset.roster);
    if(!profile)return;
    picked[active]=profile;locked[active]=false;preview.show(active,profile);   // preview updates immediately
    net?.send({t:'pick',id:profile.id,locked:false});
    refreshPickUI();
  }));
}
function enterBattle(){
  applyHud('player',picked.player);applyHud('cpu',picked.cpu);
  onEnter(picked.player,picked.cpu);
}
// Call when returning to the select screen: both sides must lock in again.
export function resetLocks(){locked.player=locked.cpu=false;active=net?net.local:'player';refreshPickUI();}
// Switch between vs-CPU (net=null) and online (net={local,remote,send}).
export function setNetMode(n){net=n;locked.player=locked.cpu=false;active=n?n.local:'player';refreshPickUI();}
// The peer picked / locked a fighter.
export function setRemotePick(id,isLocked){
  if(!net)return;
  const profile=roster.find(r=>r.id===id);if(!profile)return;
  picked[net.remote]=profile;locked[net.remote]=!!isLocked;preview.show(net.remote,profile);refreshPickUI();
  if(locked.player&&locked.cpu)enterBattle();
}
export function initRosterPicker(enterCallback){
  onEnter=enterCallback;
  preview=initPreview($('#preview'));
  for(const s of ['player','cpu'])$('#pick-'+s).addEventListener('click',()=>{active=s;locked[s]=false;refreshPickUI();});
  $('#lock-button').addEventListener('click',()=>{
    if(!picked[active])return;
    locked[active]=true;
    net?.send({t:'pick',id:picked[active].id,locked:true});
    if(locked.player&&locked.cpu){refreshPickUI();enterBattle();return;}
    if(!net)active=other(active);
    refreshPickUI();
  });
  renderRoster();refreshPickUI();
}

export const currentPick=side=>picked[side];
