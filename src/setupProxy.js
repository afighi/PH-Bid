const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
  app.use(
    '/api/anthropic',
    createProxyMiddleware({
      target: 'https://api.anthropic.com',
      changeOrigin: true,
      pathRewrite: { '^/api/anthropic': '' },
      onProxyReq(proxyReq) {
        proxyReq.setHeader('x-api-key', process.env.ANTHROPIC_API_KEY || '');
        proxyReq.setHeader('anthropic-version', '2023-06-01');
        proxyReq.setHeader('content-type', 'application/json');
      },
    })
  );
};
