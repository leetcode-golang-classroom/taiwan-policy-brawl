# 台灣政見大亂鬥 V3.9
# 半寫實候選人 3D 格鬥角色改造與戰鬥系統升級規格

**執行工具：Claude Code**  
**專案技術：Three.js + Vite + JavaScript + GLB/glTF**  
**遊戲部署：GitHub Pages**  


---

# 0. Claude Code 執行指令

請先完整檢查目前專案及現有程式架構，然後直接修改程式碼，完成本文件所定義的角色升級及戰鬥系統改造。

本任務不是只提供建議、概念圖或範例程式碼，而是要實際修改現有遊戲專案。

## 核心目標

將目前程式生成的 Q 版或簡單幾何角色，**改為依照寫實人物比例**製作，升級為：

- KOF / 現代 3D 格鬥遊戲風格。
- 寫實人物比例（約 7～8 頭身）的半寫實人物，保留現有角色的辨識特徵。
- 半寫實 3D 人物。
- 具有候選人臉部辨識特徵的角色模型。
- 具有完整骨架及動作動畫。
- 具有專屬服裝、髮型、武器及技能。
- 保留政治諷刺及遊戲化特色。
- 能在現有 Three.js 戰鬥系統中正常運作。

**不可只將原有角色的頭部放大、增加幾何物件或替換貼圖，就宣稱完成寫實角色改造。**

必須建立真正可用的 3D 人形角色資產載入架構。

---

# 1. 開發前專案檢查

先檢查：

- package.json
- src/main.js
- src 目錄所有模組
- 現有角色生成系統
- 現有角色選擇系統
- 戰鬥系統
- HP / Energy / HUD
- 攻擊及技能系統
- 防禦及閃避
- 三回合制
- GitHub Pages 部署設定
- README

確認目前專案的角色模型是如何建立、角色如何移動、攻擊如何判定、技能如何執行、動畫如何更新。

先建立修改計畫及備份策略。

不得破壞現有版本，建議建立 V3.9 分支或新的開發版本。

---

# 2. 美術風格定義

## 2.1 目標風格

採用：

**KOF 街機格鬥遊戲 + 半寫實 3D + 政治人物諷刺角色 + 電影級技能特效**

人物風格：

- 依照寫實人物比例（約 7～8 頭身），頭、肩、胸、腰、四肢符合真實成人解剖比例。
- 以 Q 版現有造型為設計參考，但比例必須改為寫實，不沿用大頭短身。
- 搭配寫實材質、光影、臉部立體感與服裝細節。
- 臉部具真實辨識特徵。
- 具有遊戲美術修飾。
- 肌肉與身體比例合理。
- 服裝具材質與細節。
- 不使用 Q 版大頭娃娃比例，也不使用單純球體加圓柱的玩具感。
- 不使用單純球體、方塊及圓柱拼裝方式作為最終人物模型。

允許適度誇張：

- 肌肉。
- 表情。
- 髮型。
- 服裝輪廓。
- 武器。
- 特效。
- 攻擊姿勢。

但臉部辨識特徵應保留。

## 2.1.1 頭型與臉部風格：日本動漫帥氣男子

男性角色的頭型與臉部以**日本動漫（少年／青年漫畫）帥氣男子**為方向，結合半寫實材質：

- 頭型：**雞蛋頭**——頭顱上半部寬而圓潤、額頭飽滿，往下平順收窄到圓潤的下巴，下顎線柔和不尖，不使用圓球、方塊或尖下巴 V 字臉。
- 眼睛：大而清晰的杏仁眼，上眼瞼線條明確、有深邃雙眼皮，瞳孔有高光，眼神堅定。
- 眉毛：粗細適中、略帶角度的英氣眉，眉眼距離近。
- 鼻子：鼻樑細而挺直，鼻頭小巧。
- 嘴巴：唇形精緻，嘴角略上揚的自信微笑。
- 皮膚：乾淨細緻，輕微明暗分色，避免毛孔與皺紋噪訊。
- 髮型：以角色設定為準（01 維持原本 Q 版髮型），髮絲成束、帶光澤高光。
- 以上為整體美術方向；候選人的辨識特徵（髮型、眉形、臉部比例）仍須保留，不可變成千篇一律的動漫臉。

