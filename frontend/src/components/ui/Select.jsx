import React from 'react'

export function Select({ label, value, onChange, required, children, className = '', ...props }) {
  return (
    <label className={`grid ${className}`}>
      {label && <span>{label}</span>}
      <select value={value} onChange={onChange} required={required} {...props}>
        {children}
      </select>
    </label>
  )
}
