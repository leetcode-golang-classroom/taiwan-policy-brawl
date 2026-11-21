# 角色 01 模型生成提示詞（外部 3D 工具用）
基底與臉部提示詞見 `character-modify.md` 第 21 節。

## Head / face / hair
Japanese anime handsome-man head and face (egg-shaped head, rounded chin, large sharp almond eyes, straight slim nose), original Q-version hairstyle (hair cap, side-swept front locks, bang tufts, small quiff). Keep the candidate's recognisable hairline, brow shape and proportions.

## Outfit
Realistic human proportions (~7.5 heads tall), semi-realistic. Tailored dark-blue wool suit jacket, white fitted shirt, tie, athletic broad shoulders, track-style side-stripe trousers, white sneakers with orange soles, white sport wristbands, small golden Buddhist 卍 lapel pin (not Nazi imagery), stopwatch on a lanyard at the hip.

## Animation (humanoid clips, names per src/character/CharacterRegistry.js)
Idle WalkForward WalkBackward WalkLeft WalkRight Run Dash DodgeLeft DodgeRight Jump Landing Punch Kick Skill Ultimate Block Hit Knockback Fall GetUp Victory

## Defense
Spinning propeller shield with grey party-emblem motif (already implemented as VFX).

## V3.9 調整：Q 版比例 + 戰鬥位移平滑
- 比例：約 2.8 頭身（大頭、短手短腿、腿部加粗），保留原型人物臉部特徵（硬朗下顎、粗直眉、細長杏眼、淺笑、原 Q 版髮型）。由 `tools/build-character-01.mjs` 的 Q 版重映射（`QS`、`fy`、`hy`）產生，骨架與 21 個動作名稱不變。
- 戰鬥：邏輯層的單幀位移（閃避、擊退、stepIn）由 `src/presentation/renderSync.js` 的「位移吸收器」在約 0.22 秒內平滑滑過去，畫面不再瞬間移動；邏輯座標不變，不影響連線同步。
- 閃避動作 clip 不再自帶 root 位移，只做身體傾斜，避免與邏輯位移重複、動作結束時彈回。
- 01–05 的手同 06 規範：左右鏡像、四指較細且間距加大、指起點移入掌內。