## 2.2 視覺風格

參考方向：

- KOF 3D 格鬥遊戲。
- Street Fighter 3D 格鬥遊戲。
- 高品質 stylized realism。
- Semi-realistic game character。
- PBR materials。
- Realistic skin texture。
- Detailed hair.
- Detailed clothing.
- Cinematic lighting。

不要直接複製任何既有遊戲的角色、模型或素材。

只參考格鬥遊戲的品質及美術方向。

---

# 3. 候選人臉部特徵製作流程

## 3.1 參考照片來源

使用合法取得、可供開發參考的候選人照片。

照片可以是：

- 公開照片。
- 使用者提供的參考圖片。
- 使用者合法取得的圖片素材。
- 可合法用於開發的圖片。

不得將照片直接當成 3D 角色臉部貼圖，必須將臉部特徵轉換成真正的 3D 模型。

## 3.2 參考照片資料夾

建立：

assets/
  characters/
    references/
      character_01/
        front.jpg
        three_quarter.jpg
        profile.jpg
        expression.jpg
        notes.md

      character_02/
        front.jpg
        three_quarter.jpg
        profile.jpg
        expression.jpg
        notes.md

如果使用者尚未提供照片：

- 不可假裝已經取得候選人照片。
- 不可自行宣稱模型已經符合本人特徵。
- 建立角色製作資料夾。
- 提供照片需求及素材清單。
- 先完成可替換模型的系統。
- 使用暫時模型時明確標示為 placeholder。

## 3.3 臉部特徵分析

每位人物建立 facial profile。

格式：

```json
{
  "characterId": "01",
  "faceProfile": {
    "faceShape": "待參考照片確認",
    "forehead": "待確認",
    "eyeShape": "待確認",
    "eyeSpacing": "待確認",
    "eyebrows": "待確認",
    "noseBridge": "待確認",
    "noseTip": "待確認",
    "cheeks": "待確認",
    "jawline": "待確認",
    "mouth": "待確認",
    "hairline": "待確認",
    "hairstyle": "待確認",
    "distinctiveFeatures": [],
    "ageAppearance": "待確認",
    "expression": "待確認"
  }
}
```

分析時著重：

1. 臉部整體輪廓。
2. 額頭比例。
3. 眉毛特徵。
4. 眼睛形狀及眼距。
5. 鼻樑與鼻頭。
6. 顴骨。
7. 下顎與下巴。
8. 嘴巴與嘴角。
9. 髮際線。
10. 髮型。
11. 眼鏡、鬍子、痣等辨識特徵。
12. 特有表情。

不能只寫「像某候選人」。

必須將特徵轉換成可以實際製作模型的描述。

---

# 4. 3D 人物模型製作管線

## 4.1 優先使用真正的人形模型

建議資產格式：

- GLB。
- glTF。

模型必須支援：

- Mesh。
- Skeleton。
- Skinning。
- PBR Materials。
- Textures。
- Animations。

## 4.2 模型製作來源

依環境可使用：

- Blender。
- 合法授權的人形模型。
- AI 3D Model Generator。
- Meshy 類型的 3D 生成工具。
- 可輸出 GLB 的人物建模工具。
- 自製 Blender 模型。
- 已取得授權的角色資產。

Claude Code 必須先檢查目前環境是否能操作 Blender 或相關 3D 工具。

如果不能直接生成完整人物模型：

1. 不可假裝已生成。
2. 不可將簡單幾何拼裝稱為高品質半寫實人物。
3. 先完成 GLB 載入系統。
4. 完成骨架動畫系統。
5. 完成模型替換功能。
6. 完成 placeholder。
7. 建立完整人物製作提示詞。
8. 將需要外部工具製作的素材列出。

---

# 5. 人物模型品質標準

## 5.1 頭部

