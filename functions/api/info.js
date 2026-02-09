// 可以直接回傳靜態 JSON
export function onRequest() {
  return Response.json({
    success: true,
    api: {
        name: '寵物檔次計算 API (Cloudflare 版)',
        version: '2.0.0',
        algorithm: 'Matrix Solver'
    }
  });
}