# Claude Code Implementation Prompt — Taiwan Policy Brawl Attack SFX Integration

## 專案

台灣政見大亂鬥（Taiwan Policy Brawl）

目前本機開發環境：
http://localhost:5173/

GitHub Pages：
https://leetcode-golang-classroom.github.io/taiwan-policy-brawl/

## 任務目標

請直接檢查並修改目前遊戲專案，整合一套統一的角色戰鬥攻擊音效系統。

**本次攻擊音效唯一指定素材來源：**

使用我已經下載到本機的：

150 Combat Sound Effects — CC0

原始素材介紹頁：
https://opengameart.org/content/150-combat-sound-effects

**重要：我已經下載完成，不需要再下載、不需要另外搜尋或使用其他音效素材包。**

請自行搜尋目前專案目錄及可能的素材資料夾，找到我已下載的 150 Combat Sound Effects 音檔，並依照實際檔案內容挑選及配置音效。

本次目標是強化戰鬥打擊感、攻擊命中反饋、招式辨識度及音效與動畫同步性。

不要重寫整個遊戲，不要刪除既有功能。

---

## 1. 開始前先檢查專案

請先檢查：

- 現有專案架構
- Three.js 戰鬥系統
- 角色名單及角色技能
- J 普通攻擊、K 技能、L 大招、I 防禦
- 現有 Hit Stop
- Hit Flash
- Knockback
- Combo 系統
- 蓄力動畫與蓄力時間
- 角色攻擊動畫
- 目前是否已有 AudioManager 或 SoundManager
- BGM 系統
- HUD 音量設定
- Online Mode 音效同步機制

先理解現有程式碼再修改，優先擴充現有架構，不要建立重複的音訊管理系統。

---

## 2. 音效素材來源（已下載，禁止重新下載）

使用我已經下載到本機的 CC0 音效素材：

**150 Combat Sound Effects — CC0**

原始介紹網址：
https://opengameart.org/content/150-combat-sound-effects

### 執行要求

1. 搜尋目前專案根目錄。
2. 搜尋專案內的 assets、audio、sound、sfx、downloads 等資料夾。
3. 搜尋可能已解壓縮的 150 Combat Sound Effects 素材。
4. 搜尋可能存在的 ZIP 壓縮檔。
5. 檢查音檔格式及實際檔名。
6. 確認找到的素材內容確實屬於 150 Combat Sound Effects。
7. 根據實際音檔內容挑選適合的攻擊、技能、大招音效。

**禁止：**

- 重新下載 150 Combat Sound Effects。
- 使用其他攻擊音效素材包。
- 使用其他來源音效代替。
- 使用未經授權的音效。
- 自行假設音檔存在。
- 建立指向不存在音檔的路徑。
- 因找不到檔案就擅自更換素材來源。

如果素材目前位於專案外的其他資料夾，請先搜尋目前工作環境能存取的下載目錄及相關資料夾。

若找到 ZIP：

- 檢查 ZIP 內容。
- 確認是指定音效包。
- 將實際需要的音檔解壓縮至遊戲專案。
- 不要將整個不必要的壓縮包內容全部塞入遊戲。
- 保留原始檔及 License 資訊。

若無法找到素材：

1. 不要自行下載。
2. 不要改用其他音效庫。
3. 不要假裝已完成音效整合。
4. 先完成 AudioManager 架構及音效 Config。
5. 將需要的檔案位置及缺少素材清楚列出。
6. 等待我提供素材位置或檔案。

---

## 3. 音檔整理

請將實際使用的音效整理至：

public/audio/combat/

建議建立子目錄：

public/audio/combat/melee/
public/audio/combat/heavy/
public/audio/combat/projectile/
public/audio/combat/magic/
public/audio/combat/explosion/
public/audio/combat/defense/
public/audio/combat/misc/

分類依實際素材內容決定，不必強制建立沒有音檔的資料夾。

