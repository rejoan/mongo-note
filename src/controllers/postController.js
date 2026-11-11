import { Types } from 'mongoose'

import { Post } from '../models/Post.js'
import { User } from '../models/User.js'
import { ApiError } from '../utils/ApiError.js'
import { aggregateResponse, paginatedResponse, paginationFrom } from '../utils/pagination.js'
import { aggregatedPostJSON, postJSON } from '../utils/presenters.js'

const OBJECT_ID = /^[a-f\d]{24}$/i

async function findPost(id) {
  if (!OBJECT_ID.test(id)) {
    throw new ApiError(404, 'Post not found.')
  }

  const post = await Post.findById(id)

  if (!post) {
    throw new ApiError(404, 'Post not found.')
  }

  return post
}

export async function index(req, res) {
  const { page, perPage, skip } = paginationFrom(req.query)

  const [total, posts] = await Promise.all([
    Post.countDocuments(),
    Post.find()
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(perPage)
      .populate('author'),
  ])

  res.json(paginatedResponse(req, posts.map(postJSON), total, page, perPage))
}

export async function store(req, res) {
  const post = await Post.create({
    user_id: req.user._id,
    title: req.body.title,
    body: req.body.body,
  })

  await post.populate('author')

  res.status(201).json({ data: postJSON(post) })
}

/**
 * Scenario 2: retrieve a user's posts with a single aggregation pipeline
 * containing a $lookup stage.
 */
export async function byUser(req, res) {
  const { page, perPage, skip } = paginationFrom(req.query)
  const { user: userId } = req.params

  if (!OBJECT_ID.test(userId)) {
    throw new ApiError(404, 'User not found.')
  }

  const authorExists = await User.exists({ _id: userId })

  if (!authorExists) {
    throw new ApiError(404, 'User not found.')
  }

  // $match uses posts.user_id, and $sort uses the compound
  // (user_id, created_at) index. The lookup target users._id is the default
  // primary-key index.
  const pipeline = [
    { $match: { user_id: new Types.ObjectId(userId) } },
    { $sort: { created_at: -1 } },
    {
      $facet: {
        data: [
          { $skip: skip },
          { $limit: perPage },
          {
            $lookup: {
              from: 'users',
              localField: 'user_id',
              foreignField: '_id',
              as: 'author',
            },
          },
          { $unwind: '$author' },
          {
            $project: {
              _id: 0,
              id: '$_id',
              title: 1,
              body: 1,
              user_id: 1,
              created_at: 1,
              updated_at: 1,
              author: {
                id: '$author._id',
                name: '$author.name',
              },
            },
          },
        ],
        meta: [{ $count: 'total' }],
      },
    },
  ]

  const [result = { data: [], meta: [] }] = await Post.collection.aggregate(pipeline).toArray()
  const total = result.meta?.[0]?.total ?? 0

  res.json(
    aggregateResponse(
      (result.data ?? []).map(aggregatedPostJSON),
      total,
      page,
      perPage,
    ),
  )
}

export async function destroy(req, res) {
  const post = await findPost(req.params.post)

  if (String(post.user_id) !== String(req.user._id)) {
    throw new ApiError(403, 'You can only delete your own posts.')
  }

  await post.deleteOne()

  res.status(204).end()
}
