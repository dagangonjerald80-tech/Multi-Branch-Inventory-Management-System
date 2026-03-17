const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  };
  if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
    config.body = JSON.stringify(options.body);
  }
  const res = await fetch(url, config);
  let data = null;
  try {
    const text = await res.text();
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {};
  }
  if (!res.ok) {
    let msg = data?.detail || data?.error;
    if (typeof msg === 'object') msg = JSON.stringify(msg);
    if (!msg && data && typeof data === 'object') {
      const parts = [];
      for (const [k, v] of Object.entries(data)) {
        const val = Array.isArray(v) ? v.join(', ') : String(v);
        parts.push(`${k}: ${val}`);
      }
      msg = parts.join('; ');
    }
    const err = new Error(msg || `Request failed: ${res.status}`);
    err.data = data;
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  branches: {
    list: () => request('/branches/'),
    get: (id) => request(`/branches/${id}/`),
    create: (data) => request('/branches/', { method: 'POST', body: data }),
    update: (id, data) => request(`/branches/${id}/`, { method: 'PUT', body: data }),
    delete: (id) => request(`/branches/${id}/`, { method: 'DELETE' }),
  },
  products: {
    list: () => request('/products/'),
    get: (id) => request(`/products/${id}/`),
    create: (data) => request('/products/', { method: 'POST', body: data }),
    update: (id, data) => request(`/products/${id}/`, { method: 'PUT', body: data }),
    delete: (id) => request(`/products/${id}/`, { method: 'DELETE' }),
  },
  stocks: {
    list: (branchId) => request(branchId ? `/stocks/?branch=${branchId}` : '/stocks/'),
    get: (id) => request(`/stocks/${id}/`),
    create: (data) => request('/stocks/', { method: 'POST', body: data }),
    update: (id, data) => request(`/stocks/${id}/`, { method: 'PUT', body: data }),
    delete: (id) => request(`/stocks/${id}/`, { method: 'DELETE' }),
    addStock: (branchId, productId, quantity) =>
      request('/stocks/add_stock/', { method: 'POST', body: { branch_id: Number(branchId), product_id: Number(productId), quantity: Number(quantity) } }),
    recordSale: (branchId, productId, quantity) =>
      request('/stocks/record_sale/', { method: 'POST', body: { branch_id: Number(branchId), product_id: Number(productId), quantity: Number(quantity) } }),
    lowStock: () => request('/stocks/low_stock/'),
  },
  transfers: {
    list: () => request('/transfers/'),
    get: (id) => request(`/transfers/${id}/`),
    create: (data) => request('/transfers/', {
      method: 'POST',
      body: { product: Number(data.product), from_branch: Number(data.from_branch), to_branch: Number(data.to_branch), quantity: Number(data.quantity) },
    }),
    complete: (id) => request(`/transfers/${id}/complete_transfer/`, { method: 'POST' }),
    cancel: (id) => request(`/transfers/${id}/cancel_transfer/`, { method: 'POST' }),
  },
  history: {
    list: () => request('/history/'),
  },
  suppliers: {
    list: () => request('/suppliers/'),
  },
  dashboard: {
    get: () => request('/dashboard/'),
  },
};
