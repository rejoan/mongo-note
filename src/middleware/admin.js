import { ApiError } from '../utils/ApiError.js'

export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    next(new ApiError(403, 'This action requires an administrator account.'))
    return
  }

  next()
}
