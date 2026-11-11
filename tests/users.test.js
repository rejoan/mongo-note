import assert from 'node:assert/strict'
import { after, before, beforeEach, test } from 'node:test'

import { Note } from '../src/models/Note.js'
import { Post } from '../src/models/Post.js'
import {
  bearer,
  client,
  createAdmin,
  createUser,
  resetTestDb,
  startTestDb,
  stopTestDb,
  tokenFor,
} from './helpers.js'

before(startTestDb)
beforeEach(resetTestDb)
after(stopTestDb)

test('regular users cannot access admin user endpoints', async () => {
  const user = await createUser({ email: 'plain@example.com' })
  const token = await tokenFor(user)

  const list = await client().get('/api/users').set(bearer(token))
  assert.equal(list.status, 403)
  assert.equal(list.body.message, 'This action requires an administrator account.')

  const grouped = await client().get('/api/users/grouped-by-interests').set(bearer(token))
  assert.equal(grouped.status, 403)
})

test('an admin creates, lists, updates and changes a user password', async () => {
  const admin = await createAdmin({ email: 'boss@example.com' })
  const adminToken = await tokenFor(admin)

  const created = await client()
    .post('/api/users')
    .set(bearer(adminToken))
    .send({
      name: 'New Person',
      email: 'new@example.com',
      password: 'Password123!',
      role: 'admin',
      interests: ['chess', 'chess', 'reading'],
    })

  assert.equal(created.status, 201)
  assert.equal(created.body.data.role, 'admin')
  assert.deepEqual(created.body.data.interests, ['chess', 'reading'])

  const duplicate = await client()
    .post('/api/users')
    .set(bearer(adminToken))
    .send({
      name: 'Duplicate',
      email: 'new@example.com',
      password: 'Password123!',
    })

  assert.equal(duplicate.status, 422)
  assert.ok(duplicate.body.errors.email)

  const id = created.body.data.id

  const updated = await client()
    .put(`/api/users/${id}`)
    .set(bearer(adminToken))
    .send({ name: 'Renamed', role: 'user', interests: ['hiking'] })

  assert.equal(updated.status, 200)
  assert.equal(updated.body.data.name, 'Renamed')
  assert.equal(updated.body.data.role, 'user')
  assert.deepEqual(updated.body.data.interests, ['hiking'])

  // Password was omitted, so the existing one still works.
  const oldLogin = await client()
    .post('/api/auth/login')
    .send({ email: 'new@example.com', password: 'Password123!' })
  assert.equal(oldLogin.status, 200)

  const passwordUpdate = await client()
    .put(`/api/users/${id}`)
    .set(bearer(adminToken))
    .send({ password: 'NewPassword123!' })
  assert.equal(passwordUpdate.status, 200)

  const newLogin = await client()
    .post('/api/auth/login')
    .send({ email: 'new@example.com', password: 'NewPassword123!' })
  assert.equal(newLogin.status, 200)

  const list = await client().get('/api/users').set(bearer(adminToken))
  assert.equal(list.body.meta.total, 2)
})

test('an admin cannot demote or delete their own account', async () => {
  const admin = await createAdmin({ email: 'solo@example.com' })
  const token = await tokenFor(admin)

  const demote = await client()
    .put(`/api/users/${admin._id}`)
    .set(bearer(token))
    .send({ role: 'user' })

  assert.equal(demote.status, 422)
  assert.equal(demote.body.message, 'You cannot remove your own administrator role.')

  const remove = await client().delete(`/api/users/${admin._id}`).set(bearer(token))
  assert.equal(remove.status, 422)
  assert.equal(remove.body.message, 'You cannot delete your own account.')

  const stillAuthenticated = await client().get('/api/auth/me').set(bearer(token))
  assert.equal(stillAuthenticated.status, 200)
})

test('deleting a user removes their notes and posts', async () => {
  const admin = await createAdmin({ email: 'boss@example.com' })
  const victim = await createUser({ email: 'victim@example.com' })
  const victimToken = await tokenFor(victim)

  await client()
    .post('/api/notes')
    .set(bearer(victimToken))
    .send({ title: 'Cascade note', body: 'Body' })

  await client()
    .post('/api/posts')
    .set(bearer(victimToken))
    .send({ title: 'Cascade post', body: 'Body' })

  const adminToken = await tokenFor(admin)
  const response = await client()
    .delete(`/api/users/${victim._id}`)
    .set(bearer(adminToken))

  assert.equal(response.status, 204)
  assert.equal(await Note.countDocuments({ user_id: victim._id }), 0)
  assert.equal(await Post.countDocuments({ user_id: victim._id }), 0)
})
