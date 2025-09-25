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
  const [selectedPO, setSelectedPO] = useState(null)
  const [poSteps, setPoSteps] = useState([])
  const [decisionComment, setDecisionComment] = useState('')
  const [poLogs, setPoLogs] = useState([])
  const [poFilters, setPoFilters] = useState({ status: '', supplierId: '' })
  const [poPage, setPoPage] = useState(0)
  const pageSize = 10
  const [poListLoading, setPoListLoading] = useState(false)
  const [suppliersLoading, setSuppliersLoading] = useState(false)
  const [poStats, setPoStats] = useState({ counts: { draft: 0, submitted: 0, approved: 0, rejected: 0, cancelled: 0 }, recent: [] })
  const [poPendingMe, setPoPendingMe] = useState({ items: [], total: 0 })
  const [poTimeseries, setPoTimeseries] = useState({ days: 14, series: [] })

  useEffect(() => {
    fetch(`${api.url}/health`).then(r=>r.json()).then(setHealth).catch(e=>setHealth({error:e.message}))
  }, [])

  useEffect(() => {
    (async () => {
      try {
        const profile = await api.me()
        setMe(profile)
        await Promise.all([loadSuppliers(), loadPOs(), loadStats(), loadPendingForMe(), loadTimeseries()])
      } catch (e) {
        api.clearToken()
        nav('/login')
      }
    })()
  }, [nav])

  // Auto-reload POs when filters or page change
  useEffect(() => {
    loadPOs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poFilters, poPage])

  async function loadSuppliers() {
    setSuppliersLoading(true)
    try {
      const data = await api.suppliers.list({ take: 50 })
      setSuppliers(data)
      if (data.items.length && !poForm.supplierId) {
        setPoForm((p) => ({ ...p, supplierId: data.items[0].id }))
      }
    } finally {
      setSuppliersLoading(false)
    }
  }

  async function loadPOs() {
    setPoListLoading(true)
    try {
      const params = { take: pageSize, skip: poPage * pageSize }
      if (poFilters.status) params.status = poFilters.status
      if (poFilters.supplierId) params.supplierId = poFilters.supplierId
      const data = await api.po.list(params)
      setPoList(data)
    } finally {
      setPoListLoading(false)
    }
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
  
  async function selectPO(id) {
    try {
      setLoading(true)
      const po = await api.po.get(id)
      setSelectedPO(po)
      const st = await api.po.steps(id)
      setPoSteps(st.steps || [])
      const logsRes = await api.po.logs(id)
      setPoLogs(logsRes.logs || [])
    } catch (e) {
      alert('Load PO error: ' + e.message)
    } finally {
      setLoading(false)
    }
  }
  async function submitSelectedPO() {
    if (!selectedPO) return
    try {
      setLoading(true)
      const res = await api.po.submit(selectedPO.id)
      setSelectedPO(res)
      const st = await api.po.steps(selectedPO.id)
      setPoSteps(st.steps || [])
      await loadPOs()
    } catch (e) {
      alert('Submit PO error: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  async function approveCurrentStep() {
    if (!selectedPO) return
    try {
      setLoading(true)
      const pending = poSteps.find(s => s.status === 'PENDING')
      if (!pending) {
        alert('No hay pasos pendientes')
        return
      }
      await api.po.approve(selectedPO.id, pending.order, decisionComment || undefined)
      await selectPO(selectedPO.id)
      await loadPOs()
    } catch (e) {
      alert('Approve error: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  async function rejectCurrentStep() {
    if (!selectedPO) return
    try {
      setLoading(true)
      const pending = poSteps.find(s => s.status === 'PENDING')
      if (!pending) {
        alert('No hay pasos pendientes')
        return
      }
      await api.po.reject(selectedPO.id, pending.order, decisionComment || undefined)
      await selectPO(selectedPO.id)
      await loadPOs()
    } catch (e) {
      alert('Reject error: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  async function cancelSelectedPO() {
    if (!selectedPO) return
    try {
      setLoading(true)
      await api.po.cancel(selectedPO.id)
      await selectPO(selectedPO.id)
      await loadPOs()
    } catch (e) {
      alert('Cancel error: ' + e.message)
    } finally {
      setLoading(false)
    }
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

      <Section title="Indicadores (PO)">
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px, 1fr))', gap:12}}>
          {[
            { key:'draft', label:'Borradores' },
            { key:'submitted', label:'Enviadas' },
            { key:'approved', label:'Aprobadas' },
            { key:'rejected', label:'Rechazadas' },
            { key:'cancelled', label:'Canceladas' },
          ].map(k => (
            <div key={k.key} style={{border:'1px solid #ddd', borderRadius:8, padding:12, background:'#fafafa'}}>
              <div style={{fontSize:12, color:'#666'}}>{k.label}</div>
              <div style={{fontSize:24, fontWeight:700}}>{poStats.counts?.[k.key] ?? 0}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Actividad reciente (aprobaciones)">
        {poStats.recent?.length ? (
          <ul>
            {poStats.recent.map(ev => (
              <li key={ev.id}>
                <span>{new Date(ev.createdAt).toLocaleString()} — {ev.action}</span>
                {ev.user && (
                  <span> — Por: {ev.user.firstName || ev.user.email}</span>
                )}
                {ev.purchaseOrder && (
                  <span> — PO: {ev.purchaseOrder.id} ({ev.purchaseOrder.status})</span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <div style={{color:'#666'}}>Sin actividad reciente.</div>
        )}
      </Section>

      <Section title="Mis aprobaciones pendientes">
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
          <strong>Total: {poPendingMe.total}</strong>
          <button onClick={() => { loadPendingForMe(); }}>Refrescar</button>
        </div>
        {poPendingMe.items.length ? (
          <ul>
            {poPendingMe.items.map(it => (
              <li key={it.step.id} style={{display:'flex', gap:8, alignItems:'center'}}>
                <span>PO {it.po.id} — Paso #{it.step.order} ({it.step.roleName || it.step.roleId}) — Estado: {it.po.status} — Total: {it.po.total} {it.po.currency}</span>
                <button onClick={() => selectPO(it.po.id)}>Ver</button>
                {selectedPO?.id !== it.po.id && (
                  <button onClick={async () => { await selectPO(it.po.id); }}>Abrir</button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <div style={{color:'#666'}}>No tienes aprobaciones pendientes.</div>
        )}
      </Section>

      <Section title={`Actividad (últimos ${poTimeseries.days} días)`}>
        {poTimeseries.series.length ? (
          <div style={{overflowX:'auto'}}>
            <table style={{borderCollapse:'collapse', minWidth:560}}>
              <thead>
                <tr>
                  <th style={{textAlign:'left', borderBottom:'1px solid #ddd', padding:'4px 8px'}}>Fecha</th>
                  <th style={{textAlign:'right', borderBottom:'1px solid #ddd', padding:'4px 8px'}}>Submitted</th>
                  <th style={{textAlign:'right', borderBottom:'1px solid #ddd', padding:'4px 8px'}}>Approved</th>
                  <th style={{textAlign:'right', borderBottom:'1px solid #ddd', padding:'4px 8px'}}>Rejected</th>
                  <th style={{textAlign:'right', borderBottom:'1px solid #ddd', padding:'4px 8px'}}>Cancelled</th>
                </tr>
              </thead>
              <tbody>
                {poTimeseries.series.map(row => (
                  <tr key={row.date}>
                    <td style={{padding:'4px 8px'}}>{row.date}</td>
                    <td style={{padding:'4px 8px', textAlign:'right'}}>{row.submitted}</td>
                    <td style={{padding:'4px 8px', textAlign:'right'}}>{row.approved}</td>
                    <td style={{padding:'4px 8px', textAlign:'right'}}>{row.rejected}</td>
                    <td style={{padding:'4px 8px', textAlign:'right'}}>{row.cancelled}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{color:'#666'}}>Sin actividad en el rango seleccionado.</div>
        )}
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
              <div style={{display:'flex', gap:8, alignItems:'center'}}>
                {suppliersLoading && <small style={{color:'#888'}}>Cargando…</small>}
                <button onClick={loadSuppliers} disabled={suppliersLoading}>Refrescar</button>
              </div>
            </div>
            {suppliers.items.length === 0 ? (
              <div style={{color:'#666'}}>No hay proveedores.</div>
            ) : (
              <ul>
                {suppliers.items.map(s => (
                  <li key={s.id}>{s.name} — {s.email || 's/ email'}</li>
                ))}
              </ul>
            )}
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
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', gap:12, flexWrap:'wrap'}}>
          <strong>Total: {poList.total}</strong>
          <div style={{display:'flex', gap:8, alignItems:'center', flexWrap:'wrap'}}>
            <label style={{display:'grid'}}>
              <span>Estado</span>
              <select value={poFilters.status} onChange={e=>{ setPoFilters({...poFilters, status:e.target.value}); setPoPage(0) }}>
                <option value="">Todos</option>
                <option value="DRAFT">DRAFT</option>
                <option value="SUBMITTED">SUBMITTED</option>
                <option value="APPROVED">APPROVED</option>
                <option value="REJECTED">REJECTED</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </label>
            <label style={{display:'grid'}}>
              <span>Proveedor</span>
              <select value={poFilters.supplierId} onChange={e=>{ setPoFilters({...poFilters, supplierId:e.target.value}); setPoPage(0) }}>
                <option value="">Todos</option>
                {suppliers.items.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </label>
            <button onClick={loadPOs}>Aplicar</button>
          </div>
          <div style={{display:'flex', gap:8, alignItems:'center'}}>
            {poListLoading && <small style={{color:'#888'}}>Cargando…</small>}
            {(() => {
              const pages = Math.max(1, Math.ceil((poList.total || 0) / pageSize))
              const page = poPage + 1
              return (
                <>
                  <button onClick={() => setPoPage(p => Math.max(0, p - 1))} disabled={poPage === 0}>Anterior</button>
                  <span>Página {page} de {pages}</span>
                  <button onClick={() => setPoPage(p => (page < pages ? p + 1 : p))} disabled={(poPage + 1) >= pages}>Siguiente</button>
                </>
              )
            })()}
          </div>
        </div>
        {poList.items.length === 0 ? (
          <div style={{color:'#666'}}>Sin resultados para los filtros seleccionados.</div>
        ) : (
          <ul>
            {poList.items.map(po => (
              <li key={po.id} style={{display:'flex', gap:8, alignItems:'center'}}>
                <span>{po.id} — {po.currency} — Total: {po.total} — Estado: {po.status}</span>
                <button onClick={() => selectPO(po.id)}>Ver</button>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {selectedPO && (
        <Section title={`PO seleccionada: ${selectedPO.id}`}>
          <div style={{display:'grid', gap:8}}>
            <div>
              <strong>Estado:</strong> {selectedPO.status} — <strong>Moneda:</strong> {selectedPO.currency} — <strong>Total:</strong> {selectedPO.total}
            </div>
            <div>
              <strong>Notas:</strong> {selectedPO.notes || '—'}
            </div>
            <div>
              <strong>Acciones:</strong>
              <div style={{display:'flex', gap:8, flexWrap:'wrap', marginTop:8}}>
                {(selectedPO.status === 'DRAFT' || selectedPO.status === 'REJECTED') && (
                  <button onClick={submitSelectedPO} disabled={loading}>Enviar a aprobación</button>
                )}
                {selectedPO.status !== 'CANCELLED' && selectedPO.status !== 'APPROVED' && (
                  <button onClick={cancelSelectedPO} disabled={loading}>Cancelar</button>
                )}
              </div>
            </div>
            <div>
              <strong>Pasos de aprobación</strong>
              <div style={{marginTop:8}}>
                {poSteps.length === 0 ? (
                  <em>No hay pasos instanciados.</em>
                ) : (
                  <ol>
                    {poSteps.map(st => (
                      <li key={st.id}>
                        <div>
                          <span>Orden {st.order} — Rol: {st.role?.name || 'N/A'} — Estado: {st.status}</span>
                          {st.approver && (
                            <span> — Aprobador: {st.approver.firstName || st.approver.email}</span>
                          )}
                          {st.comment && (
                            <span> — Comentario: {st.comment}</span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
              {selectedPO.status === 'SUBMITTED' && poSteps.some(s => s.status === 'PENDING') && (
                <div style={{display:'grid', gap:8, maxWidth:520, marginTop:8}}>
                  <label style={{display:'grid'}}>
                    <span>Comentario (opcional)</span>
                    <input value={decisionComment} onChange={e=>setDecisionComment(e.target.value)} />
                  </label>
                  <div style={{display:'flex', gap:8}}>
                    <button onClick={approveCurrentStep} disabled={loading}>Aprobar paso pendiente</button>
                    <button onClick={rejectCurrentStep} disabled={loading}>Rechazar paso pendiente</button>
                  </div>
                </div>
              )}
            </div>
            <div>
              <strong>Auditoría</strong>
              <div style={{marginTop:8}}>
                {poLogs.length === 0 ? (
                  <em>Sin eventos todavía.</em>
                ) : (
                  <>
                    <div style={{marginBottom:8}}>
                      <button onClick={exportLogsToCSV}>Exportar CSV</button>
                    </div>
                    <ul>
                      {poLogs.map(log => (
                        <li key={log.id}>
                          <span>{new Date(log.createdAt).toLocaleString()} — {log.action}</span>
                          {log.user && (
                            <span> — Por: {log.user.firstName || log.user.email}</span>
                          )}
                          {log.comment && (
                            <span> — Comentario: {log.comment}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            </div>
          </div>
        </Section>
      )}
    </div>
  )
}

