/*
 * 寵物素質完整分析器 (支援 5 圍與 7 圍)
 */

// 橫向是 BP 體 力 強 速 魔
// 直向是素質 點 BP 所得的素質：體 魔 攻 防 敏 [精 回]
const MATRIX = [
    [8,   2,   3,   3,   1  ], // HP
    [1,   2,   2,   2,   10 ], // MP
    [0.2, 2.7, 0.3, 0.3, 0.2], // Atk
    [0.2, 0.3, 3,   0.3, 0.2], // Def
    [0.1, 0.2, 0.2, 2,   0.1], // Agi
    [-0.3, -0.1, 0.2, -0.1, 0.8], // Spt (精神: 重魔)
    [0.8, -0.1, -0.1, 0.2, -0.3], // Rec (回復: 重體)
];

const BASE = 20;

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

function getRate(grow) {
    return fullRates[Math.max(0, Math.min(52, grow))] || 0;
}

function fixPos(n) {
    return Math.round(n * 10000) / 10000;
}

/**
 * 解線性方程組 (只使用前 5 列 Matrix 解 5 個變數)
 */
function solveLinearSystem(FullMatrix, B) {
    // 只取 Matrix 的前 5 列 (HP, MP, Atk, Def, Agi) 來進行反推 BP
    // 因為 5 個 BP 變數只需要 5 條方程式就能解出唯一解
    // 精神與回復用於驗證，不用於求解
    let n = 5; 
    let mat = FullMatrix.slice(0, 5).map(row => [...row]);
    let x = [...B].slice(0, 5); // 確保 B 也只取前 5 個

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
    let result = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
        let sum = 0;
        for (let j = i + 1; j < n; j++) sum += mat[i][j] * result[j];
        result[i] = (x[i] - sum) / mat[i][i];
    }
    return result;
}

function bpToStats(bpArray) {
    // 正向計算：一定算出 7 個屬性
    const calc = (row) => fixPos(
        fixPos(MATRIX[row][0] * bpArray[0]) +
        fixPos(MATRIX[row][1] * bpArray[1]) +
        fixPos(MATRIX[row][2] * bpArray[2]) +
        fixPos(MATRIX[row][3] * bpArray[3]) +
        fixPos(MATRIX[row][4] * bpArray[4])
    );

    return {
        hp: fixPos(calc(0) + BASE),
        mp: fixPos(calc(1) + BASE),
        atk: fixPos(calc(2) + BASE),
        def: fixPos(calc(3) + BASE),
        agi: fixPos(calc(4) + BASE),
        spt: fixPos(calc(5) + 100), // 精神基數為100
        rec: fixPos(calc(6) + 100)  // 回復基數為100
    };
}

function fastBpToValues(bpArray) {
    // 快速計算不含 Base 的數值，用於大量迭代
    // 回傳 [HP, MP, Atk, Def, Agi, Spt, Rec]
    return [
        MATRIX[0][0] * bpArray[0] + MATRIX[0][1] * bpArray[1] + MATRIX[0][2] * bpArray[2] + MATRIX[0][3] * bpArray[3] + MATRIX[0][4] * bpArray[4],
        MATRIX[1][0] * bpArray[0] + MATRIX[1][1] * bpArray[1] + MATRIX[1][2] * bpArray[2] + MATRIX[1][3] * bpArray[3] + MATRIX[1][4] * bpArray[4],
        MATRIX[2][0] * bpArray[0] + MATRIX[2][1] * bpArray[1] + MATRIX[2][2] * bpArray[2] + MATRIX[2][3] * bpArray[3] + MATRIX[2][4] * bpArray[4],
        MATRIX[3][0] * bpArray[0] + MATRIX[3][1] * bpArray[1] + MATRIX[3][2] * bpArray[2] + MATRIX[3][3] * bpArray[3] + MATRIX[3][4] * bpArray[4],
        MATRIX[4][0] * bpArray[0] + MATRIX[4][1] * bpArray[1] + MATRIX[4][2] * bpArray[2] + MATRIX[4][3] * bpArray[3] + MATRIX[4][4] * bpArray[4],
        MATRIX[5][0] * bpArray[0] + MATRIX[5][1] * bpArray[1] + MATRIX[5][2] * bpArray[2] + MATRIX[5][3] * bpArray[3] + MATRIX[5][4] * bpArray[4],
        MATRIX[6][0] * bpArray[0] + MATRIX[6][1] * bpArray[1] + MATRIX[6][2] * bpArray[2] + MATRIX[6][3] * bpArray[3] + MATRIX[6][4] * bpArray[4]
    ];
}

export function calculatePetStats(petGrow, randomGrow, petLevel, manualPoints) {
    if (petLevel === 1) {
        const actualBp = petGrow.map((g, i) => fixPos((g + randomGrow[i]) * 0.2)); 
        const stats = bpToStats(actualBp);
        return { baseBp: actualBp, actualBp, stats };
    }
    
    const lvldiff = petLevel - 1;
    const baseBp = petGrow.map((grow) => fixPos(grow * 0.2 + getRate(grow) * lvldiff));
    const actualBp = baseBp.map((bp, i) => fixPos(bp + manualPoints[i] + 0.2 * randomGrow[i]));
    const stats = bpToStats(actualBp);
    return { baseBp, actualBp, stats };
}

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

