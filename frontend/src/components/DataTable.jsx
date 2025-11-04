import React from 'react'

export default function DataTable({ columns = [], data = [], meta = {}, onPageChange, onPerPageChange }) {
  const { page = 1, perPage = 20, pageCount = 1, total = data.length } = meta || {}

  return (
    <div style={{ width: '100%' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '8px' }}>
                {col.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.id}>
              {columns.map((col) => (
                <td key={col.key} style={{ borderBottom: '1px solid #f0f0f0', padding: '8px' }}>
                  {col.render ? col.render(row[col.key], row) : String(row[col.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
          {data.length === 0 && (
            <tr>
              <td colSpan={columns.length} style={{ padding: '16px', textAlign: 'center', color: '#666' }}>
                Sin resultados
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
        <div style={{ color: '#666' }}>
          Página {page} de {pageCount} — {total} registros
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button disabled={page <= 1} onClick={() => onPageChange && onPageChange(page - 1)}>
            Anterior
          </button>
          <button disabled={page >= pageCount} onClick={() => onPageChange && onPageChange(page + 1)}>
            Siguiente
          </button>
          <select value={perPage} onChange={(e) => onPerPageChange && onPerPageChange(Number(e.target.value))}>
            {[10, 20, 50, 100].map((n) => (
              <option key={n} value={n}>{n} / pág</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}
