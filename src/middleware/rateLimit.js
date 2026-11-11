import rateLimit from 'express-rate-limit'

import { isTest } from '../config.js'

export const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: () => isTest,
  handler: (req, res) => {
    res.status(429).json({ message: 'Too many attempts. Please try again later.' })
  },
})
