// public/js/logic.js

const MATRIX = [
    [8,   2,   3,   3,   1  ],  // HP
    [1,   2,   2,   2,   10 ],  // MP
    [0.2, 2.7, 0.3, 0.3, 0.2],  // ATK
    [0.2, 0.3, 3,   0.3, 0.2],  // DEF
    [0.1, 0.2, 0.2, 2,   0.1],  // AGI
];
const BASE = 20;
const ATTR_LABELS = ['體力', '力量', '強度', '速度', '魔法'];

// 成長率表
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

function calculateFinalStats(baseGrow, dropCombo, randomCombo, manualPoints, petLevel) {
    const BP_RATE_CONST = 0.2;
    const lvldiff = petLevel - 1;
    
    // 1. 計算 BP
    const actualBp = [];
    for(let i=0; i<5; i++) {
        let grow = baseGrow[i] - dropCombo[i];
        if (grow < 0) grow = 0; 

        let base = fixPos(grow * BP_RATE_CONST + getRate(grow) * lvldiff);
        let total = fixPos(base + manualPoints[i] + randomCombo[i] * BP_RATE_CONST);
        actualBp.push(total);
    }

    // 2. BP 轉 面板
    const rawResults = [];
    for(let r=0; r<5; r++) { 
        let sum = 0;
        for(let c=0; c<5; c++) { 
            sum += fixPos(MATRIX[r][c] * actualBp[c]);
        }
        rawResults.push(fixPos(sum + BASE));
    }

    return {
        hp: rawResults[0],
        mp: rawResults[1],
        atk: rawResults[2],
        def: rawResults[3],
        agi: rawResults[4],
        actualBp: actualBp
    };
}

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

