// Thin client for the Paystack billing endpoints in server.ts.

export interface CheckoutResult {
  configured: boolean;
  url?: string;
  error?: string;
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
    return await res.json();
  } catch (e) {
    console.error('[Voxnote] Failed to reach billing server:', e);
    return { configured: false, error: 'Could not reach the billing server.' };
  }
}

export async function createPortalSession(uid: string, email?: string): Promise<CheckoutResult> {
  try {
    const res = await fetch('/api/billing/create-portal-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, email }),
    });
    return await res.json();
  } catch (e) {
    console.error('[Voxnote] Failed to reach billing server:', e);
    return { configured: false, error: 'Could not reach the billing server.' };
  }
}
