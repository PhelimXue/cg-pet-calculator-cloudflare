/*
 * 寵物素質完整分析器 (Web Worker / Async Optimized Version)
 * Use this logic.js content
 */

// ... (前面的矩陣與常數定義 MATRIX, BASE, fullRates 保持不變) ...

const MATRIX = [
    [8,   2,   3,   3,   1  ],
    [1,   2,   2,   2,   10 ],
    [0.2, 2.7, 0.3, 0.3, 0.2],
    [0.2, 0.3, 3,   0.3, 0.2],
    [0.1, 0.2, 0.2, 2,   0.1], 
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

// ... (getRate, fixPos 保持不變) ...

function getRate(grow) {
    return fullRates[Math.max(0, Math.min(52, grow))] || 0;
}

function fixPos(n) {
    return Math.round(n * 10000) / 10000;
}

// ... (solveLinearSystem, bpToStats, fastBpToValues 保持不變) ...
function solveLinearSystem(A, B) {
    let n = A.length;
    let mat = A.map(row => [...row]);
    let x = [...B];
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

function fastBpToValues(bpArray) {
    return [
        MATRIX[0][0] * bpArray[0] + MATRIX[0][1] * bpArray[1] + MATRIX[0][2] * bpArray[2] + MATRIX[0][3] * bpArray[3] + MATRIX[0][4] * bpArray[4],
        MATRIX[1][0] * bpArray[0] + MATRIX[1][1] * bpArray[1] + MATRIX[1][2] * bpArray[2] + MATRIX[1][3] * bpArray[3] + MATRIX[1][4] * bpArray[4],
        MATRIX[2][0] * bpArray[0] + MATRIX[2][1] * bpArray[1] + MATRIX[2][2] * bpArray[2] + MATRIX[2][3] * bpArray[3] + MATRIX[2][4] * bpArray[4],
        MATRIX[3][0] * bpArray[0] + MATRIX[3][1] * bpArray[1] + MATRIX[3][2] * bpArray[2] + MATRIX[3][3] * bpArray[3] + MATRIX[3][4] * bpArray[4],
        MATRIX[4][0] * bpArray[0] + MATRIX[4][1] * bpArray[1] + MATRIX[4][2] * bpArray[2] + MATRIX[4][3] * bpArray[3] + MATRIX[4][4] * bpArray[4]
    ];
}

// *** 修改處：加上 export ***
export function calculatePetStats(petGrow, randomGrow, petLevel, manualPoints) {
    // 雖然 1 等邏輯被 smart 函數的優化分支取代，但正算檢查時仍需此邏輯
    if (petLevel === 1) {
        // 1等公式: (成長 - 掉檔 + 隨機) * 0.2
        // petGrow 參數傳入時應該是 "actualGrow" (即 原始成長-掉檔)
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

// ... (getDropCombos, getRandomCombos 等其餘輔助函式保持不變) ...

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


// ... (smartReverseCalculateMatrix 函式內容保持不變) ...

export async function smartReverseCalculateMatrix(
    baseGrow, 
    targetStats, 
    level, 
    bpRate, 
    maxResults, 
    remainingPoints, 
    _unusedTolerance, 
    signal
) {
    // 這裡直接使用原本提供的 smartReverseCalculateMatrix完整代碼
    // 為了節省篇幅，請保留您原本 logic.js 中的此函式完整內容
    // 只要確保本文件上方的 calculatePetStats 是 export 的即可
    
    // *** 以下為您原本的代碼內容 (示意) ***
    const startTime = performance.now();
    let lastYieldTime = startTime;
    const YIELD_INTERVAL = 50; 

    const allMatchedCombinations = [];
    let totalChecked = 0;

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

            const actualGrow = [
                baseGrow[0] - drops[0],
                baseGrow[1] - drops[1],
                baseGrow[2] - drops[2],
                baseGrow[3] - drops[3],
                baseGrow[4] - drops[4]
            ];
            
            const baseBP = [
                actualGrow[0]*0.2, 
                actualGrow[1]*0.2, 
                actualGrow[2]*0.2, 
                actualGrow[3]*0.2, 
                actualGrow[4]*0.2
            ];
            const baseVals = fastBpToValues(baseBP);

            for (let rIdx = 0; rIdx < randomCombos.length; rIdx++) {
                totalChecked++;
                const randVals = cachedRandomEffects[rIdx];
                
                const rawHP = baseVals[0] + randVals[0];
                const finalHP = Math.floor(Math.round(rawHP * 10000) / 10000 + BASE);
                if (finalHP !== targetStats.hp) continue;

                const rawMP = baseVals[1] + randVals[1];
                const finalMP = Math.floor(Math.round(rawMP * 10000) / 10000 + BASE);
                if (finalMP !== targetStats.mp) continue;

                const rawATK = baseVals[2] + randVals[2];
                const finalATK = Math.floor(Math.round(rawATK * 10000) / 10000 + BASE);
                if (finalATK !== targetStats.atk) continue;

                const rawDEF = baseVals[3] + randVals[3];
                const finalDEF = Math.floor(Math.round(rawDEF * 10000) / 10000 + BASE);
                if (finalDEF !== targetStats.def) continue;

                const rawAGI = baseVals[4] + randVals[4];
                const finalAGI = Math.floor(Math.round(rawAGI * 10000) / 10000 + BASE);
                if (finalAGI !== targetStats.agi) continue;

                const stats = {
                    hp: Math.round(rawHP * 10000) / 10000 + BASE,
                    mp: Math.round(rawMP * 10000) / 10000 + BASE,
                    atk: Math.round(rawATK * 10000) / 10000 + BASE,
                    def: Math.round(rawDEF * 10000) / 10000 + BASE,
                    agi: Math.round(rawAGI * 10000) / 10000 + BASE
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

    // Level > 1 Logic
    const bpRanges = calculateBPRanges(targetStats);
    if (bpRanges.some(r => r.length === 0)) {
        return { results: [], executionTime: 0, totalCombinationsTested: 0 };
    }

    const bpCombinations = generateBPCombinations(bpRanges);
    const dropCombos = getDropCombos();
    const randomCombos = getRandomCombos();
    const totalAllocatable = level - 1 - remainingPoints;
    const requireExactAllocation = (remainingPoints === 0);

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
                
                let isValidAlloc = false;
                if (requireExactAllocation) {
                    if (totalNeeded === totalAllocatable) isValidAlloc = true;
                } else {
                    if (totalNeeded <= totalAllocatable) isValidAlloc = true;
                }

                if (isValidAlloc) {
                    const result = calculatePetStats(actualGrow, randoms, level, neededAlloc);
                    const dHP = Math.floor(result.stats.hp) - targetStats.hp;
                    const dMP = Math.floor(result.stats.mp) - targetStats.mp;
                    const dATK = Math.floor(result.stats.atk) - targetStats.atk;
                    const dDEF = Math.floor(result.stats.def) - targetStats.def;
                    const dAGI = Math.floor(result.stats.agi) - targetStats.agi;

                    if (Math.abs(dHP) <= 1 && Math.abs(dMP) <= 1 && Math.abs(dATK) <= 1 &&
                        Math.abs(dDEF) <= 1 && Math.abs(dAGI) <= 1) {
                        
                        let errorCount = 0;
                        if (dHP !== 0) errorCount++;
                        if (dMP !== 0) errorCount++;
                        if (dATK !== 0) errorCount++;
                        if (dDEF !== 0) errorCount++;
                        if (dAGI !== 0) errorCount++;

                        if (errorCount <= 2) {
                             addResult(actualGrow, randoms, neededAlloc, result.stats, { hp: dHP, mp: dMP, atk: dATK, def: dDEF, agi: dAGI });
                        }
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