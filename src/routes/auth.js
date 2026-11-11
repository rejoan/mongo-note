import { Router } from 'express'

import { login, logout, me, register } from '../controllers/authController.js'
import { authenticate } from '../middleware/auth.js'
import { authLimiter } from '../middleware/rateLimit.js'
import { validate } from '../middleware/validate.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { loginRules, registerRules } from '../validation/rules.js'

const router = Router()

router.post('/register', authLimiter, validate(registerRules), asyncHandler(register))
router.post('/login', authLimiter, validate(loginRules), asyncHandler(login))

router.get('/me', authenticate, asyncHandler(me))
router.post('/logout', authenticate, asyncHandler(logout))

export default router
