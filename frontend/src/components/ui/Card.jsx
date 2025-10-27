import React from 'react'

export function Card({ title, subtitle, children, className = '', style }) {
  return (
    <div className={`card ${className}`} style={style}>
      {(title || subtitle) && (
        <div style={{marginBottom: 12}}>
          {title && <h1 style={{margin: 0}}>{title}</h1>}
          {subtitle && <div className="subtle">{subtitle}</div>}
        </div>
      )}
      {children}
    </div>
  )
}
