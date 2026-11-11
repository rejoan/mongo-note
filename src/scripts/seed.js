import { config } from '../config.js'
import { connectDatabase, disconnectDatabase } from '../db.js'
import { Note } from '../models/Note.js'
import { Post } from '../models/Post.js'
import { User } from '../models/User.js'

const DEMO_PASSWORD = 'Password123!'

const otherUsers = [
  { name: 'Geraldine Olson', email: 'morar.mose@example.org', interests: ['chess'] },
  { name: 'Antonio Cassin DVM', email: 'xmertz@example.com', interests: ['reading', 'gaming'] },
  { name: 'Gerson Ullrich', email: 'mabelle.krajcik@example.net', interests: ['reading', 'cooking'] },
  {
    name: 'Dr. Hannah Mills III',
    email: 'antonetta.osinski@example.org',
    interests: ['reading', 'photography'],
  },
  { name: 'Velma Wehner', email: 'gutkowski.jessyca@example.com', interests: ['cooking', 'hiking'] },
  { name: 'Forest Fisher', email: 'crona.augusta@example.org', interests: ['photography', 'hiking'] },
]

const sampleNotes = [
  {
    title: 'Groceries and errands',
    body: 'Pick up coffee, oats and fruit, then drop the parcel at the post office.',
  },
  {
    title: 'Reading list',
    body: 'Finish the chapter on indexes, then start the aggregation pipeline notes.',
  },
]

const samplePosts = [
  {
    title: 'Hello from the community',
    body: 'This post is public and is resolved with a single $lookup aggregation pipeline.',
  },
]

async function seed() {
  await connectDatabase(config.mongoUri)

  // Make sure the declared indexes exist even on a fresh database.
  await Promise.all([User.init(), Note.init(), Post.init()])

  if ((await User.countDocuments()) > 0) {
    console.log('Database already contains users; skipping seed.')
    return
  }

  const admin = await User.create({
    name: 'Admin User',
    email: 'admin@example.com',
    password: DEMO_PASSWORD,
    role: 'admin',
    interests: ['chess', 'reading'],
  })

  const user = await User.create({
    name: 'Regular User',
    email: 'user@example.com',
    password: DEMO_PASSWORD,
    role: 'user',
    interests: ['reading', 'hiking'],
  })

  await Note.create({
    user_id: admin._id,
    title: 'Admin private note',
    body: 'Only the admin (and nobody else) can read this note.',
  })

  await Note.create({
    user_id: user._id,
    title: 'Weekend plans',
    body: 'Hike the ridge trail and finish the reading list.',
  })

  await Post.create({
    user_id: user._id,
    title: 'Hello from the regular user',
    body: 'This post is visible to everyone and is resolved with a $lookup aggregation.',
  })

  await Post.create({
    user_id: admin._id,
    title: 'Admin announcement',
    body: 'Welcome to Mongo Note.',
  })

  for (const person of otherUsers) {
    const created = await User.create({
      ...person,
      password: DEMO_PASSWORD,
      role: 'user',
    })

    for (const note of sampleNotes) {
      await Note.create({ user_id: created._id, ...note })
    }

    for (const post of samplePosts) {
      await Post.create({ user_id: created._id, ...post })
    }
  }

  console.log('Seed complete.')
  console.log('  admin@example.com / Password123! (admin)')
  console.log('  user@example.com  / Password123! (user)')
}

seed()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await disconnectDatabase()
  })