保留原始 CC0 音檔及原始名稱，若需轉換格式，另建立遊戲使用版本。

優先使用適合 Web 的 OGG 或 WAV，注意檔案大小及載入效能。

不要重複複製相同音檔。

---

## 4. SoundManager

建立或擴充現有 SoundManager / AudioManager。

必要功能：

- Preload
- Play
- Stop
- Volume Control
- Mute
- Random Variants
- Pitch Variation
- Audio Cooldown
- Concurrent Sound Limit
- Sound Priority
- 防止音效重疊過多
- 音效播放失敗不影響遊戲
- 音效延遲盡可能低
- Web Audio API 支援
- AudioContext 必須遵守瀏覽器使用者互動啟動規則

音效管理應採用事件觸發，不要直接將音效播放邏輯散佈在每一個角色的動畫程式內。

---

## 5. 音效事件

建立統一 Combat Audio Event：

### 普通攻擊

- ATTACK_START
- ATTACK_SWING
- ATTACK_HIT
- ATTACK_MISS

### 重擊

- HEAVY_ATTACK
- HEAVY_HIT
- HEAVY_KNOCKBACK

### 蓄力

- CHARGE_START
- CHARGE_LOOP
- CHARGE_LEVEL
- CHARGE_FULL
- CHARGE_RELEASE

### 技能

- SKILL_START
- SKILL_PROJECTILE
- SKILL_IMPACT
- SKILL_EXPLOSION

### 大招

- ULTIMATE_START
- ULTIMATE_CHARGE
- ULTIMATE_RELEASE
- ULTIMATE_IMPACT
- ULTIMATE_EXPLOSION

### 受擊及防禦

- HIT_LIGHT
- HIT_HEAVY
- KNOCKDOWN
- DEFENSE
- PERFECT_GUARD

---

## 6. 音效播放規則

### 普通攻擊 J

- 攻擊動畫開始時播放 Whoosh / Swing。
- 確認攻擊命中時播放 Impact。
- 攻擊揮空時只播放 Swing，不播放 Hit。
- Combo 每一段可以使用不同音效。
- 相同音效提供 Random Variant。
- 不要每次 J 都播放同一個音檔。
- 音效必須與攻擊動作的實際發生時間同步。

### 重擊

- 使用較重的 Impact。
- 播放時間必須與 Hit Stop 同步。
- 加強低頻但不可讓音效失真。
- 擊中時搭配 Knockback。
- 不可只在攻擊動畫開始時播放重擊音，必須在實際命中時播放。

### 蓄力 K

- CHARGE_START：蓄力開始音。
- CHARGE_LOOP：持續蓄力音效。
- CHARGE_LEVEL：依蓄力程度漸進強化。
- CHARGE_FULL：滿蓄力時播放一次。
- CHARGE_RELEASE：技能釋放音。
- 蓄力被取消、受擊中斷或釋放時停止蓄力 Loop。
- 不可讓蓄力音效在技能結束後繼續播放。
- CHARGE_FULL 不可每幀重複播放。

### 技能

- 技能啟動音。
- Projectile 發射音。
- Projectile 命中音。
- Explosion 音。
- 不同技能依技能類型選擇不同音效。

### 大招 L

建議使用多層音效：

1. Start：大招啟動。
2. Charge：能量蓄積。
3. Release：大招發射或施放。
4. Impact：實際命中。
5. Explosion：爆發或終結。

不要把所有音效同時播放在同一幀。

必須依大招動畫時間軸逐步播放，讓大招具有蓄力、爆發及命中層次。

---

## 7. 9 名角色音效配置

請依照角色目前既有招式及動畫，從我已下載的 150 Combat Sound Effects 素材中實際挑選最適合的音檔。

### 01 AI 推廣者

角色風格：科技、機械、電子戰士。

- J 普攻：Punch / Melee / Light Impact
- K 技能：Projectile / Sci-Fi 類音效
- L 大招：Heavy Impact / Explosion
- I 防禦：Shield / Block

