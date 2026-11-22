import {scene,camera,renderer,mount,updateCamera} from './scene.js';
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
  let last=0;
  function loop(now){
    requestAnimationFrame(loop);
    const dt=Math.min((now-last)/1000,.04);last=now;
    stepWorld(world,dt,keys);   // hit stop is per fighter inside the logic step (status.hitStop); UI/clock/cooldowns keep running
    const frozen=world.query('status').some(id=>world.get(id,'status').frozen);
    syncViews(world);updateAnimations(world,dt);updateVfx(frozen?0:dt);updateEventVfx();updateDefenseView(dt);   // hit effects hold still with the fighters
    updateHud(world);updateComboCounter();updateCamera(world,dt);
    if(mount.clientWidth>0)renderer.render(scene,camera);   // battle screen hidden: skip drawing
  }
  updateHud(world);requestAnimationFrame(loop);
}
