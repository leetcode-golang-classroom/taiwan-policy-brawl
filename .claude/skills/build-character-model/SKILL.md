---
name: build-character-model
description: 建立或調整 taiwan-policy-brawl 角色的 3D 模型（GLB）：以程式生成 Q 版蒙皮角色、調臉型/髮型/手/比例、修蒙皮權重、避免戰鬥瞬間移動，並用 headless Chrome 截圖驗證。使用者提到「建立角色模型」、「調整角色臉/頭髮/拳頭/腿/領帶」、「Q 版角色」、「build-character」、「換成真正的 glb」時使用，即使沒說「skill」。
---

# 建立／調整角色模型流程

以角色 01（`mech`）為範本。其他角色比照：複製 `tools/build-character-01.mjs` 成 `tools/build-character-NN.mjs` 再改參數。規格見 `character-modify.md`。

## 0. 前置
- 在功能分支作業（例如 `v3.9-realistic-fighters`），不要動其他角色。
- 參考圖放 `assets/characters/references/character_NN/`（競選公報、證件發表會影片截圖，不得用未授權圖）。
- 每完成一個部分提醒使用者自行 `/compact`（你無法執行）。

## 1. 架構概念
- 程序化角色（placeholder）會在 `public/assets/characters/character-NN/metadata.json` 為 `"status":"ready"` 時被 GLB 取代（`src/character/CharacterController.js`：GLTFLoader + SkeletonUtils.clone + AnimationMixer）。
- GLB 由 Node 腳本生成（Three.js GLTFExporter，需 polyfill `FileReader`），指令：`npm run build:character-NN`。
- 模型 = 蒙皮網格：衣服用 lathe、頭用高解析球體雕刻（高斯凸起 + 頂點色）、各材質合併成單一 geometry。
- 動畫 clip 名稱需符合 `src/character/CharacterRegistry.js` 的 CLIPS（Idle、WalkForward、Punch、Skill、Ultimate、Hit、Block、DodgeLeft/Right…）；缺少的 clip 由 `CharacterAnimator` 的 FALLBACK 降級。

## 2. 生成腳本要點（踩過的坑）
1. **蒙皮權重 `blend(mat,geo,chain,bounds,w)`**：chain 必須「由上到下」且 bounds 遞減（例如 `['Chest','Spine','Hips'],[1.85,1.5]`）。順序反了會出現負權重／未正規化，症狀是領帶或衣服被拉到胯下。改完先在瀏覽器檢查最大頂點位移。
2. **Q 版比例**：用分段 y 映射 `fy` 壓縮身體、頭部乘 `QS`（約 1.9）依頭骨權重 `wH` 放大；骨骼位置也要同步重算（local = 新世界座標 − 父新世界座標），之後才 `new THREE.Skeleton(bones)`。
3. **頭部**：蛋形（下巴收窄）、柔和眼窩、小鼻小嘴、圓下巴。眉毛、睫毛線、嘴一律用**實體幾何**，頂點色會糊。
4. **頭髮**：頭殼半球 + 分束瀏海錐形 + 側髮 + 呆毛。瀏海參數 `[x,tip,L,a]`；半球太低會吃掉瀏海，需抬高並後傾。
5. **手**（規範，所有角色統一，範本見 `tools/build-character-06.mjs` 的 `hand(...)`）：
   - 放鬆握拳：掌 `ell(.05,.056,.046)` + 四指各兩節（細圓筒，半徑約 .0185 / .0175，起點 `K=(k*.032,-.012,.03)`，間距要夠大讓四指各自分明）往掌心捲（角度約 .55 / 2.6 rad）+ 拇指 `cap(.02,.06)` 折在指上（`[0,-.015,.06]`）。整體縮放 `FIST`（1.7～2.0），手腕不縮放。
   - **左右手必須鏡像**：手的 Y 軸旋轉用 `makeRotationY(x*(-Math.PI/2+.65))`（x 為左右號）。寫成 `-x*Math.PI/2+.65` 會讓兩手往同一方向轉，一手在前、一手在後。
   - 前臂下緣要收束到手腕半徑（lathe 最下方加 `[.06,1.31],[.085,1.38]` 之類的點），不然前臂與手腕間會有缺口。
   - 手指起點要在掌內、有重疊，不可浮在掌前面；改完務必拍左右兩側＋正面確認對稱、手指與掌相連。
6. **嘴**：淺笑 = 閉嘴弧線（`TorusGeometry` 一小段弧 + 壓扁）+ 兩端短嘴角上揚；使用者明確要求不露齒。
7. **領帶/襯衫**：strip 起點與長度要落在胸腹，不能到下半身。
8. **腿**：加長靠 `QF` 映射與 LEG 半徑倍率，不是只加粗。

## 3. 戰鬥動作不瞬間移動
- 邏輯層（`performDodge`、knockback、`skill.stepIn`）本來就一步位移；**不要改邏輯座標**（會影響連線同步）。
- 在 `src/presentation/renderSync.js` 的「跳躍吸收」：僅對有 `userData.limbs` 的實體，單步位移 0.45~6 且比賽進行中時，視覺保留舊位置並以 `exp(-dt*3/0.22)` 滑到新位置；超過 6 或非比賽狀態直接 snap（重生）。
- 測試：`tests/entity/render-sync-glide.test.js`。
- 動畫 clip 的 hips 軌道不要加水平位移（dodge 不要 `hx`），位移交給邏輯。

