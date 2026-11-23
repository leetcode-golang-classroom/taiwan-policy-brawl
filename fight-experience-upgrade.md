# 《台灣政見大亂鬥》V4.0 戰鬥體感升級任務

請以目前公開版 V3.9 / 現有專案為基礎，直接進行戰鬥系統升級。

目標是將目前 3D 自由移動技能對戰，改造成結合 KOF 格鬥連段及 Naruto Ultimate Ninja Storm 式追擊的戰鬥體驗。

## 第一優先：打擊感

實作：
- Hit Stop。
- Hit Flash。
- Hit Shake。
- Hit Sparks。
- 依傷害程度調整擊退。
- 依攻擊方向調整受擊姿勢。
- 普通、重擊、技能、大招不同命中回饋。
- 真實傷害數字與 Combo HUD。
- 命中音效及攻擊音效。

## 第二優先：Combo 系統

建立連段系統：
- J 三段攻擊。
- J → J → J。
- J → J → K。
- J → J → J → K。
- J → K。
- 命中後允許攻擊取消。
- 攻擊落空時不可無限制取消。
- Combo 計時器。
- Combo Hit Count。
- Combo Damage。
- Combo 結束後正確重置。

## 第三優先：擊飛與追擊

實作：
- Launcher。
- Airborne Hit State。
- Chase Dash。
- Air Combo。
- Ground Slam。
- 追擊次數上限。
- 空中傷害遞減。
- Combo 期間防止 CPU 或玩家受到無