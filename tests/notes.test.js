import assert from 'node:assert/strict'
import { after, before, beforeEach, test } from 'node:test'

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

function createNote(token, title, body = 'Note body') {
  return client().post('/api/notes').set(bearer(token)).send({ title, body })
}

test('a user creates a note and only lists their own notes', async () => {
  const alice = await createUser({ email: 'alice@example.com', name: 'Alice' })
  const bob = await createUser({ email: 'bob@example.com', name: 'Bob' })
  const aliceToken = await tokenFor(alice)
  const bobToken = await tokenFor(bob)

  const created = await createNote(aliceToken, 'Alice note')

  assert.equal(created.status, 201)
  assert.equal(created.body.data.title, 'Alice note')
  assert.equal(created.body.data.user_id, String(alice._id))
  assert.equal(created.body.data.author.email, 'alice@example.com')

  await createNote(bobToken, 'Bob note')

  const list = await client().get('/api/notes').set(bearer(aliceToken))

  assert.equal(list.status, 200)
  assert.equal(list.body.meta.total, 1)
  assert.equal(list.body.data[0].title, 'Alice note')
})

test('an admin lists every note and can filter by author', async () => {
  const alice = await createUser({ email: 'alice@example.com', name: 'Alice' })
  const bob = await createUser({ email: 'bob@example.com', name: 'Bob' })
  const admin = await createAdmin({ email: 'admin@example.com', name: 'Admin' })

  await createNote(await tokenFor(alice), 'Alice note')
  await createNote(await tokenFor(bob), 'Bob note')

  const adminToken = await tokenFor(admin)

  const all = await client().get('/api/notes').set(bearer(adminToken))
  assert.equal(all.body.meta.total, 2)

  const filtered = await client()
    .get(`/api/notes?user_id=${alice._id}`)
    .set(bearer(adminToken))

  assert.equal(filtered.body.meta.total, 1)
  assert.equal(filtered.body.data[0].author.name, 'Alice')
})

test('an admin can read but not modify another user’s note', async () => {
  const alice = await createUser({ email: 'alice@example.com' })
  const admin = await createAdmin({ email: 'admin@example.com' })
  const aliceToken = await tokenFor(alice)
  const adminToken = await tokenFor(admin)

  const note = (await createNote(aliceToken, 'Private note')).body.data

  const read = await client().get(`/api/notes/${note.id}`).set(bearer(adminToken))
  assert.equal(read.status, 200)

  const update = await client()
    .put(`/api/notes/${note.id}`)
    .set(bearer(adminToken))
    .send({ title: 'Changed by admin' })

  assert.equal(update.status, 403)
  assert.equal(update.body.message, 'You can only modify your own notes.')

  const remove = await client().delete(`/api/notes/${note.id}`).set(bearer(adminToken))

  assert.equal(remove.status, 403)
})

test('an owner can update and delete their note', async () => {
  const alice = await createUser({ email: 'alice@example.com' })
  const token = await tokenFor(alice)
  const note = (await createNote(token, 'Original')).body.data

  const updated = await client()
    .put(`/api/notes/${note.id}`)
    .set(bearer(token))
    .send({ title: 'Updated', body: 'New body' })

  assert.equal(updated.status, 200)
  assert.equal(updated.body.data.title, 'Updated')
  assert.equal(updated.body.data.body, 'New body')

  const removed = await client().delete(`/api/notes/${note.id}`).set(bearer(token))
  assert.equal(removed.status, 204)

  const missing = await client().get(`/api/notes/${note.id}`).set(bearer(token))
  assert.equal(missing.status, 404)
})

test('note validation and pagination behave like the API contract', async () => {
  const alice = await createUser({ email: 'alice@example.com' })
  const token = await tokenFor(alice)

  const invalid = await client().post('/api/notes').set(bearer(token)).send({ title: '' })

  assert.equal(invalid.status, 422)
  assert.ok(invalid.body.errors.title)
  assert.ok(invalid.body.errors.body)

  for (let index = 1; index <= 12; index += 1) {
    await createNote(token, `Note ${index}`)
  }

  const page = await client()
    .get('/api/notes?per_page=5&page=2')
    .set(bearer(token))

  assert.equal(page.body.meta.current_page, 2)
  assert.equal(page.body.meta.last_page, 3)
  assert.equal(page.body.meta.total, 12)
  assert.equal(page.body.data.length, 5)

  const badPage = await client().get('/api/notes?page=0').set(bearer(token))
  assert.equal(badPage.status, 422)
})