不需額外使用其他 Sci-Fi 音效包，僅從指定的 150 Combat Sound Effects 挑選符合內容的音效。

### 02 大樹守護者

角色風格：野性、樹根、自然力量、洪流。

- J 普攻：Claw / Punch / Heavy Melee
- K 技能：Earth / Heavy Impact / Projectile
- L 大招：Water / Explosion / Heavy Impact
- I 防禦：Block / Impact

### 03 麻將大叔

角色風格：麻將、搞笑、牌桌攻擊。

- J 普攻：Punch / Melee
- K 技能：Projectile / Throw / Impact
- L 大招：Multi-hit / Heavy Impact / Explosion
- I 防禦：Block

若素材沒有麻將牌音效，不要另外下載其他素材庫；用指定素材中的輕型 Impact、Projectile 或適合的聲音代替。

### 04 教育推廣者

角色風格：魔法、書本、推導、學術法術。

- J 普攻：Light Impact / Swing
- K 技能：Magic / Projectile
- L 大招：Heavy Impact / Explosion / Magic 類
- I 防禦：Block

### 05 神職人員

角色風格：莊嚴、神聖、法術。

- J 普攻：Staff / Melee
- K 技能：Magic / Projectile
- L 大招：Explosion / Heavy Impact
- I 防禦：Block

### 06 肌肉大叔

角色風格：肌肉、重拳、力量。

- J 普攻：Punch / Melee
- K 技能：Heavy Hit / Slam
- L 大招：Heavy Impact / Explosion / Multi-hit
- I 防禦：Heavy Block

### 07 都更拆遷王

角色風格：破壞、電光火球、爆炸。

- J 普攻：Heavy Melee / Punch
- K 技能：Projectile / Electric 類
- L 大招：Explosion / Destruction / Heavy Impact
- I 防禦：Block

### 08 工程總指揮

角色風格：工程機械、重裝、施工。

- J 普攻：Metal / Heavy Impact / Melee
- K 技能：Projectile / Mechanical 類
- L 大招：Heavy Impact / Slam / Explosion
- I 防禦：Block

### 09 家庭計畫推廣員

角色風格：可愛、卡通、愛心、輕快。

- J 普攻：Light Punch / Pop / Light Impact
- K 技能：Projectile / Light Magic
- L 大招：Multi-hit / Explosion / Impact
- I 防禦：Block

如果指定音效分類不存在，請挑選本機指定素材中最接近的音檔，不要自行創造檔案或使用其他來源。

---

## 8. 角色音效 Config

建立角色音效設定表。

每個角色需要：

- attackSwingVariants
- attackHitVariants
- heavyHitVariants
- chargeStart
- chargeLoop
- chargeFull
- skillStart
- skillProjectile
- skillImpact
- ultimateStart
- ultimateCharge
- ultimateRelease
- ultimateImpact
- ultimateExplosion
- defense
- perfectGuard
- hitLight
- hitHeavy
- knockdown

如某事件沒有合適音檔，可以使用共用音效，不要建立不存在的音檔路徑。

所有音檔路徑必須實際驗證存在。

---

## 9. 音效變化

### Random Variants

普通攻擊、受擊、揮空等音效建立 Variant Pool。

例如：

Attack Hit：

- Hit A
- Hit B
- Hit C

每次攻擊隨機選擇，避免同一音檔連續播放。

### Pitch Variation

普通攻擊可使用微幅 Pitch Variation：

建議範圍：

- 普攻：±3%
- 重擊：±1～2%
- 技能：±2%
- 大招：原始音高或固定 Pitch

避免過度變調導致聲音品質下降。

### Volume

- 普攻：0.65～0.80
- 重擊：0.85～1.00
- 技能：0.75～0.90
- 大招：0.90～1.00
- 揮空：0.40～0.65
- 防禦：0.60～0.80

