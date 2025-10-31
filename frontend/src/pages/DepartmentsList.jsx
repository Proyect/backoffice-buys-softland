import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import DataTable from 'react-data-table-component'
import styled from 'styled-components'
import { api } from '../api'

const Container = styled.div`
  padding: 20px;
`
const Bar = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 12px;
`
const Input = styled.input`
  padding: 8px 10px;
`
const Button = styled.button`
  padding: 8px 12px;
  cursor: pointer;
`

export default function DepartmentsList() {
  const nav = useNavigate()
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)

  const fetchData = async (params = {}) => {
    setLoading(true)
    try {
      const skip = (page - 1) * perPage
      const take = perPage
      const res = await api.departments.list({ q, skip, take, ...params })
      setItems(res.items || [])
      setTotal(res.total || 0)
    } catch (e) {
      alert(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [page, perPage])

  const columns = useMemo(() => [
    { name: 'Nombre', selector: r => r.name, sortable: true },
    { name: 'Código', selector: r => r.code, sortable: true },
    { name: 'Gerente', selector: r => r.manager ? `${r.manager.firstName} ${r.manager.lastName}` : '', sortable: false },
    { name: 'Presupuesto', selector: r => r.budgetLimit, right: true },
    { name: 'Activo', selector: r => r.isActive ? 'Sí' : 'No' },
    {
      name: 'Acciones',
      cell: r => (
        <div style={{ display: 'flex', gap: 8 }}>
          <Link to={`/departments/${r.id}`}>Ver</Link>
          <Link to={`/departments/${r.id}/edit`}>Editar</Link>
          <a href="#" onClick={async (ev) => { ev.preventDefault(); if (!confirm('Eliminar?')) return; try { await api.departments.remove(r.id); fetchData() } catch(e){ alert(e.message) } }}>Eliminar</a>
        </div>
      )
    }
  ], [])

  const onSearch = () => {
    setPage(1)
    fetchData({ skip: 0 })
  }

  const exportCsv = () => {
    const url = api.departments.exportCsvUrl({ q })
    window.open(url, '_blank')
  }

  return (
    <Container>
      <h2>Departamentos</h2>
      <Bar>
        <Input placeholder="Buscar por nombre o código" value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key==='Enter' && onSearch()} />
        <Button onClick={onSearch}>Buscar</Button>
        <Button onClick={() => nav('/departments/new')}>Nuevo</Button>
        <Button onClick={exportCsv}>Exportar CSV</Button>
      </Bar>
      <DataTable
        columns={columns}
        data={items}
        progressPending={loading}
        pagination
        paginationServer
        paginationTotalRows={total}
        onChangePage={setPage}
        onChangeRowsPerPage={(n) => { setPerPage(n); setPage(1) }}
      />
    </Container>
  )
}
