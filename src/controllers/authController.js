import { User } from '../models/User.js'
import { issueToken } from '../utils/jwt.js'
import { userJSON } from '../utils/presenters.js'

function uniqueInterests(interests = []) {
  return [...new Set(interests.map((interest) => interest.trim()).filter(Boolean))]
}

export async function register(req, res) {
  const user = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    role: 'user',
    interests: uniqueInterests(req.body.interests),
  })

  res.status(201).json({
    user: userJSON(user),
    ...issueToken(user),
  })
}

export async function login(req, res) {
  const user = await User.findOne({ email: req.body.email }).select('+password')

  if (!user || !(await user.verifyPassword(req.body.password))) {
    res.status(401).json({ message: 'Invalid email or password.' })
    return
  }

  res.json({
    user: userJSON(user),
    ...issueToken(user),
  })
}

export function me(req, res) {
  res.json({ data: userJSON(req.user) })
}

export function logout(req, res) {
  res.json({ message: 'Logged out.' })
}
