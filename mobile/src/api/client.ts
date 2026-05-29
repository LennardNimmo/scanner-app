const API_URL = 'https://scanner-app-r6ye.onrender.com';

console.log('APP GEBRUIKT API_URL:', API_URL);

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_URL}${path}`;

  console.log('API request naar:', url);

  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers || {})
      },
      ...options
    });

    console.log('API response status:', response.status);

    if (!response.ok) {
      let message = 'Er ging iets mis';
      try {
        const error = await response.json();
        message = error.detail || message;
      } catch {}
      throw new Error(message);
    }

    return response.json();
  } catch (error) {
    console.log('API request mislukt:', url, error);
    throw error;
  }
}

export const api = {
  health: () => request('/health'),

  register: (email: string, password: string, fullName?: string) =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, full_name: fullName })
    }),

  login: (email: string, password: string) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    }),

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

  checkout: (userId: string, optimizationId: string) =>
    request('/checkout', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, optimization_id: optimizationId })
    }),

  getShipments: (userId: string) => request(`/shipments/${userId}`),

  addManualShipment: (userId: string, carrier: string, trackingCode: string, description: string) =>
    request('/shipments/manual', {
      method: 'POST',
      body: JSON.stringify({
        user_id: userId,
        carrier,
        tracking_code: trackingCode,
        description
      })
    })
};
