const Module = require('module');

const expressPath = require.resolve('express');
const originalExpress = require(expressPath);
const originalListen = originalExpress.application.listen;

function registerLiveTokenRoute(app) {
  if (app.__voxnoteLiveTokenRouteRegistered) return;
  app.__voxnoteLiveTokenRouteRegistered = true;

  app.post('/api/live-token', async (_req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(503).json({ error: 'GEMINI_API_KEY is not configured.' });
      }

      const { GoogleGenAI } = require('@google/genai');
      const client = new GoogleGenAI({ apiKey });
      const expireTime = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      const newSessionExpireTime = new Date(Date.now() + 60 * 1000).toISOString();

      const token = await client.authTokens.create({
        config: {
          uses: 1,
          expireTime,
          newSessionExpireTime,
          liveConnectConstraints: {
            model: 'gemini-3.1-flash-live-preview',
            config: {
              responseModalities: ['AUDIO'],
              inputAudioTranscription: {},
              contextWindowCompression: { slidingWindow: {} },
              sessionResumption: {},
              systemInstruction: {
                parts: [{
                  text: 'You are Voxnote transcription service. Listen to the user\'s speech and do not respond verbally. Your only useful output is the input audio transcription. Preserve the speaker\'s wording and punctuation as accurately as possible.'
                }]
              }
            }
          }
        }
      });

      res.json({ token: token.name });
    } catch (error) {
      console.error('Gemini Live token error:', error);
      res.status(500).json({ error: error?.message || 'Failed to create Gemini Live token.' });
    }
  });

  // Ensure the API route is checked before any SPA/static fallback route.
  const stack = app._router?.stack;
  if (Array.isArray(stack)) {
    const layer = stack.pop();
    if (layer) stack.unshift(layer);
  }
}

function wrappedExpress(...args) {
  const app = originalExpress(...args);
  const originalAppListen = app.listen;
  app.listen = function (...listenArgs) {
    registerLiveTokenRoute(app);
    return originalAppListen.apply(app, listenArgs);
  };
  return app;
}

Object.setPrototypeOf(wrappedExpress, originalExpress);
Object.assign(wrappedExpress, originalExpress);
wrappedExpress.application = originalExpress.application;
wrappedExpress.request = originalExpress.request;
wrappedExpress.response = originalExpress.response;

require.cache[expressPath].exports = wrappedExpress;
