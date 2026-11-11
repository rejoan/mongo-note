import crypto from 'node:crypto'

import jwt from 'jsonwebtoken'

import { config } from '../config.js'

export function assertJwtConfigured() {
  if (!config.jwtSecret) {
    throw new Error(
      'JWT_SECRET is not configured. Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"',
    )
  }
}

function secret() {
  assertJwtConfigured()
  return config.jwtSecret
}

export function issueToken(user) {
  const now = Math.floor(Date.now() / 1000)
  const expiresIn = config.jwtTtlMinutes * 60

  const payload = {
    iss: config.jwtIssuer,
    sub: String(user._id),
    role: user.role,
    iat: now,
    nbf: now,
    exp: now + expiresIn,
    jti: crypto.randomUUID(),
  }

  return {
    access_token: jwt.sign(payload, secret(), { algorithm: 'HS256' }),
    token_type: 'bearer',
    expires_in: expiresIn,
  }
}

export function verifyToken(token) {
  return jwt.verify(token, secret(), {
    algorithms: ['HS256'],
    issuer: config.jwtIssuer,
  })
}