- 具有完整頭部模型。
- 真實比例。
- 臉部輪廓正確。
- 眼睛、鼻子、嘴巴具立體感。
- 髮型具有細節。
- 不使用平面照片貼臉。
- 具有可辨識的臉部特徵。
- 能在遊戲鏡頭距離辨識。

## 5.2 身體

- 寫實人物比例（約 7～8 頭身）。
- 肩膀、胸部、腰部及腿部比例合理。
- 手掌、手指、腳部形狀完整。
- 服裝符合角色設定。
- 不使用簡單方塊代替衣服。

## 5.3 材質

使用 PBR：

- Base Color。
- Roughness。
- Normal Map。
- Metallic。
- Skin Materials。
- Hair Materials。
- Cloth Materials。
- Armor Materials。

## 5.4 臉部表情

至少支援：

- Idle。
- Angry。
- Attack。
- Hit。
- Victory。

若模型支援 Blend Shapes / Morph Targets，優先使用。

若不支援，可使用骨骼、臉部 Mesh 或替代動畫實現。

---

# 6. 角色骨架及動畫

每個角色應有 Humanoid Skeleton。

## 6.1 動畫清單

至少：

- Idle。
- Walk Forward。
- Walk Backward。
- Walk Left。
- Walk Right。
- Run。
- Dash。
- Dodge Left。
- Dodge Right。
- Jump。
- Landing。
- Punch。
- Kick。
- Skill Attack。
- Ultimate Attack。
- Block。
- Hit Reaction。
- Knockback。
- Fall。
- Get Up。
- Victory。

## 6.2 動作切換

使用 Animation State Machine。

避免：

- 動作互相覆蓋。
- 動畫突然跳回。
- 攻擊動畫未完成就被走路動畫取代。
- 角色骨架失控。
- 手臂穿過身體。
- 腳部滑動。
- 角色浮在空中。

## 6.3 移動

角色移動時：

- 向前移動使用前進動畫。
- 向後移動使用後退動畫。
- 左右側移使用 Strafe 動畫。
- 斜向移動可以混合動畫。
- 攻擊移動使用 Attack Movement。
- 衝刺使用 Dash。
- 閃避使用 Dodge。

角色朝向應與攻擊方向一致。

---

# 7. 角色 01：AI 推廣者

## 7.1 外型

寫實人物比例（約 7～8 頭身）的帥氣西裝運動男格鬥角色，以現有造型為設計參考。

設計：

- 剪裁合身的西裝外套、襯衫與領帶，肩膀寬闊、運動員體態（寫實比例）。
- 運動元素：白色運動鞋、側邊條紋運動長褲、運動護腕。
- 日本漫畫風的帥氣男子頭型與臉部（見 2.1.1）。
- 髮型維持原本 Q 版風格：頭頂髮帽、側分前髮、瀏海髮束與前額翹髮，不使用飛機頭；瀏海短而蓬鬆、髮束分明，露出額頭，不遮住眉眼。
- 臉部對應 `front.jpg`：下顎線較硬朗、粗直濃眉、偏細長的杏仁眼、挺直鼻樑與圓潤鼻頭、淺笑，以日式動漫手法美化。
- 自信有魅力的格鬥姿態。
- 西裝翻領別一枚佛教吉祥「卍」字小徽章。
- 傳統佛教符號，不使用納粹標誌。
- 材質：西裝羊毛、襯衫棉布、運動鞋橡膠鞋底，具 PBR 細節。
- 不使用科技裝甲、頭盔或機械身體。

若使用者提供候選人臉部照片，將其臉部辨識特徵整合到角色頭部。

## 7.2 攻擊

保留原有：

- GPU 攻擊。
- 巨大科技標誌攻擊。
- 牛奶瓶與大型蛋／圓頂攻擊。

## 7.3 武器

- 隨身秒錶／能量道具（掛於腰間，蓄能時發光）。
- 攻擊前蓄能。
- 道具旋轉並發光。
- 發光。
- 能量粒子聚集。
- 發射。
- 命中爆炸。

## 7.4 防禦：螺旋槳護盾

按 I：

