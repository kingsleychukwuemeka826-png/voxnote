const expressPath = require.resolve('express');
const originalExpress = require(expressPath);

function sendJson(res, statusCode, body) {
  // Use the native Node response API instead of res.status()/res.json().
  // The live-token route can be registered before Express has attached its
  // response helpers, which previously caused `res.status is not a function`.
  res.statusCode = statusCode;
  if (typeof res.setHeader === 'function') {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
  }
  const serialized = JSON.stringify(body);
  if (typeof res.end === 'function') return res.end(serialized);
  return serialized;
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
        return sendJson(res, 502, {
          error: `Gemini token service returned a non-JSON response (HTTP ${tokenResponse.status}).`,
        });
      }

      if (!tokenResponse.ok || !payload?.name) {
        const providerMessage = payload?.error?.message || payload?.message;
        console.error('Gemini Live token provisioning failed:', {
          status: tokenResponse.status,
          payload,
        });
        return sendJson(res, 502, {
          error: providerMessage
            ? `Gemini token provisioning failed: ${providerMessage}`
            : `Gemini Live token provisioning failed (HTTP ${tokenResponse.status}).`,
        });
      }

      return sendJson(res, 200, { token: payload.name });
    } catch (error) {
      console.error('Gemini Live token error:', error);
      return sendJson(res, 500, {
        error: error?.message || 'Failed to create Gemini Live token.'
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