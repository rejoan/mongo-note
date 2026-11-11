import { body } from 'express-validator'

import { User } from '../models/User.js'

const nameRule = () =>
  body('name')
    .trim()
    .notEmpty()
    .withMessage('The name field is required.')
    .isString()
    .withMessage('The name must be a string.')
    .isLength({ max: 100 })
    .withMessage('The name may not be greater than 100 characters.')

const emailRule = () =>
  body('email')
    .trim()
    .toLowerCase()
    .notEmpty()
    .withMessage('The email field is required.')
    .isEmail()
    .withMessage('The email must be a valid email address.')
    .isLength({ max: 255 })
    .withMessage('The email may not be greater than 255 characters.')

const passwordRule = () =>
  body('password')
    .isString()
    .withMessage('The password must be a string.')
    .isLength({ min: 8 })
    .withMessage('The password must be at least 8 characters.')

const optionalPasswordRule = () =>
  body('password')
    .optional()
    .isString()
    .withMessage('The password must be a string.')
    .isLength({ min: 8 })
    .withMessage('The password must be at least 8 characters.')

const roleRule = () =>
  body('role').optional().isIn(['user', 'admin']).withMessage('The selected role is invalid.')

const interestsRules = () => [
  body('interests')
    .optional()
    .isArray({ max: 20 })
    .withMessage('The interests must be an array with at most 20 items.'),
  body('interests.*')
    .optional()
    .trim()
    .isString()
    .withMessage('Each interest must be a string.')
    .isLength({ max: 50 })
    .withMessage('Each interest may not be greater than 50 characters.'),
]

async function emailIsAvailable(value, { req }) {
  const filter = { email: value }

  if (req.params.user && /^[a-f\d]{24}$/i.test(req.params.user)) {
    filter._id = { $ne: req.params.user }
  }

  if (await User.exists(filter)) {
    throw new Error('The email has already been taken.')
  }
}

const titleRule = (optional = false) => {
  const rule = optional ? body('title').optional() : body('title')

  return rule
    .isString()
    .withMessage('The title must be a string.')
    .trim()
    .notEmpty()
    .withMessage('The title field is required.')
    .isLength({ max: 200 })
    .withMessage('The title may not be greater than 200 characters.')
}

const bodyRule = (optional = false) => {
  const rule = optional ? body('body').optional() : body('body')

  return rule
    .isString()
    .withMessage('The body must be a string.')
    .notEmpty()
    .withMessage('The body field is required.')
    .isLength({ max: 20000 })
    .withMessage('The body may not be greater than 20000 characters.')
}

export const registerRules = [
  nameRule(),
  emailRule().custom(emailIsAvailable),
  passwordRule(),
  body('password_confirmation')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('The password confirmation does not match.')
      }

      return true
    }),
  ...interestsRules(),
]

export const loginRules = [
  emailRule(),
  body('password')
    .isString()
    .withMessage('The password must be a string.')
    .notEmpty()
    .withMessage('The password field is required.'),
]

export const storeNoteRules = [titleRule(), bodyRule()]

export const updateNoteRules = [titleRule(true), bodyRule(true)]

export const storePostRules = [titleRule(), bodyRule()]

export const storeUserRules = [
  nameRule(),
  emailRule().custom(emailIsAvailable),
  passwordRule(),
  roleRule(),
  ...interestsRules(),
]

export const updateUserRules = [
  nameRule().optional(),
  emailRule().optional().custom(emailIsAvailable),
  optionalPasswordRule(),
  roleRule(),
  ...interestsRules(),
]
