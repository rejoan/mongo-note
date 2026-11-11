import { Router } from 'express'

import { destroy, index, store } from '../controllers/postController.js'
import { authenticate } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { storePostRules } from '../validation/rules.js'

const router = Router()

// Posts are public to read; creating and deleting requires authentication.
router.get('/', asyncHandler(index))
router.post('/', authenticate, validate(storePostRules), asyncHandler(store))
router.delete('/:post', authenticate, asyncHandler(destroy))

export default router
