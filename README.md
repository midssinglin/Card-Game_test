# 牌桌學堂

和電腦或朋友對戰**德州撲克**與**台灣 16 張麻將**的練牌室。教練會即時算勝率、聽牌與台數，題目與教學關卡幫你從規則學起。籌碼免費、每場重置，沒有現金價值。

**線上試玩：** https://midssinglin.github.io/Card-Game_test/

## 功能

| 類別 | 內容 |
| --- | --- |
| 遊戲 | 無限注德州撲克（2–6 人）、台灣 16 張麻將（算台，含補花、吃碰槓、搶槓、連莊、風圈） |
| 電腦對手 | 新手／普通／高手三種難度，加上打法個性：撲克有緊兇、鬆兇、跟注站、保守；麻將有速攻、做大牌、防守 |
| 教練 | 撲克：勝率、跟注所需勝率、改良張、出牌建議。麻將：向聽數、有效進張、打牌建議、聽牌與台數試算、防守提示。可隨時開關 |
| 學習 | 撲克 5 關、麻將 6 關互動教學；每日 3 題練習（同一天每個人題目相同）；每手牌局可重播並看當時的教練判斷 |
| 統計 | 入池率、加注率、胡牌率、放槍率、打牌效率等，並依弱點推薦教學關 |
| 家規 | 台數表 32 個台型、留牌、截胡或一炮多響、七搶一與八仙過海、平胡條件都能在首頁改 |
| 線上對戰 | 快速配對、6 碼房號的私人房間、電腦補位、斷線由電腦代打 |
| 其他 | 牌局自動存檔、可安裝到手機主畫面（PWA）、離線可玩、AI 在背景執行緒運算 |

## 專案結構

```
src/            原始碼（HTML 片段、CSS、JavaScript）
  poker_core.js   德州撲克規則引擎、AI、教練
  mj.js           台灣麻將規則引擎、台數計算、AI、教練
  ui.js           畫面：首頁、設定、牌桌
  learn.js        教學關卡與出題
  stats.js        個人統計、弱點報告、每日練習
  replay.js       牌局重播
  worker.js       背景執行緒（AI 與教練運算）
  net.js          即時資料庫介面（Firebase／本機測試）
  online.js       線上對戰：大廳、房間、房主與玩家同步
  save.js         存檔與啟動
docs/           建好的網站（GitHub Pages 從這裡發佈）
firebase/       Firebase 即時資料庫安全規則
mobile/         Capacitor 打包成 Android／iOS App
tests/          Node.js 自動測試
tools/          產生圖示的腳本
guides/         上架檢查清單
build.py        把 src/ 組成 docs/index.html
```

## 開發

需要 Python 3 與 Node.js 18 以上。

```bash
python3 build.py        # 組出 docs/（網站）與 dist/artifact.html（單一檔案預覽版）
npm test                # 模擬上千手撲克與麻將、檢查所有教學題與每日題
npm run serve           # 在 http://localhost:8000 試玩
```

改完 `src/` 記得重新執行 `python3 build.py` 並一起提交 `docs/`，GitHub Actions 會檢查兩者是否一致。

## 線上對戰設定（Firebase）

網站本身放在 GitHub Pages（只能放靜態檔案），線上對戰的即時同步用免費的 Firebase 即時資料庫。沒設定之前，線上頁只能用「本機測試」（同一個瀏覽器開兩個分頁對戰）。

1. 到 [Firebase 主控台](https://console.firebase.google.com/) 建立專案（不需要 Google Analytics）。
2. **Authentication** → 開始使用 → 登入方式 → 啟用 **匿名**。
3. **Authentication** → 設定 → 授權網域 → 新增 `midssinglin.github.io`。
4. **Realtime Database** → 建立資料庫 → 位置選 `asia-southeast1`（新加坡，離台灣較近）→ 以鎖定模式開始。
5. 在 Realtime Database 的 **規則** 分頁，貼上 `firebase/database.rules.json` 的內容並發佈。
6. 專案設定 → 一般 → 你的應用程式 → 新增 **網頁應用程式**，複製 `firebaseConfig`。
7. 把設定貼進 `docs/firebase-config.js`：

   ```js
   window.FIREBASE_CONFIG = {
     apiKey: "…",
     authDomain: "你的專案.firebaseapp.com",
     databaseURL: "https://你的專案-default-rtdb.asia-southeast1.firebasedatabase.app",
     projectId: "你的專案",
     appId: "…"
   };
   ```

8. 提交並推送，幾分鐘後網站的「線上」頁就會出現「網路連線」選項。

> Firebase 的網頁設定值本來就會出現在瀏覽器裡，不是密碼；真正保護資料的是第 5 步的安全規則。免費的 Spark 方案同時連線上限 100 人、每月下載 10 GB，練習用綽綽有餘。

### 線上對戰怎麼運作

房主的瀏覽器負責發牌和執行規則，再把桌面狀態寫到資料庫。每位玩家的手牌寫在只有本人讀得到的位置（安全規則限制），所以其他玩家看不到你的牌；但房主的瀏覽器握有全部牌局資料，懂技術的房主有辦法看到。這是不架設伺服器的取捨，免費籌碼遊戲可以接受。

- 輪到某位玩家時 40 秒沒動作：撲克自動過牌或棄牌，麻將自動打出摸到的牌；別人打牌時 15 秒沒決定就視為「過」。
- 玩家斷線 8 秒後由電腦接手；房主離開則房間關閉。

## 打包成 App

網站已經可以「加入主畫面」當成 App 使用。要上架商店，見 [`guides/上架檢查清單.md`](guides/上架檢查清單.md)：

```bash
python3 build.py
cd mobile && npm install && npx cap add android && npm run android
```

## 聲明

遊戲中的籌碼只是計分用的虛擬點數，免費取得、每場重置，沒有現金價值，不能購買、兌換、轉讓或提領，也不提供任何獎品。本專案僅供娛樂與學習。
