let apiUrl = process.env.REACT_APP_API_URL;
if (apiUrl && !apiUrl.startsWith('http')) {
  apiUrl = `https://${apiUrl}/api`;
}
const API_BASE = (apiUrl || 'http://localhost:8000/api').replace(/\/$/, '');

const ACCESS_KEY = 'inventory_access_token';
const REFRESH_KEY = 'inventory_refresh_token';

export function getAccessToken() {
  return localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_KEY);
}

export function setTokens(access, refresh) {
  if (access) localStorage.setItem(ACCESS_KEY, access);
  if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

async function refreshAccessToken() {
  const refresh = getRefreshToken();
  if (!refresh) return null;
  const res = await fetch(`${API_BASE}/auth/token/refresh/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (data.access) {
    localStorage.setItem(ACCESS_KEY, data.access);
    return data.access;
  }
  return null;
}

function buildHeaders(extra = {}, isFormData = false) {
  const headers = { ...extra };
  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (!isFormData && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  return headers;
}

async function parseBody(res) {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

export async function request(endpoint, options = {}, retry = true) {
  const url = `${API_BASE}${endpoint}`;
  const isFormData = options.body instanceof FormData;
  const config = {
    ...options,
    headers: buildHeaders(options.headers || {}, isFormData),
  };
  if (options.body && typeof options.body === 'object' && !isFormData) {
    config.body = JSON.stringify(options.body);
  }

  let res = await fetch(url, config);
  let data = await parseBody(res);

  if (res.status === 401 && retry && getRefreshToken()) {
    const newAccess = await refreshAccessToken();
    if (newAccess) {
      const retryHeaders = buildHeaders(options.headers || {}, isFormData);
      res = await fetch(url, { ...config, headers: retryHeaders });
      data = await parseBody(res);
    }
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

export function buildProductFormData(raw) {
  const fd = new FormData();
  if (raw.name != null) fd.append('name', raw.name);
  if (raw.description != null) fd.append('description', raw.description || '');
  if (raw.sku != null) fd.append('sku', raw.sku);
  if (raw.price != null) fd.append('price', String(raw.price));
  if (raw.supplier != null && raw.supplier !== '') {
    fd.append('supplier', String(raw.supplier));
  }
  if (raw.image instanceof File) {
    fd.append('image', raw.image);
  }
  return fd;
}

export const api = {
  auth: {
    login: (username, password) =>
      request('/auth/login/', { method: 'POST', body: { username, password } }, false),
    register: (body) =>
      request('/auth/register/', { method: 'POST', body }, false),
    verifyEmail: (email, code) =>
      request('/auth/verify-email/', { method: 'POST', body: { email, code } }, false),
    resendVerification: (email) =>
      request('/auth/resend-verification/', { method: 'POST', body: { email } }, false),
    changeEmail: (email) =>
      request('/auth/change-email/', { method: 'POST', body: { email } }),
  },
  me: {
    get: () => request('/users/me/'),
    patch: (data) => {
      const isForm = data instanceof FormData;
      return request('/users/me/', {
        method: 'PATCH',
        body: isForm ? data : data,
      });
    },
  },
  chat: {
    send: (message) => request('/chat/', { method: 'POST', body: { message } }),
  },
  users: {
    list: () => request('/users/'),
    get: (id) => request(`/users/${id}/`),
    create: (body) => request('/users/', { method: 'POST', body }),
    update: (id, body) => request(`/users/${id}/`, { method: 'PATCH', body }),
    delete: (id) => request(`/users/${id}/`, { method: 'DELETE' }),
  },
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
    create: (data) =>
      data instanceof FormData
        ? request('/products/', { method: 'POST', body: data })
        : request('/products/', { method: 'POST', body: data }),
    update: (id, data) =>
      data instanceof FormData
        ? request(`/products/${id}/`, { method: 'PATCH', body: data })
        : request(`/products/${id}/`, { method: 'PATCH', body: data }),
    delete: (id) => request(`/products/${id}/`, { method: 'DELETE' }),
  },
  stocks: {
    list: (branchId) => request(branchId ? `/stocks/?branch=${branchId}` : '/stocks/'),
    get: (id) => request(`/stocks/${id}/`),
    create: (data) => request('/stocks/', { method: 'POST', body: data }),
    update: (id, data) => request(`/stocks/${id}/`, { method: 'PUT', body: data }),
    delete: (id) => request(`/stocks/${id}/`, { method: 'DELETE' }),
    addStock: (branchId, productId, quantity) =>
      request('/stocks/add_stock/', {
        method: 'POST',
        body: {
          branch_id: Number(branchId),
          product_id: Number(productId),
          quantity: Number(quantity),
        },
      }),
    recordSale: (branchId, productId, quantity) =>
      request('/stocks/record_sale/', {
        method: 'POST',
        body: {
          branch_id: Number(branchId),
          product_id: Number(productId),
          quantity: Number(quantity),
        },
      }),
    lowStock: () => request('/stocks/low_stock/'),
  },
  transfers: {
    list: () => request('/transfers/'),
    get: (id) => request(`/transfers/${id}/`),
    create: (data) =>
      request('/transfers/', {
        method: 'POST',
        body: {
          product: Number(data.product),
          from_branch: Number(data.from_branch),
          to_branch: Number(data.to_branch),
          quantity: Number(data.quantity),
        },
      }),
    complete: (id) => request(`/transfers/${id}/complete_transfer/`, { method: 'POST' }),
    cancel: (id) => request(`/transfers/${id}/cancel_transfer/`, { method: 'POST' }),
    delete: (id) => request(`/transfers/${id}/`, { method: 'DELETE' }),
  },
  history: {
    list: () => request('/history/'),
  },
  suppliers: {
    list: () => request('/suppliers/'),
    get: (id) => request(`/suppliers/${id}/`),
    create: (data) => request('/suppliers/', { method: 'POST', body: data }),
    update: (id, data) => request(`/suppliers/${id}/`, { method: 'PUT', body: data }),
    delete: (id) => request(`/suppliers/${id}/`, { method: 'DELETE' }),
  },
  dashboard: {
    get: () => request('/dashboard/'),
  },
};