以上為初始設定，實際依音檔 Loudness 校正。

---

## 10. 音效與戰鬥同步

這是本次最重要的工作。

音效必須跟著實際戰鬥事件播放：

- 攻擊動畫開始 → Swing
- 攻擊實際命中 → Hit
- Hit Stop → Hit Sound 同步
- Knockback → Heavy Hit
- Combo → 不同打擊音
- Charge → 持續音效及蓄力進度
- Charge Full → 一次音效
- Skill → 技能音效
- Ultimate → 多階段音效
- Perfect Guard → 特殊音效

禁止用 setTimeout 猜測攻擊命中時間。

必須使用現有 Combat State、Attack Frame、Collision、Damage Event 或 Animation Event。

---

## 11. HUD 音量控制

若目前沒有音量控制，新增：

- SFX Volume Slider
- Mute SFX

如果現有 HUD 已有音量控制，請擴充而不是重複建立。

音量設定儲存於 LocalStorage。

音效音量與 BGM 音量分開管理。

設定變更應立即生效。

---

## 12. 效能與安全

- 不要每次攻擊重新下載音檔。
- Preload 必要音檔。
- 控制 Audio Buffer 使用量。
- 避免每次戰鬥建立大量 Audio Nodes。
- 音效播放有 Concurrent Limit。
- 避免音效過度重疊。
- AudioContext 在使用者互動後啟動。
- 音效失敗不能使遊戲 crash。
- Online Mode 不可讓同一攻擊事件重複播放音效。
- 不要因音效載入延遲而延遲戰鬥動畫或判定。

---

## 13. License

建立或更新：

LICENSES/AUDIO.md

內容記錄：

- 150 Combat Sound Effects
- 原作者資訊（依實際素材頁）
- Source URL
- CC0
- 使用的原始音檔名稱
- 修改方式（如轉檔、裁切、Pitch 調整等）

README 增加 Audio Assets 說明。

不得移除原始素材的 License 文件。

---

## 14. 測試

請實際測試：

1. J 普攻 Swing
2. J 命中 Hit
3. J 揮空 Miss
4. 三段 Combo 音效
5. 重擊音效
6. K 蓄力開始
7. K 持續蓄力
8. 滿蓄力
9. 取消蓄力
10. K 技能發射
11. K 技能命中
12. L 大招啟動
13. L 大招蓄力
14. L 大招釋放
15. L 大招命中
16. I 防禦
17. Perfect Guard
18. 輕受擊
19. 重受擊
20. Knockdown
21. 9 名角色音效配置
22. SFX Volume
23. Mute SFX
24. 音效重疊測試
25. Online Mode
26. Chrome / Firefox / Edge

---

## 15. 完成條件

- 直接修改現有專案。
- 只使用我已下載的 150 Combat Sound Effects CC0 作為攻擊 SFX 來源。
- 不重新下載素材。
- 不使用其他音效素材庫。
- 全角色音效依照實際招式及動畫配置。
- 音效與 Attack Frame、Collision、Damage Event 同步。
- 普攻、重擊、技能、大招音效明顯不同。
- Combo 音效自然，不會連續重複太多。
- 蓄力音效能正確啟動、循環、停止。
- 大招有多階段音效。
- 音量控制正常。
- 不破壞既有功能。
- npm build 成功。
- 更新 README 及 AUDIO License。
- 產生完整專案 ZIP。
- 提供修改摘要、音檔配置表、測試結果。
- 不可只產生示範程式碼。
- 不可虛報測試成功。
- 若某項功能因環境無法測試，必須明確說明。

## 最終回報格式

1. 修改檔案列表
2. 使用音效素材列表
3. 9 名角色攻擊音效配置表
4. 新增 AudioManager 功能
5. 戰鬥音效同步方式
6. HUD 修改
7. Build 結果
8. 測試結果
9. 未完成事項

請開始檢查目前專案並直接執行實作。
