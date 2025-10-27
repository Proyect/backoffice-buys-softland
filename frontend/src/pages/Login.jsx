import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api.js'
import { useToast } from '../components/ToastProvider.jsx'
import { Card } from '../components/ui/Card.jsx'
import { TextField } from '../components/ui/TextField.jsx'
import { Button } from '../components/ui/Button.jsx'

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
    <div className="center-screen">
      <Card title="Ingresar" subtitle="Backoffice Buys Softland">
        <div className="flex justify-between items-center">
          <span className="badge">{new URL(api.url).host}</span>
        </div>
        <form onSubmit={onSubmit} className="grid mt-16">
          <TextField
            label="Email"
            type="email"
            value={form.email}
            onChange={e=>setForm({...form, email:e.target.value})}
            required
          />
          <TextField
            label="Password"
            type="password"
            value={form.password}
            onChange={e=>setForm({...form, password:e.target.value})}
            required
          />
          <Button type="submit" disabled={loading} fullWidth>
            {loading ? 'Ingresando...' : 'Ingresar'}
          </Button>
        </form>

        <div className="mt-16">
          <div className="subtle" style={{marginBottom:8}}>Estado backend</div>
          <pre className="codebox">{JSON.stringify(health, null, 2)}</pre>
        </div>
      </Card>
    </div>
  )
}