- 召喚旋轉螺旋槳。
- 使用國民黨灰色徽章意象。
- 旋轉速度逐漸加快。
- 形成護盾。
- 攻擊撞擊護盾時產生碰撞效果。
- 防禦結束時護盾消散。

---

# 8. 角色 02：樹精靈

## 8.1 外型

豹型森林守護者。

- 豹科身體比例。
- 斑點。
- 動物頭部。
- 森林裝甲。
- 綠色自然系材質。
- 樹枝與葉片裝飾。
- 半獸人／森林精靈風格。
- 可使用人形雙足站立格鬥姿勢。

## 8.2 動作

- 豹型走路。
- 低姿態衝刺。
- 撲擊。
- 爪擊。
- 側跳。
- 野獸閃避。

## 8.3 防禦：愛台灣

按 I：

- 大量芒果乾從地面或周圍出現。
- 芒果乾形成防禦屏障。
- 屏障可以阻擋敵方攻擊。
- 受到攻擊時產生屏障波紋。
- 防禦結束時芒果乾散落消失。

## 8.4 原有技能

保留：

- 樹木攻擊。
- 工人攻擊。
- 大海奔流。

---

# 9. 角色 03：麻將大叔

保留原有麻將角色設計及技能：

- 推送麻將牌。
- 對對胡。
- 清一色。

角色外型改為寫實人物比例的格鬥人物。

## 防禦

按 I：

- 麻將牌旋轉。
- 形成麻將防禦牆。
- 攻擊撞上牌牆產生碰撞效果。
- 牌牆消失時散落牌面。

---

# 10. 角色 04：教育推廣者

## 10.1 外型

寫實人物比例的魔法教授。

- 法師長袍。
- 魔法帽或教育特色頭飾。
- 法杖。
- 漂浮書本。
- 魔法符文。
- 藍紫色或金色魔法光效。
- 保留候選人臉部特徵。

## 10.2 動作

- 法杖旋轉。
- 魔法書漂浮。
- 蓄力時身體周圍出現符文。
- 發動技能時法杖發光。
- 魔法書跟隨角色。
- 攻擊後收招。

## 10.3 技能

保留：

- 誨人不倦。
- SoR 書本連續攻擊。
- 學海無涯巨大書本攻擊。

## 10.4 防禦

按 I：

- 法杖舉起。
- 魔法陣形成。
- 符文旋轉。
- 魔法結界阻擋攻擊。
- 結界破裂時產生光波。

---

# 11. 角色 05：神職人員

保留神職人物主題。

外型：

- 寫實人物比例（約 7～8 頭身）。
- 神職服裝。
- 專屬飾品。
- 聖光效果。

防禦按 I：

- 祈禱或舉手。
- 產生神聖光環。
- 形成聖光盾。
- 防禦期間產生波紋。
- 結束後光環擴散。

---

# 12. 角色 06：健身獎牌肌肉大叔

外型：

- 寫實人物比例（約 7～8 頭身）。
- 肌肉格鬥家。
- 健身服。
- 獎牌。
- 肌肉細節。
- 運動鞋。

動畫：

- 拳擊。
- 肘擊。
- 踢擊。
- 肌肉展示。
- 衝刺。
- 肌肉強化姿勢。

防禦按 I：

- 雙手交叉。
- 展示肌肉。
- 產生金色肌肉能量盾。
- 減少受到的傷害。

---

# 13. 角色 07：都更拆遷王

外型：

- 寫實人物比例（約 7～8 頭身）。
- 工程安全帽。
- 工程服。
- 工作手套。
- 工程機械裝備。

## 第二招：電光火球

攻擊流程：

1. 雙手聚集電能。
2. 電光開始旋轉。
3. 能量球逐漸變大。
4. 球體發光。
5. 角色向前發射。
6. 能量球飛向對手。
7. 命中後產生電光爆炸。
8. 對手產生擊退。
9. 顯示實際傷害數字。

必須具有：

- 真實投射物。
- 飛行速度。
- 攻擊距離。
- 碰撞判定。
- 命中傷害。
- 防禦判定。
- 冷卻時間。

## 防禦

按 I：

