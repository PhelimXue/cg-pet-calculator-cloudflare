# 魔力寶貝 - 永恆初心 - 寵物檔次計算機

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-2.1.0-blue.svg)](https://github.com/PhelimXue/cg-pet-calculator-cloudflare)

一個用於計算《魔力寶貝 - 永恆初心》遊戲中寵物成長檔次的純前端網頁工具。

## 功能特色

### 核心功能
- 🔍 **智能反推計算**：根據寵物當前數值反推可能的成長檔組合
- 🧠 **智能策略過濾**：自動過濾雜亂配點，優先顯示符合人類配點邏輯（如：全體、全攻、體攻混點）的結果
- 🔗 **結果分享功能**：可生成專屬連結，將計算參數與結果快速分享給他人
- 🎯 **嚴格誤差驗證**：容許個別素質 ±1 的極小誤差，並自動排除誤差過多的組合
- 🔎 **寵物快速搜尋**：內建寵物資料庫，支援繁簡搜尋

### 技術特點
- 🚀 **統一核心演算法**：採用高斯消去法 (Gaussian Elimination) 計算 BP 理論區間，不再區分等級算法，大幅提升運算準確度
- ⚡ **非同步運算優化**：使用 Async/Await 與分段運算機制，確保網頁在大量計算時不卡頓
- ✂️ **雙重剪枝策略**：
  1. **邊界剪枝**：透過線性代數計算素質邊界，跳過不可能的掉檔組合
  2. **容錯剪枝**：嚴格限制單項誤差 ≤1 且總誤差項目 ≤2，排除無效結果
- 📱 **響應式設計**：Bootstrap 5 介面，完美支援桌面和行動裝置

## 線上使用

訪問部署版本：[https://cg-pet-calculator-cloudflare.pages.dev/](https://cg-pet-calculator-cloudflare.pages.dev/)

## 本地開發

### 環境需求
- Node.js 16.x 或更高版本
- npm 或 yarn

### 安裝步驟

```bash
# 克隆專案
git clone https://github.com/yourusername/cg-pet-calculator-cloudflare.git
cd cg-pet-calculator-cloudflare

# 安裝依賴
npm install

# 啟動開發伺服器
npm run dev
```

開發伺服器將在 `http://localhost:8788` 啟動。

### 部署到 Cloudflare Pages

```bash
# 部署到 Cloudflare Pages
npm run deploy
```

## 使用說明

### 基本使用流程

1. **搜尋或輸入寵物**
   - 可直接在搜尋框輸入寵物名稱（如：虎人）自動填入成長檔
   - 或手動輸入五項成長檔（體力、力量、強度、速度、魔法）

2. **輸入寵物資訊**
   - **成長率**：預設 20
   - **等級**：寵物當前等級
   - **剩餘點數**：未分配的點數
   - **寵物素質**：輸入面版上的 HP、MP、ATK、DEF、AGI
   - ⚠️ **重要**：計算前請務必卸下所有裝備

3. **查看結果**
   - **智能排序**：系統會優先顯示「配點單純」且「誤差最小」的組合
   - **詳細資訊**：點擊展開可查看所有可能的隨機檔組合
   - **誤差標示**：若計算結果非完全吻合，會標示 `±1` 或誤差值

4. **分享結果**
   - 點擊上方的「📋 複製分享連結」按鈕，即可將當前的計算結果網址傳送給朋友

### 常見問題

**Q: 為什麼計算結果顯示「未找到符合條件的組合」？**
- 請確認是否卸下所有裝備（包含水晶、飾品）。
- 請確認輸入的「剩餘點數」是否正確。
- 本計算機採用嚴格模式：單項素質誤差不能超過 1，且最多只允許 2 個項目有誤差。若您的寵物數據偏差過大，將不會顯示結果。

**Q: "智能過濾" 是什麼意思？**
- 由於數學上可能存在無數種「亂配點」的組合（例如：體+1、力+2、防+3...），這不符合玩家習慣。
- 系統會優先篩選出「配點集中」（例如：全體、2體2力）的結果，幫助您快速判斷最可能的檔次。

**Q: 計算一段時間後自動停止？**
- 若運算量過大，您可以隨時點擊「中斷計算」。
- 系統設計了超時保護，若輸入數值明顯不合理導致窮舉過多，建議檢查輸入數值。

## 技術架構

### 前端技術
- **HTML5 + ES6 Modules**
- **Bootstrap 5**：UI 框架
- **OpenCC.js**：繁簡轉換

### 計算核心 update (v2.1)

#### 核心邏輯流程
1. **反向區間估算**：
   利用高斯消去法 (`solveLinearSystem`)，根據輸入素質 ±0.9999 的範圍，反推該等級下可能的 BP (Basic Points) 整數區間。
   
2. **組合生成與剪枝**：
   - 生成所有合法 BP 組合
   - 遍歷掉檔組合 (Drop 0~4)
   - 遍歷隨機檔組合 (Random Total = 10)

3. **嚴格誤差判定 (Strict Tolerance)**：
   不再使用總和誤差，而是對每個屬性進行獨立檢核：
   - 規則 A：單項屬性誤差絕對值必須 `≤ 1`
   - 規則 B：有誤差的屬性數量必須 `≤ 2` 個
   
   ```javascript
   // 範例判定邏輯
   const dHP = calculatedHP - targetHP;
   if (Math.abs(dHP) > 1) continue; // 稍有偏差即過濾
   ```

4. **最佳策略排序 (Best Strategy Sort)**：
   結果產出後，依序權重進行排序：
   - **複雜度 (Complexity)**：配點種類越少越好 (單項配點 > 雙項配點 > 雜亂配點)
   - **精準度 (Accuracy)**：誤差總和越小越好
   - **數值集中度 (Concentration)**：單項數值越高越好

## 專案結構

```
cg-pet-calculator-cloudflare/
├── public/
│   ├── index.html              # 主頁面 (UI)
│   ├── originmood-pet-data.json # 寵物資料庫
│   └── js/
│       └── logic.js            # 計算核心 (Worker/Logic)
├── wrangler.toml               # Cloudflare Pages 設定
├── package.json                # 專案配置
├── README.md                   # 專案說明
└── LICENSE                     # MIT 授權
```

## 更新日誌

### v2.1.0 (2026-02-11)
- 🚀 **核心算法重構**：移除舊版分級算法，統一採用高斯消去區間反算，大幅提升準確度。
- 🎯 **嚴格誤差機制**：引入單項 ±1 誤差限制，排除無效的寬鬆結果。
- ✨ **智能配點過濾**：新增結果排序邏輯，優先顯示符合玩家配點習慣的組合。
- 🔗 **分享功能**：新增 URL 參數分享功能。
- ⚡ **效能優化**：改善非同步運算流程，即使大量計算也不會凍結瀏覽器。
- ➖ **功能簡化**：移除「交集計算」功能，專注於單次高精準度計算。

### v2.0.0
- 🎉 重構為純前端版本
- 🔍 新增寵物快速搜尋功能
- 🛑 新增中斷計算功能

## 貢獻指南

歡迎提交 Issue 或 Pull Request！

1. Fork 本專案
2. 創建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 開啟 Pull Request

## 授權條款

本專案採用 MIT 授權條款 - 詳見 [LICENSE](LICENSE) 文件

## 致謝

- 感謝《魔力寶貝 - 永恆初心》遊戲社群提供的寵物資料
- 感謝所有貢獻者的支持

---

⭐ 如果這個專案對你有幫助，歡迎給個星星！