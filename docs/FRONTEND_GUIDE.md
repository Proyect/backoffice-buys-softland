# Frontend Guide

## Overview
- Stack: React + Vite.
- Routing: `react-router-dom` with `Login` and `Dashboard` pages.
- Global styles: `frontend/src/styles.css` with light (default) and dark theme support.
- UI components: `frontend/src/components/ui/` (Card, Button, TextField, Select).
- Toasts: `ToastProvider.jsx` provides `useToast()`.
- API client: `frontend/src/api.js` uses `VITE_API_URL`.

## Project Structure
```
frontend/
  index.html
  vite.config.js
  package.json
  src/
    api.js
    App.jsx
    main.jsx
    styles.css
    components/
      ToastProvider.jsx
      ui/
        Button.jsx
        Card.jsx
        TextField.jsx
        Select.jsx
    pages/
      Login.jsx
      Dashboard.jsx
```

## Running
```bash
cd frontend
npm install
npm run dev
# Open http://localhost:5173
```

If using Docker, `docker compose --profile all-in-docker up -d frontend` from repo root.

## Theming
- Default theme is light; dark is activated by setting `data-theme="dark"` on the root element:
```js
// Toggle dark mode in the browser console
document.documentElement.dataset.theme = 'dark'
// Reset to light
delete document.documentElement.dataset.theme
```

## Components
- `Card`:
```jsx
<Card title="Section title" subtitle="Optional subtitle">
  ...content...
</Card>
```
- `Button` (variants: `primary` default, `secondary`, `danger`):
```jsx
<Button onClick={save}>Save</Button>
<Button variant="secondary">Cancel</Button>
<Button variant="danger">Delete</Button>
```
- `TextField`:
```jsx
<TextField label="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)} required />
```
- `Select`:
```jsx
<Select label="Estado" value={status} onChange={e=>setStatus(e.target.value)}>
  <option value="">Todos</option>
  <option value="DRAFT">DRAFT</option>
</Select>
```

## Pages
- `Login.jsx`:
  - Uses `Card`, `TextField`, `Button` for a clean enterprise look.
  - Shows backend health in a styled `codebox`.
- `Dashboard.jsx`:
  - Uses `container`, `appbar`, `section`, `kpis`, `kpi` classes for structure.
  - Incremental migration to UI components recommended (forms, filters, actions).

## API Client
- `src/api.js` exposes:
  - `api.url` base URL from `import.meta.env.VITE_API_URL`.
  - Auth helpers: `login`, `setToken`, `setRefreshToken`, `clearToken`, `logout`, `me`.
  - Suppliers: `list`, `create`, `update`, `remove`.
  - Purchase Orders: `list`, `get`, `create`, `submit`, `steps`, `approve`, `reject`, `cancel`.
- Errors throw with message; handle with `useToast()` as shown in pages.

## Quality & UX Standards
- Use components for consistency (spacing, focus, colors).
- Prefer semantic HTML inside components (labels, headings, lists/tables).
- Keep logic in pages/hooks; keep components presentational.
- Ensure keyboard focus states are visible (styles.css provides focus ring).

## Suggested Enhancements
- Add `ThemeToggle` component (light/dark) and persist preference.
- Add loading skeletons for lists and charts.
- Build `Table` and `Pagination` reusable components to standardize lists.
- Create `FormSection`/`PageHeader` components for unified layout.
