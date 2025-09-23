import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { env } from '../config/env.js'
import { prisma } from './prisma.js'

function parseTtlToMs(ttl) {
  // supports formats like 15m, 7d, 1h. Defaults to minutes if number only
  if (!ttl) return 15 * 60 * 1000
  const m = /^([0-9]+)\s*([smhd])?$/i.exec(ttl.trim())
  if (!m) return 15 * 60 * 1000
  const value = parseInt(m[1], 10)
  const unit = (m[2] || 'm').toLowerCase()
  switch (unit) {
    case 's': return value * 1000
    case 'm': return value * 60 * 1000
    case 'h': return value * 60 * 60 * 1000
    case 'd': return value * 24 * 60 * 60 * 1000
    default: return value * 60 * 1000
  }
}

export function generateAccessToken(payload) {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.ACCESS_TOKEN_TTL })
}

export async function issueRefreshToken(userId, meta = {}) {
  const token = crypto.randomBytes(48).toString('base64url')
  const expiresAt = new Date(Date.now() + parseTtlToMs(env.REFRESH_TOKEN_TTL))
  const created = await prisma.refreshToken.create({
    data: {
      userId,
      token,
      expiresAt,
      revoked: false,
      ip: meta.ip || null,
      userAgent: meta.userAgent || null,
    },
  })
  return created
}

export async function revokeRefreshToken(token) {
  await prisma.refreshToken.updateMany({
    where: { token, revoked: false },
    data: { revoked: true },
  })
}

export async function rotateRefreshToken(oldToken, userId, meta = {}) {
  await revokeRefreshToken(oldToken)
  const created = await issueRefreshToken(userId, meta)
  return created
}

export function verifyAccessToken(token) {
  return jwt.verify(token, env.JWT_SECRET)
}

export async function getUserPermissions(userId) {
  const rolePerms = await prisma.rolePermission.findMany({
    where: { role: { users: { some: { userId } } } },
    include: { permission: true },
  })
  const set = new Set(rolePerms.map((rp) => rp.permission.key))
  return Array.from(set)
}

export async function passwordMatches(password, hash) {
  return bcrypt.compare(password, hash)
}

