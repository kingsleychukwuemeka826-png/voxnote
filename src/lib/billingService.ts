// Thin client for the Paystack billing endpoints in server.ts.
// Both calls gracefully report { configured: false } if Paystack hasn't
// been set up on the server yet, so callers can fall back to a simulated flow.

export interface CheckoutResult {
  configured: boolean;
  url?: string;
  error?: string;
}

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

    return {
      configured: true,
      error: message,
    };
  }

  return data || {
    configured: false,
    error: 'Billing server returned an empty response.',
  };
}

export async function createCheckoutSession(
  uid: string,
  email: string | undefined,
  plan: 'monthly' | 'annual'
): Promise<CheckoutResult> {
  try {
    const res = await fetch('/api/billing/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, email, plan }),
    });
    return await parseBillingResponse(res);
  } catch (e) {
    console.error('[Voxnote] Failed to reach billing server:', e);
    return { configured: false, error: 'Could not reach the billing server.' };
  }
}

export async function createPortalSession(uid: string): Promise<CheckoutResult> {
  try {
    const res = await fetch('/api/billing/create-portal-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid }),
    });
    return await parseBillingResponse(res);
  } catch (e) {
    console.error('[Voxnote] Failed to reach billing server:', e);
    return { configured: false, error: 'Could not reach the billing server.' };
  }
}
