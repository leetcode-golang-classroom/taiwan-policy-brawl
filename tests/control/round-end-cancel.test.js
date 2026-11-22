import test from 'node:test';
import assert from 'node:assert/strict';
import {endRound} from '../../src/systems/roundSystem.js';
import {pressAttack} from '../../src/systems/playerControl.js';
import {startedWorld,step,arrange} from '../helpers.js';

// Regression: a fighter caught mid-charge when the round/match ended kept charge+phase forever (actionSystem stops when
// the match is not running), so the charge halo hung in the air for the rest of the screen.
for(const [name,final] of [['round end',false],['match end',true]]){
  test(`${name} cancels an unfinished charge/attack so no charge visual is left floating`,()=>{
    const w=startedWorld({p:'brawler',c:'leopard'});arrange(w,{dist:3});
    pressAttack(w.world,'player','skill');step(w.world,.2);
    const a=w.world.get(w.player,'attacker');assert.ok(a.charge,'precondition: still charging');
    const m=w.world.match;if(final){m.playerRounds=1;m.cpuRounds=0;}
    endRound(w.world,'cpu','test');
    step(w.world,1);
    for(const id of [w.player,w.cpu]){
      const at=w.world.get(id,'attacker');
      assert.equal(at.charge,null);assert.equal(at.phase,'idle');assert.equal(at.attackTime,0);assert.equal(at.active,null);
    }
  });
}

// Regression: physicsSystem used to skip entirely when the match was not running, so a fighter airborne at the KO
// (launched, or mid-jump) hung in the air for the whole round transition and forever after the final round.
for(const [name,final] of [['round end',false],['match end',true]]){
  test(`${name}: a fighter airborne at the KO still falls and lands`,()=>{
    const w=startedWorld({p:'cleric',c:'leopard'});arrange(w,{dist:3});
    const t=w.world.get(w.player,'transform'),b=w.world.get(w.player,'body');
    t.y=2.5;b.grounded=false;b.vy=0;
    const m=w.world.match;if(final){m.playerRounds=1;m.cpuRounds=0;}
    endRound(w.world,'cpu','test');
    step(w.world,.2);assert.ok(t.y<2.5,'already falling: '+t.y);
    step(w.world,1.5);assert.equal(t.y,0);assert.equal(b.grounded,true);
  });
}