function calculateBPRanges(displayStats, tolerance = 0.9999) {
    // 這裡只取前 5 個屬性來解線性方程，因為是用於限縮 BP 搜尋範圍
    const bVecA = [displayStats.hp, displayStats.mp, displayStats.atk, displayStats.def, displayStats.agi].map(v => v - BASE);
    const resultA = solveLinearSystem(MATRIX, bVecA);

    const bVecB = [displayStats.hp + tolerance, displayStats.mp + tolerance, displayStats.atk + tolerance, displayStats.def + tolerance, displayStats.agi + tolerance].map(v => v - BASE);
    const resultB = solveLinearSystem(MATRIX, bVecB);

    const bpRanges = [];
    for (let i = 0; i < 5; i++) {
        const val1 = resultA[i];
        const val2 = resultB[i];
        
        const minFloor = Math.floor(Math.min(val1, val2)); 
        const maxFloor = Math.floor(Math.max(val1, val2));

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

export async function smartReverseCalculateMatrix(
    baseGrow, 
    targetStats, // 物件: {hp, mp, atk, def, agi, spt?, rec?}
    level, 
    bpRate, 
    maxResults, 
    remainingPoints, 
    _unusedTolerance, 
    signal
) {
    const startTime = performance.now();
    let lastYieldTime = startTime;
    const YIELD_INTERVAL = 50; 
    const allMatchedCombinations = [];
    let totalChecked = 0;

    // 判斷是否需要檢核精回 (7圍模式)
    const checkSpt = targetStats.spt !== undefined;
    const checkRec = targetStats.rec !== undefined;

    function addResult(actualGrow, randoms, manualPoints, stats, diffs) {
        allMatchedCombinations.push({
            dropCombo: actualGrow.map((v, i) => baseGrow[i] - v),
            randomCombo: randoms,
            manualPoints: manualPoints,
            stats: stats,
            isExact: Object.values(diffs).every(d => d === 0),
            sumDiff: Object.values(diffs).reduce((a, b) => a + b, 0),
            diffs: diffs,
            actualGrow: actualGrow
        });
    }

    // 1等計算邏輯
    if (level === 1) {
        const zeroPoints = [0, 0, 0, 0, 0];
        const randomCombos = getRandomCombos(); 
        const dropCombos = getDropCombos();     

        const cachedRandomEffects = new Array(randomCombos.length);
        for (let i = 0; i < randomCombos.length; i++) {
            const r = randomCombos[i];
            const randBP = [r[0]*0.2, r[1]*0.2, r[2]*0.2, r[3]*0.2, r[4]*0.2];
            cachedRandomEffects[i] = fastBpToValues(randBP);
        }

        for (let dIdx = 0; dIdx < dropCombos.length; dIdx++) {
            const drops = dropCombos[dIdx];

            if (dIdx % 1000 === 0) {
                 const now = performance.now();
                 if (now - lastYieldTime > YIELD_INTERVAL) {
                     await new Promise(r => setTimeout(r, 0));
                     lastYieldTime = performance.now();
                     if (signal && signal.aborted) throw new Error('ABORTED');
                 }
            }

            const actualGrow = baseGrow.map((g, i) => g - drops[i]);
            
            // 1等公式: (成長 - 掉檔) * 0.2 + 隨機 * 0.2
            const baseBP = actualGrow.map(val => val * 0.2);
            const baseVals = fastBpToValues(baseBP);

            for (let rIdx = 0; rIdx < randomCombos.length; rIdx++) {
                totalChecked++;
                const randVals = cachedRandomEffects[rIdx];
                
                // 1. 先比對 5 圍
                const rawHP = baseVals[0] + randVals[0];
                if (Math.floor(fixPos(rawHP + BASE)) !== targetStats.hp) continue;

                const rawMP = baseVals[1] + randVals[1];
                if (Math.floor(fixPos(rawMP + BASE)) !== targetStats.mp) continue;

                const rawATK = baseVals[2] + randVals[2];
                if (Math.floor(fixPos(rawATK + BASE)) !== targetStats.atk) continue;

                const rawDEF = baseVals[3] + randVals[3];
                if (Math.floor(fixPos(rawDEF + BASE)) !== targetStats.def) continue;

                const rawAGI = baseVals[4] + randVals[4];
                if (Math.floor(fixPos(rawAGI + BASE)) !== targetStats.agi) continue;

                // 2. 若有 7 圍輸入，比對精回 (精神回復基數為 100)
                const rawSPT = baseVals[5] + randVals[5];
                if (checkSpt && Math.floor(fixPos(rawSPT + 100)) !== targetStats.spt) continue;

                const rawREC = baseVals[6] + randVals[6];
                if (checkRec && Math.floor(fixPos(rawREC + 100)) !== targetStats.rec) continue;

                // 整理最終數值
                const stats = {
                    hp: fixPos(rawHP + BASE),
                    mp: fixPos(rawMP + BASE),
                    atk: fixPos(rawATK + BASE),
                    def: fixPos(rawDEF + BASE),
                    agi: fixPos(rawAGI + BASE),
                    spt: fixPos(rawSPT + 100),
                    rec: fixPos(rawREC + 100)
                };
                
                addResult(actualGrow, randomCombos[rIdx], zeroPoints, stats, { hp:0, mp:0, atk:0, def:0, agi:0 });
            }
        }

        const endTime = performance.now();
        return {
            results: allMatchedCombinations,
            executionTime: ((endTime - startTime) / 1000).toFixed(3),
            totalCombinationsTested: totalChecked
        };
    }

    // 非1等計算邏輯 (線性代數反推，僅使用 5 圍找出可能的 BP 組合)
    const bpRanges = calculateBPRanges(targetStats); // 只用前5
    if (bpRanges.some(r => r.length === 0)) {
        return { results: [], executionTime: 0, totalCombinationsTested: 0 };
    }

    const bpCombinations = generateBPCombinations(bpRanges);
    const dropCombos = getDropCombos();
    const randomCombos = getRandomCombos();
    const totalAllocatable = level - 1 - remainingPoints;
    const requireExactAllocation = (remainingPoints === 0);

    for (let bpIndex = 0; bpIndex < bpCombinations.length; bpIndex++) {
        const targetBPFloored = bpCombinations[bpIndex]; // [T, L, Q, S, M]

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
            // 基礎 BP (不含隨機與加點)
            const baseBP = actualGrow.map(g => fixPos(g * bpRate + getRate(g) * lvldiff));
            const minBP = baseBP.map(bp => Math.floor(bp));

            // 初步檢查: 基礎 BP 不能超過目標 BP (因為只能加點往上加)
            if (baseBP.some((bp, i) => Math.floor(bp) > targetBPFloored[i])) continue;

            // 檢查加點點數是否合理
            const needExtra = targetBPFloored.map((target, i) => Math.max(0, target - minBP[i]));
            const totalNeedExtra = needExtra.reduce((a, b) => a + b, 0);
            if (totalNeedExtra > (totalAllocatable + 3)) continue;

            for (const randoms of randomCombos) {
                totalChecked++;
                
                // 計算加入隨機檔後的 BP (尚未加點)
                const bpNoAlloc = actualGrow.map((grow, i) => {
                    const b = fixPos(grow * bpRate + getRate(grow) * lvldiff);
                    return Math.floor(fixPos(b + bpRate * randoms[i]));
                });

                // 計算所需的「手動加點」
                let neededAlloc = targetBPFloored.map((target, i) => target - bpNoAlloc[i]);
                neededAlloc = neededAlloc.map(v => Math.max(0, v));

                const totalNeeded = neededAlloc.reduce((a, b) => a + b, 0);
                
                let isValidAlloc = false;
                if (requireExactAllocation) {
                    if (totalNeeded === totalAllocatable) isValidAlloc = true;
                } else {
                    if (totalNeeded <= totalAllocatable) isValidAlloc = true;
                }

                if (isValidAlloc) {
                    // 正向驗證：用這個組合 (成長/隨機/加點) 算出 7 圍
                    const result = calculatePetStats(actualGrow, randoms, level, neededAlloc);
                    
                    const dHP = Math.floor(result.stats.hp) - targetStats.hp;
                    const dMP = Math.floor(result.stats.mp) - targetStats.mp;
                    const dATK = Math.floor(result.stats.atk) - targetStats.atk;
                    const dDEF = Math.floor(result.stats.def) - targetStats.def;
                    const dAGI = Math.floor(result.stats.agi) - targetStats.agi;

                    // 若 5 圍驗證失敗，跳過
                    if (Math.abs(dHP) > 1 || Math.abs(dMP) > 1 || Math.abs(dATK) > 1 ||
                        Math.abs(dDEF) > 1 || Math.abs(dAGI) > 1) continue;
                        
                    // 若 7 圍有輸入，驗證精回 (允許誤差1，且誤差值通常較小因為沒經過取整放大)
                    // 精回沒有 BP 反推，所以是 "Check" 而非 "Solve"
                    if (checkSpt) {
                        const dSPT = Math.floor(result.stats.spt) - targetStats.spt;
                        if (Math.abs(dSPT) > 1) continue;
                    }
                    if (checkRec) {
                        const dREC = Math.floor(result.stats.rec) - targetStats.rec;
                        if (Math.abs(dREC) > 1) continue;
                    }

                    // 記錄誤差
                    let errorCount = 0;
                    if (dHP !== 0) errorCount++;
                    if (dMP !== 0) errorCount++;
                    if (dATK !== 0) errorCount++;
                    if (dDEF !== 0) errorCount++;
                    if (dAGI !== 0) errorCount++;
                    
                    // 寬鬆條件收錄結果
                    if (errorCount <= 2) {
                        addResult(actualGrow, randoms, neededAlloc, result.stats, { hp: dHP, mp: dMP, atk: dATK, def: dDEF, agi: dAGI });
                    }
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