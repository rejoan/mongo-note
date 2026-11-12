import cors from 'cors'
import express from 'express'
import helmet from 'helmet'

import { config } from './config.js'
import { ensureDatabase } from './db.js'
import { errorHandler, notFound } from './middleware/error.js'
import routes from './routes/index.js'

export function createApp() {
  const app = express()

  app.disable('x-powered-by')
  app.use(helmet())
  app.use(cors({ origin: config.corsOrigins }))
  app.use(express.json({ limit: '1mb' }))

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' })
  })

  // Serverless platforms (Vercel) import this app directly instead of running
  // src/server.js, so the connection has to be ensured here as well.
  app.use((req, res, next) => {
    ensureDatabase(config.mongoUri).then(() => next(), next)
  })

  app.use('/api', routes)

  app.use(notFound)
  app.use(errorHandler)

  return app
}

export const app = createApp()

export default app
