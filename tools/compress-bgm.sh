#!/usr/bin/env bash
# Re-encode the battle BGM for the web. Source (320 kbps, ~3 MB) -> public/audio/bgm/battle.mp3 (~1 MB).
# Usage: tools/compress-bgm.sh [bitrate]   (default 96k; 64k = smaller/lo-fi, 128k = safer for music with cymbals)
# Needs ffmpeg:  sudo apt install ffmpeg
set -euo pipefail
cd "$(dirname "$0")/.."
BR="${1:-96k}"
SRC=assets-src/bgm/urban_battle_bpm135.mp3
OUT=public/audio/bgm/battle.mp3
ffmpeg -y -hide_banner -i "$SRC" -map 0:a -map_metadata -1 -c:a libmp3lame -b:a "$BR" -ar 44100 -ac 2 -joint_stereo 1 -af "loudnorm=I=-20:TP=-2:LRA=9" "$OUT"
ls -l "$SRC" "$OUT"
