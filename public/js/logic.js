/*
 * 寵物素質完整分析器
 * 整合所有反算功能的統一程式
 *
 * 功能：
 * 1. 輸入：檔次、等級、成長率、剩餘點數、目標素質
 * 2. 輸出：實際檔次、隨機檔、配點模式
 *
 * 使用高斯消去法 + 快速窮舉，速度快且精確
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
// 3. 高斯消去法（矩陣求解）
// ==========================================

/**
 * 高斯消去法求解 Ax = B
 */
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

// ==========================================
// 4. BP 計算函數（正算）
// ==========================================

/**
 * BP 轉換為素質
 */
function bpToStats(bpArray) {
    const hp = fixPos(
        fixPos(
            fixPos(MATRIX[0][0] * bpArray[0]) +
            fixPos(MATRIX[0][1] * bpArray[1]) +
            fixPos(MATRIX[0][2] * bpArray[2]) +
            fixPos(MATRIX[0][3] * bpArray[3]) +
            fixPos(MATRIX[0][4] * bpArray[4])
        ) + BASE
    );

    const mp = fixPos(
        fixPos(
            fixPos(MATRIX[1][0] * bpArray[0]) +
            fixPos(MATRIX[1][1] * bpArray[1]) +
            fixPos(MATRIX[1][2] * bpArray[2]) +
            fixPos(MATRIX[1][3] * bpArray[3]) +
            fixPos(MATRIX[1][4] * bpArray[4])
        ) + BASE
    );

    const atk = fixPos(
        fixPos(
            fixPos(MATRIX[2][0] * bpArray[0]) +
            fixPos(MATRIX[2][1] * bpArray[1]) +
            fixPos(MATRIX[2][2] * bpArray[2]) +
            fixPos(MATRIX[2][3] * bpArray[3]) +
            fixPos(MATRIX[2][4] * bpArray[4])
        ) + BASE
    );

    const def = fixPos(
        fixPos(
            fixPos(MATRIX[3][0] * bpArray[0]) +
            fixPos(MATRIX[3][1] * bpArray[1]) +
            fixPos(MATRIX[3][2] * bpArray[2]) +
            fixPos(MATRIX[3][3] * bpArray[3]) +
            fixPos(MATRIX[3][4] * bpArray[4])
        ) + BASE
    );

    const agi = fixPos(
        fixPos(
            fixPos(MATRIX[4][0] * bpArray[0]) +
            fixPos(MATRIX[4][1] * bpArray[1]) +
            fixPos(MATRIX[4][2] * bpArray[2]) +
            fixPos(MATRIX[4][3] * bpArray[3]) +
            fixPos(MATRIX[4][4] * bpArray[4])
        ) + BASE
    );

    return { hp, mp, atk, def, agi };
}

/**
 * 計算寵物素質（正算）
 */
function calculatePetStats(petGrow, randomGrow, petLevel, manualPoints) {
    const lvldiff = petLevel - 1;

    // 計算基礎 BP
    const baseBp = petGrow.map((grow) => {
        return fixPos(grow * BP_RATE + getRate(grow) * lvldiff);
    });

    // 計算實際 BP（加上隨機檔和配點）
    const actualBp = baseBp.map((bp, i) => {
        return fixPos(bp + manualPoints[i] + BP_RATE * randomGrow[i]);
    });

    // 轉換為素質
    const stats = bpToStats(actualBp);

    return {
        baseBp,
        actualBp,
        stats
    };
}

// ==========================================
// 5. 組合生成器
// ==========================================

/**
 * 生成所有掉檔組合（0-4檔）
 */
function generateAllDropCombinations() {
    const results = [];
    for (let t = 0; t <= 4; t++) {
        for (let l = 0; l <= 4; l++) {
            for (let q = 0; q <= 4; q++) {
                for (let s = 0; s <= 4; s++) {
                    for (let m = 0; m <= 4; m++) {
                        results.push([t, l, q, s, m]);
                    }
                }
            }
        }
    }
    return results;
}

/**
 * 生成所有隨機檔組合（總和為10）
 */
