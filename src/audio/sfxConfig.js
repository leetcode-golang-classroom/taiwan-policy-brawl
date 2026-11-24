// Combat SFX configuration: audio events, how each event is played (volume / pitch / priority), and the per-character palettes.
// Every id below is a key of combatSfxManifest.json (tests/control/sfx-config.test.js checks that each one exists on disk).
// Source of all audio: "150 Combat Sound Effects" (CC0) - see LICENSES/AUDIO.md.
import manifest from './combatSfxManifest.json' with { type: 'json' };

export const SFX_EVENT = Object.freeze({
  ATTACK_START: 'ATTACK_START', ATTACK_SWING: 'ATTACK_SWING', ATTACK_HIT: 'ATTACK_HIT', ATTACK_MISS: 'ATTACK_MISS',
  HEAVY_ATTACK: 'HEAVY_ATTACK', HEAVY_HIT: 'HEAVY_HIT', HEAVY_KNOCKBACK: 'HEAVY_KNOCKBACK',
  CHARGE_START: 'CHARGE_START', CHARGE_LOOP: 'CHARGE_LOOP', CHARGE_LEVEL: 'CHARGE_LEVEL', CHARGE_FULL: 'CHARGE_FULL', CHARGE_RELEASE: 'CHARGE_RELEASE',
  SKILL_START: 'SKILL_START', SKILL_PROJECTILE: 'SKILL_PROJECTILE', SKILL_IMPACT: 'SKILL_IMPACT', SKILL_EXPLOSION: 'SKILL_EXPLOSION',
  ULTIMATE_START: 'ULTIMATE_START', ULTIMATE_CHARGE: 'ULTIMATE_CHARGE', ULTIMATE_RELEASE: 'ULTIMATE_RELEASE', ULTIMATE_IMPACT: 'ULTIMATE_IMPACT', ULTIMATE_EXPLOSION: 'ULTIMATE_EXPLOSION',
  HIT_LIGHT: 'HIT_LIGHT', HIT_HEAVY: 'HIT_HEAVY', KNOCKDOWN: 'KNOCKDOWN', DEFENSE: 'DEFENSE', PERFECT_GUARD: 'PERFECT_GUARD',
});
const E = SFX_EVENT;

