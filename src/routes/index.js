import { Router } from 'express'

import authRoutes from './auth.js'
import noteRoutes from './notes.js'
import postRoutes from './posts.js'
import userRoutes from './users.js'

const router = Router()

router.use('/auth', authRoutes)
router.use('/notes', noteRoutes)
router.use('/posts', postRoutes)
router.use('/users', userRoutes)

export default router
