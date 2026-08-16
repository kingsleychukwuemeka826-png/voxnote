const expressPath = require.resolve('express');
const originalExpress = require(expressPath);

function registerLiveTokenRoute(app) {
  if (app.__voxnoteLiveTokenRouteRegistered) return;
  app.__voxnoteLiveTokenRouteRegistered = true;

  app.post('/api/live-token', async (_req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(503).json({ error: 'GEMINI_API_KEY is not configured on Render.' });
      }

      // Keep this request aligned with Google's current REST example for
      // ephemeral Live API tokens. In particular, don't send extra fields
      // that aren't required for token provisioning.
      const tokenResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/auth_tokens', {
        method: 'POST',
        headers: {
          'x-goog-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uses: 1,
          expireTime: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          liveConnectConstraints: {
            model: 'models/gemini-3.1-flash-live-preview',
            config: {
              sessionResumption: {},
              responseModalities: ['AUDIO'],
            },
          },
        }),
      });

      const rawBody = await tokenResponse.text();
      let payload = null;
      try {
        payload = rawBody ? JSON.parse(rawBody) : null;
      } catch (_) {
        console.error('Gemini Live token response was not JSON:', {
          status: tokenResponse.status,
          body: rawBody.slice(0, 1000),
        });
        return res.status(502).json({
          error: `Gemini token service returned a non-JSON response (HTTP ${tokenResponse.status}).`,
        });
      }

      if (!tokenResponse.ok || !payload?.name) {
        const providerMessage = payload?.error?.message || payload?.message;
        console.error('Gemini Live token provisioning failed:', {
          status: tokenResponse.status,
          payload,
        });
        return res.status(502).json({
          error: providerMessage
            ? `Gemini token provisioning failed: ${providerMessage}`
            : `Gemini Live token provisioning failed (HTTP ${tokenResponse.status}).`,
        });
      }

      return res.json({ token: payload.name });
    } catch (error) {
      console.error('Gemini Live token error:', error);
      return res.status(500).json({
        error: error?.message || 'Failed to create Gemini Live token.'
      });
    }
  });

  // Put the route ahead of any SPA/static fallback route already registered.
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
