import { smartReverseCalculateMatrix } from '../../lib/logic.js';

export async function onRequestPost({ request }) {
  try {
    const body = await request.json();
    const {
        baseGrow,
        petLevel,
        targetStats,
        remainingPoints = 0,
        errorTolerance = -1,
        bpRateVal = 20
    } = body;

    // 參數驗證 (與原本 Express 邏輯一致)
    if (!baseGrow || !Array.isArray(baseGrow) || baseGrow.length !== 5) {
        return Response.json({ success: false, error: 'baseGrow 格式錯誤' }, { status: 400 });
    }
    if (!petLevel || petLevel < 1) {
        return Response.json({ success: false, error: 'petLevel 錯誤' }, { status: 400 });
    }
    // ... 可以加入更多驗證，這裡簡化處理

    // 呼叫邏輯
    const result = await smartReverseCalculateMatrix(
        baseGrow,
        targetStats,
        petLevel,
        bpRateVal / 100,
        0,
        remainingPoints,
        errorTolerance
    );

    return Response.json({
        success: true,
        data: result.results,
        summary: {
            totalMatches: result.results.length,
            executionTime: result.executionTime,
            totalCombinationsTested: result.totalCombinationsTested
        }
    });

  } catch (err) {
    return Response.json({ 
        success: false, 
        error: '計算過程錯誤', 
        details: err.message 
    }, { status: 500 });
  }
}