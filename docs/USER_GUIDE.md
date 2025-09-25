# Manual de Usuario

## Acceso e inicio de sesión
- Frontend: http://localhost:5173
- Usuario seed: `admin@local.test`
- Password: `Admin1234!`

## Dashboard
- Estado del backend: muestra `/health` con estado del servicio y DB.
- Suppliers:
  - Crear proveedor con “Nombre” obligatorio; “Tax ID” y “Email” opcionales.
  - Listado con total y botón “Refrescar”.
- Crear Purchase Order (PO):
  - Selecciona proveedor, define moneda, notas e ítem (descripción, cantidad, precio, IVA%).
  - "Crear PO" la guarda en estado `DRAFT`.
- Listado de POs:
  - Filtros: por `Estado` y `Proveedor`.
  - Paginación: 10 por página, “Anterior/Siguiente”.
  - “Ver” abre detalles y acciones.

## Flujo de aprobación
1. `DRAFT` → “Enviar a aprobación” → `SUBMITTED` (instancia pasos por política).
2. Pasos: ordenados, cada uno con rol; acciones de “Aprobar” o “Rechazar” si tienes permisos/rol. Comentario opcional.
3. Sin `PENDING`: pasa a `APPROVED`.
4. Rechazo: pasa a `REJECTED`; puedes re-enviar a `SUBMITTED` y se reinstancian pasos.
5. Cancelar: disponible mientras no esté `APPROVED`/`CANCELLED`; marca pasos pendientes `SKIPPED`.

## Auditoría
- Eventos: `submitted`, `approved`, `rejected`, `cancelled` con fecha, usuario, comentario.
- Exportar CSV: botón en PO seleccionada descarga `po_<id>.csv` (`timestamp, action, user, comment`).

## Roles y permisos (seed)
- Admin: todos los permisos.
- Comprador: `supplier.read`, `po.read`, `po.create`, `po.update`, `po.submit`.
- Aprobador: `po.read`, `po.approve`, `po.reject`.
- Consulta: `supplier.read`, `po.read`, `audit.read`.
- Política por defecto: 2 pasos (Comprador → Aprobador).

## Problemas comunes
- CORS en navegador: pedir al admin agregar tu origen en `ALLOWED_ORIGINS`.
- Backend caído: verificar http://localhost:4000/health.

## Capturas (referenciales)

Coloca capturas en `docs/images/` y actualiza las rutas a continuación si difieren:

- Dashboard general: `docs/images/dashboard.png`
- Crear proveedor: `docs/images/create_supplier.png`
- Crear PO: `docs/images/create_po.png`
- Detalle de PO con pasos: `docs/images/po_detail_steps.png`
- Auditoría y export CSV: `docs/images/po_audit.png`

Ejemplo de inclusión (Markdown):

```markdown
![Dashboard](../docs/images/dashboard.png)
```

## Ejemplos de respuestas JSON

### GET /health

```json
{
  "status": "ok",
  "service": "backoffice-buys-softland",
  "version": "0.1.0",
  "uptime": 12.34,
  "db": { "status": "ok", "latencyMs": 3 }
}
```

### GET /api/po/{id}/steps

```json
{
  "steps": [
    {
      "id": "uuid-step-1",
      "purchaseOrderId": "uuid-po",
      "order": 1,
      "roleId": "uuid-role-comprador",
      "approverUserId": null,
      "status": "PENDING",
      "comment": null,
      "decidedAt": null,
      "role": { "id": "uuid-role-comprador", "name": "Comprador" },
      "approver": null
    }
  ]
}
```

### GET /api/po/{id}/logs

```json
{
  "logs": [
    {
      "id": "uuid-log-1",
      "purchaseOrderId": "uuid-po",
      "userId": "uuid-user",
      "action": "submitted",
      "comment": null,
      "createdAt": "2025-09-24T13:00:00.000Z",
      "user": { "id": "uuid-user", "email": "admin@local.test", "firstName": "System" }
    }
  ]
}
```
