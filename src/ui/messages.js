import {$} from '../utils/dom.js';
import {fighterOf} from '../ecs/entities.js';
import {rosterById} from '../roster.js';
import {startMatch} from '../systems/roundSystem.js';

// Round / match overlay driven by logic events.
export function initMessages(world){
  const profileOf=side=>rosterById(world.get(fighterOf(world,side),'fighter').charId);
  const show=html=>{$('#message').classList.remove('hidden');$('#message').innerHTML=html;};
  const who=w=>w==='player'?'玩家 1':'玩家 2（CPU）';
  world.events.on('roundStart',()=>$('#message').classList.add('hidden'));
  world.events.on('roundEnd',e=>show(`<strong>第 ${e.roundNumber} 回合結束！</strong><span>${who(e.winner)} 拿下本回合 · ${e.reason}</span><span>目前戰績 ${e.playerRounds} : ${e.cpuRounds}　準備下一回合…</span>`));
  world.events.on('matchEnd',e=>{
    const win=profileOf(e.winner),lose=profileOf(e.winner==='player'?'cpu':'player');
    show(`<strong>${win.name} 獲得總冠軍！</strong><span>🏆 ${who(e.winner)}｜${win.code}</span><span>三回合戰績 ${e.playerRounds} : ${e.cpuRounds} · ${e.reason} · 擊敗 ${lose.name}</span><button id="restart-button">重新開始三回合</button>`);
    $('#restart-button').addEventListener('click',()=>startMatch(world));
  });
  const ready=()=>{show('<strong>READY?</strong><span>角色已就位，按下開始對戰！</span><button id="start-button">開始對戰</button>');$('#start-button').addEventListener('click',()=>startMatch(world));};
  world.events.on('ready',ready);ready();
}
