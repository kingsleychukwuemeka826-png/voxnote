import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import crypto from 'crypto';
import { initializeApp as initAdminApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// --- Paystack (billing) --------------------------------------------------
// Paystack's API is plain REST with a Bearer secret key, so no SDK is
// needed — just fetch. Returns null (rather than throwing) when
// unconfigured, so every route that uses it can fall back to "demo mode"
// instead of crashing the server.
const PAYSTACK_BASE_URL = 'https://api.paystack.co';

function getPaystackSecretKey(): string | null {
  return process.env.PAYSTACK_SECRET_KEY || null;
}

async function paystackRequest(path: string, options: { method?: string; body?: object } = {}) {
  const key = getPaystackSecretKey();
  if (!key) throw new Error('Paystack is not configured.');

  const res = await fetch(`${PAYSTACK_BASE_URL}${path}`, {
    method: options.method || 'GET',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const json: any = await res.json();
  if (!res.ok || json.status === false) {
    throw new Error(json.message || `Paystack request failed (${res.status})`);
  }
  return json;
}

// --- Firebase Admin (server-side Firestore writes) ---
// Used only to record confirmed Paystack payment status. The Admin SDK
// bypasses Firestore security rules by design, which is exactly why the
// client is *not* allowed to write to users/{uid}/meta/billing directly
// (see BACKEND_SETUP.md) — only this trusted server process can.
function getAdminDb() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return null;
  try {
    if (getApps().length === 0) {
      const serviceAccount = JSON.parse(raw);
      initAdminApp({ credential: cert(serviceAccount) });
    }
    return getAdminFirestore();
  } catch (e) {
    console.error('Failed to initialize Firebase Admin:', e);
    return null;
  }
}

// --- Paystack webhook -----------------------------------------------------
// IMPORTANT: this route (and its express.raw() body parser) must be
// registered BEFORE the global express.json() middleware below, or
// Paystack's signature verification will fail because the body will
// already have been parsed/re-serialized as JSON.
//
// Paystack signs the raw request body with HMAC-SHA512 using your secret
// key and sends the hex digest in the `x-paystack-signature` header —
// there's no separate webhook secret to configure, unlike some other
// providers.
app.post('/api/webhooks/paystack', express.raw({ type: 'application/json' }), async (req, res) => {
  const secretKey = getPaystackSecretKey();
  if (!secretKey) {
    return res.status(501).json({ error: 'Paystack is not configured on this server.' });
  }

  const signature = req.headers['x-paystack-signature'] as string | undefined;
  const expectedHash = crypto.createHmac('sha512', secretKey).update(req.body).digest('hex');
  if (!signature || signature !== expectedHash) {
    console.error('Paystack webhook signature verification failed.');
    return res.status(400).send('Invalid signature');
  }

  let event: any;
  try {
    event = JSON.parse(req.body.toString('utf8'));
  } catch (err) {
    return res.status(400).send('Invalid payload');
  }

  const db = getAdminDb();
  if (!db) {
    console.error('Paystack webhook received but Firebase Admin is not configured — cannot record billing status.');
    return res.status(200).json({ received: true, warning: 'FIREBASE_SERVICE_ACCOUNT not set' });
  }

  try {
    const data = event.data || {};

    switch (event.event) {
      // Fired on the very first successful charge — this is the only event
      // guaranteed to carry the metadata we sent at checkout (our uid), so
      // we use it to record a Paystack customer_code -> uid mapping that
      // later subscription events (which don't carry our metadata) can look
      // up by.
      case 'charge.success': {
        const uid = data.metadata?.uid;
        const customerCode = data.customer?.customer_code;
        if (uid && customerCode) {
          await db.doc(`paystackCustomers/${customerCode}`).set({ uid });
          await db.doc(`users/${uid}/meta/billing`).set(
            {
              isProPlan: true,
              paystackCustomerCode: customerCode,
              plan: data.metadata?.plan || 'unknown',
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );
        }
        break;
      }

      case 'subscription.create':
      case 'subscription.disable':
      case 'subscription.not_renew': {
        const customerCode = data.customer?.customer_code;
        if (!customerCode) break;

        const mappingDoc = await db.doc(`paystackCustomers/${customerCode}`).get();
        const uid = mappingDoc.data()?.uid || data.metadata?.uid;
        if (!uid) break;

        const isActive = event.event === 'subscription.create' && data.status === 'active';
        await db.doc(`users/${uid}/meta/billing`).set(
          {
            isProPlan: isActive,
            paystackCustomerCode: customerCode,
            paystackSubscriptionCode: data.subscription_code,
            status: data.status,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
        break;
      }

      default:
        break;
    }
    res.json({ received: true });
  } catch (err: any) {
    console.error('Error handling Paystack webhook:', err);
    res.status(500).json({ error: err.message });
  }
});

app.use(express.json({ limit: '25mb' }));

// Initialize a Paystack transaction for the Pro subscription — returns a
// hosted checkout URL to redirect the user to (Paystack's equivalent of a
// Stripe Checkout session).
app.post('/api/billing/create-checkout-session', async (req, res) => {
  if (!getPaystackSecretKey()) {
    return res.status(200).json({ configured: false });
  }

  try {
    const { uid, email, plan } = req.body as { uid: string; email?: string; plan: 'monthly' | 'annual' };
    if (!uid || !plan || !email) {
      return res.status(400).json({ error: 'uid, email, and plan are required.' });
    }

    const planCode = plan === 'annual' ? process.env.PAYSTACK_PLAN_ANNUAL : process.env.PAYSTACK_PLAN_MONTHLY;
    if (!planCode) {
      return res.status(500).json({ error: `Missing PAYSTACK_PLAN_${plan.toUpperCase()} env var.` });
    }

    const appUrl = process.env.APP_URL || `http://localhost:${PORT}`;

    const result = await paystackRequest('/transaction/initialize', {
      method: 'POST',
      body: {
        email,
        plan: planCode,
        callback_url: `${appUrl}?billing=success`,
        metadata: { uid, plan },
      },
    });

    res.json({ configured: true, url: result.data.authorization_url });
  } catch (err: any) {
    console.error('Error creating Paystack checkout:', err);
    res.status(500).json({ error: err.message });
  }
});

// Generate a Paystack-hosted "manage subscription" link so an existing Pro
// user can update their card or cancel — Paystack's equivalent of a Stripe
// Billing Portal session.
app.post('/api/billing/create-portal-session', async (req, res) => {
  if (!getPaystackSecretKey()) {
    return res.status(200).json({ configured: false });
  }

  try {
    const { uid } = req.body as { uid: string };
    if (!uid) {
      return res.status(400).json({ error: 'uid is required.' });
    }

    const db = getAdminDb();
    if (!db) {
      return res.status(500).json({ error: 'Firebase Admin is not configured — cannot look up billing record.' });
    }

    const billingDoc = await db.doc(`users/${uid}/meta/billing`).get();
    const subscriptionCode = billingDoc.data()?.paystackSubscriptionCode;
    if (!subscriptionCode) {
      return res.status(404).json({ error: 'No active Paystack subscription found for this account yet.' });
    }

    const result = await paystackRequest(`/subscription/${subscriptionCode}/manage/link`);
    res.json({ configured: true, url: result.data.link });
  } catch (err: any) {
    console.error('Error creating Paystack manage link:', err);
    res.status(500).json({ error: err.message });
  }
});

// Helper to initialize Gemini Client securely
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    hasPaystack: Boolean(process.env.PAYSTACK_SECRET_KEY),
    hasFirebaseAdmin: Boolean(process.env.FIREBASE_SERVICE_ACCOUNT),
  });
});

// AI Note Processing endpoint
app.post('/api/generate-note', async (req, res) => {
  try {
    const { transcript, titleHint, categoryHint, imageBase64 } = req.body;

    if (!transcript && !imageBase64) {
      return res.status(400).json({ error: 'Either transcript text or an image is required.' });
    }

    const ai = getGeminiClient();
    
    // Fallback if API key is not present or AI fails
    if (!ai) {
      const fallbackTitle = titleHint || (transcript ? transcript.slice(0, 30) + '...' : 'Quick Voice Note');
      const textSample = transcript || 'Scanned document snippet';
      return res.json({
        title: fallbackTitle,
        summary: `Summary of recorded note: ${textSample.slice(0, 120)}...`,
        formattedContent: `## Notes\n\n${textSample}\n\n*Generated locally (Gemini API Key pending)*`,
        tags: [categoryHint || 'Voice Note', 'Quick Note'],
        keyTakeaways: [textSample.slice(0, 80)],
        actionItems: ['Review and organize note content'],
        sentiment: 'Informational',
      });
    }

    const systemInstruction = `You are Voxnote, an expert AI note-taking assistant.
Analyze the user's audio transcript or document text/image and organize it into a structured, highly useful note.
Extract:
- title: A short, concise title (max 6 words).
- summary: A crisp 2-3 sentence overview.
- formattedContent: Rich markdown formatted body with bullet points, headers, and organized sections.
- tags: Array of 1-3 relevant tags (e.g. "Meeting", "Study", "Idea", "Project", "Finance", "Personal", "Research").
- keyTakeaways: Array of 2-4 key takeaway strings.
- actionItems: Array of actionable task items extracted from the content.
- sentiment: One word description like "Urgent", "Strategic", "Informational", "Brainstorm".
`;

    let parts: any[] = [];
    if (imageBase64) {
      const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
      const mimeType = imageBase64.includes('data:image/png') ? 'image/png' : 'image/jpeg';
      parts.push({
        inlineData: {
          mimeType,
          data: base64Data
        }
      });
      parts.push({
        text: `Transcribe and summarize this document or handwritten page into a structured note. User context: ${transcript || 'No extra context'}`
      });
    } else {
      parts.push({
        text: `Here is the spoken or typed audio transcript:\n\n"${transcript}"\n\nPlease structure this into a clean note.`
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: { parts },
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            summary: { type: Type.STRING },
            formattedContent: { type: Type.STRING },
            tags: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            keyTakeaways: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            actionItems: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            sentiment: { type: Type.STRING }
          },
          required: ['title', 'summary', 'formattedContent', 'tags', 'keyTakeaways', 'actionItems']
        }
      }
    });

    const responseText = response.text || '{}';
    const parsedNote = JSON.parse(responseText);

    res.json(parsedNote);
  } catch (error: any) {
    console.error('Error generating note:', error);
    res.status(500).json({
      error: 'Failed to process note with AI',
      details: error.message
    });
  }
});

// AI Smart Search / Ask Notes Endpoint
app.post('/api/ai-search', async (req, res) => {
  try {
    const { query, notes } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.json({
        answer: "AI search fallback: Configure GEMINI_API_KEY in secrets to get AI synthesized answers.",
        matchingNoteIds: notes ? notes.slice(0, 3).map((n: any) => n.id) : []
      });
    }

    const notesSummary = notes?.map((n: any) => `[ID: ${n.id}] Title: ${n.title}\nTags: ${n.tags.join(', ')}\nContent: ${n.content}\nSummary: ${n.summary}`).join('\n---\n') || '';

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: `You are an AI assistant searching through user notes.
Query: "${query}"

User Notes Collection:
${notesSummary}

Provide a direct, helpful synthesis answer to the user's question based on their notes, and return the IDs of the relevant notes.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            answer: { type: Type.STRING },
            matchingNoteIds: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ['answer', 'matchingNoteIds']
        }
      }
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json(parsed);
  } catch (error: any) {
    console.error('Error in AI search:', error);
    res.status(500).json({ error: error.message });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

 app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
