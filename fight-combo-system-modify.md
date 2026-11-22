# 台灣政見大亂鬥 V4.0 — Fighting Feel & Combat Flow Upgrade

## 開發任務

請直接檢查並修改目前《台灣政見大亂鬥》GitHub Pages 版本的原始專案。

目前遊戲已具備：

- 9 名角色
- P1 vs CPU
- 三回合制
- HP
- Energy
- J 三段普攻
- K 蓄力技能
- L 大招
- I 專屬防禦
- SHIFT 閃避
- SPACE 跳躍
- 角色移動
- 角色選擇
- 技能冷卻
- 連招提示

本次開發目標：

**不要再只是增加技能數量，而是改善整個戰鬥的流暢度、打擊感、連招感、動作重量及操作回饋。**

請先讀取目前原始碼及既有戰鬥邏輯，確認目前每一個攻擊、動畫、冷卻、扣血及擊退的實際執行方式。

不可只修改 UI 或增加裝飾文字。

必須實際修改戰鬥系統。

---

# PHASE 1：建立統一戰鬥狀態機

為角色建立清楚的戰鬥狀態：

- Idle
- Walk
- Run
- Dash
- Jump
- AttackStartup
- AttackActive
- AttackRecovery
- SkillStartup
- SkillActive
- SkillRecovery
- Ultimate
- Defense
- Dodge
- HitStun
- Knockback
- Airborne
- Down
- GetUp
- Victory

所有狀態必須有：

- 狀態開始時間。
- 狀態持續時間。
- 狀態轉換條件。
- 可否移動。
- 可否攻擊。
- 可否防禦。
- 可否閃避。
- 可否取消至其他狀態。

避免攻擊、走路、受擊及防禦動畫互相衝突。

---

# PHASE 2：Input Buffer 輸入緩衝

建立輸入緩衝系統。

玩家提前按下 J、K、L、I 或 SHIFT 時，若目前角色正在收招或硬直，但即將允許下一動作，應記錄輸入。

建議 Buffer Window：

180 ms。

要求：

- 記錄按鍵及輸入時間。
- 角色狀態允許時立即執行。
- 過期輸入自動清除。
- 不允許過期的 L 大招突然執行。
- 不允許重複輸入造成技能重複施放。
- Combo 中的輸入優先於一般移動輸入。
- 支援 J J J 三段連招。

---

# PHASE 3：Hit Stop 命中停頓

實作真正的 Hit Stop。

攻擊命中瞬間：

- 攻擊者短暫停頓。
- 受擊者短暫停頓。
- 命中特效短暫停頓。
- Hit Stop 結束後恢復正常動作。

建議：

- 普通攻擊：50～80 ms。
- 強力攻擊：80～120 ms。
- 大招：120～180 ms。

要求：

- 不要 freeze 整個遊戲。
- UI、HP、冷卻、計時器仍可正常更新。
- CPU 不可在 Hit Stop 期間繼續完成攻擊。
- Hit Stop 必須與動畫時間系統正確整合。
- 避免造成遊戲時間錯誤。

---

# PHASE 4：Combo Cancel

建立正式連招取消系統。

## J 普攻

J 攻擊分成三段：

J1 → J2 → J3

每一段都具有：

- Startup。
- Active。
- Recovery。
- Hitbox。
- Damage。
- Hitstun。
- Knockback。
- Cancel Window。

玩家在指定窗口輸入下一段 J 時，立即接續下一招。

如果命中：

- 可取消至下一段。
- 可以依角色規則取消至 K。
- 部分角色可以在特殊條件下接 L。

如果沒有命中：

- 不能無限制取消。
- 必須完成一定收招時間。
- 允許使用閃避取消，但需符合規則。

---

# PHASE 5：Startup / Active / Recovery

所有攻擊統一為三個階段。

## Startup

攻擊準備。

- 角色先做預備姿勢。
- 武器準備。
- 身體重心移動。
- 特效逐漸出現。

## Active

真正攻擊判定期間。

- Hitbox 啟用。
- 攻擊動畫到達有效攻擊姿勢。
- 命中後造成傷害。
- 不可在同一招重複扣血。

## Recovery

攻擊收招。

- 角色回到戰鬥姿勢。
- 不能任意取消。
- 允許指定 Combo Cancel。
- 允許指定 Dodge Cancel。
- 不能無限制連按造成攻擊動畫跳躍。

攻擊必須與動畫同步。

