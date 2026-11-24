# Audio Licenses

## 戰鬥音效：150 Combat Sound Effects（CC0）

- 作品：**150 Combat Sound Effects**，收錄於 OpenGameArt
- 來源網址：https://opengameart.org/content/150-combat-sound-effects
- 授權：**CC0 1.0 Universal**（公眾領域貢獻，不需標示姓名；本專案仍在遊戲頁尾與此文件註明來源）
  - https://creativecommons.org/publicdomain/zero/1.0/
- 本包為 150 個 WAV 的合輯，檔名結尾 `_sNN` 代表原始作者／來源：

| ID | 原作者 – 作品 | 來源 |
|---|---|---|
| s01 | Cosmo Myzrail Gorynych – CoMiGo's Bleeps and Bloops | https://comigo.itch.io/bleeps-n-bloops |
| s02 | Kenney – Impact Sounds | https://kenney.nl/assets/impact-sounds |
| s03 | Kenney – RPG Audio | https://kenney.nl/assets/rpg-audio |
| s04 | Kenney – Sci-fi Sounds | https://kenney.nl/assets/sci-fi-sounds |
| s05 | Kronbits – 200 Free SFX | https://kronbits.itch.io/freesfx |
| s06 | lentikula – Basic Spell Impacts | https://lentikula.itch.io/freecc0-basic-spell-impacts-sfx |
| s07 | lentikula – Druid Spell Impacts | https://lentikula.itch.io/druid-spell-impacts |
| s08 | lentikula – Healing Spell Impacts | https://lentikula.itch.io/healing-spell-impacts |
| s09 | lentikula – Sci-Fi Weapon Shots SFX | https://lentikula.itch.io/sci-fi-weapon-shots-sfx-freecc0 |

原始授權說明檔（含逐檔來源 ID）原樣保留於 `assets-src/audio/150gameeffectsounds/LICENSES.txt`，並隨成品放在 `public/audio/combat/LICENSES.txt`。

## 本專案的修改方式

只使用上述音效包，沒有使用其他音效素材庫。由 `tools/prepare-combat-sfx.py` 依 `src/audio/combatSfxManifest.json` 處理（純 Python 標準函式庫）：

1. 立體聲混為單聲道（減少約一半檔案大小）。
2. 過長的檔案裁切至指定秒數，尾端 30 ms 淡出。
3. 峰值正規化至 -3 dBFS（各檔響度一致，實際音量由 `src/audio/sfxConfig.js` 決定）。
4. 蓄力循環檔（`charge/`）把尾端與開頭交叉淡化 80 ms，做成無縫循環。
5. 遊戲內播放時另有 ±1～3% 的隨機音高變化（見 `sfxConfig.js`），不改動檔案本身。

原始 48 kHz WAV 不修改，僅存在本機 `assets-src/audio/`（體積 56 MB，已在 `.gitignore` 排除；只有 LICENSES.txt 納入版本控制）。處理後檔案名稱保留原始檔名。

## 實際使用的音檔（31 個）

