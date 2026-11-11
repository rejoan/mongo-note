import request from 'supertest'

import app from '../src/app.js'
import { connectDatabase, disconnectDatabase } from '../src/db.js'
import { Note } from '../src/models/Note.js'
import { Post } from '../src/models/Post.js'
import { User } from '../src/models/User.js'

let counter = 0

export function client() {
  return request(app)
}

export async function startTestDb() {
  await connectDatabase(process.env.MONGODB_URI)
}

export async function resetTestDb() {
  await Promise.all([User.deleteMany({}), Note.deleteMany({}), Post.deleteMany({})])
}

export async function stopTestDb() {
  await disconnectDatabase()
}

export async function createUser(overrides = {}) {
  counter += 1

  return User.create({
    name: `Test User ${counter}`,
    email: `test-user-${counter}@example.com`,
    password: 'Password123!',
    role: 'user',
    interests: [],
    ...overrides,
  })
}

export function createAdmin(overrides = {}) {
  return createUser({ role: 'admin', ...overrides })
}

export async function tokenFor(user) {
  const response = await client()
    .post('/api/auth/login')
    .send({ email: user.email, password: 'Password123!' })

  if (response.status !== 200) {
    throw new Error(`Login failed: ${JSON.stringify(response.body)}`)
  }

  return response.body.access_token
}

export function bearer(token) {
  return { Authorization: `Bearer ${token}` }
}