- 召喚工程鋼板。
- 角色躲在鋼板後方。
- 攻擊碰撞時產生金屬火花。
- 鋼板可設定耐久度。
- 防禦結束時鋼板收回或碎裂。

---

# 14. 角色 08：工程總指揮

寫實人物比例的工程指揮官。

- 工程裝備。
- 指揮風格服裝。
- 工具。
- 工程機具裝飾。

防禦按 I：

- 召喚工程防護牆。
- 防護牆在前方形成。
- 阻擋投射物。
- 產生撞擊特效。
- 防禦結束後防護牆碎裂。

---

# 15. 角色 09：家庭計畫推廣員

寫實人物比例角色。

保留原有角色主題及技能。

防禦按 I：

- 召喚多層防護泡泡。
- 泡泡環繞角色。
- 受到攻擊產生波紋。
- 防禦值耗盡時泡泡逐層破裂。

---

# 16. 戰鬥系統

## 16.1 HP HUD

顯示：

- P1 HP。
- CPU HP。
- HP 數字。
- HP Bar。
- 受擊閃爍。
- 低血量警告。

## 16.2 傷害數字

實際傷害顯示：

- -2。
- -5。
- -10。
- -20。

數字必須來自實際 damage value。

動畫：

- 浮起。
- 放大。
- 淡出。
- 不同傷害使用不同大小。
- 強力技能使用更明顯顏色。
- 連擊避免重疊。

## 16.3 攻擊距離

所有技能必須有：

- Range。
- Damage。
- Cooldown。
- Attack Type。
- Hitbox。
- Projectile Speed。
- Radius。
- Knockback。
- Tracking。
- Blockable。

## 16.4 攻擊類型

- Melee。
- Projectile。
- Area。
- Tracking。
- Dash Attack。
- Grab / Pull。
- Knockback。

## 16.5 防禦

I 鍵：

- 每個角色專屬防禦。
- 專屬動畫。
- 專屬特效。
- 防禦持續時間。
- 冷卻時間。
- 減傷或完全阻擋。
- HUD 顯示冷卻。

初始平衡值：

- 持續時間：1.5 秒。
- 冷卻時間：6 秒。
- 一般減傷：70%。

以上數值集中管理。

---

# 17. 技能資料管理

建立統一技能設定。

例如：

```js
const skill = {
  id: "electric-fireball",
  name: "電光火球",
  type: "projectile",
  damage: 10,
  range: 15,
  speed: 12,
  radius: 1.2,
  cooldown: 5,
  knockback: 5,
  tracking: false,
  blockable: true
};
```

技能執行流程：

1. 檢查技能冷卻。
2. 檢查角色狀態。
3. 執行準備動畫。
4. 執行蓄力動畫。
5. 建立攻擊判定。
6. 計算命中。
7. 計算防禦。
8. 計算實際傷害。
9. 更新 HP。
10. 顯示傷害數字。
11. 執行擊退。
12. 執行收招動畫。
13. 更新冷卻。

---

# 18. Three.js 模型載入系統

建立統一的 GLB 載入架構。

建議：

```text
src/
  character/
    CharacterLoader.js
    CharacterAnimator.js
    CharacterController.js
    CharacterRegistry.js

  combat/
    CombatSystem.js
    DefenseSystem.js
    ProjectileSystem.js
    DamageNumberSystem.js

  vfx/
    VFXSystem.js

  ui/
    HealthHUD.js
```

模型載入：

- 使用 GLTFLoader。
- 支援 GLB。
- 支援 Skeleton。
- 支援 Animation Clips。
- 使用 AnimationMixer。
- 支援動畫切換。
- 支援模型替換。
- 支援角色專屬裝備掛載。

角色資產：

```text
public/
  assets/
    characters/
      character-01/
        fighter.glb
        thumbnail.png
        metadata.json

      character-02/
        fighter.glb
        thumbnail.png
        metadata.json
```

如果資產尚未完成，Loader 必須支援 fallback，不可導致遊戲無法啟動。

---

# 19. GitHub Pages 相容性

必須確保：

