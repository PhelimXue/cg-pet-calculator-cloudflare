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
    return Math.fround(fullRates[Math.max(0, Math.min(52, grow))] || 0);
}

/**
 * 解線性方程組 (只使用前 5 列 Matrix 解 5 個變數)
 */
function solveLinearSystem(FullMatrix, B) {
    let n = 5; 
    let mat = FullMatrix.slice(0, 5).map(row => [...row]);
    let x = [...B].slice(0, 5); 

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
    const f = Math.fround;
    const calc = (row) => {
        let sum = 0;
        for (let i = 0; i < 5; i++) {
            sum = f(sum + f(f(MATRIX[row][i]) * f(bpArray[i])));
        }
        return sum;
    };

    return {
        hp: f(calc(0) + BASE),
        mp: f(calc(1) + BASE),
        atk: f(calc(2) + BASE),
        def: f(calc(3) + BASE),
        agi: f(calc(4) + BASE),
        spt: f(calc(5) + 100),
        rec: f(calc(6) + 100)
    };
}

function fastBpToValues(bpArray) {
    const f = Math.fround;
    return MATRIX.map(row => {
        let sum = 0;
        for (let i = 0; i < 5; i++) {
            sum = f(sum + f(f(row[i]) * f(bpArray[i])));
        }
        return sum;
    });
}

/**
 * 計算寵物等級素質
 * @param {*} petGrow 實際成長檔 (基礎 - 掉檔)
 * @param {*} randomGrow 隨機檔 (0~10)
 * @param {*} petLevel 等級
 * @param {*} manualPoints 手動加點陣列 [0,0,0,0,0]
 * @param {*} bpRate 成長率 (預設 0.2)
 */