不能按下攻擊後直接扣血，再補一段沒有判定的動畫。

---

# PHASE 6：Hit Stun 受擊硬直

受擊者在攻擊命中後產生 Hit Stun。

普通攻擊：

- 250～400 ms。

技能攻擊：

- 450～700 ms。

大招：

- 依招式設定。

要求：

- Hit Stun 期間不能任意攻擊。
- Hit Stun 期間不能任意防禦。
- 可以依角色及技能設定允許閃避。
- Hit Stun 結束後恢復操作。
- 連續攻擊能正確延長或重新計算硬直。
- 不可永久卡在受擊狀態。

---

# PHASE 7：擊退及位移

建立統一擊退系統。

所有攻擊具有：

- Knockback Distance。
- Knockback Velocity。
- Knockback Direction。
- Vertical Knockback。
- Knockback Duration。

普通拳：

- 小幅後退。

強力技能：

- 中度擊退。

大招：

- 明顯擊飛或特殊位移。

要求：

- 角色不能飛出競技場。
- 不能穿越牆壁。
- 不可穿過另一角色。
- 不可穿過地面。
- 角色在空中時必須有合理重力。
- 落地有動畫及效果。
- 不同角色重量可影響擊退距離。

---

# PHASE 8：移動慣性與方向性

改善 WASD 移動。

加入：

- 加速。
- 減速。
- 方向轉換。
- 側移。
- 前進。
- 後退。
- Dash。
- Dodge。
- Jump。

要求：

- 不要瞬間移動。
- 不要角色一放開鍵就瞬間停止。
- 不要角色轉向時突然旋轉 180 度。
- 不要走路動畫與移動方向不一致。
- 角色在戰鬥時保持面向對手。
- 前進與後退使用不同動作。
- 側移使用 Strafe。
- 衝刺有加速及結束收招。

建議使用：

- Velocity。
- Acceleration。
- Friction。
- Maximum Speed。

---

# PHASE 9：動作連接

改善角色動畫：

Idle → Walk → Run → Dash

Idle → Attack Startup → Active → Recovery → Idle

Idle → Defense → Defense End → Idle

Idle → Dodge → Dodge Recovery

Attack → Hit → Hit Stun → Knockback → Recovery

要求：

- 動作自然切換。
- 不要瞬間回到 T-Pose。
- 不要突然重置位置。
- 不要角色身體抽動。
- 不要腳步滑動。
- 不要手臂穿過身體。
- 不要攻擊時角色突然變成另一個姿勢。

如果目前使用程式生成角色：

先改善目前的 procedural animation。

如果已經使用 GLB：

使用 AnimationMixer 與動畫交叉淡入淡出。

---

# PHASE 10：動態戰鬥鏡頭

建立 Combat Camera。

## 普通戰鬥

- 保持雙方在畫面內。
- 角色移動時鏡頭平滑跟隨。
- 不要突然跳轉。

## 近距離攻擊

- 可適度拉近鏡頭。
- 保持攻擊動作完整可見。

## 強力技能

- 允許短暫鏡頭震動。
- 允許微調角度。
- 不要遮住攻擊者及受擊者。

## 大招

- 可以拉遠。
- 可增加 cinematic camera effect。
- 可以短暫調整視角。
- 大招結束後平滑恢復正常視角。

所有鏡頭轉換使用 Smooth Interpolation。

---

# PHASE 11：連招 HUD

建立 Combo HUD。

顯示：

- 1 HIT。
- 2 HIT。
- 3 HIT。
- 5 HIT COMBO。
- Total Damage。

Combo 計數：

- 每次有效命中增加。
- 連招中斷後重置。
- 防禦成功不計入命中。
- 閃避不計入命中。
- 不可因一個 Hitbox 多次接觸而重複計數。
- 同一次攻擊只能計算一次有效命中。

Combo HUD：

- 命中時放大。
- Combo 增加時短暫動畫。
- 高 Combo 時更醒目。
- Combo 結束後淡出。

---

# PHASE 12：防禦及閃避 Timing

## Defense

I：

- 進入 Defense Startup。
- 啟動防禦判定。
- 防禦有效期間降低或抵銷傷害。
- 防禦失效後進入 Recovery。
- 顯示冷卻。

## Dodge

SHIFT：

- 執行方向閃避。
- 依方向使用不同動作。
- 具有短暫無敵窗口。
- 無敵窗口結束後仍有 Recovery。
- 閃避距離不能過大。
- 不允許永久無敵。