- 使用正確 Vite base path。
- GLB 資產載入路徑正確。
- 不使用僅本機可用的絕對路徑。
- 大型模型可正常載入。
- 載入期間顯示 Loading。
- 失敗時顯示 fallback。
- 避免 404。
- 避免 CORS 問題。
- 部署後確認 GitHub Pages 路徑。

---

# 20. 開發階段

## Phase 1：角色系統架構

- 檢查現有角色。
- 建立 GLB Loader。
- 建立 Animation Mixer。
- 建立 Character Registry。
- 建立 fallback 模型。
- 保留舊角色供比較。

## Phase 2：01 角色試作

先完成 01 AI 推廣者。

- 寫實人物比例（約 7～8 頭身）。
- 帥氣西裝運動男造型。
- 候選人臉部特徵。
- 隨身道具與能量武器（秒錶等）。
- 骨架。
- 走路。
- 攻擊。
- 受擊。
- 防禦。
- 閃避。

01 必須作為後續八名角色的品質標準。

## Phase 3：戰鬥整合

- HP HUD。
- Damage Numbers。
- Range。
- Projectile。
- Knockback。
- Defense。
- Cooldown。

## Phase 4：角色 02、04、07

完成：

- 02 豹型樹精靈。
- 04 魔法教授。
- 07 電光火球拆遷王。

## Phase 5：其餘六名角色

逐一換成半寫實角色。

## Phase 6：動畫及特效

- Walk。
- Run。
- Dash。
- Attack。
- Block。
- Dodge。
- Hit。
- Knockback。
- Victory。

## Phase 7：驗收

- Build。
- Browser Test。
- GitHub Pages Test。
- 修正問題。
- 打包。

---

# 21. 第一隻角色 01 的模型生成提示詞

當使用外部 3D 生成工具時，請使用以下基礎提示詞。

## Base Prompt

```text
Create a high quality semi-realistic 3D fighting game character.

Realistic human proportions, approximately 7.5 heads tall, anatomically plausible adult body.
Modern arcade fighting game aesthetic.
KOF-inspired semi-realistic character art direction.
Detailed facial anatomy.
Natural eyes, nose, lips and jaw.
High quality skin material.
Detailed hair.
Realistic clothing materials.
Physically based rendering.
Full body.
Neutral A-pose or T-pose.
Clean topology suitable for rigging.
Humanoid skeleton compatible.
Game-ready character.
High quality textures.
Detailed hands and feet.
Front, side and back consistent design.
No background.
No text.
No watermark.

Character concept:
Handsome, athletic man with realistic adult proportions in a tailored modern suit with sporty details.
Sharp tailored suit jacket, fitted shirt and tie, athletic build with broad shoulders.
Sporty elements: white sneakers, track-style side-stripe trousers, wristbands.
Japanese anime-style handsome young man: egg-shaped head (broad rounded cranium tapering smoothly to a rounded chin, soft jawline), large sharp almond eyes with strong upper eyelids and highlights, straight slim nose, confident slight smile.
Hairstyle kept from the original Q-version character: hair cap with side-swept front locks, bang tufts and a small front quiff (not a pompadour).
Confident and charismatic fighting stance.
Detailed fabric materials: wool suit, cotton shirt, leather and rubber sneaker soles.
Realistic adult human body proportions with semi-realistic surface detail.
Traditional Buddhist auspicious 卍 symbol as a decorative emblem.
Do not use Nazi imagery.
Keep facial identity based on supplied candidate reference photographs.
Do not turn the face into a generic face.
Preserve distinctive facial proportions, hairstyle, eyebrow shape, eye shape, nose, mouth and jawline.
```

## Face Identity Prompt

```text
Use the supplied reference photographs as facial identity references.

Preserve the recognizable facial structure:
face shape,
forehead,
eyebrows,
eye shape,
eye spacing,
nose bridge,
nose tip,
cheeks,
jawline,
mouth shape,
hairline,
hairstyle,
age appearance,
distinctive facial features.

Create a stylized realistic 3D game character face.
Do not simply paste the reference photo onto the face.
The face must be sculpted as a three-dimensional model.
The facial identity must remain recognizable at the actual game camera distance.
```

