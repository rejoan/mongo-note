import { app } from './app.js'
import { config } from './config.js'
import { connectDatabase, disconnectDatabase } from './db.js'
import { Note } from './models/Note.js'
import { Post } from './models/Post.js'
import { User } from './models/User.js'
import { assertJwtConfigured } from './utils/jwt.js'

async function main() {
  assertJwtConfigured()

  await connectDatabase(config.mongoUri)

  // Ensure the declared indexes exist before accepting requests.
  await Promise.all([User.init(), Note.init(), Post.init()])

  const server = app.listen(config.port, () => {
    console.log(`Mongo Note API listening on http://localhost:${config.port}/api`)
  })

  async function shutdown(signal) {
    console.log(`\n${signal} received, shutting down...`)

    server.close(async () => {
      await disconnectDatabase()
      process.exit(0)
    })
  }

  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
