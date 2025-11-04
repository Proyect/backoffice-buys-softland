import React, { useEffect, useMemo, useState } from 'react'
import { api } from '../api'
import DataTable from '../components/DataTable'

export default function SuppliersList() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [rows, setRows] = useState([])
  const [meta, setMeta] = useState({ page: 1, perPage: 20, pageCount: 1, total: 0 })
  const [q, setQ] = useState('')

  const columns = useMemo(() => [
    { key: 'name', title: 'Nombre' },
    { key: 'taxId', title: 'CUIT/RUT' },
    { key: 'email', title: 'Email' },
    { key: 'phone', title: 'Teléfono' },
    { key: 'isActive', title: 'Activo', render: (v) => (v ? 'Sí' : 'No') },
  ], [])

  async function load(page = meta.page, perPage = meta.perPage) {
    try {
      setLoading(true)
      setError('')
      const params = { q, skip: String((page - 1) * perPage), take: String(perPage) }
      const res = await api.suppliers.list(params)
      const data = res?.data || res?.items || []
      const total = typeof res?.meta?.total === 'number' ? res.meta.total : (typeof res?.total === 'number' ? res.total : data.length)
      const pageCount = res?.meta?.pageCount ?? Math.max(1, Math.ceil(total / perPage))
      setRows(data)
      setMeta({
        page: res?.meta?.page ?? page,
        perPage: res?.meta?.perPage ?? perPage,
        pageCount,
        total,
      })
    } catch (e) {
      setError(e?.message || 'Error al cargar proveedores')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load(1, meta.perPage)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function onSearchSubmit(e) {
    e.preventDefault()
    load(1, meta.perPage)
  }

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ marginBottom: 12 }}>Proveedores</h2>

      <form onSubmit={onSearchSubmit} style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input
          placeholder="Buscar por nombre"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ flex: '0 0 280px', padding: 6 }}
        />
        <button type="submit">Buscar</button>
      </form>

      {error && (
        <div style={{ marginBottom: 12, color: 'crimson' }}>{error}</div>
      )}

      {loading ? (
        <div>Cargando...</div>
      ) : (
        <DataTable
          columns={columns}
          data={rows}
          meta={meta}
          onPageChange={(p) => load(p, meta.perPage)}
          onPerPageChange={(pp) => load(1, pp)}
        />
      )}
    </div>
  )
}
