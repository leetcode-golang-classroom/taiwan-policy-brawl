import {skillMech} from './mech.js';
import {skillLeopard} from './leopard.js';
import {skillAdmiral} from './admiral.js';
import {skillMage} from './mage.js';
import {skillCleric} from './cleric.js';
import {skillBrawler} from './brawler.js';
import {skillYu} from './yu.js';
import {skillNun} from './nun.js';
import {skillBubble} from './bubble.js';
import {createSkillContext} from './context.js';
const handlers={'mech':skillMech,'leopard':skillLeopard,'admiral':skillAdmiral,'mage':skillMage,'cleric':skillCleric,'brawler':skillBrawler,'nun':skillNun,'yu':skillYu,'bubble':skillBubble};
export function signatureUltimate(fighter,target,type,sink=[]){
  const ctx=createSkillContext(fighter,target,sink);
  handlers[ctx.id]?.(ctx,type);
}
