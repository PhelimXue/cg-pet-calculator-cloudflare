export function onRequest() {
  return Response.json({
    success: true,
    status: 'healthy',
    platform: 'Cloudflare Pages Functions'
  });
}