function generateAllRandomCombinations() {
    const results = [];

    function backtrack(current, remaining, index) {
        if (index === 5) {
            if (remaining === 0) {
                results.push([...current]);
            }
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
    return results;
}

// ==========================================
// 6. 核心分析函數
// ==========================================

/**
 * 計算 BP 的可能範圍
 * 因為遊戲顯示的素質是 floor 後的整數，真實素質有小數部分
 */
function calculateBPRanges(displayStats, tolerance = 0.9999) {
    // 計算最小 BP（使用顯示值）
    const minStatsArray = [
        displayStats.hp,
        displayStats.mp,
        displayStats.atk,
        displayStats.def,
        displayStats.agi
    ];
    const minB = minStatsArray.map(v => v - BASE);
    const minBP = solveLinearSystem(MATRIX, minB);

    // 計算最大 BP（使用顯示值 + 誤差）
    const maxStatsArray = [
        displayStats.hp + tolerance,
        displayStats.mp + tolerance,
        displayStats.atk + tolerance,
        displayStats.def + tolerance,
        displayStats.agi + tolerance
    ];
    const maxB = maxStatsArray.map(v => v - BASE);
    const maxBP = solveLinearSystem(MATRIX, maxB);

    // 計算每個 BP 的可能整數範圍
    const bpRanges = [];
    for (let i = 0; i < 5; i++) {
        const minFloor = Math.floor(minBP[i]);
        const maxFloor = Math.floor(maxBP[i]);
        const possibleValues = [];
        for (let j = minFloor; j <= maxFloor; j++) {
            possibleValues.push(j);
        }
        bpRanges.push(possibleValues);
    }

    return bpRanges;
}

/**
 * 生成所有可能的 BP 組合
 */
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

/**
 * 針對1等寵物的優化計算函數
 * 1等寵物配點一定是0，只需枚舉掉檔(5^5=3125)和隨機檔(1001種)
 */
async function calculateLevel1Pet(baseGrow, targetStats, signal) {
    const startTime = Date.now();

    const allMatchedCombinations = [];
    let totalChecked = 0;

    // 生成所有掉檔組合 (5^5 = 3125)
    const dropCombos = [];
    function generateDrops(idx, current) {
        if (idx === 5) {
            dropCombos.push([...current]);
            return;
        }
        for(let i = 0; i <= 4; i++) {
            current[idx] = i;
            generateDrops(idx + 1, current);
        }
    }
    generateDrops(0, [0,0,0,0,0]);

    // 過濾出有效的掉檔組合
    const validDropCombos = dropCombos.filter(drop => {
        for(let i = 0; i < 5; i++) {
            if (baseGrow[i] - drop[i] < 0) return false;
        }
        return true;
    });

    // 遍歷所有有效的掉檔組合
    for (let dIdx = 0; dIdx < validDropCombos.length; dIdx++) {
        const drop = validDropCombos[dIdx];

        // 每50次檢查是否需要中斷
        if (dIdx % 50 === 0) {
            await new Promise(resolve => setTimeout(resolve, 0));
            if (signal && signal.aborted) {
                throw new Error('ABORTED');
            }
        }

        // ===== 剪枝優化：計算素質邊界 =====
        const actualGrow = baseGrow.map((g, i) => g - drop[i]);

        // 計算最小素質（隨機檔全0）
        const actualBpMin = actualGrow.map(grow => fixPos(grow * BP_RATE));
        const minRawResults = [];
        for(let r = 0; r < 5; r++) {
            let sum = 0;
            for(let c = 0; c < 5; c++) {
                sum += fixPos(MATRIX[r][c] * actualBpMin[c]);
            }
            minRawResults.push(fixPos(sum + BASE));
        }

        // 計算最大素質（隨機檔最佳分配）
        const maxRandomBP = 10 * BP_RATE; // 2.0
        const maxContribution = {
            hp: MATRIX[0][0] * maxRandomBP,   // 體力對HP貢獻最大
            mp: MATRIX[1][4] * maxRandomBP,   // 魔法對MP貢獻最大
            atk: MATRIX[2][1] * maxRandomBP,  // 力量對ATK貢獻最大
            def: MATRIX[3][2] * maxRandomBP,  // 強度對DEF貢獻最大
            agi: MATRIX[4][3] * maxRandomBP   // 速度對AGI貢獻最大
        };

        const maxRawResults = [
            minRawResults[0] + maxContribution.hp,
            minRawResults[1] + maxContribution.mp,
            minRawResults[2] + maxContribution.atk,
            minRawResults[3] + maxContribution.def,
            minRawResults[4] + maxContribution.agi
        ];

        // 檢查目標素質是否在可能範圍內
        const canMatch = (
            targetStats.hp >= Math.floor(minRawResults[0]) &&
            targetStats.hp <= Math.floor(maxRawResults[0]) &&
            targetStats.mp >= Math.floor(minRawResults[1]) &&
            targetStats.mp <= Math.floor(maxRawResults[1]) &&
            targetStats.atk >= Math.floor(minRawResults[2]) &&
            targetStats.atk <= Math.floor(maxRawResults[2]) &&
            targetStats.def >= Math.floor(minRawResults[3]) &&
            targetStats.def <= Math.floor(maxRawResults[3]) &&
            targetStats.agi >= Math.floor(minRawResults[4]) &&
            targetStats.agi <= Math.floor(maxRawResults[4])
        );

        if (!canMatch) {
            continue; // 這個掉檔組合無法匹配，直接跳過
        }
        // ===== 剪枝優化結束 =====

        // 遍歷所有隨機檔組合 (總和=10，共1001種)
        function generateRandomCombos(idx, currentRandom, remainingSum) {
            if (idx === 5) {
                // 檢查總和是否等於10
                if (currentRandom.reduce((a, b) => a + b, 0) !== 10) return;

                totalChecked++;

                // 每10000次檢查一次中斷
                if (totalChecked % 10000 === 0 && signal && signal.aborted) {
                    throw new Error('ABORTED');
                }

                // 計算最終數值
                const actualBp = actualGrow.map((grow, i) =>
                    fixPos((grow + currentRandom[i]) * BP_RATE)
                );

                // BP 轉面板
                const rawResults = [];
                for(let r = 0; r < 5; r++) {
                    let sum = 0;
                    for(let c = 0; c < 5; c++) {
                        sum += fixPos(MATRIX[r][c] * actualBp[c]);
                    }
                    rawResults.push(fixPos(sum + BASE));
                }

                // 檢查是否完全匹配
                if (
                    Math.floor(rawResults[0]) === targetStats.hp &&
                    Math.floor(rawResults[1]) === targetStats.mp &&
                    Math.floor(rawResults[2]) === targetStats.atk &&
                    Math.floor(rawResults[3]) === targetStats.def &&
                    Math.floor(rawResults[4]) === targetStats.agi
                ) {
                    allMatchedCombinations.push({
                        dropCombo: [...drop],
                        randomCombo: [...currentRandom],
                        manualPoints: [0, 0, 0, 0, 0],
                        stats: {
                            hp: rawResults[0],
                            mp: rawResults[1],
                            atk: rawResults[2],
                            def: rawResults[3],
                            agi: rawResults[4]
                        },
                        totalError: 0,
                        actualGrow: actualGrow
                    });
                }
                return;
            }

            // 優化：使用剩餘總和來剪枝
            const maxForThisSlot = Math.min(10, remainingSum);
            for(let r = 0; r <= maxForThisSlot; r++) {
                currentRandom[idx] = r;
                generateRandomCombos(idx + 1, currentRandom, remainingSum - r);
            }
        }

        try {
            generateRandomCombos(0, [0,0,0,0,0], 10);
        } catch (error) {
            if (error.message === 'ABORTED') throw error;
        }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

    return {
        results: allMatchedCombinations,
        executionTime: elapsed,
        totalCombinationsTested: totalChecked
    };
}

/**
 * 分析寵物素質，找出所有可能的組合
 */
async function analyzePetStats(baseGrow, targetStats, level, remainingPoints, bpRate, signal) {
    const startTime = Date.now();

    // 計算 BP 的可能範圍
    const bpRanges = calculateBPRanges(targetStats);
    const bpCombinations = generateBPCombinations(bpRanges);

    const dropCombos = generateAllDropCombinations();
    const randomCombos = generateAllRandomCombinations();
    const totalAllocatable = level - 1 - remainingPoints;
    const requireExactAllocation = (remainingPoints === 0);

    const allMatchedCombinations = [];
    let totalChecked = 0;

    // 對每個可能的 BP 組合進行分析
    for (let bpIndex = 0; bpIndex < bpCombinations.length; bpIndex++) {
        const targetBPFloored = bpCombinations[bpIndex];

        let checked = 0;

        for (const drops of dropCombos) {
            // 每50個掉檔組合檢查一次中斷信號
            if (checked % 50 === 0) {
                await new Promise(resolve => setTimeout(resolve, 0));
                if (signal && signal.aborted) {
                    throw new Error('ABORTED');
                }
            }

            // ===== 剪枝策略 1：快速預檢 =====
            const actualGrow = baseGrow.map((g, i) => g - drops[i]);
            const lvldiff = level - 1;

            // 計算基礎 BP（無隨機檔、無配點）
            const baseBP = actualGrow.map((grow) => {
                return fixPos(grow * bpRate + getRate(grow) * lvldiff);
            });

            // 最小可能 BP：隨機檔 = 0，無配點
            const minBP = baseBP.map(bp => Math.floor(bp));

            // 最大可能 BP
            const maxBP = baseBP.map(bp => Math.floor(fixPos(bp + bpRate * 10)) + totalAllocatable);

            // 剪枝檢查 1：單個屬性範圍檢查
            let canReach = true;
            for (let i = 0; i < 5; i++) {
                if (maxBP[i] < targetBPFloored[i] || minBP[i] > targetBPFloored[i]) {
                    canReach = false;
                    break;
                }
            }

            if (!canReach) {
                continue;
            }

            // 剪枝檢查 2：總和檢查
            const needExtra = targetBPFloored.map((target, i) => Math.max(0, target - minBP[i]));
            const totalNeedExtra = needExtra.reduce((a, b) => a + b, 0);
            const maxExtra = 3 + totalAllocatable;

            if (totalNeedExtra > maxExtra) {
                continue;
            }

            // 剪枝檢查 3：檢查是否任何屬性的基礎 BP 明顯超過目標
            if (baseBP.some((bp, i) => Math.floor(bp) > targetBPFloored[i])) {
                continue;
            }

            // 如果通過預檢，則枚舉隨機檔
            for (const randoms of randomCombos) {
                checked++;

                // 每10000次檢查一次中斷信號
                if (checked % 10000 === 0) {
                    await new Promise(resolve => setTimeout(resolve, 0));
                    if (signal && signal.aborted) {
                        throw new Error('ABORTED');
                    }
                }

                // 剪枝檢查 4：隨機檔快速預檢
                const bpNoAlloc = actualGrow.map((grow, i) => {
                    const baseBp = fixPos(grow * bpRate + getRate(grow) * lvldiff);
                    const withRandom = fixPos(baseBp + bpRate * randoms[i]);
                    return Math.floor(withRandom);
                });

                // 計算需要的配點
                const neededAlloc = targetBPFloored.map((target, i) => target - bpNoAlloc[i]);

                // 快速檢查：如果任何屬性需要負配點，直接跳過
                if (neededAlloc.some(v => v < 0)) {
                    continue;
                }

                const totalNeeded = neededAlloc.reduce((a, b) => a + b, 0);

                // 快速檢查：配點總和是否超過可用配點
                if (totalNeeded > totalAllocatable) {
                    continue;
                }

                // 如果要求精確配點，檢查配點總和是否剛好等於可用配點
                if (requireExactAllocation && totalNeeded !== totalAllocatable) {
                    continue;
                }

                // 使用正算驗證
                const result = calculatePetStats(actualGrow, randoms, level, neededAlloc);

                const flooredStats = {
                    hp: Math.floor(result.stats.hp),
                    mp: Math.floor(result.stats.mp),
                    atk: Math.floor(result.stats.atk),
                    def: Math.floor(result.stats.def),
                    agi: Math.floor(result.stats.agi)
                };

                // 檢查是否完全匹配
                if (
                    flooredStats.hp === targetStats.hp &&
                    flooredStats.mp === targetStats.mp &&
                    flooredStats.atk === targetStats.atk &&
                    flooredStats.def === targetStats.def &&
                    flooredStats.agi === targetStats.agi
                ) {
                    const totalDrop = drops.reduce((a, b) => a + b, 0);
                    allMatchedCombinations.push({
                        dropCombo: drops,
                        randomCombo: randoms,
                        manualPoints: neededAlloc,
                        stats: result.stats,
                        totalError: 0,  // 完全匹配，誤差為0
                        actualGrow: actualGrow
                    });
                }
            }
        }

        totalChecked += checked;
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

    return {
        results: allMatchedCombinations,
        executionTime: elapsed,
        totalCombinationsTested: totalChecked
    };
}

/**
 * 主要導出函數，與原 logic.js 接口兼容
 */
export async function smartReverseCalculateMatrix(baseGrow, targetStats, petLevel, bpRateVal, maxResults, remainingPoints, errorTolerance, signal) {
    // 如果是1等寵物，使用優化的計算方式（只枚舉5^5*1001種組合）
    if (petLevel === 1) {
        return await calculateLevel1Pet(baseGrow, targetStats, signal);
    }

    // 其他等級使用通用分析函數
    return await analyzePetStats(baseGrow, targetStats, petLevel, remainingPoints, bpRateVal, signal);
}
