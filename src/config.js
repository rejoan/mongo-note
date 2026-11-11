import 'dotenv/config'

function toInt(value, fallback) {
  const parsed = Number.parseInt(value ?? '', 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: toInt(process.env.PORT, 8000),
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/mongo_note',
  jwtSecret: process.env.JWT_SECRET || '',
  jwtTtlMinutes: Math.max(1, toInt(process.env.JWT_TTL, 60)),
  jwtIssuer: process.env.JWT_ISSUER || 'mongo-note',
  bcryptRounds: Math.max(4, toInt(process.env.BCRYPT_ROUNDS, 12)),
  corsOrigins: (
    process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173'
  )
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
}

export const isTest = config.env === 'test'
