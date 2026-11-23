import {$} from '../utils/dom.js';
import {startBgm,stopBgm} from '../audio/bgm.js';
// Two screens: 'select' (character pick + 3D preview) and 'battle'.
export function showScreen(name){
  $('#select-screen').hidden=name!=='select';
  $('#battle-screen').hidden=name!=='battle';
  $('#back-button').hidden=name!=='battle';
  if(name==='battle')startBgm();else stopBgm();
}