export function calculatePetStats(petGrow, randomGrow, petLevel, manualPoints, bpRate = 0.2) {
    // 通用計算所有等級 (包含 Level 1)
    // 邏輯：BaseBP = (成長 + 隨機) * rate + 升級成長
    const f = Math.fround;
    const lvldiff = petLevel - 1;
    const bpRateF = f(bpRate);

    // 計算 Base BP (含隨機檔，但不含手動點數)
    const baseBp = petGrow.map((grow, i) => {
        // 1等時的初始狀態: (成長 + 隨機) * 0.2
        const initBp = f((grow + randomGrow[i]) * bpRateF);
        // 升級獲得的狀態: 係數 * (等級-1)
        const lvlUpBp = f(getRate(grow) * lvldiff);
        return f(initBp + lvlUpBp);
    });

    // 計算 Actual BP (Base + 手動配點)
    const actualBp = baseBp.map((bp, i) => f(bp + manualPoints[i]));

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
    targetStats, 
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

        const bpRateF = Math.fround(bpRate);
        const cachedRandomEffects = new Array(randomCombos.length);
        for (let i = 0; i < randomCombos.length; i++) {
            const r = randomCombos[i];
            const randBP = [
                Math.fround(r[0] * bpRateF),
                Math.fround(r[1] * bpRateF),
                Math.fround(r[2] * bpRateF),
                Math.fround(r[3] * bpRateF),
                Math.fround(r[4] * bpRateF)
            ];
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
            
            // 1等公式: (成長 - 掉檔) * rate
            const baseBP = actualGrow.map(val => Math.fround(val * bpRateF));
            const baseVals = fastBpToValues(baseBP);

            for (let rIdx = 0; rIdx < randomCombos.length; rIdx++) {
                totalChecked++;
                const randVals = cachedRandomEffects[rIdx];
                
                const f = Math.fround;
                const rawHP = f(baseVals[0] + randVals[0]);
                if (Math.floor(f(rawHP + BASE)) !== targetStats.hp) continue;

                const rawMP = f(baseVals[1] + randVals[1]);
                if (Math.floor(f(rawMP + BASE)) !== targetStats.mp) continue;

                const rawATK = f(baseVals[2] + randVals[2]);
                if (Math.floor(f(rawATK + BASE)) !== targetStats.atk) continue;

                const rawDEF = f(baseVals[3] + randVals[3]);
                if (Math.floor(f(rawDEF + BASE)) !== targetStats.def) continue;

                const rawAGI = f(baseVals[4] + randVals[4]);
                if (Math.floor(f(rawAGI + BASE)) !== targetStats.agi) continue;

                const rawSPT = f(baseVals[5] + randVals[5]);
                if (checkSpt && Math.floor(f(rawSPT + 100)) !== targetStats.spt) continue;

                const rawREC = f(baseVals[6] + randVals[6]);
                if (checkRec && Math.floor(f(rawREC + 100)) !== targetStats.rec) continue;

                const stats = {
                    hp: f(rawHP + BASE),
                    mp: f(rawMP + BASE),
                    atk: f(rawATK + BASE),
                    def: f(rawDEF + BASE),
                    agi: f(rawAGI + BASE),
                    spt: f(rawSPT + 100),
                    rec: f(rawREC + 100)
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

    // 非1等計算邏輯
    const bpRanges = calculateBPRanges(targetStats); 
    if (bpRanges.some(r => r.length === 0)) {
        return { results: [], executionTime: 0, totalCombinationsTested: 0 };
    }

    const bpCombinations = generateBPCombinations(bpRanges);
    const dropCombos = getDropCombos();
    const randomCombos = getRandomCombos();
    const totalAllocatable = level - 1 - remainingPoints;
    const lvldiff2 = level - 1;
    const bpRateF2 = Math.fround(bpRate);

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

            // 算基礎 BP (不含隨機與加點)
            const baseBP = actualGrow.map(g => Math.fround(Math.fround(g * bpRateF2) + Math.fround(getRate(g) * lvldiff2)));
            const minBP = baseBP.map(bp => Math.floor(bp));

            if (baseBP.some((bp, i) => Math.floor(bp) > targetBPFloored[i])) continue;

            const needExtra = targetBPFloored.map((target, i) => Math.max(0, target - minBP[i]));
            const totalNeedExtra = needExtra.reduce((a, b) => a + b, 0);
            if (totalNeedExtra > (totalAllocatable + 3)) continue;

            for (const randoms of randomCombos) {
                totalChecked++;

                // 計算加入隨機檔後的 BP (尚未加點)
                const bpNoAlloc = actualGrow.map((grow, i) => {
                    const b = Math.fround(Math.fround(grow * bpRateF2) + Math.fround(getRate(grow) * lvldiff2));
                    return Math.floor(Math.fround(b + Math.fround(bpRateF2 * randoms[i])));
                });

                let neededAlloc = targetBPFloored.map((target, i) => target - bpNoAlloc[i]);
                neededAlloc = neededAlloc.map(v => Math.max(0, v));

                const totalNeeded = neededAlloc.reduce((a, b) => a + b, 0);
                
                const isValidAlloc = (totalNeeded === totalAllocatable);

                if (isValidAlloc) {
                    // 正向驗證，帶入目前選定的 bpRate
                    const result = calculatePetStats(actualGrow, randoms, level, neededAlloc, bpRate);
                    
                    const dHP = Math.floor(result.stats.hp) - targetStats.hp;
                    const dMP = Math.floor(result.stats.mp) - targetStats.mp;
                    const dATK = Math.floor(result.stats.atk) - targetStats.atk;
                    const dDEF = Math.floor(result.stats.def) - targetStats.def;
                    const dAGI = Math.floor(result.stats.agi) - targetStats.agi;

                    if (Math.abs(dHP) > 1 || Math.abs(dMP) > 1 || Math.abs(dATK) > 1 ||
                        Math.abs(dDEF) > 1 || Math.abs(dAGI) > 1) continue;
                        
                    if (checkSpt && Math.abs(Math.floor(result.stats.spt) - targetStats.spt) > 1) continue;
                    if (checkRec && Math.abs(Math.floor(result.stats.rec) - targetStats.rec) > 1) continue;

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

    const endTime = performance.now();
    return {
        results: allMatchedCombinations,
        executionTime: ((endTime - startTime) / 1000).toFixed(2),
        totalCombinationsTested: totalChecked
    };
}