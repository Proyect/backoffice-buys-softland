import React, { useEffect, useState } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

export default function App() {
  const [health, setHealth] = useState(null)

  useEffect(() => {
    fetch(`${API_URL}/health`)
      .then(res => res.json())
      .then(setHealth)
      .catch(err => setHealth({ error: err.message }))
  }, [])

  return (
    <div style={{fontFamily:'Inter, system-ui, Arial', padding: 24}}>
      <h1>Backoffice Buys Softland</h1>
      <p>Frontend en React + Vite. API: {API_URL}</p>

      <h2>Estado del backend</h2>
      <pre>{JSON.stringify(health, null, 2)}</pre>
    </div>
  )
}
