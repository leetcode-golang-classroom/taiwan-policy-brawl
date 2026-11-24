import {$} from '../utils/dom.js';
import {fighterOf} from '../ecs/entities.js';
import {rosterById} from '../roster.js';
import {startMatch} from '../systems/roundSystem.js';
import {requestStart} from '../net/netplay.js';

// Round / match overlay driven by logic events.
export function initMessages(world){
  const profileOf=side=>rosterById(world.get(fighterOf(world,side),'fighter').charId);
  const show=html=>{$('#message').classList.remove('hidden','compact');$('#message').innerHTML=html;};
  const who=w=>w==='player'?'玩家 1':world.net?'玩家 2':'玩家 2（CPU）';
  const begin=()=>{if(!requestStart(world))startMatch(world);};
  world.events.on('roundStart',()=>$('#message').classList.add('hidden'));
  world.events.on('roundEnd',e=>{show(`<strong>第 ${e.roundNumber} 回合結束！</strong><span>${who(e.winner)} 拿下本回合 · ${e.reason}</span><span>目前戰績 ${e.playerRounds} : ${e.cpuRounds}　準備下一回合…</span>`);$('#message').classList.add('compact');});
  // Match result: a compact MATCH WIN banner (the arena stays visible) while the winner celebrates; Rematch / back appear when the pose is held.
  let result='';
  world.events.on('matchEnd',e=>{
    const win=profileOf(e.winner),lose=profileOf(e.winner==='player'?'cpu':'player');
    result=`<strong>MATCH WIN</strong><b class="winner-name">${win.name} 獲得總冠軍！</b><span>🏆 ${who(e.winner)}｜${win.code}　比分 ${e.playerRounds} : ${e.cpuRounds}</span><span>${e.reason} · 擊敗 ${lose.name}</span>`;
    show(result);$('#message').classList.add('compact');
  });
  world.events.on('victoryEnd',()=>{
    show(`${result}<div class="result-buttons"><button id="restart-button">再戰一場（Rematch）</button><button id="select-button" class="secondary">回選角畫面</button></div>`);
    $('#message').classList.add('compact');
    $('#restart-button').addEventListener('click',begin);
    $('#select-button').addEventListener('click',()=>$('#back-button').click());
  });
  world.events.on('roundStart',()=>$('#message').classList.remove('compact'));
  const ready=()=>{show('<strong>READY?</strong><span>角色已就位，按下開始對戰！</span><button id="start-button">開始對戰</button>');$('#start-button').addEventListener('click',begin);};
  world.events.on('ready',ready);ready();
}
