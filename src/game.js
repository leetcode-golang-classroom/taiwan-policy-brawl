import {scene,camera,renderer,mount,updateCamera} from './scene.js';
import {stepWorld} from './systems/index.js';
import {syncViews} from './presentation/renderSync.js';
import {updateAnimations} from './presentation/animation.js';
import {initCombatAudio} from './audio/combatAudio.js';
import {initVfxEvents} from './presentation/vfxEvents.js';
import {updateVfx} from './vfx/VFXSystem.js';
import {updateHud} from './ui/hud.js';
import {initMessages} from './ui/messages.js';
import {initDamageNumbers} from './ui/damageNumbers.js';
import {initDefenseView} from './presentation/defenseView.js';
import {initComboCounter} from './ui/comboCounter.js';
import {SLOWMO} from './config.js';
import {initKoCinematic} from './presentation/koCinematic.js';
import {initVictory} from './presentation/victory.js';

// Main loop: logic step (ECS systems) -> presentation (sync, animation, effects, HUD, camera) -> render.
export function initGame(world,keys){
  initMessages(world);initDamageNumbers(world);
  const updateComboCounter=initComboCounter(world);
  const updateDefenseView=initDefenseView(world);
  const updateEventVfx=initVfxEvents(world);
  const updateCombatAudio=initCombatAudio(world);
  const ko=initKoCinematic(world),victory=initVictory(world);
  // Successful dodge by the local player: a brief slow-motion (presentation + logic share the scaled dt; skipped online to keep peers in step).
  let slow=0;
  world.events.on('evade',e=>{if(!world.net&&world.get(e.targetId,'fighter').side==='player')slow=SLOWMO.time;});
  let last=0;
  function loop(now){
    requestAnimationFrame(loop);
    let dt=Math.min((now-last)/1000,.04);last=now;
    if(world.match.phase!=='NORMAL_FIGHT')slow=0;   // the KO cinematic owns the time scale
    if(slow>0){slow-=dt;dt*=SLOWMO.scale;}
    // KO cinematic: only the fighters / physics / particles are scaled (per phase). The KO clock, HUD, round timer, audio and network keep real time.
    const sc=ko.scale(),ldt=dt*sc.logic;
    // A slow frame is split into equal sub-steps of <= 1/60 s so low FPS cannot skip a hit window or tunnel a projectile;
    // a fast display (60+ Hz) still runs exactly one step per frame, so motion stays smooth. Hit stop is per fighter inside the step.
    const n=Math.max(1,Math.ceil(ldt*60-1e-6));for(let i=0;i<n;i++){stepWorld(world,ldt/n,keys,dt/n);if(i===n-1)ko.record();}   // one replay frame per rendered frame
    ko.update();
    const frozen=world.query('status').some(id=>world.get(id,'status').frozen);
    syncViews(world);updateAnimations(world,dt*sc.anim);victory.update(dt);updateVfx(frozen?0:dt*sc.vfx);updateEventVfx();updateCombatAudio();updateDefenseView(dt);   // hit effects hold still with the fighters
    updateHud(world);updateComboCounter();updateCamera(world,dt);
    if(mount.clientWidth>0)renderer.render(scene,camera);   // battle screen hidden: skip drawing
  }
  updateHud(world);requestAnimationFrame(loop);
}
