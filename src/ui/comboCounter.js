import {$} from '../utils/dom.js';

// Combo HUD (PHASE 11). Pure view: the combo itself is tracked in systems/comboSystem.js ('combo' / 'comboEnd' events).
// Shows "N HIT" + total damage; pops on every new hit, gets bigger at 5+ / 8+ hits, fades out after the combo ends (CSS delay).
export function initComboCounter(world){
  const sideOf=id=>world.get(id,'fighter').side;
  world.events.on('combo',e=>{
    const el=$('#combo-counter-'+sideOf(e.attackerId));
    el.innerHTML=`<b>${e.hits}</b> HIT${e.hits>=5?' COMBO':''}<small>總傷害 ${e.damage}</small>`;
    el.classList.add('show');
    el.classList.toggle('big',e.hits>=5);el.classList.toggle('mega',e.hits>=8);
    el.classList.remove('pop');void el.offsetWidth;el.classList.add('pop');   // restart the pop animation
  });
  world.events.on('comboEnd',e=>$('#combo-counter-'+sideOf(e.attackerId)).classList.remove('show'));
  world.events.on('roundStart',()=>{for(const k of ['player','cpu'])$('#combo-counter-'+k).classList.remove('show','big','mega');});
  return ()=>{};   // nothing to poll: the logic layer owns the timing
}
