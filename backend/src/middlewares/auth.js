import { verifyAccessToken, getUserPermissions } from '../lib/auth.js'

export async function requireAuth(req, res, next) {
  try {
    const auth = req.headers.authorization || ''
    const [, token] = auth.split(' ')
    if (!token) return res.status(401).json({ error: 'Unauthorized' })

    const payload = verifyAccessToken(token)
    req.user = { id: payload.sub, email: payload.email }
    req.permissions = await getUserPermissions(payload.sub)
    return next()
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
}

export function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.permissions || !req.permissions.includes(permission)) {
      return res.status(403).json({ error: 'Forbidden' })
    }
    return next()
  }
}
