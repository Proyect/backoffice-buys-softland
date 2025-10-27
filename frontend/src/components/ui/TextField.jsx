import React from 'react'

export function TextField({ label, type = 'text', value, onChange, required, placeholder, className = '', ...props }) {
  return (
    <label className={`grid ${className}`}>
      {label && <span>{label}</span>}
      <input
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        {...props}
      />
    </label>
  )
}
