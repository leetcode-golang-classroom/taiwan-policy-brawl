import {scene,camera,renderer,updateCamera} from './scene.js';
import {stepWorld} from './systems/index.js';
import {syncViews} from './presentation/renderSync.js';
import {updateAnimations} from './presentation/animation.js';
import {initVfxEvents} from './presentation/vfxEvents.js';
import {updateVfx} from './vfx/VFXSystem.js';
import {updateHud} from './ui/hud.js';
import {initMessages} from './ui/messages.js';
import {initDamageNumbers} from './ui/damageNumbers.js';
import {initDefenseView} from './presentation/defenseView.js';
import {initComboCounter} from './ui/comboCounter.js';

// Main loop: logic step (ECS systems) -> presentation (sync, animation, effects, HUD, camera) -> render.
export function initGame(world,keys){
  initMessages(world);initDamageNumbers(world);
  const updateComboCounter=initComboCounter(world);
  const updateDefenseView=initDefenseView(world);
  const updateEventVfx=initVfxEvents(world);
  // Hit-stop: a few frames of frozen logic on a solid hit give impacts weight (visual feel only; no game rule depends on it).
  let hitStop=0;
  world.events.on('hit',e=>{if(e.amount>0)hitStop=Math.max(hitStop,e.skill.tier==='ult'?.09:e.launched?.06:.035);});
  let last=0;
  function loop(now){
    requestAnimationFrame(loop);
    const dt=Math.min((now-last)/1000,.04);last=now;
    if(hitStop>0)hitStop-=dt;else stepWorld(world,dt,keys);
    syncViews(world);updateAnimations(world,dt);updateVfx(dt);updateEventVfx();updateDefenseView(dt);
    updateHud(world);updateComboCounter();updateCamera(world,dt);
    renderer.render(scene,camera);
  }
  updateHud(world);requestAnimationFrame(loop);
}
