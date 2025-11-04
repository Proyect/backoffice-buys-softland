import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import DepartmentsList from './pages/DepartmentsList.jsx'
import DepartmentForm from './pages/DepartmentForm.jsx'
import DepartmentView from './pages/DepartmentView.jsx'
import SuppliersList from './pages/SuppliersList.jsx'

function Guard({ children }) {
  const token = localStorage.getItem('accessToken')
  if (!token) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Guard><Dashboard /></Guard>} />
        <Route path="/dashboard" element={<Guard><Dashboard /></Guard>} />
        <Route path="/departments" element={<Guard><DepartmentsList /></Guard>} />
        <Route path="/departments/new" element={<Guard><DepartmentForm /></Guard>} />
        <Route path="/departments/:id" element={<Guard><DepartmentView /></Guard>} />
        <Route path="/departments/:id/edit" element={<Guard><DepartmentForm /></Guard>} />
        <Route path="/suppliers" element={<Guard><SuppliersList /></Guard>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