// [修改] 新增 signal 參數
export async function smartReverseCalculateMatrix(baseGrow, targetStats, petLevel, bpRateVal, maxResults, remainingPoints, errorTolerance, signal) {
    const startTime = Date.now();
    const BP_RATE_CONST = 0.2; 

    // --- 準備階段 ---
    const targetArray = [targetStats.hp, targetStats.mp, targetStats.atk, targetStats.def, targetStats.agi];
    const totalAllocatedTarget = (petLevel - 1) - remainingPoints;

    const B_Vector = targetArray.map(v => v - BASE);
    
    // 1. 高斯消去法求解 (取得理論上需要的 BP)
    const approxBP = solveLinearSystem(MATRIX, B_Vector);

    // === 合理性檢查 (Sanity Check) ===
    const maxTotalManual = (petLevel - 1); 
    const BUFFER = 4; 
    let totalExcess = 0;

    for(let i=0; i<5; i++) {
        if (approxBP[i] < -5) {
            throw new Error(`計算出的 ${ATTR_LABELS[i]}BP 為負值 (${approxBP[i].toFixed(1)})，請檢查輸入數值是否正確(或太低)。`);
        }

        let grow = baseGrow[i];
        let theoreticalMaxNaturalBP = fixPos(grow * 0.2 + getRate(grow) * (petLevel - 1));
        
        let diff = approxBP[i] - theoreticalMaxNaturalBP;
        
        if (diff > (maxTotalManual + BUFFER)) {
            throw new Error(`數值異常：${ATTR_LABELS[i]} 過高。\n推測可能【穿著裝備】或【輸入數值有誤】。請卸下裝備後再試。`);
        }

        if (diff > 0) totalExcess += diff;
    }

    if (totalExcess > (maxTotalManual + BUFFER)) {
         throw new Error(`總能力值過高 (超出理論上限)。\n請確認是否【穿著裝備】？計算前請務必卸下全套裝備。`);
    }
    // === 檢查結束 ===

    let solutions = [];
    let checkedCount = 0;

    const dropCombos = [];
    function generateDrops(idx, current) {
        if (idx === 5) {
            dropCombos.push([...current]);
            return;
        }
        for(let i=0; i<=4; i++) { 
            current[idx] = i;
            generateDrops(idx+1, current);
        }
    }
    generateDrops(0, [0,0,0,0,0]);

    // [修改] 改用標準 for 迴圈來控制疊代過程
    for (let dIdx = 0; dIdx < dropCombos.length; dIdx++) {
        const drop = dropCombos[dIdx];
        checkedCount++;

        // [重點] 每 50 次運算，讓出執行緒讓 UI 喘一口氣，並檢查是否中斷
        if (dIdx % 50 === 0) {
            await new Promise(resolve => setTimeout(resolve, 0));
            if (signal && signal.aborted) {
                // 丟出一個特定的錯誤訊息，方便外面 catch
                throw new Error('ABORTED');
            }
        }

        let possibleAttrs = [[], [], [], [], []]; 
        let isValidDrop = true;

        for (let i = 0; i < 5; i++) {
            let grow = baseGrow[i] - drop[i];
            if (grow < 0) { isValidDrop = false; break; }

            let baseBp = fixPos(grow * BP_RATE_CONST + getRate(grow) * (petLevel - 1));
            let diff = approxBP[i] - baseBp;

            let centerManual = Math.round(diff);
            let minM = Math.max(0, centerManual - 3);
            let maxM = Math.max(0, centerManual + 3);

            for (let m = minM; m <= maxM; m++) {
                for (let r = 0; r <= 10; r++) {
                     let tempBP = baseBp + m + r * 0.2;
                     if (Math.abs(tempBP - approxBP[i]) < 1.6) {
                         possibleAttrs[i].push({ m, r });
                     }
                }
            }

            if (possibleAttrs[i].length === 0) {
                isValidDrop = false; break;
            }
        }

        if (!isValidDrop) continue;

        function solveCombination(idx, sumM, sumR, currentM, currentR) {
            if (sumM > totalAllocatedTarget) return;
            
            if (idx === 5) {
                if (sumM === totalAllocatedTarget && sumR >= 0 && sumR <= 10) { // 隨機檔範圍
                    verifySolution(drop, currentR, currentM);
                }
                return;
            }

            for (let cand of possibleAttrs[idx]) {
                if (sumM + cand.m > totalAllocatedTarget) continue;
                
                currentM[idx] = cand.m;
                currentR[idx] = cand.r;
                solveCombination(idx + 1, sumM + cand.m, sumR + cand.r, currentM, currentR);
            }
        }

        solveCombination(0, 0, 0, [0,0,0,0,0], [0,0,0,0,0]);
    }

    function verifySolution(drop, r, m) {
        const res = calculateFinalStats(baseGrow, drop, r, m, petLevel);
        const errHp = Math.abs(Math.floor(res.hp) - targetStats.hp);
        const errMp = Math.abs(Math.floor(res.mp) - targetStats.mp);
        const errAtk = Math.abs(Math.floor(res.atk) - targetStats.atk);
        const errDef = Math.abs(Math.floor(res.def) - targetStats.def);
        const errAgi = Math.abs(Math.floor(res.agi) - targetStats.agi);

        const totalError = errHp + errMp + errAtk + errDef + errAgi;

        let isPass = false;
        if (errorTolerance === -1) {
            isPass = (totalError <= 5); 
        } else {
             isPass = (totalError <= errorTolerance);
        }

        if (isPass) {
            solutions.push({
                dropCombo: [...drop],
                randomCombo: [...r],
                manualPoints: [...m],
                stats: res,
                totalError: totalError,
                actualGrow: baseGrow.map((g,i)=>g-drop[i])
            });
        }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

    if (errorTolerance === -1 && solutions.length > 0) {
        let minErr = solutions.reduce((min, s) => Math.min(min, s.totalError), Infinity);
        solutions = solutions.filter(s => s.totalError === minErr);
    }

    solutions.sort((a,b) => {
        if (a.totalError !== b.totalError) return a.totalError - b.totalError;
        let dropA = a.dropCombo.reduce((s,v)=>s+v,0);
        let dropB = b.dropCombo.reduce((s,v)=>s+v,0);
        return dropA - dropB;
    });

    if (maxResults > 0 && solutions.length > maxResults) {
        solutions = solutions.slice(0, maxResults);
    }

    return {
        results: solutions,
        executionTime: elapsed,
        totalCombinationsTested: checkedCount
    };
}