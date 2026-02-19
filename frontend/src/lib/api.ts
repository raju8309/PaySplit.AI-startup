const API_BASE = '/api'

// ── AUTH ──────────────────────────────────────
export const authAPI = {
  signup: async (name: string, email: string, password: string) => {
    const res = await fetch(`${API_BASE}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    })
    if (!res.ok) throw new Error((await res.json()).detail)
    return res.json() // returns { access_token, user }
  },

  login: async (email: string, password: string) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })
    if (!res.ok) throw new Error((await res.json()).detail)
    return res.json() // returns { access_token, user }
  },
}

// ── SETTLEMENTS ───────────────────────────────
export const settlementAPI = {
  calculate: async (expenses: object[]) => {
    const res = await fetch(`${API_BASE}/settlements/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expenses })
    })
    if (!res.ok) throw new Error((await res.json()).detail)
    return res.json() // returns { balances_cents, transactions }
  }
}

// ── TOKEN HELPERS ─────────────────────────────
export const saveToken = (token: string) => localStorage.setItem('token', token)
export const getToken = () => localStorage.getItem('token')
export const clearToken = () => localStorage.removeItem('token')