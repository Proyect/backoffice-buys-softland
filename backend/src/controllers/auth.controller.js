import { prisma } from '../lib/prisma.js'
import { env } from '../config/env.js'
import { passwordMatches, generateAccessToken, issueRefreshToken, rotateRefreshToken, revokeRefreshToken, getUserPermissions } from '../lib/auth.js'
import { z } from 'zod'

export async function login(req, res) {
  try {
    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(6),
    })
    const { email, password } = schema.parse(req.body || {})

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user || !user.isActive) return res.status(401).json({ error: 'Invalid credentials' })

    if (!(await passwordMatches(password, user.passwordHash))) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const permissions = await getUserPermissions(user.id)

    const accessToken = generateAccessToken({ sub: user.id, email: user.email })
    const refresh = await issueRefreshToken(user.id, { ip: req.ip, userAgent: req.get('user-agent') })

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        permissions,
      },
      tokens: {
        accessToken,
        accessTokenExpiresIn: env.ACCESS_TOKEN_TTL,
        refreshToken: refresh.token,
        refreshTokenExpiresAt: refresh.expiresAt,
      },
    })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.flatten() })
    }
    return res.status(500).json({ error: 'Login failed' })
  }
}

export async function refreshToken(req, res) {
  try {
    const schema = z.object({ refreshToken: z.string().min(10) })
    const { refreshToken } = schema.parse(req.body || {})

    const existing = await prisma.refreshToken.findFirst({ where: { token: refreshToken, revoked: false } })
    if (!existing) return res.status(401).json({ error: 'Invalid refresh token' })
    if (existing.expiresAt < new Date()) return res.status(401).json({ error: 'Refresh token expired' })

    const user = await prisma.user.findUnique({ where: { id: existing.userId } })
    if (!user || !user.isActive) return res.status(401).json({ error: 'User disabled' })

    const permissions = await getUserPermissions(user.id)

    const newRefresh = await rotateRefreshToken(existing.token, user.id, { ip: req.ip, userAgent: req.get('user-agent') })
    const accessToken = generateAccessToken({ sub: user.id, email: user.email })

    return res.json({
      user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, permissions },
      tokens: {
        accessToken,
        accessTokenExpiresIn: env.ACCESS_TOKEN_TTL,
        refreshToken: newRefresh.token,
        refreshTokenExpiresAt: newRefresh.expiresAt,
      },
    })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.flatten() })
    }
    return res.status(500).json({ error: 'Refresh failed' })
  }
}

export async function logout(req, res) {
  try {
    const schema = z.object({ refreshToken: z.string().min(10) })
    const { refreshToken } = schema.parse(req.body || {})

    await revokeRefreshToken(refreshToken)
    return res.json({ ok: true })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.flatten() })
    }
    return res.status(500).json({ error: 'Logout failed' })
  }
}

export async function me(req, res) {
  try {
    // requireAuth set req.user and req.permissions
    return res.json({
      user: req.user,
      permissions: req.permissions || [],
    })
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch profile' })
  }
}
