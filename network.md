# 線上對戰網路說明（WebRTC）

台灣大亂鬥的「與人連線」使用 WebRTC，不需要自己的伺服器：兩端用「連線碼」（複製貼上或 QR code）交換 SDP，之後資料直接 peer-to-peer 傳送。

相關檔案：

- `src/net/signal.js`：信令碼編碼／解碼、ICE 設定、`RTCPeerConnection` 與資料通道
- `src/net/ui.js`：連線對話框（建房、加入、掃 QR、狀態提示）
- `src/net/netplay.js`：對戰同步（host 權威的混合模式）

## 連線流程

1. 房主按「建立房間」，產生邀請碼（`PB1O.…`），以文字或 QR 呈現。
2. 加入者貼上或掃描邀請碼，產生回覆碼（`PB1A.…`）。
3. 房主貼上或掃描回覆碼，連線建立後自動進入遊戲。

連線碼是把 SDP 精簡後用 `deflate-raw` 壓縮，再做 base64url 編碼。精簡內容包含移除 TCP candidate 和 trickle 殘留行。

資料通道有兩條：

- `ctl`：可靠、有序，傳選角、指令、回合事件
- `snap`：不可靠、無序，傳狀態快照（每 50 ms 一次）

房主是 P1（左側），加入者是 P2（右側）。

## NAT 穿透的限制

| 網路情況 | 只用 STUN 能否連線 |
|---|---|
| 同一個區網（host candidate） | 可以 |
| 雙方都是友善 NAT（取得公網位址 srflx） | 通常可以 |
| 行動網路（CGNAT）、對稱 NAT | 常常不行 |
| 防火牆擋 UDP、Wi-Fi 開啟用戶端隔離 | 不行 |

後三種需要 TURN 中繼（relay candidate）。GitHub Pages 是靜態網站，無法架設 TURN，必須使用外部服務或自架 coturn。

## 兩個版本的差別

這是 commit `6d172bb`（舊版）與 `719ee27`（新版）的差異。連線碼格式、資料通道和同步機制都沒有改，只改了 ICE 設定與提示。

| 項目 | 舊版 | 新版 |
|---|---|---|
| STUN 伺服器 | 2 個（Google） | 3 個，多了 `stun.cloudflare.com:3478` |
| 收集 ICE 候選的等待時間 | 4 秒 | 6 秒 |
| TURN 中繼 | 無 | 可選設定，預設關閉 |
| 連線前診斷 | 無 | 顯示有沒有公網位址、有沒有 TURN |
| 失敗訊息 | 「可能是防火牆或 NAT 限制」 | 說明雙方網路無法直連，建議改連同一個 Wi-Fi 或設定 TURN |

新版預設仍然沒有 TURN，所以新版能連上的原因推測是前兩項：

- **等待時間變長：** 舊版 4 秒內 STUN 可能還沒回應，連線碼就缺少公網位址。新版多等 2 秒，碼裡比較容易帶到 srflx。
- **STUN 變多：** 其中一個被擋或很慢時還有備援。

這是推測，沒有實際比對測試過。

## 設定 TURN

兩種方式，都是可選的。

**建置時**（vite 環境變數，多個網址用逗號分隔）：

```
VITE_TURN_URL=turn:example.com:3478,turns:example.com:5349
VITE_TURN_USER=帳號
VITE_TURN_CRED=密碼
```

**執行時**（瀏覽器 console，只影響該瀏覽器）：

```js
localStorage.setItem('pb-turn', JSON.stringify({urls:'turn:example.com:3478',username:'帳號',credential:'密碼'}))
```

注意：建置時設定的帳密會被打包進公開的前端程式碼，任何人都看得到。請使用有流量上限的帳號（例如 Cloudflare Calls、Metered 免費方案），不要放重要的憑證。

## 連線診斷

建房或加入時，畫面下方會依 SDP 內的 candidate 類型顯示提示（`candidateInfo`）：

| 提示 | 意義 |
|---|---|
| （空白） | 有 relay candidate，已使用 TURN |
| 未設定 TURN：行動網路或嚴格 NAT 可能連不上 | 拿到公網位址（srflx），但沒有 TURN |
| 沒取得公網位址（STUN 被擋），只有同一個區網能連線 | 只有 host candidate |

## 測試建議

- 先讓雙方連同一個 Wi-Fi 測試，並關掉手機行動數據，確認路由器沒有開用戶端隔離。
- 要跨網路遊玩，再設定 TURN 測試。
