# 魔力寶貝 - 永恆初心 - 寵物檔次計算機

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-2.0.1-blue.svg)](https://github.com/yourusername/cg-pet-calculator-cloudflare)

一個用於計算《魔力寶貝 - 永恆初心》遊戲中寵物成長檔次的純前端網頁工具。

## 功能特色

### 核心功能
- 🔍 **智能反推計算**：根據寵物當前數值反推可能的成長檔組合
- 📊 **詳細結果分析**：顯示掉檔、隨機檔、加點等詳細資訊
- 🎯 **機率統計**：計算每種組合的出現機率
- 🔎 **寵物快速搜尋**：內建寵物資料庫，支援繁簡搜尋

### 技術特點
- ⚡ **1等寵物優化**：針對1等寵物使用完全窮舉法（3,125 × 1,001 種組合）
- 🧮 **高等寵物優化**：使用高斯消去法+剪枝算法，大幅提升計算效率
- 🎮 **遊戲機制準確**：嚴格遵循隨機檔總和必須等於10的遊戲規則
- 🛑 **可中斷計算**：長時間運算可隨時中斷
- 📱 **響應式設計**：支援桌面和行動裝置

## 線上使用

訪問部署版本：[https://your-site.pages.dev](https://your-site.pages.dev)

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

1. **輸入寵物成長檔**
   - 格式：五個數字，以空格或逗號分隔
   - 順序：體力、力量、強度、速度、魔法
   - 例如：`36 38 34 11 6`

2. **輸入寵物素質**
   - 格式：五個數字，以空格或逗號分隔
   - 順序：HP、MP、ATK、DEF、AGI
   - 例如：`1797 683 348 355 132`
   - ⚠️ **重要**：計算前請務必卸下所有裝備

3. **設定參數**
   - **寵物等級**：寵物當前等級（預設1）
   - **剩餘點數**：未分配的點數（預設0）
   - **允許誤差**：建議使用「智能」模式（預設）

4. **查看結果**
   - 結果按機率從高到低排序
   - 點擊展開可查看詳細的隨機檔組合

### 快速搜尋寵物

使用「快速搜尋寵物」功能可以自動填入成長檔：
- 支援繁體/簡體中文搜尋
- 輸入寵物名稱（如：虎人）
- 點擊結果即可自動填入

### 常見問題

**Q: 為什麼計算結果是「未找到符合條件的組合」？**
- 請確認是否卸下所有裝備
- 檢查輸入的數值是否正確
- 嘗試增加允許誤差值

**Q: 計算時間過久怎麼辦？**
- 點擊「中斷計算」按鈕停止運算
- 使用「智能」誤差模式可以加快計算
- 確認輸入數值是否正確

**Q: 1等寵物和高等寵物的計算有什麼不同？**
- 1等寵物：使用完全窮舉法，保證找出所有可能組合
- 高等寵物：使用高斯消去法優化，在準確性和效率間取得平衡

## 技術架構

### 前端技術
- **HTML5 + ES6 Modules**：模組化架構
- **Bootstrap 5**：UI 框架
- **OpenCC.js**：繁簡轉換

### 計算核心

#### 成長公式
```
BP[i] = grow[i] × 0.2 + getRate(grow[i]) × (level - 1) + manual[i] + random[i] × 0.2
```

#### 面板轉換矩陣
```javascript
const MATRIX = [
    [8,   2,   3,   3,   1  ],  // HP
    [1,   2,   2,   2,   10 ],  // MP
    [0.2, 2.7, 0.3, 0.3, 0.2],  // ATK
    [0.2, 0.3, 3,   0.3, 0.2],  // DEF
    [0.1, 0.2, 0.2, 2,   0.1],  // AGI
];
```

#### 關鍵約束
- **Drop 範圍**：每個屬性可 drop 0-4 檔
- **Random 約束**：五個屬性的隨機檔總和必須等於 10
- **Manual 約束**：手動配點總和 = (level - 1) - remainingPoints

### 算法優化

#### 1等寵物專用算法
```javascript
// 組合數：3,125 × 1,001 = 3,128,125 種
- Drop 組合：5^5 = 3,125
- Random 組合：C(14,4) = 1,001（總和=10）
- 使用剪枝優化避免無效組合
```

#### 高等寵物算法
```javascript
1. 高斯消去法估算目標 BP
2. 為每個屬性生成候選 {manual, random} 組合
3. 使用回溯法搜尋有效組合
4. 剪枝條件：
   - manual 總和 = (level - 1) - remainingPoints
   - random 總和 = 10
```

## 專案結構

```
cg-pet-calculator-cloudflare/
├── public/
│   ├── index.html              # 主頁面
│   ├── originmood-pet-data.json # 寵物資料庫
│   └── js/
│       └── logic.js            # 計算核心邏輯
├── wrangler.toml               # Cloudflare Pages 設定
├── package.json                # 專案配置
├── README.md                   # 專案說明
└── LICENSE                     # MIT 授權
```

## 更新日誌

### v2.0.1 (2026-02-10)
- ✨ 新增1等寵物優化算法
- 🐛 修正隨機檔總和約束（改為固定等於10）
- ⚡ 效能優化：加入剪枝邏輯
- 📝 完善文檔和註解

### v2.0.0
- 🎉 重構為純前端版本
- 🔍 新增寵物快速搜尋功能
- 🛑 新增中斷計算功能
- 🎨 改善 UI/UX

## 貢獻指南

歡迎提交 Issue 或 Pull Request！

### 開發流程
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

## 聯絡資訊

- 作者：Phelim Xue
- 專案連結：[https://github.com/yourusername/cg-pet-calculator-cloudflare](https://github.com/yourusername/cg-pet-calculator-cloudflare)

---

⭐ 如果這個專案對你有幫助，歡迎給個星星！
