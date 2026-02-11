/*
 * 寵物素質完整分析器 (Web Worker / Async Optimized Version)
 * Update: 2026/02/11 - Performance Fix & Strict Tolerance Logic
 * 修正：
 * 1. 移除總和誤差判定
 * 2. 新增個別素質誤差判定 (每項最多 ±1)
 * 3. 新增誤差數量限制 (最多允許 2 個素質有誤差)
 */

// ==========================================
// 1. 常數與矩陣定義
// ==========================================

const MATRIX = [
    [8,   2,   3,   3,   1  ],  // HP
    [1,   2,   2,   2,   10 ],  // MP
    [0.2, 2.7, 0.3, 0.3, 0.2],  // ATK
    [0.2, 0.3, 3,   0.3, 0.2],  // DEF
    [0.1, 0.2, 0.2, 2,   0.1],  // AGI
];

const BASE = 20;
// 注意：MAX_ERROR_TOLERANCE 這裡不再作為總和判斷，改由內部邏輯控制個別誤差
const INDIVIDUAL_TOLERANCE = 1; // 個別容許誤差
const MAX_ERROR_COUNT = 2;      // 容許有誤差的項目數量

const fullRates = {
    0:0, 1:0.04, 2:0.08, 3:0.12, 4:0.16, 5:0.205,
    6:0.25, 7:0.29, 8:0.33, 9:0.37, 10:0.415,
    11:0.46, 12:0.50, 13:0.54, 14:0.58, 15:0.625,
    16:0.67, 17:0.71, 18:0.75, 19:0.79, 20:0.835,
    21:0.88, 22:0.92, 23:0.96, 24:1.00, 25:1.045,
    26:1.09, 27:1.13, 28:1.17, 29:1.21, 30:1.255,
    31:1.30, 32:1.34, 33:1.38, 34:1.42, 35:1.465,
    36:1.51, 37:1.55, 38:1.59, 39:1.63, 40:1.675,
    41:1.72, 42:1.76, 43:1.80, 44:1.84, 45:1.885,
    46:1.93, 47:1.97, 48:2.01, 49:2.05, 50:2.095,
    51:2.14, 52:2.18
};

// ==========================================
// 2. 基礎工具函數
// ==========================================

function getRate(grow) {
    return fullRates[Math.max(0, Math.min(52, grow))] || 0;
}

function fixPos(n) {
    return Math.round(n * 10000) / 10000;
}

// ==========================================
// 3. 高斯消去法與核心反算
// ==========================================

function solveLinearSystem(A, B) {
    let n = A.length;
    let mat = A.map(row => [...row]);
    let x = [...B];

    // 前向消元
    for (let i = 0; i < n; i++) {
        let maxRow = i;
        for (let k = i + 1; k < n; k++) {
            if (Math.abs(mat[k][i]) > Math.abs(mat[maxRow][i])) maxRow = k;
        }
        [mat[i], mat[maxRow]] = [mat[maxRow], mat[i]];
        [x[i], x[maxRow]] = [x[maxRow], x[i]];

        for (let k = i + 1; k < n; k++) {
            let factor = mat[k][i] / mat[i][i];
            for (let j = i; j < n; j++) mat[k][j] -= factor * mat[i][j];
            x[k] -= factor * x[i];
        }
    }

    // 回代
    let result = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
        let sum = 0;
        for (let j = i + 1; j < n; j++) sum += mat[i][j] * result[j];
        result[i] = (x[i] - sum) / mat[i][i];
    }

    return result;
}

function bpToStats(bpArray) {
    const calc = (row) => fixPos(
        fixPos(MATRIX[row][0] * bpArray[0]) +
        fixPos(MATRIX[row][1] * bpArray[1]) +
        fixPos(MATRIX[row][2] * bpArray[2]) +
        fixPos(MATRIX[row][3] * bpArray[3]) +
        fixPos(MATRIX[row][4] * bpArray[4])
    ) + BASE;

    return {
        hp: fixPos(calc(0)),
        mp: fixPos(calc(1)),
        atk: fixPos(calc(2)),
        def: fixPos(calc(3)),
        agi: fixPos(calc(4))
    };
}