// event -> which character-palette field it plays, plus volume range, pitch variation (+-fraction), priority and per-sound cooldown (ms).
// Volumes follow the spec (basic .65-.80, heavy .85-1, skill .75-.90, ultimate .90-1, whiff .40-.65, defense .60-.80).
// `pitch` is a fixed playback-rate offset; `delay` is a layering offset on the audio clock (seconds), never a game-time guess.
// Events with no entry (ATTACK_START, ATTACK_MISS, HEAVY_ATTACK, CHARGE_RELEASE, SKILL_EXPLOSION) are emitted but intentionally silent:
// a whiff is just the swing without a hit sound, and release / start cues are carried by SKILL_START / ULTIMATE_RELEASE.
export const SFX_RULES = Object.freeze({
  [E.ATTACK_SWING]:       { field: 'attackSwingVariants', vol: [.42, .55], pitchVar: .03, priority: 1, cooldown: 50 },
  [E.ATTACK_HIT]:         { field: 'attackHitVariants',   vol: [.65, .80], pitchVar: .03, priority: 2, cooldown: 30 },
  [E.HEAVY_HIT]:          { field: 'heavyHitVariants',    vol: [.85, 1.0], pitchVar: .015, priority: 3, cooldown: 40 },
  [E.HEAVY_KNOCKBACK]:    { field: 'hitHeavy',            vol: [.50, .62], pitchVar: .015, priority: 3, cooldown: 80, delay: .03 },
  [E.HIT_LIGHT]:          { field: 'hitLight',            vol: [.26, .34], pitchVar: .03, priority: 1, cooldown: 30, delay: .012 },
  [E.HIT_HEAVY]:          { field: 'hitHeavy',            vol: [.50, .62], pitchVar: .015, priority: 3, cooldown: 80, delay: .02 },
  [E.KNOCKDOWN]:          { field: 'knockdown',           vol: [.60, .75], pitchVar: .02, priority: 3, cooldown: 200 },
  [E.CHARGE_START]:       { field: 'chargeStart',         vol: [.50, .60], pitchVar: .02, priority: 2, cooldown: 80 },
  [E.CHARGE_FULL]:        { field: 'chargeFull',          vol: [.65, .78], pitchVar: .02, priority: 2, cooldown: 120 },
  [E.SKILL_START]:        { field: 'skillStart',          vol: [.75, .88], pitchVar: .02, priority: 3, cooldown: 80 },
  [E.SKILL_PROJECTILE]:   { field: 'skillProjectile',     vol: [.70, .84], pitchVar: .02, priority: 3, cooldown: 60, delay: .04 },
  [E.SKILL_IMPACT]:       { field: 'skillImpact',         vol: [.78, .90], pitchVar: .02, priority: 3, cooldown: 40 },
  [E.ULTIMATE_START]:     { field: 'ultimateStart',       vol: [.90, 1.0], pitchVar: 0,   priority: 4, cooldown: 200 },
  [E.ULTIMATE_RELEASE]:   { field: 'ultimateRelease',     vol: [.92, 1.0], pitchVar: 0,   priority: 4, cooldown: 200 },
  [E.ULTIMATE_IMPACT]:    { field: 'ultimateImpact',      vol: [.92, 1.0], pitchVar: 0,   priority: 4, cooldown: 60 },
  [E.ULTIMATE_EXPLOSION]: { field: 'ultimateExplosion',   vol: [.90, 1.0], pitchVar: 0,   priority: 4, cooldown: 100, delay: .09 },
  [E.DEFENSE]:            { field: 'defense',             vol: [.60, .78], pitchVar: .03, priority: 2, cooldown: 60 },
  [E.PERFECT_GUARD]:      { field: 'perfectGuard',        vol: [.72, .80], pitchVar: 0,   priority: 4, cooldown: 100 },
});
// Looping charge sounds: volume and playback rate rise with charge progress q (0..1) -> CHARGE_LEVEL / ULTIMATE_CHARGE.
export const CHARGE_LOOPS = Object.freeze({
  skill: { field: 'chargeLoop',      gain: [.22, .55], rate: [.85, 1.30] },
  ult:   { field: 'ultimateCharge',  gain: [.30, .75], rate: [.80, 1.20] },
});
// J combo: pitch of the swing per step (so the three swings are audibly different), step 3 is the launcher.
export const COMBO_SWING_PITCH = [1, 1.07, .9];

const SHARED = {   // fallback palette (every roster character overrides most of it)
  attackSwingVariants: ['wind_1', 'heal_15'],
  attackHitVariants: ['heal_5', 'ice_1', 'water_3'],
  heavyHitVariants: ['water_1', 'fire_3', 'earth_2'],
  chargeStart: ['heal_15'], chargeLoop: ['loop_magic_11'], chargeFull: ['zap_energy'],
  skillStart: ['zap_heavy'], skillProjectile: ['zap_energy', 'wind_1'], skillImpact: ['lightning_3', 'fire_3'],
  ultimateStart: ['zap_power'], ultimateCharge: ['loop_charge_12'], ultimateRelease: ['lightning_1'], ultimateImpact: ['fire_1'], ultimateExplosion: ['earth_2'],
  defense: ['impact_1', 'impact_2'], perfectGuard: ['heal_15'],
  hitLight: ['heal_5', 'heal_15'], hitHeavy: ['earth_2', 'water_1'], knockdown: ['blast_3'],
};
const P = o => Object.freeze({ ...SHARED, ...o });   // a palette overrides only what is character-specific; the rest uses the shared sounds

