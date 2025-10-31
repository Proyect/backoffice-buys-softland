import React, { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import styled from 'styled-components'
import { api } from '../api'

const Container = styled.div`
  padding: 20px;
  max-width: 720px;
`
const Row = styled.div`
  display: flex;
  gap: 12px;
  margin-bottom: 10px;
`
const Label = styled.div`
  width: 180px;
  color: #555;
`
const Value = styled.div`
  flex: 1;
`
export default function DepartmentView() {
  const { id } = useParams()
  const [loading, setLoading] = useState(false)
  const [dep, setDep] = useState(null)

  useEffect(() => {
    setLoading(true)
    api.departments.get(id)
      .then(setDep)
      .catch(e => alert(e.message))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <Container>Cargando...</Container>
  if (!dep) return <Container>No encontrado</Container>

  return (
    <Container>
      <h2>Departamento</h2>
      <Row><Label>Nombre</Label><Value>{dep.name}</Value></Row>
      <Row><Label>Código</Label><Value>{dep.code}</Value></Row>
      <Row><Label>Descripción</Label><Value>{dep.description || '-'}</Value></Row>
      <Row><Label>Gerente</Label><Value>{dep.manager ? `${dep.manager.firstName} ${dep.manager.lastName}` : '-'}</Value></Row>
      <Row><Label>Presupuesto</Label><Value>{dep.budgetLimit}</Value></Row>
      <Row><Label>Activo</Label><Value>{dep.isActive ? 'Sí' : 'No'}</Value></Row>
      <Row><Label>ID ERP</Label><Value>{dep.erpDepartmentId ?? '-'}</Value></Row>
      <div style={{ marginTop: 16 }}>
        <Link to={`/departments/${dep.id}/edit`}>Editar</Link>{' | '}
        <Link to="/departments">Volver</Link>
      </div>
    </Container>
  )
}
