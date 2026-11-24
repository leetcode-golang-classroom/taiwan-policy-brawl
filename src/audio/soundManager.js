// SFX engine (Web Audio). Presentation layer only: it never touches game state and never throws into the game loop.
//  - AudioContext is created / resumed from a user gesture (browser autoplay rules); decoding starts at the first preload().
//  - Buffers are fetched + decoded once and cached; play() on a not-yet-loaded sound is a silent no-op (never delays combat).
//  - Per-sound cooldown, a global voice limit with priority stealing, random variants (no immediate repeat) and pitch variation.
//  - Volume / mute are persisted in localStorage, separate from the BGM settings (audio/bgm.js).
import manifest from './combatSfxManifest.json' with { type: 'json' };

const KEY = 'pb.sfx.v1', MAX_VOICES = 20, DEFAULT_VOL = .8;
export const sfxState = { volume: DEFAULT_VOL, muted: false };
try {
  const s = JSON.parse(localStorage.getItem(KEY) || '{}');
  if (typeof s.muted === 'boolean') sfxState.muted = s.muted;
  if (Number.isFinite(s.volume)) sfxState.volume = Math.min(1, Math.max(0, s.volume));
} catch { /* storage unavailable: defaults */ }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(sfxState)); } catch { /* ignore */ } };

export const sfxUrl = id => {
  const e = manifest[id];
  return e ? `${import.meta.env?.BASE_URL ?? '/'}audio/combat/${e.dir}/${encodeURIComponent(e.src.split('/').pop())}` : null;
};

let ctx = null, master = null;
const buffers = new Map(), loading = new Map(), cooldowns = new Map(), lastVariant = new Map();
const voices = new Set();   // {src, gain, priority, t0}
const listeners = new Set();

function ensureContext() {
  if (ctx) return ctx;
  const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!AC) return null;
  try {
    ctx = new AC({ latencyHint: 'interactive' });
    const comp = ctx.createDynamicsCompressor();   // layered hits must not clip
    comp.threshold.value = -10; comp.knee.value = 12; comp.ratio.value = 4; comp.attack.value = .003; comp.release.value = .12;
    master = ctx.createGain(); master.gain.value = sfxState.muted ? 0 : sfxState.volume;
    master.connect(comp); comp.connect(ctx.destination);
  } catch { ctx = null; }
  return ctx;
}

/** Call from a user gesture. Safe to call repeatedly. */
export function unlockAudio() {
  const c = ensureContext();
  if (c && c.state !== 'running') c.resume().catch(() => {});
  return !!c;
}
if (typeof window !== 'undefined') {
  for (const ev of ['pointerdown', 'keydown', 'touchend']) window.addEventListener(ev, unlockAudio, { passive: true });
}

/** Fetch + decode these sound ids (once). Resolves when finished; failures are swallowed (the sound just stays silent). */
export function preload(ids) {
  const c = ensureContext();
  if (!c) return Promise.resolve();
  return Promise.all([...new Set(ids)].map(id => {
    if (buffers.has(id) || loading.has(id) || !manifest[id]) return null;
    const p = fetch(sfxUrl(id)).then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
      .then(ab => new Promise((ok, no) => c.decodeAudioData(ab, ok, no)))
      .then(buf => { buffers.set(id, buf); })
      .catch(() => {}).finally(() => loading.delete(id));
    loading.set(id, p); return p;
  }));
}

function reserveVoice(priority) {
  if (voices.size < MAX_VOICES) return true;
  let victim = null;   // steal the quietest-priority, oldest voice, but never one that outranks the newcomer
  for (const v of voices) if (v.priority <= priority && (!victim || v.priority < victim.priority || (v.priority === victim.priority && v.t0 < victim.t0))) victim = v;
  if (!victim) return false;
  stopVoice(victim, .02); return true;
}
function stopVoice(v, fade = .05) {
  if (!voices.delete(v)) return;
  try {
    const t = ctx.currentTime;
    v.gain.gain.cancelScheduledValues(t); v.gain.gain.setValueAtTime(v.gain.gain.value, t); v.gain.gain.linearRampToValueAtTime(0, t + fade);
    v.src.stop(t + fade + .01);
  } catch { /* already stopped */ }
}

