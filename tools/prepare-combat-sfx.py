#!/usr/bin/env python3
"""Build the game-ready combat SFX from the downloaded "150 Combat Sound Effects" (CC0) pack.

Reads src/audio/combatSfxManifest.json and writes public/audio/combat/<dir>/<original file name>.wav.
Processing (documented in LICENSES/AUDIO.md): trim to `maxDur` with a short fade-out, stereo -> mono,
peak-normalise to -3 dBFS, and for `loop` entries bake a cross-faded seamless loop. No re-synthesis, nothing else changes.
Usage: python3 -I tools/prepare-combat-sfx.py   (standard library only; originals stay untouched in assets-src/audio/)
"""
import array, json, math, os, shutil, sys, wave
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SRC = os.path.join(ROOT, 'assets-src/audio/150gameeffectsounds')
OUT = os.path.join(ROOT, 'public/audio/combat')
PEAK = 10 ** (-3 / 20)
FADE, XFADE = .03, .08   # seconds

def process(src, dst, max_dur, loop):
    with wave.open(src) as w:
        ch, sw, sr, n = w.getnchannels(), w.getsampwidth(), w.getframerate(), w.getnframes()
        raw = w.readframes(n)
    assert sw == 2, f'{src}: expected 16-bit PCM'
    s = array.array('h'); s.frombytes(raw)
    if ch == 2: s = [(s[i] + s[i + 1]) / 2 for i in range(0, len(s), 2)]
    else: s = [float(x) for x in s]
    if max_dur: s = s[:int(max_dur * sr)]
    if loop:   # overlap the tail onto the head so the wrap-around has no click
        x = min(int(XFADE * sr), len(s) // 3)
        head = [s[i] * (i / x) + s[len(s) - x + i] * (1 - i / x) for i in range(x)]
        s = head + s[x:len(s) - x]
    else:      # fade the tail (also covers trimmed files); also a 2 ms attack ramp so a cut start cannot click
        f = min(int(FADE * sr), len(s))
        for i in range(f): s[len(s) - f + i] *= 1 - i / f
    pk = max(1.0, max(abs(v) for v in s)); g = PEAK * 32767 / pk
    out = array.array('h', (max(-32768, min(32767, int(round(v * g)))) for v in s))
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    with wave.open(dst, 'wb') as o:
        o.setnchannels(1); o.setsampwidth(2); o.setframerate(sr); o.writeframes(out.tobytes())

def main():
    man = json.load(open(os.path.join(ROOT, 'src/audio/combatSfxManifest.json')))
    shutil.rmtree(OUT, ignore_errors=True); total = 0
    for id_, e in man.items():
        src = os.path.join(SRC, e['src'])
        if not os.path.exists(src): sys.exit(f'missing source for {id_}: {src}')
        dst = os.path.join(OUT, e['dir'], os.path.basename(e['src']))
        process(src, dst, e.get('maxDur'), e.get('loop')); total += os.path.getsize(dst)
    shutil.copy(os.path.join(SRC, 'LICENSES.txt'), os.path.join(OUT, 'LICENSES.txt'))
    print(f'{len(man)} files, {total / 1024 / 1024:.2f} MB -> {OUT}')
main()
