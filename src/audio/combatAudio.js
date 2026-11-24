// Combat audio router: subscribes to the logic events on world.events and turns them into SFX events (SFX_EVENT).
// Nothing here changes gameplay and nothing uses timers: sounds fire on the same logic frame as the event
// (swing = `phase: strike`, hit = `hit`, release = `attackStart`, ...), so they line up with hit stop / knockback by construction.
// Online: both peers run the same simulation and emit the same events locally, so each event is voiced exactly once per peer
// (soundManager's per-sound cooldown additionally drops an accidental duplicate within 30-100 ms).
import { SFX_EVENT as E, SFX_RULES, CHARGE_LOOPS, COMBO_SWING_PITCH, paletteOf, idsFor } from './sfxConfig.js';
import * as realSound from './soundManager.js';

const rnd = ([a, b]) => a + Math.random() * (b - a);

export function initCombatAudio(world, sound = realSound) {   // `sound` is injectable so tests can record what would be played
  const { playVariant, loop, preload, stopAll } = sound;
  const charId = id => world.get(id, 'fighter')?.charId;
  const on = (n, f) => world.events.on(n, e => { try { f(e); } catch { /* audio must never break the game */ } });
  const loops = new Map();     // fighter id -> {handle, tier}
  const struckAt = new Map();  // fighter id -> world.time of the last strike cue (so attackStart can fall back if the strike frame was skipped)

  /** Voice one SFX event for a character. extra: {volMul, pitch, ids (override pool)} */
  function fire(event, cid, extra = {}) {
    const r = SFX_RULES[event]; if (!r) return null;   // event exists but has no sound by design
    const pool = extra.ids || paletteOf(cid)[r.field];
    return playVariant(pool, {
      volume: rnd(r.vol) * (extra.volMul ?? 1), pitch: extra.pitch ?? 1, pitchVar: r.pitchVar,
      priority: r.priority, cooldown: r.cooldown, delay: (r.delay || 0) + (extra.delay || 0),
    });
  }
  const preloadMatch = () => { const ids = [...world.query('fighter')].map(charId).filter(Boolean); preload(idsFor(ids)); };

  function stopLoop(id, fade) { const l = loops.get(id); if (!l) return; l.handle?.stop(fade ?? .08); loops.delete(id); }
  function stopAllLoops() { for (const id of [...loops.keys()]) stopLoop(id, .05); }

  // ---- charge (K / L): start cue + looping hum that rises with progress; stops on release, cancel, interrupt or round end ----
  on('chargeStart', e => {
    stopLoop(e.id);   // a new charge can start before update() noticed the previous one ended
    const cid = charId(e.id);
    if (e.tier === 'basic') { fire(E.ATTACK_START, cid); return; }
    const cfg = CHARGE_LOOPS[e.tier]; if (!cfg) return;
    fire(e.tier === 'ult' ? E.ULTIMATE_START : E.CHARGE_START, cid);
    const handle = loop(paletteOf(cid)[cfg.field][0], { volume: cfg.gain[0], pitch: cfg.rate[0], priority: e.tier === 'ult' ? 4 : 2 });
    if (handle) loops.set(e.id, { handle, tier: e.tier });
  });

  // ---- phase: `strike` is the arm-thrust frame just before the hit resolves ----
  on('phase', e => {
    if (e.phase !== 'strike') return;
    const a = world.get(e.id, 'attacker'), cid = charId(e.id);
    if (!a?.charge) return;   // dash attacks stay in `strike` after release: the cue already fired
    struckAt.set(e.id, world.time);
    stopLoop(e.id, .05);
    if (e.tier === 'basic') {
      const step = Math.min(3, a.charge.comboStep || a.comboStep || 1);
      fire(E.ATTACK_SWING, cid, { pitch: COMBO_SWING_PITCH[step - 1] });   // the whoosh; a whiff stops here (no hit sound follows)
    } else fire(E.CHARGE_FULL, cid);   // charge reached full: exactly once (phase only changes once per charge)
  });

  // ---- release: hitbox / projectile is created ----
  on('attackStart', e => {
    const cid = charId(e.attackerId), tier = e.tier;
    const struck = world.time - (struckAt.get(e.attackerId) ?? -9) < .3;
    struckAt.delete(e.attackerId);
    if (tier === 'basic') {
      if (!struck) { const a = world.get(e.attackerId, 'attacker'); fire(E.ATTACK_SWING, cid, { pitch: COMBO_SWING_PITCH[Math.min(3, a?.comboStep || 1) - 1] }); }
      if (e.projectileId != null) fire(E.SKILL_PROJECTILE, cid, { volMul: .8 });
      return;
    }
    if (tier === 'ult') { fire(E.ULTIMATE_RELEASE, cid); return; }
    fire(E.SKILL_START, cid);
    if (e.projectileId != null) fire(E.SKILL_PROJECTILE, cid);
  });

  // ---- impact: resolved hit (amount 0 = blocked / absorbed) ----
  on('hit', e => {
    const atk = charId(e.attackerId), vic = charId(e.targetId), tier = e.skill?.tier;
    if (e.perfect) { fire(E.PERFECT_GUARD, vic); return; }
    if (e.blocked) { fire(E.DEFENSE, vic, { pitch: tier === 'ult' ? .85 : 1 }); return; }
    if (e.reduced) fire(E.DEFENSE, vic, { volMul: .7 });   // partial guard still thuds
    if (!(e.amount > 0)) return;
    const heavy = e.launched || e.slam;
    if (tier === 'ult') {
      fire(E.ULTIMATE_IMPACT, atk); fire(E.ULTIMATE_EXPLOSION, atk);   // explosion is offset on the audio clock so the two layers do not share a frame
      fire(E.HIT_HEAVY, vic);
    } else if (tier === 'skill') {
      fire(E.SKILL_IMPACT, atk);
      if (heavy) fire(E.HEAVY_KNOCKBACK, vic); else fire(E.HIT_LIGHT, vic);
    } else {
      const step = world.get(e.attackerId, 'attacker')?.comboStep || 1;
      if (heavy || step >= 3) { fire(E.HEAVY_HIT, atk); if (e.launched) fire(E.HEAVY_KNOCKBACK, vic); }   // J3 launcher: heavier impact + knockback layer
      else { fire(E.ATTACK_HIT, atk, { pitch: step === 2 ? .96 : 1 }); fire(E.HIT_LIGHT, vic); }
    }
  });
  on('slamLand', e => fire(E.KNOCKDOWN, charId(e.targetId)));
  on('land', e => { if (e.hard) fire(E.KNOCKDOWN, charId(e.id), { volMul: .8 }); });
  on('defenseStart', e => fire(E.DEFENSE, charId(e.id), { volMul: .45, pitch: 1.25 }));   // shield-up cue
  on('roundStart', () => { stopAllLoops(); stopAll(.05); preloadMatch(); });
  on('roundEnd', () => { stopAllLoops(); });
  on('matchEnd', () => { stopAllLoops(); });
  preloadMatch();

  // per-frame: drive each loop with charge progress; stop it the moment the charge is gone (released / cancelled / interrupted)
  return function update() {
    for (const [id, l] of loops) {
      const a = world.get(id, 'attacker'), ch = a?.charge;
      if (!ch || ch.tier !== l.tier || a.phase === 'strike') { stopLoop(id, .06); continue; }
      const q = Math.min(1, ch.time / ch.duration), cfg = CHARGE_LOOPS[l.tier];
      l.handle.setRate(cfg.rate[0] + (cfg.rate[1] - cfg.rate[0]) * q);
      l.handle.setGain(cfg.gain[0] + (cfg.gain[1] - cfg.gain[0]) * q);
    }
  };
}
