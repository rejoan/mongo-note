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

test('scenario 1 groups users by interest with one aggregation pipeline', async () => {
  await createUser({
    name: 'Reader One',
    email: 'reader-one@example.com',
    interests: ['reading', 'chess'],
  })
  await createUser({
    name: 'Reader Two',
    email: 'reader-two@example.com',
    interests: ['reading'],
  })
  await createUser({ name: 'No Interests', email: 'none@example.com', interests: [] })

  const admin = await createAdmin({ email: 'admin@example.com', interests: [] })
  const token = await tokenFor(admin)

  const response = await client()
    .get('/api/users/grouped-by-interests')
    .set(bearer(token))

  assert.equal(response.status, 200)
  assert.equal(response.body.meta.total, 2)

  const reading = response.body.data.find((group) => group.interest === 'reading')
  assert.equal(reading.count, 2)
  assert.equal(reading.users.length, 2)
  assert.ok(reading.users.every((user) => user.id && user.email))

  const chess = response.body.data.find((group) => group.interest === 'chess')
  assert.equal(chess.count, 1)

  const paged = await client()
    .get('/api/users/grouped-by-interests?per_page=1&page=2')
    .set(bearer(token))

  assert.equal(paged.body.data.length, 1)
  assert.equal(paged.body.meta.last_page, 2)
  assert.equal(paged.body.meta.total, 2)
})

test('scenario 2 returns one user’s posts with the author from $lookup', async () => {
  const writer = await createUser({ name: 'Writer', email: 'writer@example.com' })
  const other = await createUser({ name: 'Other', email: 'other@example.com' })
  const writerToken = await tokenFor(writer)
  const otherToken = await tokenFor(other)

  await client()
    .post('/api/posts')
    .set(bearer(writerToken))
    .send({ title: 'Writer post', body: 'One' })

  await client()
    .post('/api/posts')
    .set(bearer(otherToken))
    .send({ title: 'Other post', body: 'Two' })

  // Public endpoint: no Authorization header.
  const response = await client().get(`/api/users/${writer._id}/posts`)

  assert.equal(response.status, 200)
  assert.equal(response.body.meta.total, 1)
  assert.equal(response.body.data[0].title, 'Writer post')
  assert.equal(response.body.data[0].user_id, String(writer._id))
  assert.deepEqual(response.body.data[0].author, {
    id: String(writer._id),
    name: 'Writer',
  })

  const missing = await client().get('/api/users/0123456789abcdef01234567/posts')
  assert.equal(missing.status, 404)
})

test('the public posts feed embeds the author and is readable without a token', async () => {
  const writer = await createUser({ name: 'Public Writer', email: 'public@example.com' })
  const token = await tokenFor(writer)

  await client()
    .post('/api/posts')
    .set(bearer(token))
    .send({ title: 'Public post', body: 'Everyone can read this.' })

  const feed = await client().get('/api/posts')

  assert.equal(feed.status, 200)
  assert.equal(feed.body.meta.total, 1)
  assert.equal(feed.body.data[0].author.name, 'Public Writer')
})