function calculatePetStats(petGrow, randomGrow, petLevel, manualPoints) {
    const lvldiff = petLevel - 1;
    // 成長率根據 BP_RATE 計算
    const baseBp = petGrow.map((grow) => fixPos(grow * 0.2 + getRate(grow) * lvldiff));
    // 實際 BP = 基礎 + 加點 + 隨機檔影響
    const actualBp = baseBp.map((bp, i) => fixPos(bp + manualPoints[i] + 0.2 * randomGrow[i]));
    const stats = bpToStats(actualBp);
    return { baseBp, actualBp, stats };
}

// ==========================================
// 4. 組合生成與範圍計算
// ==========================================

let CACHED_DROP_COMBOS = null;
let CACHED_RANDOM_COMBOS = null;

function getDropCombos() {
    if (CACHED_DROP_COMBOS) return CACHED_DROP_COMBOS;
    const results = [];
    for (let t = 0; t <= 4; t++) 
        for (let l = 0; l <= 4; l++) 
            for (let q = 0; q <= 4; q++) 
                for (let s = 0; s <= 4; s++) 
                    for (let m = 0; m <= 4; m++) 
                        results.push([t, l, q, s, m]);
    CACHED_DROP_COMBOS = results;
    return results;
}

function getRandomCombos() {
    if (CACHED_RANDOM_COMBOS) return CACHED_RANDOM_COMBOS;
    const results = [];
    function backtrack(current, remaining, index) {
        if (index === 5) {
            if (remaining === 0) results.push([...current]);
            return;
        }
        const maxVal = Math.min(remaining, 10);
        for (let i = 0; i <= maxVal; i++) {
            current.push(i);
            backtrack(current, remaining - i, index + 1);
            current.pop();
        }
    }
    backtrack([], 10, 0);
    CACHED_RANDOM_COMBOS = results;
    return results;
}

/**
 * 嚴格版的 BP 範圍計算
 */
function calculateBPRanges(displayStats, tolerance = 0.9999) {
    const bVecA = [displayStats.hp, displayStats.mp, displayStats.atk, displayStats.def, displayStats.agi].map(v => v - BASE);
    const resultA = solveLinearSystem(MATRIX, bVecA);

    const bVecB = [displayStats.hp + tolerance, displayStats.mp + tolerance, displayStats.atk + tolerance, displayStats.def + tolerance, displayStats.agi + tolerance].map(v => v - BASE);
    const resultB = solveLinearSystem(MATRIX, bVecB);

    const bpRanges = [];
    for (let i = 0; i < 5; i++) {
        const val1 = resultA[i];
        const val2 = resultB[i];
        
        const realMinBP = Math.min(val1, val2);
        const realMaxBP = Math.max(val1, val2);
        
        const minFloor = Math.floor(realMinBP); 
        const maxFloor = Math.floor(realMaxBP);

        const possibleValues = [];
        for (let j = minFloor; j <= maxFloor; j++) {
            possibleValues.push(j);
        }
        bpRanges.push(possibleValues);
    }
    return bpRanges;
}

function generateBPCombinations(bpRanges) {
    const results = [];
    function backtrack(index, current) {
        if (index === 5) {
            results.push([...current]);
            return;
        }
        for (const value of bpRanges[index]) {
            current[index] = value;
            backtrack(index + 1, current);
        }
    }
    backtrack(0, [0, 0, 0, 0, 0]);
    return results;
}

// ==========================================
// 5. Async 核心邏輯
// ==========================================

