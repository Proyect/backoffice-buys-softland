import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api.js'
import { useToast } from '../components/ToastProvider.jsx'

export default function Login() {
  const nav = useNavigate()
  const toast = useToast()
  const [form, setForm] = useState({ email: 'admin@local.test', password: 'Admin1234!' })
  const [loading, setLoading] = useState(false)
  const [health, setHealth] = useState(null)

  useEffect(() => {
    fetch(`${api.url}/health`).then(r=>r.json()).then(setHealth).catch(e=>setHealth({error:e.message}))
  }, [])

  async function onSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await api.login(form.email, form.password)
      api.setToken(res.tokens.accessToken)
      if (res.tokens?.refreshToken) {
        api.setRefreshToken(res.tokens.refreshToken)
      }
      toast.success(`Bienvenido ${res.user?.firstName || res.user?.email || ''}`.trim())
      nav('/dashboard')
    } catch (e) {
      toast.error('Login error: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{fontFamily:'Inter, system-ui, Arial', padding: 24, maxWidth: 420, margin:'10vh auto'}}>
      <h1>Ingresar</h1>
      <p style={{color:'#555'}}>API: {api.url}</p>
      <form onSubmit={onSubmit} style={{display:'grid', gap:12}}>
        <label style={{display:'grid'}}>
          <span>Email</span>
          <input type="email" value={form.email} onChange={e=>setForm({...form, email:e.target.value})} required />
        </label>
        <label style={{display:'grid'}}>
          <span>Password</span>
          <input type="password" value={form.password} onChange={e=>setForm({...form, password:e.target.value})} required />
        </label>
        <button type="submit" disabled={loading}>{loading ? 'Ingresando...' : 'Ingresar'}</button>
      </form>
      <div style={{marginTop:16}}>
        <strong>Estado backend</strong>
        <pre style={{whiteSpace:'pre-wrap', background:'#fafafa', padding:12, border:'1px solid #eee'}}>{JSON.stringify(health, null, 2)}</pre>
      </div>
    </div>
  )
}
