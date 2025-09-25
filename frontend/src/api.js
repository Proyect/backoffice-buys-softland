const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

function getToken() {
  return localStorage.getItem('accessToken') || ''
}

async function requestForm(path, { method = 'POST', formData, auth = false, _retried = false } = {}) {
  const headers = {}
  if (auth) {
    const t = getToken()
    if (t) headers['Authorization'] = `Bearer ${t}`
  }
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: formData,
  })
  if (res.status === 401 && auth && !_retried) {
    try {
      await doRefresh()
      return requestForm(path, { method, formData, auth, _retried: true })
    } catch (e) {
      throw e
    }
  }
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    let err
    try { err = JSON.parse(txt) } catch { err = { error: txt || res.statusText } }
    throw new Error(err.message || err.error || `HTTP ${res.status}`)
  }
  return res.json()
}

function setToken(token) {
  if (token) localStorage.setItem('accessToken', token)
}

function clearToken() {
  localStorage.removeItem('accessToken')
}

function getRefreshToken() {
  return localStorage.getItem('refreshToken') || ''
}

function setRefreshToken(token) {
  if (token) localStorage.setItem('refreshToken', token)
}

function clearRefreshToken() {
  localStorage.removeItem('refreshToken')
}

async function doRefresh() {
  const rt = getRefreshToken()
  if (!rt) throw new Error('No refresh token')
  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: rt }),
  })
  if (!res.ok) {
    // On refresh failure, clear stored tokens
    clearToken();
    clearRefreshToken();
    const txt = await res.text().catch(() => '')
    let err
    try { err = JSON.parse(txt) } catch { err = { error: txt || res.statusText } }
    throw new Error(err.message || err.error || `HTTP ${res.status}`)
  }
  const data = await res.json()
  // Persist new tokens
  setToken(data.tokens?.accessToken)
  if (data.tokens?.refreshToken) setRefreshToken(data.tokens.refreshToken)
  return data
}

async function request(path, { method = 'GET', body, auth = false, _retried = false } = {}) {
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
  if (res.status === 401 && auth && !_retried) {
    try {
      await doRefresh()
      return request(path, { method, body, auth, _retried: true })
    } catch (e) {
      throw e
    }
  }
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
  setRefreshToken,
  getRefreshToken,
  clearRefreshToken,
  login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password } }),
  refresh: () => doRefresh(),
  logout: async () => {
    const rt = getRefreshToken()
    if (rt) {
      try {
        await request('/auth/logout', { method: 'POST', body: { refreshToken: rt } })
      } catch (_) {
        // ignore errors on logout
      }
    }
    clearToken();
    clearRefreshToken();
  },
  me: () => request('/auth/me', { auth: true }),
  suppliers: {
    list: (params = {}) => {
      const q = new URLSearchParams(params)
      return request(`/api/suppliers?${q.toString()}`, { auth: true })
    },
    create: (data) => request('/api/suppliers', { method: 'POST', body: data, auth: true }),
    update: (id, data) => request(`/api/suppliers/${id}`, { method: 'PUT', body: data, auth: true }),
    remove: (id) => request(`/api/suppliers/${id}`, { method: 'DELETE', auth: true }),
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
    files: {
      list: (id) => request(`/api/po/${id}/files`, { auth: true }),
      upload: (id, file) => {
        const fd = new FormData()
        fd.append('file', file)
        return requestForm(`/api/po/${id}/files`, { method: 'POST', formData: fd, auth: true })
      },
      downloadUrl: (id, fileId) => `${API_URL}/api/po/${id}/files/${fileId}`,
      remove: (id, fileId) => request(`/api/po/${id}/files/${fileId}`, { method: 'DELETE', auth: true }),
    },
  },
}

