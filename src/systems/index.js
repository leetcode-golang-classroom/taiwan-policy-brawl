import {statusSystem} from './statusSystem.js';
import {aiControl} from './aiControl.js';
import {actionSystem} from './actionSystem.js';
import {movementSystem} from './movementSystem.js';
import {dashSystem,chaseSystem} from './combatSystem.js';
import {projectileSystem} from './projectileSystem.js';
import {physicsSystem} from './physicsSystem.js';
import {roundSystem} from './roundSystem.js';
import {defenseSystem} from './defenseSystem.js';
import {fighterStateSystem} from './fighterStateSystem.js';
import {comboSystem} from './comboSystem.js';
import {playerControl} from './playerControl.js';

// One logic tick. Order: timers -> control (intents) -> actions -> movement -> combat -> physics -> round rules.
export function stepWorld(world,dt,keys={}){
  statusSystem(world,dt);
  playerControl(world,keys);
  aiControl(world,dt);
  defenseSystem(world,dt);
  actionSystem(world,dt);
  movementSystem(world,dt);
  dashSystem(world,dt);
  chaseSystem(world,dt);
  projectileSystem(world,dt);
  physicsSystem(world,dt);
  roundSystem(world,dt);
  comboSystem(world);
  fighterStateSystem(world);
}
