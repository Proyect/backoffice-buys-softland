import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
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
const Label = styled.label`
  width: 180px;
  display: inline-block;
`
const Input = styled.input`
  flex: 1;
  padding: 8px 10px;
`
const TextArea = styled.textarea`
  flex: 1;
  padding: 8px 10px;
  min-height: 80px;
`
const Button = styled.button`
  padding: 8px 14px;
  cursor: pointer;
`

export default function DepartmentForm() {
  const { id } = useParams()
  const nav = useNavigate()
  const isEdit = Boolean(id)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '',
    code: '',
    description: '',
    managerId: '',
    budgetLimit: 0,
    isActive: true,
    erpDepartmentId: ''
  })

  useEffect(() => {
    if (isEdit) {
      setLoading(true)
      api.departments.get(id)
        .then((d) => setForm({
          name: d.name || '',
          code: d.code || '',
          description: d.description || '',
          managerId: d.managerId || '',
          budgetLimit: d.budgetLimit ?? 0,
          isActive: !!d.isActive,
          erpDepartmentId: d.erpDepartmentId ?? ''
        }))
        .catch((e) => alert(e.message))
        .finally(() => setLoading(false))
    }
  }, [id])

  const onChange = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  const onSubmit = async (ev) => {
    ev.preventDefault()
    setLoading(true)
    try {
      const payload = {
        ...form,
        budgetLimit: Number(form.budgetLimit || 0),
        erpDepartmentId: form.erpDepartmentId === '' ? null : Number(form.erpDepartmentId),
        managerId: form.managerId || null,
      }
      if (isEdit) await api.departments.update(id, payload)
      else await api.departments.create(payload)
      nav('/departments')
    } catch (e) {
      alert(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container>
      <h2>{isEdit ? 'Editar departamento' : 'Nuevo departamento'}</h2>
      <form onSubmit={onSubmit}>
        <Row>
          <Label>Nombre</Label>
          <Input value={form.name} onChange={e => onChange('name', e.target.value)} required />
        </Row>
        <Row>
          <Label>Código</Label>
          <Input value={form.code} onChange={e => onChange('code', e.target.value)} required />
        </Row>
        <Row>
          <Label>Descripción</Label>
          <TextArea value={form.description} onChange={e => onChange('description', e.target.value)} />
        </Row>
        <Row>
          <Label>Gerente (User ID)</Label>
          <Input value={form.managerId} onChange={e => onChange('managerId', e.target.value)} placeholder="UUID de usuario (pendiente selector)" />
        </Row>
        <Row>
          <Label>Presupuesto (ARS)</Label>
          <Input type="number" step="0.01" value={form.budgetLimit} onChange={e => onChange('budgetLimit', e.target.value)} />
        </Row>
        <Row>
          <Label>Activo</Label>
          <input type="checkbox" checked={form.isActive} onChange={e => onChange('isActive', e.target.checked)} />
        </Row>
        <Row>
          <Label>ID ERP</Label>
          <Input type="number" value={form.erpDepartmentId} onChange={e => onChange('erpDepartmentId', e.target.value)} />
        </Row>
        <Row>
          <Button type="button" onClick={() => nav('/departments')}>Cancelar</Button>
          <Button type="submit" disabled={loading}>{isEdit ? 'Guardar' : 'Crear'}</Button>
        </Row>
      </form>
    </Container>
  )
}
