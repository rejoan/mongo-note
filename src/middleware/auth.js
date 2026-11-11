import { User } from '../models/User.js'
import { ApiError } from '../utils/ApiError.js'
import { verifyToken } from '../utils/jwt.js'

export async function authenticate(req, res, next) {
  const header = req.get('authorization') || ''
  const [scheme, token] = header.trim().split(/\s+/)

  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    next(new ApiError(401, 'Unauthenticated.'))
    return
  }

  try {
    const payload = verifyToken(token)
    const user = await User.findById(payload.sub)

    if (!user) {
      next(new ApiError(401, 'Unauthenticated.'))
      return
    }

    req.user = user
    next()
  } catch {
    next(new ApiError(401, 'Unauthenticated.'))
  }
}