/**
 * Play one sound. opts: volume (0..1), pitch (playbackRate, 1 = original), pitchVar (± fraction), cooldown (ms, per sound id),
 * priority (higher survives voice stealing), delay (s, on the audio clock: layering offset, not a gameplay timer).
 * Returns a handle {stop()} or null when skipped (muted, not loaded, cooling down, voices full).
 */
export function play(id, opts = {}) {
  try {
    if (!ctx || sfxState.muted || sfxState.volume <= 0) return null;
    const buf = buffers.get(id); if (!buf) return null;
    const now = performance.now(), cd = opts.cooldown ?? 40;
    if (now - (cooldowns.get(id) ?? -1e9) < cd) return null;   // also dedupes the same event arriving twice (online)
    const priority = opts.priority ?? 1;
    if (!reserveVoice(priority)) return null;
    cooldowns.set(id, now);
    const src = ctx.createBufferSource(), gain = ctx.createGain();
    src.buffer = buf;
    src.playbackRate.value = (opts.pitch ?? 1) * (1 + (Math.random() * 2 - 1) * (opts.pitchVar ?? 0));
    gain.gain.value = opts.volume ?? 1;
    src.connect(gain); gain.connect(master);
    const v = { src, gain, priority, t0: now };
    voices.add(v);
    src.onended = () => { voices.delete(v); try { src.disconnect(); gain.disconnect(); } catch { /* ignore */ } };
    src.start(ctx.currentTime + (opts.delay || 0));
    return { stop: fade => stopVoice(v, fade) };
  } catch { return null; }
}

/** Pick one of `ids` at random, never the same as the previous pick for that pool (when there is a choice). */
export function pickVariant(ids) {
  if (!ids?.length) return null;
  if (ids.length === 1) return ids[0];
  const poolKey = ids.join('|'), last = lastVariant.get(poolKey);
  let id; do { id = ids[(Math.random() * ids.length) | 0]; } while (id === last);
  lastVariant.set(poolKey, id); return id;
}
export const playVariant = (ids, opts) => { const id = pickVariant(ids); return id ? play(id, opts) : null; };

/**
 * Looping sound (charge). Returns {setRate, setGain, stop} or null. stop() fades out and releases the voice.
 * The loop is one-per-owner by the caller's design; it uses the shared voice limit at high priority.
 */
export function loop(id, opts = {}) {
  try {
    if (!ctx || sfxState.muted || sfxState.volume <= 0) return null;
    const buf = buffers.get(id); if (!buf || !reserveVoice(opts.priority ?? 2)) return null;
    const src = ctx.createBufferSource(), gain = ctx.createGain(), t = ctx.currentTime;
    src.buffer = buf; src.loop = true; src.playbackRate.value = opts.pitch ?? 1;
    gain.gain.setValueAtTime(0, t); gain.gain.linearRampToValueAtTime(opts.volume ?? 1, t + (opts.fadeIn ?? .04));
    src.connect(gain); gain.connect(master);
    const v = { src, gain, priority: opts.priority ?? 2, t0: performance.now() };
    voices.add(v); src.start(t);
    src.onended = () => { voices.delete(v); try { src.disconnect(); gain.disconnect(); } catch { /* ignore */ } };
    return {
      setRate: r => { try { src.playbackRate.setTargetAtTime(r, ctx.currentTime, .03); } catch { /* ignore */ } },
      setGain: g => { try { gain.gain.setTargetAtTime(g, ctx.currentTime, .03); } catch { /* ignore */ } },
      stop: (fade = .08) => stopVoice(v, fade),
    };
  } catch { return null; }
}

export function stopAll(fade = .05) { for (const v of [...voices]) stopVoice(v, fade); }
function apply() { if (master && ctx) master.gain.setTargetAtTime(sfxState.muted ? 0 : sfxState.volume, ctx.currentTime, .015); if (sfxState.muted) stopAll(.03); for (const f of listeners) f(sfxState); }
export function setSfxVolume(v) { sfxState.volume = Math.min(1, Math.max(0, +v || 0)); save(); apply(); }
export function setSfxMuted(m) { sfxState.muted = !!m; save(); apply(); return sfxState.muted; }
export const toggleSfxMute = () => setSfxMuted(!sfxState.muted);
export const onSfxChange = f => { listeners.add(f); return () => listeners.delete(f); };
export const isLoaded = id => buffers.has(id);