成功閃避：

- 顯示 DODGE。
- 產生殘影。
- 可短暫減慢效果或特殊提示。
- 不扣血。
- 不計入受擊。

---

# PHASE 13：攻擊效果

所有攻擊必須有實際 Hitbox。

攻擊種類：

- Melee。
- Projectile。
- Area。
- Tracking。
- Dash Attack。
- Knockback。
- Pull。
- Launch。

要求：

- Hitbox 與動畫同步。
- Hitbox 只在 Active Window 開啟。
- Hitbox 結束後關閉。
- 不允許動畫還沒出手就命中。
- 不允許動畫已收招還有攻擊判定。
- 不允許同一個攻擊重複造成傷害。
- 投射物具有速度。
- 投射物具有最大距離。
- 投射物具有碰撞。
- 投射物可以被防禦。
- 投射物不能穿過角色。

---

# PHASE 14：AI 改善

CPU 必須有戰鬥節奏。

不要：

- 無限亂按。
- 無限近距離攻擊。
- 無限追蹤。
- 永遠站著。
- 無視冷卻。
- 無視距離。

AI 應依情況：

- 接近對手。
- 保持距離。
- 普攻。
- 使用技能。
- 使用大招。
- 防禦。
- 閃避。
- 攻擊後收招。
- 避免在敵方攻擊 Active Window 中無腦攻擊。

AI 需要有 Reaction Delay，避免像作弊一樣瞬間反應。

---

# PHASE 15：效能與穩定性

- 使用 Delta Time。
- 不可使用過度依賴 setTimeout 的戰鬥時間管理。
- 不可使用多個互相衝突的動畫 Timer。
- 使用統一 Combat Clock。
- 避免 Hit Stop 破壞技能冷卻。
- 避免 FPS 下降導致技能判定錯誤。
- 避免大量 Particle。
- 避免每一幀重新建立 Mesh。
- 避免每一幀建立 Material。
- 使用 Object Pool。
- 保持遊戲可在 GitHub Pages 正常運作。

---

# PHASE 16：驗收測試

請逐項驗證：

## 操作

- [ ] J 可以正常連續三段。
- [ ] J 可以透過 Input Buffer 接續。
- [ ] K 可以在正確窗口接入。
- [ ] L 只有能量滿時才能使用。
- [ ] I 防禦正常。
- [ ] SHIFT 閃避正常。
- [ ] SPACE 跳躍正常。
- [ ] WASD 移動自然。

## 攻擊

- [ ] Startup 正常。
- [ ] Active 判定正常。
- [ ] Recovery 正常。
- [ ] 命中停頓正常。
- [ ] 受擊硬直正常。
- [ ] 擊退正常。
- [ ] 不重複扣血。
- [ ] Combo Cancel 正常。

## 動作

- [ ] 走路。
- [ ] 後退。
- [ ] 側移。
- [ ] 衝刺。
- [ ] 閃避。
- [ ] 跳躍。
- [ ] 攻擊。
- [ ] 受擊。
- [ ] 擊退。
- [ ] 倒地。
- [ ] 起身。

## 鏡頭

- [ ] 普通移動平滑。
- [ ] 近距離鏡頭正常。
- [ ] 強力技能鏡頭正常。
- [ ] 大招鏡頭正常。
- [ ] 鏡頭不遮住角色。
- [ ] 鏡頭不突然跳轉。

## 戰鬥

- [ ] HP 正確。
- [ ] Damage Numbers 正確。
- [ ] Combo 正確。
- [ ] 能量正確。
- [ ] Cooldown 正確。
- [ ] CPU 正常。
- [ ] 三回合正常。
- [ ] 勝負正常。

---

# PHASE 17：執行與交付

請實際：

1. 修改程式。
2. 安裝 dependencies。
3. 執行 npm run build。
4. 修正錯誤。
5. 啟動本地遊戲。
6. 測試 P1 vs CPU。
7. 測試所有戰鬥操作。
8. 測試三回合制。
9. 更新 README。
10. 打包完整專案。

版本名稱：

V4.0 Fighting Flow Upgrade

ZIP：

taiwan-policy-brawl-v4.0-fighting-flow.zip

請在完成報告中列出：

- 實際修改內容。
- 新增檔案。
- 改善的戰鬥機制。
- 測試結果。
- 尚未完成的功能。
- Build 是否成功。
- GitHub Pages 部署注意事項。

如果某項功能沒有真正完成或測試，不可宣稱完成。
