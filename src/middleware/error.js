import { ApiError } from '../utils/ApiError.js'

export function notFound(req, res, next) {
  next(new ApiError(404, `Route ${req.method} ${req.originalUrl} not found.`))
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    next(error)
    return
  }

  let status = error.status || 500
  let message = error.message || 'Server Error'
  let errors = error.errors

  if (error.name === 'CastError') {
    status = 404
    message = 'Not found.'
  }

  if (error.name === 'ValidationError') {
    status = 422
    message = 'The given data was invalid.'
    errors = {}

    for (const [field, detail] of Object.entries(error.errors ?? {})) {
      errors[field] = [detail.message]
    }
  }

  if (error.code === 11000) {
    status = 422
    message = 'The given data was invalid.'
    errors = { email: ['The email has already been taken.'] }
  }

  if (error.type === 'entity.parse.failed') {
    status = 400
    message = 'Invalid JSON payload.'
  }

  if (status >= 500) {
    console.error(error)
  }

  const body = { message }

  if (errors) {
    body.errors = errors
  }

  res.status(status).json(body)
}