| 處理後檔案（`public/audio/combat/`） | 來源 ID | 修改 |
|---|---|---|
| `charge/Retro Charge Magic 11_s05.wav` | s05 | 裁切至 1.1 秒（尾端淡出）、單聲道、正規化至 -3 dBFS、烘焙無縫循環（頭尾交叉淡化） |
| `charge/Retro Charge StereoUP 12_s05.wav` | s05 | 裁切至 1.2 秒（尾端淡出）、單聲道、正規化至 -3 dBFS、烘焙無縫循環（頭尾交叉淡化） |
| `explosion/BlastImpact_03_s01.wav` | s01 | 單聲道、正規化至 -3 dBFS |
| `explosion/BreakGlass_01_s01.wav` | s01 | 單聲道、正規化至 -3 dBFS |
| `explosion/Break_01_s01.wav` | s01 | 單聲道、正規化至 -3 dBFS |
| `explosion/Break_02_s01.wav` | s01 | 單聲道、正規化至 -3 dBFS |
| `magic/Earth Spell Impact 2_s07.wav` | s07 | 裁切至 1 秒（尾端淡出）、單聲道、正規化至 -3 dBFS |
| `magic/Earth Spell Impact 4_s07.wav` | s07 | 裁切至 1 秒（尾端淡出）、單聲道、正規化至 -3 dBFS |
| `magic/ElectroZap_s01.wav` | s01 | 單聲道、正規化至 -3 dBFS |
| `magic/EnergyZap_s01.wav` | s01 | 單聲道、正規化至 -3 dBFS |
| `magic/Fire Spell Impact 1_s06.wav` | s06 | 裁切至 1.1 秒（尾端淡出）、單聲道、正規化至 -3 dBFS |
| `magic/Fire Spell Impact 3_s06.wav` | s06 | 裁切至 1 秒（尾端淡出）、單聲道、正規化至 -3 dBFS |
| `magic/Healing Spell Impact 10_s08.wav` | s08 | 裁切至 1.1 秒（尾端淡出）、單聲道、正規化至 -3 dBFS |
| `magic/Healing Spell Impact 15_s08.wav` | s08 | 裁切至 0.8 秒（尾端淡出）、單聲道、正規化至 -3 dBFS |
| `magic/Healing Spell Impact 2_s08.wav` | s08 | 裁切至 1 秒（尾端淡出）、單聲道、正規化至 -3 dBFS |
| `magic/Healing Spell Impact 5_s08.wav` | s08 | 裁切至 0.9 秒（尾端淡出）、單聲道、正規化至 -3 dBFS |
| `magic/HeavyZap_s01.wav` | s01 | 單聲道、正規化至 -3 dBFS |
| `magic/Ice Spell Impact 1_s06.wav` | s06 | 裁切至 1 秒（尾端淡出）、單聲道、正規化至 -3 dBFS |
| `magic/Lightning Spell Impact 1_s06.wav` | s06 | 裁切至 1.2 秒（尾端淡出）、單聲道、正規化至 -3 dBFS |
| `magic/Lightning Spell Impact 3_s06.wav` | s06 | 裁切至 1.2 秒（尾端淡出）、單聲道、正規化至 -3 dBFS |
| `magic/Plant Spell Impact 2_s07.wav` | s07 | 裁切至 1 秒（尾端淡出）、單聲道、正規化至 -3 dBFS |
| `magic/PowerZap_01_s01.wav` | s01 | 裁切至 1 秒（尾端淡出）、單聲道、正規化至 -3 dBFS |
| `magic/Water Spell Impact 1_s06.wav` | s06 | 裁切至 1 秒（尾端淡出）、單聲道、正規化至 -3 dBFS |
| `magic/Water Spell Impact 3_s06.wav` | s06 | 裁切至 1.1 秒（尾端淡出）、單聲道、正規化至 -3 dBFS |
| `magic/Wind Spell Impact 1_s07.wav` | s07 | 裁切至 1.1 秒（尾端淡出）、單聲道、正規化至 -3 dBFS |
| `melee/Impact_01_s01.wav` | s01 | 單聲道、正規化至 -3 dBFS |
| `melee/Impact_02_s01.wav` | s01 | 單聲道、正規化至 -3 dBFS |
| `melee/SmallImpact_01_s01.wav` | s01 | 單聲道、正規化至 -3 dBFS |
| `melee/SmallImpact_02_s01.wav` | s01 | 單聲道、正規化至 -3 dBFS |
| `melee/SmallImpact_03_s01.wav` | s01 | 單聲道、正規化至 -3 dBFS |
| `melee/impact_punch_medium_000_48kHz_16bit_0.36s_bd322da3_s02.wav` | s02 | 單聲道、正規化至 -3 dBFS |

## 背景音樂

背景音樂（`public/audio/bgm/battle.mp3`）不屬於本文件範圍。