---

# 22. 每名角色獨立生成提示詞

每名角色需要：

1. Base Prompt。
2. Face Identity Prompt。
3. Character-specific Prompt。
4. Outfit Prompt。
5. Weapon Prompt。
6. Animation Prompt。
7. Defense Prompt。

所有角色保持一致的：

- 寫實人物比例（約 7～8 頭身）。
- 格鬥遊戲品質。
- 材質品質。
- 角色模型尺寸。
- 骨架規格。
- 動畫相容性。

不同角色的：

- 臉部。
- 髮型。
- 身材。
- 服裝。
- 武器。
- 技能。
- 防禦。

必須具有明顯差異。

---

# 23. 效能規範

因為遊戲部署於網頁：

- 控制模型 Polygon Count。
- 合理使用 Texture Resolution。
- 優先使用 1K～2K Texture。
- 避免過多透明材質。
- 避免過多 PointLight。
- 使用粒子池。
- 使用 Object Pool。
- 對投射物及傷害數字回收物件。
- 避免每一幀建立大量 Mesh。
- 避免每一幀重新建立 Material。
- 支援低效能設備。
- 確保遊戲可維持合理 FPS。

---

# 24. 驗收標準

## 角色模型

- [ ] 寫實人物比例。
- [ ] 臉部立體。
- [ ] 臉部辨識特徵明確。
- [ ] 服裝細節。
- [ ] 角色特色清楚。
- [ ] 骨架正常。
- [ ] 不穿模。
- [ ] 不浮空。
- [ ] 模型能在遊戲中正常載入。

## 動作

- [ ] Idle。
- [ ] Walk。
- [ ] Backward Walk。
- [ ] Strafe。
- [ ] Run。
- [ ] Dash。
- [ ] Dodge。
- [ ] Jump。
- [ ] Attack。
- [ ] Skill。
- [ ] Ultimate。
- [ ] Defense。
- [ ] Hit。
- [ ] Knockback。
- [ ] Victory。

## 戰鬥

- [ ] HP 正常。
- [ ] Damage Numbers 正常。
- [ ] Range 正常。
- [ ] Projectile 正常。
- [ ] Defense 正常。
- [ ] Cooldown 正常。
- [ ] Knockback 正常。
- [ ] Combo 正常。
- [ ] 三回合正常。
- [ ] Energy 正常。
- [ ] Ultimate 正常。

## 角色技能

- [ ] 01 帥氣西裝運動男形象。
- [ ] 01 佛教吉祥卍字。
- [ ] 01 螺旋槳防禦。
- [ ] 02 豹型樹精靈。
- [ ] 02 芒果乾防禦。
- [ ] 03 麻將防禦。
- [ ] 04 魔法教授。
- [ ] 04 魔法結界。
- [ ] 05 聖光防禦。
- [ ] 06 肌肉防禦。
- [ ] 07 電光火球。
- [ ] 07 工程鋼板防禦。
- [ ] 08 工程防護牆。
- [ ] 09 防護泡泡。

---

# 25. 最終交付

請完成以下工作：

1. 實際修改專案。
2. 完成角色載入系統。
3. 完成動畫系統。
4. 完成戰鬥系統升級。
5. 完成專屬防禦。
6. 完成角色 01 原型。
7. 完成角色 02、04、07 技能及造型改版。
8. 保留原有遊戲功能。
9. 執行 npm install。
10. 執行 npm run build。
11. 測試遊戲。
12. 修正錯誤。
13. 更新 README。
14. 建立版本紀錄。
15. 打包完整專案。

檔名：

taiwan-policy-brawl-v3.9-realistic-fighters.zip

若無法直接製作某些高品質模型，請完成所有可由程式實作的部分，建立資產載入與動畫框架，並列出仍需外部模型製作的角色。

不得將 placeholder 宣稱為完成模型。

最終報告需包含：

- 修改內容。
- 新增檔案。
- 完成角色。
- 尚待製作模型。
- Build 結果。
- 測試結果。
- GitHub Pages 部署注意事項。

