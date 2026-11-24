import './style.css';
import {World} from './ecs/world.js';
import {createFighter,fighterOf} from './ecs/entities.js';
import {roster,fighterParams} from './roster.js';
import {makeFighter} from './characters/makeFighter.js';
import {scene,initResize} from './scene.js';
import {syncView} from './presentation/renderSync.js';
import {initRosterPicker,resetLocks,setNetMode,setRemotePick,currentPick} from './ui/rosterPicker.js';
import {initNetUI} from './net/ui.js';
import {startNetSession} from './net/netplay.js';
import {initInput} from './input/domInput.js';
import {initGame} from './game.js';
import {showScreen} from './ui/screens.js';
import {resetRound} from './systems/roundSystem.js';
import {$} from './utils/dom.js';
import {initSfxControls} from './ui/sfxControls.js';

const world=new World();
createFighter(world,{side:'player',...fighterParams(roster[0]),view:makeFighter(roster[0])});
createFighter(world,{side:'cpu',...fighterParams(roster[1]),view:makeFighter(roster[1])});

// Character picker: swap the logic parameters and the 3D model of one side.
function swapFighter(side,profile){
  const id=fighterOf(world,side),p=fighterParams(profile);
  scene.remove(world.get(id,'view').obj);
  world.get(id,'view').obj=makeFighter(profile);
  Object.assign(world.get(id,'fighter'),{charId:p.charId});
  Object.assign(world.get(id,'body'),{moveSpeed:p.moveSpeed,jumpPower:p.jumpPower});
  syncView(world,id);
}
initResize();initSfxControls();
// Both sides locked in on the select screen -> apply the picks and switch to the battle screen.
initRosterPicker((p1,p2)=>{swapFighter('player',p1);swapFighter('cpu',p2);resetRound(world);world.events.emit('ready');showScreen('battle');});
// Leave the battle screen back to character select (stops the match). `notify`: tell the online peer to do the same.
function leaveBattle(notify){
  if(notify)world.net?.send({t:'back'});
  const m=world.match;m.running=false;m.roundTransition=0;m.ended=false;resetRound(world);m.running=false;   // stop the match
  resetLocks();showScreen('select');
}
$('#back-button').addEventListener('click',()=>leaveBattle(true));
showScreen('select');
const keys=initInput(world);
initGame(world,keys);

// Mode: vs CPU (default) or online with a human over WebRTC (serverless signalling by code / QR).
let session=null,noteTimer=0;
const note=text=>{$('#net-state').textContent=text;clearTimeout(noteTimer);if(text&&!session)noteTimer=setTimeout(()=>$('#net-state').textContent='',6000);};
function setModeUI(online){
  $('#mode-cpu').classList.toggle('active',!online);$('#mode-online').classList.toggle('active',online);
  document.querySelector('.cpu-card .fighter-name small').textContent=online?'PLAYER 02 · 線上對手':'CPU · PLAYER 02';
  $('#net-state').textContent=online?`🟢 已連線｜你是 ${world.net?.local==='player'?'P1（左）':'P2（右）'}`:'';
}
const netUI=initNetUI({onConnect:(peer,role)=>{
  leaveBattle(false);
  session=startNetSession(world,peer,role,{
    getKeys:()=>keys,
    onMessage:m=>{if(m.t==='pick')setRemotePick(m.id,m.locked);else if(m.t==='back')leaveBattle(false);},
    onEnd:reason=>{session=null;setNetMode(null);setModeUI(false);leaveBattle(false);note(reason);},
  });
  setNetMode({local:world.net.local,remote:world.net.remote,send:m=>world.net?.send(m)});
  setModeUI(true);
  const mine=currentPick(world.net.local);if(mine)world.net.send({t:'pick',id:mine.id,locked:false});
}});
$('#mode-cpu').addEventListener('click',()=>{if(session)session.end('已切換為對戰電腦');});
$('#mode-online').addEventListener('click',()=>{if(session)return;note('');netUI.open();});
netUI.fromLink();   // opened via an invite link (#join=CODE)
if(location.search.includes('debug'))window.__PB={world};   // test hook: ?debug
