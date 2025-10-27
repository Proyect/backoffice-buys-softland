import React from 'react'

export function Button({ children, variant = 'primary', fullWidth = false, className = '', style, ...props }) {
  const classes = ['button']
  if (variant === 'secondary') classes.push('secondary')
  if (variant === 'danger') classes.push('danger')
  if (fullWidth) classes.push('w-full')
  return (
    <button className={`${classes.join(' ')} ${className}`} style={style} {...props}>
      {children}
    </button>
  )
}
