import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api.js'
import { useToast } from '../components/ToastProvider.jsx'

function Section({ title, children }) {
  return (
    <section style={{border:'1px solid #ddd', borderRadius:8, padding:16, margin:'16px 0'}}>
      <h2 style={{marginTop:0}}>{title}</h2>
      {children}
    </section>
  )
}

export default function Dashboard() {
  const SHOW_PERM_NOTICES = import.meta.env.VITE_SHOW_PERM_NOTICES !== 'false'
  const nav = useNavigate()
  const toast = useToast()
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
  const [poFiles, setPoFiles] = useState([])
  const [poFilesLoading, setPoFilesLoading] = useState(false)
  const [poFilters, setPoFilters] = useState({ status: '', supplierId: '' })
  const [poPage, setPoPage] = useState(0)
  const pageSize = 10
  const [poListLoading, setPoListLoading] = useState(false)
  const [suppliersLoading, setSuppliersLoading] = useState(false)
  const [poStats, setPoStats] = useState({ counts: { draft: 0, submitted: 0, approved: 0, rejected: 0, cancelled: 0 }, recent: [] })
  const [poPendingMe, setPoPendingMe] = useState({ items: [], total: 0 })
  const [poTimeseries, setPoTimeseries] = useState({ days: 14, series: [] })
  const [supPage, setSupPage] = useState(0)
  const supPageSize = 10
  const [decisionComments, setDecisionComments] = useState({})
  const [editingSupplierId, setEditingSupplierId] = useState(null)
  const [editingSupplier, setEditingSupplier] = useState({ name: '', taxId: '', email: '' })

  function can(perm) {
    const perms = me?.permissions || me?.user?.permissions || []
    return Array.isArray(perms) && perms.includes(perm)
  }

  async function approvePendingForPo(poId) {
    try {
      setLoading(true)
      if (!can('po.approve')) throw new Error('No tienes permiso para aprobar')
      const st = await api.po.steps(poId)
      const pending = (st.steps || []).find(s => s.status === 'PENDING')
      if (!pending) {
        toast.info('No hay pasos pendientes')
        return
      }
      const comment = decisionComments[poId] || undefined
      const ok = window.confirm('¿Confirmas aprobar el paso pendiente?')
      if (!ok) return
      await api.po.approve(poId, pending.order, comment)
      if (selectedPO?.id === poId) {
        await selectPO(poId)
      }
      await loadPOs()
      await loadPendingForMe()
      toast.success('Paso aprobado')
    } catch (e) {
      toast.error('Approve error: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  async function rejectPendingForPo(poId) {
    try {
      setLoading(true)
      if (!can('po.reject')) throw new Error('No tienes permiso para rechazar')
      const st = await api.po.steps(poId)
      const pending = (st.steps || []).find(s => s.status === 'PENDING')
      if (!pending) {
        toast.info('No hay pasos pendientes')
        return
      }
      const comment = decisionComments[poId] || undefined
      if (!comment || !String(comment).trim()) {
        toast.info('Debes ingresar un comentario para rechazar')
        return
      }
      const ok = window.confirm('¿Confirmas rechazar el paso pendiente?')
      if (!ok) return
      await api.po.reject(poId, pending.order, comment)
      if (selectedPO?.id === poId) {
        await selectPO(poId)
      }
      await loadPOs()
      await loadPendingForMe()
      toast.success('Paso rechazado')
    } catch (e) {
      toast.error('Reject error: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  async function loadPoFiles(id) {
    if (!can('po.read')) return
    setPoFilesLoading(true)
    try {
      const res = await api.po.files.list(id)
      setPoFiles(res.files || [])
    } catch (e) {
      toast.error('Cargar adjuntos error: ' + e.message)
    } finally {
      setPoFilesLoading(false)
    }
  }

  async function handleUploadFile(e) {
    const file = e.target.files?.[0]
    if (!file || !selectedPO) return
    if (!can('po.attach')) return toast.error('No tienes permiso para adjuntar archivos')
    try {
      setPoFilesLoading(true)
      await api.po.files.upload(selectedPO.id, file)
      await loadPoFiles(selectedPO.id)
      toast.success('Archivo adjuntado')
    } catch (err) {
      toast.error('Subir archivo error: ' + err.message)
    } finally {
      setPoFilesLoading(false)
      // reset input so same file can be selected again if desired
      e.target.value = ''
    }
  }

  async function handleDeleteFile(fileId) {
    if (!selectedPO) return
    if (!can('po.attach')) return toast.error('No tienes permiso para eliminar adjuntos')
    try {
      setPoFilesLoading(true)
      await api.po.files.remove(selectedPO.id, fileId)
      await loadPoFiles(selectedPO.id)
      toast.success('Adjunto eliminado')
    } catch (err) {
      toast.error('Eliminar adjunto error: ' + err.message)
    } finally {
      setPoFilesLoading(false)
    }
  }

  useEffect(() => {
    fetch(`${api.url}/health`).then(r=>r.json()).then(setHealth).catch(e=>setHealth({error:e.message}))
  }, [])

  useEffect(() => {
    (async () => {
      try {
        const profile = await api.me()
        setMe(profile)
        const tasks = []
        if (can('supplier.read')) tasks.push(loadSuppliers())
        if (can('po.read')) {
          tasks.push(loadPOs())
          tasks.push(loadStats())
          tasks.push(loadPendingForMe())
          tasks.push(loadTimeseries())
        }
        await Promise.all(tasks)
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

  // Auto-reload Suppliers when page changes
  useEffect(() => {
    if (can('supplier.read')) loadSuppliers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supPage])

  async function loadSuppliers() {
    setSuppliersLoading(true)
    try {
      if (!can('supplier.read')) return
      const data = await api.suppliers.list({ take: supPageSize, skip: supPage * supPageSize })
      setSuppliers(data)
      if (data.items.length && !poForm.supplierId) {
        setPoForm((p) => ({ ...p, supplierId: data.items[0].id }))
      }
    } finally {
      setSuppliersLoading(false)
    }
  }

  function startEditSupplier(s) {
    if (!can('supplier.update')) return alert('No tienes permiso para editar proveedores')
    setEditingSupplierId(s.id)
    setEditingSupplier({ name: s.name || '', taxId: s.taxId || '', email: s.email || '' })
  }

  function cancelEditSupplier() {
    setEditingSupplierId(null)
    setEditingSupplier({ name: '', taxId: '', email: '' })
  }

  async function saveSupplier() {
    if (!editingSupplierId) return
    try {
      setSuppliersLoading(true)
      if (!can('supplier.update')) throw new Error('No tienes permiso para editar proveedores')
      await api.suppliers.update(editingSupplierId, {
        name: editingSupplier.name,
        taxId: editingSupplier.taxId || null,
        email: editingSupplier.email || null,
      })
      cancelEditSupplier()
      await loadSuppliers()
    } catch (e) {
      alert('Update supplier error: ' + e.message)
    } finally {
      setSuppliersLoading(false)
    }
  }

  async function deleteSupplier(id) {
    if (!can('supplier.delete')) return alert('No tienes permiso para eliminar proveedores')
    if (!window.confirm('¿Eliminar proveedor? Esta acción no se puede deshacer.')) return
    try {
      setSuppliersLoading(true)
      await api.suppliers.remove(id)
      if (editingSupplierId === id) cancelEditSupplier()
      await loadSuppliers()
    } catch (e) {
      alert('Delete supplier error: ' + e.message)
    } finally {
      setSuppliersLoading(false)
    }
  }

  async function loadPOs() {
    setPoListLoading(true)
    try {
      if (!can('po.read')) return
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
      if (!can('supplier.create')) throw new Error('No tienes permiso para crear proveedores')
      await api.suppliers.create({
        name: supForm.name,
        taxId: supForm.taxId || null,
        email: supForm.email || null,
      })
      setSupForm({ name: '', taxId: '', email: '' })
      await loadSuppliers()
      toast.success('Proveedor creado correctamente')
    } catch (e) {
      toast.error('Create supplier error: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  async function createPO(e) {
    e.preventDefault()
    setLoading(true)
    try {
      if (!can('po.create')) throw new Error('No tienes permiso para crear órdenes de compra')
      const body = {
        supplierId: poForm.supplierId,
        currency: poForm.currency,
        notes: poForm.notes || null,
        items: [poForm.item],
      }
      const res = await api.po.create(body)
      toast.success(`PO creada: ${res.id} — Total: ${res.total}`)
      await loadPOs()
    } catch (e) {
      toast.error('Create PO error: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  function logout() {
    (async () => {
      try {
        await api.logout()
      } finally {
        nav('/login')
      }
    })()
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
      await loadPoFiles(id)
    } catch (e) {
      toast.error('Load PO error: ' + e.message)
    } finally {
      setLoading(false)
    }
  }
  async function submitSelectedPO() {
    if (!selectedPO) return
    try {
      setLoading(true)
      if (!can('po.submit')) throw new Error('No tienes permiso para enviar a aprobación')
      const res = await api.po.submit(selectedPO.id)
      setSelectedPO(res)
      const st = await api.po.steps(selectedPO.id)
      setPoSteps(st.steps || [])
      await loadPOs()
      toast.success('PO enviada a aprobación')
    } catch (e) {
      toast.error('Submit PO error: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  async function approveCurrentStep() {
    if (!selectedPO) return
    try {
      setLoading(true)
      if (!can('po.approve')) throw new Error('No tienes permiso para aprobar este paso')
      const pending = poSteps.find(s => s.status === 'PENDING')
      if (!pending) {
        toast.info('No hay pasos pendientes')
        return
      }
      const ok = window.confirm('¿Confirmas aprobar el paso pendiente?')
      if (!ok) return
      await api.po.approve(selectedPO.id, pending.order, decisionComment || undefined)
      await selectPO(selectedPO.id)
      await loadPOs()
      toast.success('Paso aprobado')
    } catch (e) {
      toast.error('Approve error: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  async function rejectCurrentStep() {
    if (!selectedPO) return
    try {
      setLoading(true)
      if (!can('po.reject')) throw new Error('No tienes permiso para rechazar este paso')
      const pending = poSteps.find(s => s.status === 'PENDING')
      if (!pending) {
        toast.info('No hay pasos pendientes')
        return
      }
      if (!decisionComment || !decisionComment.trim()) {
        toast.info('Debes ingresar un comentario para rechazar')
        return
      }
      const ok = window.confirm('¿Confirmas rechazar el paso pendiente?')
      if (!ok) return
      await api.po.reject(selectedPO.id, pending.order, decisionComment || undefined)
      await selectPO(selectedPO.id)
      await loadPOs()
      toast.success('Paso rechazado')
    } catch (e) {
      toast.error('Reject error: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  async function cancelSelectedPO() {
    if (!selectedPO) return
    try {
      setLoading(true)
      if (!can('po.cancel')) throw new Error('No tienes permiso para cancelar')
      await api.po.cancel(selectedPO.id)
      await selectPO(selectedPO.id)
      await loadPOs()
      toast.success('PO cancelada')
    } catch (e) {
      toast.error('Cancel error: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  async function loadStats() {
    try {
      const data = await api.po.stats()
      setPoStats(data)
    } catch (e) {
      // Silent fail but visible via UI remaining empty
      console.error('Stats error:', e)
    }
  }

  async function loadPendingForMe() {
    try {
      const data = await api.po.pendingForMe()
      setPoPendingMe(data)
    } catch (e) {
      console.error('PendingForMe error:', e)
    }
  }

  async function loadTimeseries(days = poTimeseries.days || 14) {
    try {
      const data = await api.po.statsTimeseries(days)
      setPoTimeseries({ days, ...data })
    } catch (e) {
      console.error('Timeseries error:', e)
    }
  }

  function exportLogsToCSV() {
    if (!poLogs || poLogs.length === 0) {
      alert('No hay eventos para exportar')
      return
    }
    const headers = ['Fecha', 'Accion', 'Usuario', 'Comentario']
    const rows = poLogs.map(log => {
      const fecha = new Date(log.createdAt).toISOString()
      const accion = log.action || ''
      const usuario = log.user ? (log.user.firstName || log.user.email || '') : ''
      const comentario = log.comment || ''
      return [fecha, accion, usuario, comentario]
    })
    const csv = [headers, ...rows]
      .map(r => r.map(v => {
        const s = String(v ?? '')
        if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"'
        return s
      }).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `po_${selectedPO?.id || 'logs'}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
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
              <li key={it.step.id} style={{display:'grid', gap:6}}>
                <div style={{display:'flex', gap:8, alignItems:'center', flexWrap:'wrap'}}>
                  <span>PO {it.po.id} — Paso #{it.step.order} ({it.step.roleName || it.step.roleId}) — Estado: {it.po.status} — Total: {it.po.total} {it.po.currency}</span>
                  <button onClick={() => selectPO(it.po.id)}>Ver</button>
                  {selectedPO?.id !== it.po.id && (
                    <button onClick={async () => { await selectPO(it.po.id); }}>Abrir</button>
                  )}
                </div>
                {(can('po.approve') || can('po.reject')) && (
                  <div style={{display:'flex', gap:8, alignItems:'center', flexWrap:'wrap'}}>
                    <input
                      placeholder="Comentario (opcional)"
                      value={decisionComments[it.po.id] || ''}
                      onChange={e=>setDecisionComments({...decisionComments, [it.po.id]: e.target.value})}
                      style={{minWidth:240}}
                    />
                    {can('po.approve') && (
                      <button onClick={() => approvePendingForPo(it.po.id)} disabled={loading}>Aprobar</button>
                    )}
                    {can('po.reject') && (
                      <button onClick={() => rejectPendingForPo(it.po.id)} disabled={loading}>Rechazar</button>
                    )}
                  </div>
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

      {can('supplier.read') && (
      <Section title="Suppliers">
        <div style={{display:'flex', gap:16, alignItems:'start', flexWrap:'wrap'}}>
          {can('supplier.create') ? (
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
          ) : (
            <div style={{minWidth:280, color:'#666'}}>No tienes permiso para crear proveedores.</div>
          )}

          <div style={{flex:1, minWidth:320}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
              <strong>Listado (total: {suppliers.total})</strong>
              <div style={{display:'flex', gap:8, alignItems:'center'}}>
                {suppliersLoading && <small style={{color:'#888'}}>Cargando…</small>}
                <button onClick={loadSuppliers} disabled={suppliersLoading}>Refrescar</button>
              </div>
            </div>
            <div style={{display:'flex', gap:8, alignItems:'center', margin:'8px 0'}}>
              {(() => {
                const pages = Math.max(1, Math.ceil((suppliers.total || 0) / supPageSize))
                const page = supPage + 1
                return (
                  <>
                    <button onClick={() => setSupPage(p => Math.max(0, p - 1))} disabled={supPage === 0}>Anterior</button>
                    <span>Página {page} de {pages}</span>
                    <button onClick={() => setSupPage(p => (page < pages ? p + 1 : p))} disabled={(supPage + 1) >= pages}>Siguiente</button>
                  </>
                )
              })()}
            </div>
            {suppliers.items.length === 0 ? (
              <div style={{color:'#666'}}>No hay proveedores.</div>
            ) : (
              <ul>
                {suppliers.items.map(s => (
                  <li key={s.id} style={{display:'grid', gridTemplateColumns:'1fr auto', gap:8, alignItems:'center'}}>
                    {editingSupplierId === s.id ? (
                      <div style={{display:'grid', gap:8, gridTemplateColumns:'2fr 1fr 1fr'}}>
                        <input placeholder="Nombre" value={editingSupplier.name} onChange={e=>setEditingSupplier({...editingSupplier, name:e.target.value})} />
                        <input placeholder="Tax ID" value={editingSupplier.taxId} onChange={e=>setEditingSupplier({...editingSupplier, taxId:e.target.value})} />
                        <input placeholder="Email" type="email" value={editingSupplier.email} onChange={e=>setEditingSupplier({...editingSupplier, email:e.target.value})} />
                      </div>
                    ) : (
                      <div>
                        <strong>{s.name}</strong> — {s.email || 's/ email'} {s.taxId ? `— ${s.taxId}` : ''}
                      </div>
                    )}
                    <div style={{display:'flex', gap:8, justifyContent:'flex-end'}}>
                      {editingSupplierId === s.id ? (
                        <>
                          <button onClick={saveSupplier} disabled={suppliersLoading || !editingSupplier.name.trim()}>Guardar</button>
                          <button onClick={cancelEditSupplier}>Cancelar</button>
                        </>
                      ) : (
                        <>
                          {can('supplier.update') && <button onClick={() => startEditSupplier(s)}>Editar</button>}
                          {can('supplier.delete') && <button onClick={() => deleteSupplier(s.id)} style={{color:'#b00'}}>Eliminar</button>}
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Section>
      )}

      {SHOW_PERM_NOTICES && !can('po.create') && (
        <Section title="Crear Purchase Order">
          <div style={{color:'#666'}}>No tienes permiso para crear órdenes de compra.</div>
        </Section>
      )}
      {SHOW_PERM_NOTICES && !can('supplier.read') && (
        <Section title="Suppliers">
          <div style={{color:'#666'}}>No tienes permiso para ver esta sección.</div>
        </Section>
      )}

      {can('po.create') && (
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
      )}

      {can('po.read') && (
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
      )}

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
                {(selectedPO.status === 'DRAFT' || selectedPO.status === 'REJECTED') && can('po.submit') && (
                  <button onClick={submitSelectedPO} disabled={loading}>Enviar a aprobación</button>
                )}
                {selectedPO.status !== 'CANCELLED' && selectedPO.status !== 'APPROVED' && can('po.cancel') && (
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
              {selectedPO.status === 'SUBMITTED' && poSteps.some(s => s.status === 'PENDING') && (can('po.approve') || can('po.reject')) && (
                <div style={{display:'grid', gap:8, maxWidth:520, marginTop:8}}>
                  <label style={{display:'grid'}}>
                    <span>Comentario (opcional)</span>
                    <input value={decisionComment} onChange={e=>setDecisionComment(e.target.value)} />
                  </label>
                  <div style={{display:'flex', gap:8}}>
                    {can('po.approve') && <button onClick={approveCurrentStep} disabled={loading}>Aprobar paso pendiente</button>}
                    {can('po.reject') && <button onClick={rejectCurrentStep} disabled={loading}>Rechazar paso pendiente</button>}
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
            <div>
              <strong>Adjuntos</strong>
              <div style={{marginTop:8, display:'grid', gap:8}}>
                <div style={{display:'flex', alignItems:'center', gap:8, flexWrap:'wrap'}}>
                  {can('po.attach') ? (
                    <label style={{display:'inline-flex', alignItems:'center', gap:8}}>
                      <input type="file" onChange={handleUploadFile} />
                    </label>
                  ) : (
                    <small style={{color:'#666'}}>No tienes permiso para adjuntar archivos.</small>
                  )}
                  {poFilesLoading && <small style={{color:'#888'}}>Cargando…</small>}
                </div>
                {poFiles.length === 0 ? (
                  <em style={{color:'#666'}}>Sin archivos adjuntos.</em>
                ) : (
                  <ul>
                    {poFiles.map(f => (
                      <li key={f.id} style={{display:'flex', alignItems:'center', gap:8}}>
                        <a href={api.po.files.downloadUrl(selectedPO.id, f.id)} target="_blank" rel="noreferrer">
                          {f.filename}
                        </a>
                        <small style={{color:'#666'}}>
                          {f.sizeBytes ? `${f.sizeBytes} bytes` : ''} — {new Date(f.uploadedAt).toLocaleString()}
                        </small>
                        {can('po.attach') && (
                          <button onClick={() => handleDeleteFile(f.id)} style={{color:'#b00'}}>Eliminar</button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </Section>
      )}
    </div>
  )
}

