/*
 * 寵物素質完整分析器 (Web Worker / Async Optimized Version)
 * Update: 2026/02/11 - Performance Fix & Tolerance Logic
 * 修正：BP 範圍嚴格模式 + 結果允許 ±2 誤差
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
const BP_RATE = 0.2;
const MAX_ERROR_TOLERANCE = 2; // 允許的總和誤差

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
    const baseBp = petGrow.map((grow) => fixPos(grow * BP_RATE + getRate(grow) * lvldiff));
    const actualBp = baseBp.map((bp, i) => fixPos(bp + manualPoints[i] + BP_RATE * randomGrow[i]));
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
        // 修正：取兩者間的真實最小與最大值 (解決矩陣負係數問題)
        const val1 = resultA[i];
        const val2 = resultB[i];
        
        const realMinBP = Math.min(val1, val2);
        const realMaxBP = Math.max(val1, val2);
        
        // 嚴格判定：只取數學解交集的整數
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
    errorTolerance, // 此參數此處不強制使用，改用內建常數 MAX_ERROR_TOLERANCE
    signal
) {
    const startTime = performance.now();
    let lastYieldTime = startTime;
    const YIELD_INTERVAL = 30;

    // 0. 計算目標總和 (用於容錯比對)
    const targetSum = targetStats.hp + targetStats.mp + targetStats.atk + targetStats.def + targetStats.agi;

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

            // 時間切片 Check
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

            // 嚴格剪枝：基礎 BP 不可超過目標 BP
            if (baseBP.some((bp, i) => Math.floor(bp) > targetBPFloored[i])) continue;

            // 剩餘點數剪枝
            const needExtra = targetBPFloored.map((target, i) => Math.max(0, target - minBP[i]));
            const totalNeedExtra = needExtra.reduce((a, b) => a + b, 0);
            
            // 隨機檔10點約=2~2.1BP，給予3點寬限
            if (totalNeedExtra > (totalAllocatable + 3)) continue;

            for (const randoms of randomCombos) {
                totalChecked++;
                
                const bpNoAlloc = actualGrow.map((grow, i) => {
                    const b = fixPos(grow * bpRate + getRate(grow) * lvldiff);
                    return Math.floor(fixPos(b + bpRate * randoms[i]));
                });

                // 計算需要的加點
                let neededAlloc = targetBPFloored.map((target, i) => target - bpNoAlloc[i]);
                
                // 【重要】負數修正 (解決浮點數 -0.00001 導致判定錯誤)
                neededAlloc = neededAlloc.map(v => Math.max(0, v));

                // 檢查配點總量
                const totalNeeded = neededAlloc.reduce((a, b) => a + b, 0);

                if (requireExactAllocation) {
                    if (totalNeeded !== totalAllocatable) continue;
                } else {
                    if (totalNeeded > totalAllocatable) continue;
                }

                // 正算驗證
                const result = calculatePetStats(actualGrow, randoms, level, neededAlloc);
                const flooredStats = {
                    hp: Math.floor(result.stats.hp),
                    mp: Math.floor(result.stats.mp),
                    atk: Math.floor(result.stats.atk),
                    def: Math.floor(result.stats.def),
                    agi: Math.floor(result.stats.agi)
                };

                // === 關鍵修改：使用總和誤差 ±2 判定 ===
                const calcSum = flooredStats.hp + flooredStats.mp + flooredStats.atk + flooredStats.def + flooredStats.agi;
                const diff = calcSum - targetSum;

                if (Math.abs(diff) <= MAX_ERROR_TOLERANCE) {
                    
                    // 為了除錯方便，標記是否為精確解
                    const isExact = (diff === 0) && (
                        flooredStats.hp === targetStats.hp &&
                        flooredStats.mp === targetStats.mp &&
                        flooredStats.atk === targetStats.atk &&
                        flooredStats.def === targetStats.def &&
                        flooredStats.agi === targetStats.agi
                    );

                    allMatchedCombinations.push({
                        dropCombo: drops,
                        randomCombo: randoms,
                        manualPoints: neededAlloc,
                        stats: result.stats,
                        isExact: isExact,
                        sumDiff: diff,
                        actualGrow: actualGrow
                    });
                }
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