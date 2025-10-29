import React, { useEffect } from 'react'

export default function Modal({
  open,
  onClose,
  title,
  children,
  maxWidth = 720,
  size = 'md', // sm, md, lg
  footer = null,
  closeOnOverlay = true,
}) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose?.()
    }
    if (open) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const widths = { sm: 520, md: maxWidth, lg: 960 }
  const w = widths[size] || maxWidth

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" onClick={() => { if (closeOnOverlay) onClose?.() }}>
      <div
        className="modal"
        style={{ maxWidth: w }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <strong className="modal-title">{title}</strong>
          <button className="modal-close" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>
        <div className="modal-body">
          {children}
        </div>
        {(footer !== null) && (
          <div className="modal-footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