// Keys are roster ids (src/roster.js). Comment = roster code / name / theme.
export const CHARACTER_SFX = Object.freeze({
  mech: P({   // 01 AI 推廣者: tech / electronic
    // J is a soft magic sound (the knife / punch samples were too harsh): airy wind swing, water / ice / healing-spell hits
    attackSwingVariants: ['wind_1', 'heal_15'], attackHitVariants: ['heal_5', 'ice_1', 'water_3', 'zap_energy'], heavyHitVariants: ['water_1', 'fire_3', 'heal_10'], hitLight: ['heal_5', 'heal_15'],
    chargeLoop: ['loop_magic_11'], chargeStart: ['heal_15'], chargeFull: ['heal_15'],   // K: magic charge hum -> magic cast
    skillStart: ['heal_2'], skillProjectile: ['wind_1', 'zap_energy'], skillImpact: ['ice_1', 'water_3', 'fire_3'],
    ultimateStart: ['heal_10'], ultimateCharge: ['loop_charge_12'], ultimateRelease: ['lightning_1'], ultimateImpact: ['fire_1'], ultimateExplosion: ['lightning_3'],
    defense: ['impact_1', 'small_2'], perfectGuard: ['zap_power'],
  }),
  leopard: P({   // 02 大樹守護者: wild / roots / flood
    // J: nature magic (wind swing; plant / earth / water hits)
    attackSwingVariants: ['wind_1', 'heal_15'], attackHitVariants: ['plant_2', 'earth_4', 'water_3', 'heal_5'], heavyHitVariants: ['earth_2', 'water_1', 'plant_2'], hitLight: ['heal_5', 'heal_15'],
    chargeLoop: ['loop_magic_11'], chargeStart: ['plant_2'], chargeFull: ['zap_energy'],
    skillStart: ['earth_2'], skillProjectile: ['plant_2'], skillImpact: ['earth_4', 'plant_2'],
    ultimateStart: ['water_3'], ultimateCharge: ['loop_charge_12'], ultimateRelease: ['water_1'], ultimateImpact: ['water_1'], ultimateExplosion: ['earth_2'],
    defense: ['impact_2', 'small_1'], perfectGuard: ['wind_1'],
  }),
  admiral: P({   // 03 麻將大叔: comedic table magic (no tile sounds in the pack); every attack is a spell sound
    attackSwingVariants: ['wind_1', 'heal_15'], attackHitVariants: ['ice_1', 'water_3', 'zap_energy', 'heal_5'], heavyHitVariants: ['lightning_1', 'water_1', 'earth_2'], hitLight: ['heal_5', 'heal_15'],
    chargeLoop: ['loop_magic_11'], chargeStart: ['heal_15'], chargeFull: ['zap_electro'],
    skillStart: ['heal_2'], skillProjectile: ['wind_1', 'zap_energy'], skillImpact: ['ice_1', 'lightning_3', 'water_3'],
    ultimateStart: ['heal_10'], ultimateCharge: ['loop_charge_12'], ultimateRelease: ['lightning_1'], ultimateImpact: ['fire_1'], ultimateExplosion: ['lightning_3'],
    defense: ['small_3', 'impact_1'], perfectGuard: ['glass_1'],
  }),
  mage: P({   // 04 教育推廣者: magic / books
    attackSwingVariants: ['wind_1', 'heal_15'], attackHitVariants: ['heal_5', 'ice_1', 'zap_energy', 'water_3'], heavyHitVariants: ['water_1', 'ice_1', 'lightning_3'], hitLight: ['heal_5', 'heal_15'],
    chargeLoop: ['loop_magic_11'], chargeStart: ['heal_15'], chargeFull: ['heal_15'],
    skillStart: ['heal_5'], skillProjectile: ['zap_energy'], skillImpact: ['ice_1', 'heal_5'],
    ultimateStart: ['heal_10'], ultimateCharge: ['loop_charge_12'], ultimateRelease: ['lightning_1'], ultimateImpact: ['lightning_3'], ultimateExplosion: ['wind_1'],
    defense: ['impact_1', 'small_1'], perfectGuard: ['heal_5'],
  }),
  cleric: P({   // 05 神職人員: holy / fire spells
    attackSwingVariants: ['heal_15', 'wind_1'], attackHitVariants: ['heal_5', 'heal_2', 'fire_3', 'heal_10'], heavyHitVariants: ['fire_1', 'heal_10', 'fire_3'], hitLight: ['heal_5', 'heal_15'],
    chargeLoop: ['loop_magic_11'], chargeStart: ['heal_15'], chargeFull: ['heal_15'],
    skillStart: ['heal_2'], skillProjectile: ['zap_energy'], skillImpact: ['fire_3', 'heal_5'],
    ultimateStart: ['heal_10'], ultimateCharge: ['loop_magic_11'], ultimateRelease: ['lightning_1'], ultimateImpact: ['fire_1'], ultimateExplosion: ['fire_3'],
    defense: ['impact_1', 'impact_2'], perfectGuard: ['heal_15'],
  }),
  brawler: P({   // 06 肌肉大叔: earth / fire / lightning spells
    attackSwingVariants: ['wind_1', 'heal_15'], attackHitVariants: ['earth_4', 'fire_3', 'earth_2', 'lightning_3'], heavyHitVariants: ['earth_2', 'fire_1', 'lightning_1'], hitLight: ['heal_5', 'heal_15'],
    chargeStart: ['heal_15'], chargeLoop: ['loop_magic_11'],
    skillStart: ['earth_2'], skillProjectile: ['wind_1'], skillImpact: ['fire_3', 'earth_4', 'lightning_3'],
    ultimateStart: ['earth_2'], ultimateCharge: ['loop_charge_12'], ultimateRelease: ['lightning_1'], ultimateImpact: ['fire_1'], ultimateExplosion: ['earth_4'],
    defense: ['impact_2', 'punch_m0'], perfectGuard: ['break_1'],
  }),
  nun: P({   // 07 都更拆遷王 (光明使者): every attack is a spell sound (lightning / fire / wind / earth)
    attackSwingVariants: ['wind_1', 'heal_15'], attackHitVariants: ['lightning_3', 'fire_3', 'earth_4', 'zap_energy'], heavyHitVariants: ['lightning_1', 'fire_1', 'earth_2'], hitLight: ['heal_5', 'heal_15'],
    chargeLoop: ['loop_magic_11'], chargeStart: ['heal_15'], chargeFull: ['zap_electro'],
    skillStart: ['zap_heavy'], skillProjectile: ['wind_1', 'zap_energy'], skillImpact: ['lightning_3', 'fire_3'],
    ultimateStart: ['zap_power'], ultimateCharge: ['loop_charge_12'], ultimateRelease: ['lightning_1'], ultimateImpact: ['fire_1'], ultimateExplosion: ['lightning_3'],
    defense: ['impact_1', 'impact_2'], perfectGuard: ['zap_electro'],
  }),
  yu: P({   // 08 工程總指揮: earth / lightning spells
    attackSwingVariants: ['wind_1', 'heal_15'], attackHitVariants: ['lightning_3', 'ice_1', 'earth_4', 'zap_energy'], heavyHitVariants: ['earth_2', 'lightning_1', 'fire_1'], hitLight: ['heal_5', 'heal_15'],
    chargeStart: ['heal_15'], chargeLoop: ['loop_magic_11'],
    skillStart: ['zap_heavy'], skillProjectile: ['zap_energy', 'wind_1'], skillImpact: ['earth_4', 'lightning_3'],
    ultimateStart: ['zap_power'], ultimateCharge: ['loop_charge_12'], ultimateRelease: ['lightning_1'], ultimateImpact: ['fire_1'], ultimateExplosion: ['earth_2'],
    defense: ['impact_1', 'break_2'], perfectGuard: ['glass_1'],
  }),
  bubble: P({   // 09 家庭計畫推廣員: cute / light spells
    attackSwingVariants: ['wind_1', 'heal_15'], attackHitVariants: ['heal_5', 'heal_2', 'water_3', 'heal_15'], heavyHitVariants: ['heal_10', 'water_1', 'ice_1'], hitLight: ['heal_5', 'heal_15'],
    chargeLoop: ['loop_magic_11'], chargeStart: ['heal_15'], chargeFull: ['heal_15'],
    skillStart: ['heal_15'], skillProjectile: ['zap_energy'], skillImpact: ['heal_5', 'water_3'],
    ultimateStart: ['heal_10'], ultimateCharge: ['loop_charge_12'], ultimateRelease: ['water_1'], ultimateImpact: ['water_1', 'heal_10'], ultimateExplosion: ['ice_1'],
    defense: ['small_2', 'impact_1'], perfectGuard: ['heal_5'],
  }),
});

export const paletteOf = charId => CHARACTER_SFX[charId] || SHARED;
/** Every sound id a set of characters can play (used to preload only what the match needs). */
export function idsFor(charIds) {
  const ids = new Set();
  for (const c of charIds) for (const v of Object.values(paletteOf(c))) for (const id of v) ids.add(id);
  return [...ids].filter(id => manifest[id]);
}
