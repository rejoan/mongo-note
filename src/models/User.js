import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'

import { config } from '../config.js'

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 255 },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    interests: { type: [String], default: [] },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    versionKey: false,
  },
)

// Login and duplicate-account checks are by email.
userSchema.index({ email: 1 }, { unique: true, name: 'users_email_unique' })

// Admin user listing: newest first.
userSchema.index({ created_at: -1 }, { name: 'users_created_at_desc' })

// Scenario 1: $match + $unwind over the interests array (multikey index).
userSchema.index({ interests: 1 }, { name: 'users_interests' })

userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) {
    return
  }

  this.password = await bcrypt.hash(this.password, config.bcryptRounds)
})

userSchema.methods.verifyPassword = function verifyPassword(plainPassword) {
  return bcrypt.compare(plainPassword, this.password)
}

userSchema.set('toJSON', {
  transform(document, returned) {
    delete returned.password
    return returned
  },
})

export const User = mongoose.model('User', userSchema)
