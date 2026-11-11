import { validationResult } from 'express-validator'

import { ApiError } from '../utils/ApiError.js'

export function validate(rules) {
  return [
    ...rules,
    (req, res, next) => {
      const result = validationResult(req)

      if (result.isEmpty()) {
        next()
        return
      }

      const errors = {}

      for (const error of result.array()) {
        const field = error.path || '_'

        if (!errors[field]) {
          errors[field] = []
        }

        errors[field].push(error.msg)
      }

      next(new ApiError(422, 'The given data was invalid.', errors))
    },
  ]
}
