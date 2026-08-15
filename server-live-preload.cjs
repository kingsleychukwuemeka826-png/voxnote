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

      const expireTime = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      const newSessionExpireTime = new Date(Date.now() + 60 * 1000).toISOString();

      // Use the documented REST auth_tokens endpoint. Keep the model name in
      // the REST form (models/...) and parse the response as text first so a
      // non-JSON upstream response never turns into the misleading
      // "Unexpected end of JSON input" error in the browser.
      const tokenResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/auth_tokens', {
        method: 'POST',
        headers: {
          'x-goog-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uses: 1,
          expireTime,
          newSessionExpireTime,
          liveConnectConstraints: {
            model: 'models/gemini-3.1-flash-live-preview',
            config: {
              responseModalities: ['AUDIO'],
              inputAudioTranscription: {},
              contextWindowCompression: { slidingWindow: {} },
              sessionResumption: {},
              systemInstruction: {
                parts: [{
                  text: 'You are Voxnote transcription service. Listen to the user speech and do not respond verbally. Your only useful output is the input audio transcription. Preserve the speakers wording and punctuation as accurately as possible.'
                }]
              }
            }
          }
        }),
      });

      const rawBody = await tokenResponse.text();
      let payload = null;
      try {
        payload = rawBody ? JSON.parse(rawBody) : null;
      } catch (parseError) {
        console.error('Gemini Live token response was not valid JSON:', {
          status: tokenResponse.status,
          body: rawBody.slice(0, 500),
        });
        return res.status(502).json({
          error: `Gemini token service returned an invalid response (HTTP ${tokenResponse.status}).`,
        });
      }

      if (!tokenResponse.ok || !payload?.name) {
        console.error('Gemini Live token provisioning failed:', {
          status: tokenResponse.status,
          payload,
        });
        return res.status(502).json({
          error: payload?.error?.message || `Gemini Live token provisioning failed (HTTP ${tokenResponse.status}).`,
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
