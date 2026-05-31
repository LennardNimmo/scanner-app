const API_URL = process.env.EXPO_PUBLIC_API_URL;

if (!API_URL) {
  throw new Error('EXPO_PUBLIC_API_URL ontbreekt in mobile/.env');
}

let accessToken: string | null = null;

export function setApiAccessToken(token: string | null) {
  accessToken = token;
}

async function request<T = any>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(options?.headers || {})
    },
    ...options
  });

  if (!response.ok) {
    let message = 'Er ging iets mis';
    try {
      const error = await response.json();
      message = error.detail || message;
    } catch {}
    throw new Error(message);
  }

  return response.json();
}

export const api = {
  me: () => request('/auth/me'),

  scan: (userId: string, gtin: string, quantity = 1) =>
    request('/scan', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, gtin, quantity })
    }),

  getCart: (userId: string) => request(`/cart/${userId}`),

  updateCartItem: (userId: string, productId: string, quantity: number) =>
    request('/cart/items', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, product_id: productId, quantity })
    }),

  optimize: (userId: string) => request(`/cart/${userId}/optimize`, { method: 'POST' }),

  // Affiliate mode: no in-app checkout. The app opens these backend redirect URLs in the browser.
  affiliateRedirectUrl: (optimizationId: string, merchantId: string) =>
    `${API_URL}/affiliate/redirect/${optimizationId}/${merchantId}`,

  getShipments: (userId: string) => request(`/shipments/${userId}`),

  addManualShipment: (userId: string, carrier: string, trackingCode: string, description: string) =>
    request('/shipments/manual', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, carrier, tracking_code: trackingCode, description })
    })
};
