import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api.js'

function Section({ title, children }) {
  return (
    <section style={{border:'1px solid #ddd', borderRadius:8, padding:16, margin:'16px 0'}}>
      <h2 style={{marginTop:0}}>{title}</h2>
      {children}
    </section>
  )
}

export default function Dashboard() {
  const nav = useNavigate()
  const [me, setMe] = useState(null)
  const [suppliers, setSuppliers] = useState({ items: [], total: 0 })
  const [supForm, setSupForm] = useState({ name: '', taxId: '', email: '' })
  const [poForm, setPoForm] = useState({ supplierId: '', currency: 'ARS', notes: '', item: { description: 'Item', quantity: 1, unitPrice: 100, taxPercent: 21 } })
  const [poList, setPoList] = useState({ items: [], total: 0 })
  const [loading, setLoading] = useState(false)
  const [health, setHealth] = useState(null)

  useEffect(() => {
    fetch(`${api.url}/health`).then(r=>r.json()).then(setHealth).catch(e=>setHealth({error:e.message}))
  }, [])

  useEffect(() => {
    (async () => {
      try {
        const profile = await api.me()
        setMe(profile)
        await Promise.all([loadSuppliers(), loadPOs()])
      } catch (e) {
        api.clearToken()
        nav('/login')
      }
    })()
  }, [nav])

  async function loadSuppliers() {
    const data = await api.suppliers.list({ take: 10 })
    setSuppliers(data)
    if (data.items.length && !poForm.supplierId) {
      setPoForm((p) => ({ ...p, supplierId: data.items[0].id }))
    }
  }

  async function loadPOs() {
    const data = await api.po.list({ take: 10 })
    setPoList(data)
  }

  async function createSupplier(e) {
    e.preventDefault()
    setLoading(true)
    try {
      await api.suppliers.create({
        name: supForm.name,
        taxId: supForm.taxId || null,
        email: supForm.email || null,
      })
      setSupForm({ name: '', taxId: '', email: '' })
      await loadSuppliers()
    } catch (e) {
      alert('Create supplier error: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  async function createPO(e) {
    e.preventDefault()
    setLoading(true)
    try {
      const body = {
        supplierId: poForm.supplierId,
        currency: poForm.currency,
        notes: poForm.notes || null,
        items: [poForm.item],
      }
      const res = await api.po.create(body)
      alert(`PO creada: ${res.id} - Total: ${res.total}`)
      await loadPOs()
    } catch (e) {
      alert('Create PO error: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  function logout() {
    api.clearToken()
    nav('/login')
  }

  return (
    <div style={{fontFamily:'Inter, system-ui, Arial', padding: 24, maxWidth: 1000, margin:'0 auto'}}>
      <header style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16}}>
        <div>
          <h1 style={{margin:'0 0 4px'}}>Dashboard</h1>
          <small style={{color:'#666'}}>API: {api.url}</small>
        </div>
        <div>
          {me && (
            <>
              <span style={{marginRight:12}}>Hola, {me.user?.firstName || me.user?.email}</span>
              <button onClick={logout}>Logout</button>
            </>
          )}
        </div>
      </header>

      <Section title="Estado del backend">
        <pre style={{whiteSpace:'pre-wrap'}}>{JSON.stringify(health, null, 2)}</pre>
      </Section>

      <Section title="Suppliers">
        <div style={{display:'flex', gap:16, alignItems:'start', flexWrap:'wrap'}}>
          <form onSubmit={createSupplier} style={{display:'grid', gap:8, minWidth:280}}>
            <label style={{display:'grid'}}>
              <span>Nombre</span>
              <input value={supForm.name} onChange={e=>setSupForm({...supForm, name:e.target.value})} required />
            </label>
            <label style={{display:'grid'}}>
              <span>Tax ID</span>
              <input value={supForm.taxId} onChange={e=>setSupForm({...supForm, taxId:e.target.value})} />
            </label>
            <label style={{display:'grid'}}>
              <span>Email</span>
              <input type="email" value={supForm.email} onChange={e=>setSupForm({...supForm, email:e.target.value})} />
            </label>
            <button type="submit" disabled={loading}>Crear proveedor</button>
          </form>

          <div style={{flex:1, minWidth:320}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
              <strong>Listado (total: {suppliers.total})</strong>
              <button onClick={loadSuppliers}>Refrescar</button>
            </div>
            <ul>
              {suppliers.items.map(s => (
                <li key={s.id}>{s.name} — {s.email || 's/ email'}</li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      <Section title="Crear Purchase Order">
        <form onSubmit={createPO} style={{display:'grid', gap:8, maxWidth:520}}>
          <label style={{display:'grid'}}>
            <span>Proveedor</span>
            <select value={poForm.supplierId} onChange={e=>setPoForm({...poForm, supplierId:e.target.value})} required>
              <option value="">Seleccionar…</option>
              {suppliers.items.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </label>
          <label style={{display:'grid'}}>
            <span>Moneda</span>
            <select value={poForm.currency} onChange={e=>setPoForm({...poForm, currency:e.target.value})}>
              <option>ARS</option>
              <option>USD</option>
              <option>EUR</option>
            </select>
          </label>
          <label style={{display:'grid'}}>
            <span>Notas</span>
            <input value={poForm.notes} onChange={e=>setPoForm({...poForm, notes:e.target.value})} />
          </label>
          <fieldset style={{border:'1px dashed #bbb', padding:12}}>
            <legend>Ítem</legend>
            <div style={{display:'grid', gap:8, gridTemplateColumns:'2fr 1fr 1fr 1fr', alignItems:'end'}}>
              <label style={{display:'grid'}}>
                <span>Descripción</span>
                <input value={poForm.item.description} onChange={e=>setPoForm({...poForm, item:{...poForm.item, description:e.target.value}})} required />
              </label>
              <label style={{display:'grid'}}>
                <span>Cantidad</span>
                <input type="number" min={1} value={poForm.item.quantity} onChange={e=>setPoForm({...poForm, item:{...poForm.item, quantity:Number(e.target.value)}})} required />
              </label>
              <label style={{display:'grid'}}>
                <span>Precio</span>
                <input type="number" min={0} step="0.01" value={poForm.item.unitPrice} onChange={e=>setPoForm({...poForm, item:{...poForm.item, unitPrice:Number(e.target.value)}})} required />
              </label>
              <label style={{display:'grid'}}>
                <span>IVA %</span>
                <input type="number" min={0} max={100} value={poForm.item.taxPercent} onChange={e=>setPoForm({...poForm, item:{...poForm.item, taxPercent:Number(e.target.value)}})} />
              </label>
            </div>
          </fieldset>
          <button type="submit" disabled={!poForm.supplierId || loading}>Crear PO</button>
        </form>
      </Section>

      <Section title="Listado de Purchase Orders">
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
          <strong>Total: {poList.total}</strong>
          <button onClick={loadPOs}>Refrescar</button>
        </div>
        <ul>
          {poList.items.map(po => (
            <li key={po.id}>{po.id} — {po.currency} — Total: {po.total}</li>
          ))}
        </ul>
      </Section>
    </div>
  )
}
