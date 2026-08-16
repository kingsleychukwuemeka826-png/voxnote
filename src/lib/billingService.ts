// Thin client for the Paystack billing endpoints in server.ts.
// Keep the API origin configurable so the UI can work when the frontend is
// previewed from a different host while the Express billing API remains on Render.

export interface CheckoutResult {
  configured: boolean;
  url?: string;
  error?: string;
}

const BILLING_API_ORIGIN =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ||
  'https://voxnote-fgaf.onrender.com';

async function parseBillingResponse(res: Response): Promise<CheckoutResult> {
  let data: any = null;

  try {
    data = await res.json();
  } catch {
    // Keep a useful message even if the server returned non-JSON content.
  }

  if (!res.ok) {
    const serverError = data?.error || data?.details;
    const message = serverError
      ? `${serverError} (HTTP ${res.status})`
      : `Billing request failed (HTTP ${res.status}).`;

    console.error('[Voxnote] Billing server rejected request:', {
      status: res.status,
      statusText: res.statusText,
      data,
    });

    return { configured: true, error: message };
  }

  return data || {
    configured: false,
    error: 'Billing server returned an empty response.',
  };
}

async function postBilling(path: string, body: Record<string, unknown>): Promise<CheckoutResult> {
  try {
    const res = await fetch(`${BILLING_API_ORIGIN}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return await parseBillingResponse(res);
  } catch (e) {
    console.error('[Voxnote] Failed to reach billing server:', e);
    return {
      configured: false,
      error: `Could not reach the billing server at ${BILLING_API_ORIGIN}.`,
    };
  }
}

export function createCheckoutSession(
  uid: string,
  email: string | undefined,
  plan: 'monthly' | 'annual'
): Promise<CheckoutResult> {
  return postBilling('/api/billing/create-checkout-session', { uid, email, plan });
}

export function createPortalSession(uid: string): Promise<CheckoutResult> {
  return postBilling('/api/billing/create-portal-session', { uid });
}
