import { Note } from '../models/Note.js'
import { ApiError } from '../utils/ApiError.js'
import { paginatedResponse, paginationFrom } from '../utils/pagination.js'
import { noteJSON } from '../utils/presenters.js'

const OBJECT_ID = /^[a-f\d]{24}$/i

async function findNote(id) {
  if (!OBJECT_ID.test(id)) {
    throw new ApiError(404, 'Note not found.')
  }

  const note = await Note.findById(id).populate('author')

  if (!note) {
    throw new ApiError(404, 'Note not found.')
  }

  return note
}

export async function index(req, res) {
  const { page, perPage, skip } = paginationFrom(req.query)
  const filter = {}

  if (req.user.role === 'admin') {
    if (req.query.user_id !== undefined) {
      if (typeof req.query.user_id !== 'string' || !OBJECT_ID.test(req.query.user_id)) {
        throw new ApiError(422, 'The given data was invalid.', {
          user_id: ['The user id must be a valid 24-character hex string.'],
        })
      }

      filter.user_id = req.query.user_id
    }
  } else {
    filter.user_id = req.user._id
  }

  const [total, notes] = await Promise.all([
    Note.countDocuments(filter),
    Note.find(filter)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(perPage)
      .populate('author'),
  ])

  res.json(paginatedResponse(req, notes.map(noteJSON), total, page, perPage))
}

export async function store(req, res) {
  const note = await Note.create({
    user_id: req.user._id,
    title: req.body.title,
    body: req.body.body,
  })

  await note.populate('author')

  res.status(201).json({ data: noteJSON(note) })
}

export async function show(req, res) {
  const note = await findNote(req.params.note)

  const isOwner = String(note.user_id) === String(req.user._id)

  if (req.user.role !== 'admin' && !isOwner) {
    throw new ApiError(403, 'You are not allowed to view this note.')
  }

  res.json({ data: noteJSON(note) })
}

export async function update(req, res) {
  const note = await findNote(req.params.note)

  if (String(note.user_id) !== String(req.user._id)) {
    throw new ApiError(403, 'You can only modify your own notes.')
  }

  if (req.body.title !== undefined) {
    note.title = req.body.title
  }

  if (req.body.body !== undefined) {
    note.body = req.body.body
  }

  await note.save()
  await note.populate('author')

  res.json({ data: noteJSON(note) })
}

export async function destroy(req, res) {
  const note = await findNote(req.params.note)

  if (String(note.user_id) !== String(req.user._id)) {
    throw new ApiError(403, 'You can only modify your own notes.')
  }

  await note.deleteOne()

  res.status(204).end()
}
