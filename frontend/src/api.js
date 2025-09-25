const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

function getToken() {
  return localStorage.getItem('accessToken') || ''
}

function setToken(token) {
  if (token) localStorage.setItem('accessToken', token)
}

function clearToken() {
  localStorage.removeItem('accessToken')
}

async function request(path, { method = 'GET', body, auth = false } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (auth) {
    const t = getToken()
    if (t) headers['Authorization'] = `Bearer ${t}`
  }
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    let err
    try { err = JSON.parse(txt) } catch { err = { error: txt || res.statusText } }
    throw new Error(err.message || err.error || `HTTP ${res.status}`)
  }
  return res.json()
}

export const api = {
  url: API_URL,
  setToken,
  getToken,
  clearToken,
  login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password } }),
  me: () => request('/auth/me', { auth: true }),
  suppliers: {
    list: (params = {}) => {
      const q = new URLSearchParams(params)
      return request(`/api/suppliers?${q.toString()}`, { auth: true })
    },
    create: (data) => request('/api/suppliers', { method: 'POST', body: data, auth: true }),
  },
  po: {
    list: (params = {}) => {
      const q = new URLSearchParams(params)
      return request(`/api/po?${q.toString()}`, { auth: true })
    },
    create: (data) => request('/api/po', { method: 'POST', body: data, auth: true }),
    get: (id) => request(`/api/po/${id}`, { auth: true }),
    submit: (id) => request(`/api/po/${id}`, { method: 'POST', auth: true }),
    steps: (id) => request(`/api/po/${id}/steps`, { auth: true }),
    approve: (id, order, comment) => request(`/api/po/${id}/steps/${order}/approve`, { method: 'POST', body: comment ? { comment } : undefined, auth: true }),
    reject: (id, order, comment) => request(`/api/po/${id}/steps/${order}/reject`, { method: 'POST', body: comment ? { comment } : undefined, auth: true }),
    cancel: (id) => request(`/api/po/${id}/cancel`, { method: 'POST', auth: true }),
    logs: (id) => request(`/api/po/${id}/logs`, { auth: true }),
    stats: () => request('/api/po/stats', { auth: true }),
    pendingForMe: () => request('/api/po/pending-for-me', { auth: true }),
    statsTimeseries: (days = 14) => request(`/api/po/stats/timeseries?days=${days}`, { auth: true }),
  },
}

