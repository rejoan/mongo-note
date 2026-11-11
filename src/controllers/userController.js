import { Note } from '../models/Note.js'
import { Post } from '../models/Post.js'
import { User } from '../models/User.js'
import { ApiError } from '../utils/ApiError.js'
import { aggregateResponse, paginatedResponse, paginationFrom } from '../utils/pagination.js'
import { interestGroupJSON, userJSON } from '../utils/presenters.js'

const OBJECT_ID = /^[a-f\d]{24}$/i

function uniqueInterests(interests = []) {
  return [...new Set(interests.map((interest) => interest.trim()).filter(Boolean))]
}

async function findUser(id) {
  if (!OBJECT_ID.test(id)) {
    throw new ApiError(404, 'User not found.')
  }

  const user = await User.findById(id)

  if (!user) {
    throw new ApiError(404, 'User not found.')
  }

  return user
}

export async function index(req, res) {
  const { page, perPage, skip } = paginationFrom(req.query)

  const [total, users] = await Promise.all([
    User.countDocuments(),
    User.find().sort({ created_at: -1 }).skip(skip).limit(perPage),
  ])

  res.json(paginatedResponse(req, users.map(userJSON), total, page, perPage))
}

export async function store(req, res) {
  const user = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    role: req.body.role ?? 'user',
    interests: uniqueInterests(req.body.interests),
  })

  res.status(201).json({ data: userJSON(user) })
}

export async function show(req, res) {
  const user = await findUser(req.params.user)
  res.json({ data: userJSON(user) })
}

export async function update(req, res) {
  const user = await findUser(req.params.user)

  if (String(user._id) === String(req.user._id) && req.body.role !== undefined && req.body.role !== 'admin') {
    throw new ApiError(422, 'You cannot remove your own administrator role.')
  }

  if (req.body.name !== undefined) {
    user.name = req.body.name
  }

  if (req.body.email !== undefined) {
    user.email = req.body.email
  }

  if (req.body.role !== undefined) {
    user.role = req.body.role
  }

  if (req.body.interests !== undefined) {
    user.interests = uniqueInterests(req.body.interests)
  }

  if (req.body.password) {
    user.password = req.body.password
  }

  await user.save()

  res.json({ data: userJSON(user) })
}

export async function destroy(req, res) {
  const user = await findUser(req.params.user)

  if (String(user._id) === String(req.user._id)) {
    throw new ApiError(422, 'You cannot delete your own account.')
  }

  // Remove the user's documents first so no orphaned records remain.
  await Promise.all([
    Note.deleteMany({ user_id: user._id }),
    Post.deleteMany({ user_id: user._id }),
  ])

  await user.deleteOne()

  res.status(204).end()
}

/**
 * Scenario 1: group users by interest using exactly one aggregation call.
 */
export async function groupedByInterests(req, res) {
  const { page, perPage, skip } = paginationFrom(req.query)

  // The $match on interests uses the multikey users.interests index.
  // $facet keeps pagination inside the same pipeline, so this is the one and
  // only collection.aggregate() call used by this feature.
  const pipeline = [
    { $match: { interests: { $exists: true } } },
    { $unwind: '$interests' },
    {
      $group: {
        _id: '$interests',
        count: { $sum: 1 },
        users: {
          $push: {
            id: '$_id',
            name: '$name',
            email: '$email',
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        interest: '$_id',
        count: 1,
        users: 1,
      },
    },
    { $sort: { count: -1, interest: 1 } },
    {
      $facet: {
        data: [{ $skip: skip }, { $limit: perPage }],
        meta: [{ $count: 'total' }],
      },
    },
  ]

  const [result = { data: [], meta: [] }] = await User.collection.aggregate(pipeline).toArray()
  const total = result.meta?.[0]?.total ?? 0

  res.json(
    aggregateResponse(
      (result.data ?? []).map(interestGroupJSON),
      total,
      page,
      perPage,
    ),
  )
}