export async function smartReverseCalculateMatrix(
    baseGrow, 
    targetStats, 
    level, 
    bpRate, 
    maxResults, 
    remainingPoints, 
    _unusedTolerance, // 保留參數位置但不使用
    signal
) {
    const startTime = performance.now();
    let lastYieldTime = startTime;
    const YIELD_INTERVAL = 30;

    // 1. 計算嚴格 BP 範圍
    const bpRanges = calculateBPRanges(targetStats);
    
    if (bpRanges.some(r => r.length === 0)) {
        return { results: [], executionTime: 0, totalCombinationsTested: 0 };
    }

    const bpCombinations = generateBPCombinations(bpRanges);
    const dropCombos = getDropCombos();
    const randomCombos = getRandomCombos();
    const totalAllocatable = level - 1 - remainingPoints;
    const requireExactAllocation = (remainingPoints === 0);

    const allMatchedCombinations = [];
    let totalChecked = 0;

    // === 開始分析 ===
    
    for (let bpIndex = 0; bpIndex < bpCombinations.length; bpIndex++) {
        const targetBPFloored = bpCombinations[bpIndex];

        for (let dIdx = 0; dIdx < dropCombos.length; dIdx++) {
            const drops = dropCombos[dIdx];

            if (dIdx % 200 === 0) {
                const now = performance.now();
                if (now - lastYieldTime > YIELD_INTERVAL) {
                    await new Promise(r => setTimeout(r, 0)); 
                    lastYieldTime = performance.now();
                    if (signal && signal.aborted) throw new Error('ABORTED');
                }
            }

            const actualGrow = baseGrow.map((g, i) => g - drops[i]);
            if (actualGrow.some(g => g < 0)) continue;

            const lvldiff = level - 1;
            const baseBP = actualGrow.map(g => fixPos(g * bpRate + getRate(g) * lvldiff));
            const minBP = baseBP.map(bp => Math.floor(bp));

            if (baseBP.some((bp, i) => Math.floor(bp) > targetBPFloored[i])) continue;

            const needExtra = targetBPFloored.map((target, i) => Math.max(0, target - minBP[i]));
            const totalNeedExtra = needExtra.reduce((a, b) => a + b, 0);
            
            if (totalNeedExtra > (totalAllocatable + 3)) continue;

            for (const randoms of randomCombos) {
                totalChecked++;
                
                const bpNoAlloc = actualGrow.map((grow, i) => {
                    const b = fixPos(grow * bpRate + getRate(grow) * lvldiff);
                    return Math.floor(fixPos(b + bpRate * randoms[i]));
                });

                let neededAlloc = targetBPFloored.map((target, i) => target - bpNoAlloc[i]);
                neededAlloc = neededAlloc.map(v => Math.max(0, v));

                const totalNeeded = neededAlloc.reduce((a, b) => a + b, 0);

                if (requireExactAllocation) {
                    if (totalNeeded !== totalAllocatable) continue;
                } else {
                    if (totalNeeded > totalAllocatable) continue;
                }

                // 正算驗證
                const result = calculatePetStats(actualGrow, randoms, level, neededAlloc);
                
                // === 新修正：個別誤差檢查 ===
                // 取出整數後的計算值
                const cHP = Math.floor(result.stats.hp);
                const cMP = Math.floor(result.stats.mp);
                const cATK = Math.floor(result.stats.atk);
                const cDEF = Math.floor(result.stats.def);
                const cAGI = Math.floor(result.stats.agi);

                // 計算個別誤差 (計算值 - 輸入目標值)
                const dHP = cHP - targetStats.hp;
                const dMP = cMP - targetStats.mp;
                const dATK = cATK - targetStats.atk;
                const dDEF = cDEF - targetStats.def;
                const dAGI = cAGI - targetStats.agi;

                // 規則1: 任何一項誤差絕對值不能超過 1
                if (Math.abs(dHP) > 1 || Math.abs(dMP) > 1 || Math.abs(dATK) > 1 ||
                    Math.abs(dDEF) > 1 || Math.abs(dAGI) > 1) {
                    continue;
                }

                // 規則2: 統計有誤差的項目數量 (非 0 即為有誤差)
                let errorCount = 0;
                if (dHP !== 0) errorCount++;
                if (dMP !== 0) errorCount++;
                if (dATK !== 0) errorCount++;
                if (dDEF !== 0) errorCount++;
                if (dAGI !== 0) errorCount++;

                // 只有當誤差項目數量 <= 2 時才允許
                if (errorCount > MAX_ERROR_COUNT) {
                    continue;
                }

                // 符合條件，加入結果
                // sumDiff 設為所有誤差的代數和，供前端顯示參考 (雖然經過篩選，但總和可能為 0 卻非完全精準)
                const sumDiff = dHP + dMP + dATK + dDEF + dAGI;
                const isExact = (errorCount === 0);

                allMatchedCombinations.push({
                    dropCombo: drops,
                    randomCombo: randoms,
                    manualPoints: neededAlloc,
                    stats: result.stats,
                    isExact: isExact,
                    sumDiff: sumDiff,  // 用於前端顯示 "+1" 或 "-2"
                    diffs: { hp: dHP, mp: dMP, atk: dATK, def: dDEF, agi: dAGI }, // 用於更細節的顯示(若需要)
                    actualGrow: actualGrow
                });
            }
        }
    }

    const endTime = performance.now();
    return {
        results: allMatchedCombinations,
        executionTime: ((endTime - startTime) / 1000).toFixed(2),
        totalCombinationsTested: totalChecked
    };
}