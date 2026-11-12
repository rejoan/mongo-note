import mongoose from 'mongoose'

let connectionPromise = null

export function ensureDatabase(uri) {
  mongoose.set('strictQuery', true)

  if (!uri || (process.env.NODE_ENV === 'production' && !process.env.MONGODB_URI)) {
    throw new Error(
      'MONGODB_URI is not set. Add the MongoDB Atlas connection string to the environment variables.',
    )
  }

  // Reuse the live connection (serverless invocations are warm for a while).
  if (mongoose.connection.readyState === 1) {
    return Promise.resolve(mongoose.connection)
  }

  if (!connectionPromise) {
    connectionPromise = mongoose
      .connect(uri, { serverSelectionTimeoutMS: 10000 })
      .then(() => mongoose.connection)
      .catch((error) => {
        // Let the next request retry instead of caching a failure forever.
        connectionPromise = null
        throw error
      })
  }

  return connectionPromise
}

export async function connectDatabase(uri) {
  return ensureDatabase(uri)
}

export async function disconnectDatabase() {
  connectionPromise = null
  await mongoose.disconnect()
}
