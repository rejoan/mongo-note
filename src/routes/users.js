import { Router } from 'express'

import {
  destroy,
  groupedByInterests,
  index,
  show,
  store,
  update,
} from '../controllers/userController.js'
import { byUser } from '../controllers/postController.js'
import { requireAdmin } from '../middleware/admin.js'
import { authenticate } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { storeUserRules, updateUserRules } from '../validation/rules.js'

const router = Router()

// Scenario 2 is public: anyone can read a user's posts.
router.get('/:user/posts', asyncHandler(byUser))

// Everything below is admin-only.
router.use(authenticate, requireAdmin)

router.get('/grouped-by-interests', asyncHandler(groupedByInterests))
router.get('/', asyncHandler(index))
router.post('/', validate(storeUserRules), asyncHandler(store))
router.get('/:user', asyncHandler(show))
router.put('/:user', validate(updateUserRules), asyncHandler(update))
router.patch('/:user', validate(updateUserRules), asyncHandler(update))
router.delete('/:user', asyncHandler(destroy))

export default router
