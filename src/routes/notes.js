import { Router } from 'express'

import { destroy, index, show, store, update } from '../controllers/noteController.js'
import { authenticate } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { storeNoteRules, updateNoteRules } from '../validation/rules.js'

const router = Router()

router.use(authenticate)

router.get('/', asyncHandler(index))
router.post('/', validate(storeNoteRules), asyncHandler(store))
router.get('/:note', asyncHandler(show))
router.put('/:note', validate(updateNoteRules), asyncHandler(update))
router.patch('/:note', validate(updateNoteRules), asyncHandler(update))
router.delete('/:note', asyncHandler(destroy))

export default router
