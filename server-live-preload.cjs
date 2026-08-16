const expressPath = require.resolve('express');
const originalExpress = require(expressPath);

function sendJson(res, statusCode, body) {
  res.statusCode = statusCode;
  if (typeof res.setHeader === 'function') {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
  }
  return res.end(JSON.stringify(body));
}

function registerLiveTokenRoute(app) {
  if (app.__voxnoteLiveTokenRouteRegistered) return;
  app.__voxnoteLiveTokenRouteRegistered = true;

  app.post('/api/live-token', async (_req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return sendJson(res, 503, { error: 'GEMINI_API_KEY is not configured on Render.' });
      }

      // Use Google's official GenAI SDK for ephemeral-token provisioning.
      // This avoids subtle REST schema/version differences on auth_tokens.
      const { GoogleGenAI } = await import('@google/genai');
      const client = new GoogleGenAI({ apiKey });

      const token = await client.authTokens.create({
        config: {
          uses: 1,
          expireTime: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          liveConnectConstraints: {
            model: 'gemini-3.1-flash-live-preview',
            config: {
              sessionResumption: {},
              contextWindowCompression: { slidingWindow: {} },
              responseModalities: ['AUDIO'],
              inputAudioTranscription: {},
            },
          },
        },
      });

      if (!token?.name) {
        console.error('Gemini Live token response did not contain a token name:', token);
        return sendJson(res, 502, {
          error: 'Gemini token provisioning returned no token.'
        });
      }

      return sendJson(res, 200, { token: token.name });
    } catch (error) {
      console.error('Gemini Live token provisioning failed:', error);
      const message = error?.message || String(error) || 'Failed to create Gemini Live token.';
      return sendJson(res, 502, {
        error: `Gemini token provisioning failed: ${message}`
      });
    }
  });

  const stack = app._router?.stack;
  if (Array.isArray(stack)) {
    const routeLayer = stack.pop();
    if (routeLayer) stack.unshift(routeLayer);
  }
}

function wrappedExpress(...args) {
  const app = originalExpress(...args);
  const originalAppListen = app.listen;
  app.listen = function (...listenArgs) {
    registerLiveTokenRoute(app);
    return originalAppListen.apply(this, listenArgs);
  };
  return app;
}

Object.setPrototypeOf(wrappedExpress, originalExpress);
Object.assign(wrappedExpress, originalExpress);
wrappedExpress.application = originalExpress.application;
wrappedExpress.request = originalExpress.request;
wrappedExpress.response = originalExpress.response;

require.cache[expressPath].exports = wrappedExpress;
