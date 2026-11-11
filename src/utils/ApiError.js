export class ApiError extends Error {
  constructor(status, message, errors = undefined) {
    super(message)
    this.name = 'ApiError'
    this.status = status

    if (errors) {
      this.errors = errors
    }
  }
}
