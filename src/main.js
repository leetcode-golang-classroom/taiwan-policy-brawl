import './style.css';
import {World} from './ecs/world.js';
import {createFighter,fighterOf} from './ecs/entities.js';
import {roster,fighterParams} from './roster.js';
import {makeFighter} from './characters/makeFighter.js';
import {scene,initResize} from './scene.js';
import {syncView} from './presentation/renderSync.js';
import {initRosterPicker,resetLocks} from './ui/rosterPicker.js';
import {initInput} from './input/domInput.js';
import {initGame} from './game.js';
import {showScreen} from './ui/screens.js';
import {resetRound} from './systems/roundSystem.js';
import {$} from './utils/dom.js';

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
initResize();
// Both sides locked in on the select screen -> apply the picks and switch to the battle screen.
initRosterPicker((p1,p2)=>{swapFighter('player',p1);swapFighter('cpu',p2);resetRound(world);world.events.emit('ready');showScreen('battle');});
$('#back-button').addEventListener('click',()=>{
  const m=world.match;m.running=false;m.roundTransition=0;m.ended=false;resetRound(world);m.running=false;   // stop the match
  resetLocks();showScreen('select');
});
showScreen('select');
initGame(world,initInput(world));
if(location.search.includes('debug'))window.__PB={world};   // test hook: ?debug
