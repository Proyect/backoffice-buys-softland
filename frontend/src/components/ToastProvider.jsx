import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'

const ToastContext = createContext({
  success: (msg) => {},
  error: (msg) => {},
  info: (msg) => {},
})

function Toast({ toast, onClose }) {
  const bg = toast.type === 'error' ? '#fee2e2' : toast.type === 'success' ? '#dcfce7' : '#e0f2fe'
  const border = toast.type === 'error' ? '#ef4444' : toast.type === 'success' ? '#16a34a' : '#0284c7'
  const color = toast.type === 'error' ? '#991b1b' : toast.type === 'success' ? '#065f46' : '#0c4a6e'
  return (
    <div style={{
      background: bg,
      border: `1px solid ${border}`,
      color,
      padding: '10px 12px',
      borderRadius: 8,
      boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      minWidth: 280,
      maxWidth: 420,
    }}>
      <div style={{ flex: 1, whiteSpace: 'pre-wrap' }}>{toast.message}</div>
      <button onClick={onClose} style={{ background: 'transparent', border: 'none', color, cursor: 'pointer' }}>✕</button>
    </div>
  )
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const push = useCallback((type, message) => {
    const id = Math.random().toString(36).slice(2)
    const item = { id, type, message }
    setToasts((t) => [...t, item])
    // auto close
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id))
    }, 3500)
  }, [])

  const api = useMemo(() => ({
    success: (m) => push('success', m),
    error: (m) => push('error', m),
    info: (m) => push('info', m),
  }), [push])

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div style={{
        position: 'fixed',
        top: 16,
        right: 16,
        display: 'grid',
        gap: 8,
        zIndex: 9999,
      }}>
        {toasts.map((t) => (
          <Toast key={t.id} toast={t} onClose={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