## 4. 驗證流程（每次改完都做）
1. `npm run build:character-NN` 重生 GLB（`git checkout public` 會把 GLB 還原，之後要重建）。
2. 建暫時的 `_preview.html` 載入 `/assets/characters/character-NN/fighter.glb`（不是 `/public/...`），用 vite 在 5199 埠服務。
3. headless Chrome 截圖（正面、四分之三、頭部/手部特寫），有效旗標：
   `--headless=new --no-sandbox --use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist --window-size=900,700 --virtual-time-budget=15000`
   空白畫面通常是旗標錯誤或路徑錯誤。
4. 用 Read 看截圖，逐項對照使用者要求。
5. 清理：關掉 vite、刪除 `_preview.html`。
6. `npm test`（node:test，全數通過）與 `npm run build`。
7. 實戰場景尚需人工確認：clip 切換、placeholder 隱藏、縮放與朝向、真實對戰中的位移平滑、Idle 握拳在各動畫下的樣子。

## 5. 迭代與提交
- 使用者的調整通常是小步修正（拳頭再大一點、嘴形、腿再長）：只改對應常數，重生、截圖、確認，再 commit，不要順手大改。
- 模糊要求（如「請修正」）先看最新截圖找出最明顯的問題，說明你改了什麼。
- Commit：gitmoji + 中文，例如 `💄 style: 01 嘴形改為不露齒的淺笑`，結尾加 `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`。不要自行 push。
- 把新的比例/平滑說明追加到 `docs/character-NN-prompts.md`。

## 5.5 隱私：真實人物的姓名與照片
角色以真實政治人物為原型時，使用者可能要求避免引起政治爭議。預設做法：
- repo 內（程式註解、metadata、docs、skill、commit 訊息）一律用「原型人物」稱呼，不寫真名；參考照片只用來目視參考，**不要提交**，用完刪除（`assets/characters/references/character_NN/` 不入版控）。
- 若已提交，需改寫歷史：先確認分支未 push，再用
  `git filter-branch -f --index-filter 'git rm -r -q --cached --ignore-unmatch <參考資料夾>' --tree-filter 'grep -rIl "<姓名>" . --exclude-dir=.git --exclude-dir=node_modules | xargs -r sed -i "s/<姓名>/原型人物/g"' --msg-filter 'sed "s/<姓名>/原型人物/g"' main..HEAD`，之後以 `git log -p main..HEAD | grep <姓名>` 驗證歸零、`npm test` 通過。
- 先 `git stash -u` 再改寫，改寫後 `git stash pop`。
- 清除 `refs/original`、`git reflog expire --expire=now --all`、`git gc --prune=now` 不可還原，需使用者明確授權（可能被權限系統擋下，不要繞過）。
- 也檢查其他舊分支與備份分支是否含姓名；對話中的訊息無法由 Claude 刪除，需告知使用者。
- 要用真人臉部特徵時，只在 face-profile 以描述性文字（髮型、眼鏡、臉型）記錄，不寫姓名。
- 結束一個角色後，主動詢問或直接執行上述檢查（`git grep -i "<姓名>"` 應為空）。

## 5.55 不改動名單文字
- 只換 3D 模型（造型）時，**不要改 `src/roster.js` 裡該角色的 `name`（角色名稱）、`bio`（簡介）、`code`、`icon`、招式名稱**。這些文字使用者沒有要求就保持原樣。
- 只有使用者明確要求改名稱／簡介／招式時才改；造型與名單文字不一致時，在回報中說明即可，由使用者決定。
- 改完用 `git diff main -- src/roster.js` 確認沒有誤動到其他角色。

## 5.6 修改普通攻擊
- 設定：`src/config.js` 的 `SKILL_OVERRIDES[id].basic`（名稱、type、range、knockback、launch、stun）；招式名稱同步改 `src/roster.js`。
- 既有測試常以角色 02 當作會擊飛的範例（`tests/control/combat.test.js`、`movement.test.js`），改數值前先跑 `npm test`，必要時保留 knockback/launch/stun 與 damage 預設值。
- 特效：`src/skills/<id>.js`（`projectile`/`mesh`/`burst` helper）、命中特效在 `src/presentation/vfxEvents.js`、占位角色姿勢在 `src/presentation/animation.js`、GLB 的 `Punch` 動作在生成腳本。
- 補一個 `tests/control/` 測試：類型、範圍內命中、範圍外不中。

## 6. 已知限制（回報時誠實說明）
- 頭髮是低多邊形錐體，邊緣偏硬；皮膚為單色 flat shading。
- 外套下擺在正面會遮住部分手。
- 位移平滑只涵蓋有 `limbs` 的實體，技能特效仍可能跳動。
- 要更精緻的頭髮/臉，可用 Blender（`~/tools/blender-dl/blender-4.5.16-linux-x64/blender`）精修。
