import assert from 'node:assert/strict'
import { after, before, beforeEach, test } from 'node:test'

import { User } from '../src/models/User.js'
import { client, resetTestDb, startTestDb, stopTestDb } from './helpers.js'

before(startTestDb)
beforeEach(resetTestDb)
after(stopTestDb)

const registration = {
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  password: 'Password123!',
  password_confirmation: 'Password123!',
  interests: ['mathematics', 'reading'],
}

test('register creates a user, hashes the password and returns a JWT', async () => {
  const response = await client().post('/api/auth/register').send(registration)

  assert.equal(response.status, 201)
  assert.equal(response.body.user.email, 'ada@example.com')
  assert.equal(response.body.user.role, 'user')
  assert.deepEqual(response.body.user.interests, ['mathematics', 'reading'])
  assert.equal(response.body.token_type, 'bearer')
  assert.equal(response.body.access_token.split('.').length, 3)

  const stored = await User.findOne({ email: 'ada@example.com' }).select('+password')
  assert.match(stored.password, /^\$2[aby]\$/)
  assert.notEqual(stored.password, 'Password123!')
})

test('register rejects duplicate emails', async () => {
  await client().post('/api/auth/register').send(registration)

  const response = await client().post('/api/auth/register').send(registration)

  assert.equal(response.status, 422)
  assert.ok(response.body.errors.email)
})

test('register requires the password confirmation to match', async () => {
  const response = await client()
    .post('/api/auth/register')
    .send({ ...registration, password_confirmation: 'Different123!' })

  assert.equal(response.status, 422)
  assert.ok(response.body.errors.password_confirmation)
})

test('login returns a token for valid credentials and 401 otherwise', async () => {
  await client().post('/api/auth/register').send(registration)

  const valid = await client()
    .post('/api/auth/login')
    .send({ email: 'ada@example.com', password: 'Password123!' })

  assert.equal(valid.status, 200)
  assert.ok(valid.body.access_token)

  const invalid = await client()
    .post('/api/auth/login')
    .send({ email: 'ada@example.com', password: 'WrongPassword!' })

  assert.equal(invalid.status, 401)
  assert.equal(invalid.body.message, 'Invalid email or password.')
})

test('me returns the authenticated user and rejects guests', async () => {
  await client().post('/api/auth/register').send(registration)
  const login = await client()
    .post('/api/auth/login')
    .send({ email: 'ada@example.com', password: 'Password123!' })

  const me = await client()
    .get('/api/auth/me')
    .set('Authorization', `Bearer ${login.body.access_token}`)

  assert.equal(me.status, 200)
  assert.equal(me.body.data.email, 'ada@example.com')

  const guest = await client().get('/api/auth/me')

  assert.equal(guest.status, 401)
  assert.equal(guest.body.message, 'Unauthenticated.')
})

test('logout acknowledges the request', async () => {
  await client().post('/api/auth/register').send(registration)
  const login = await client()
    .post('/api/auth/login')
    .send({ email: 'ada@example.com', password: 'Password123!' })

  const response = await client()
    .post('/api/auth/logout')
    .set('Authorization', `Bearer ${login.body.access_token}`)

  assert.equal(response.status, 200)
  assert.equal(response.body.message, 'Logged out.')
})
