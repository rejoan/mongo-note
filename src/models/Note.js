import mongoose from 'mongoose'

const noteSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    body: { type: String, required: true, maxlength: 20000 },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    versionKey: false,
  },
)

// A user listing their own notes, newest first.
noteSchema.index({ user_id: 1, created_at: -1 }, { name: 'notes_user_id_created_at_desc' })

// Admin viewing everyone's notes, newest first.
noteSchema.index({ created_at: -1 }, { name: 'notes_created_at_desc' })

noteSchema.virtual('author', {
  ref: 'User',
  localField: 'user_id',
  foreignField: '_id',
  justOne: true,
})

export const Note = mongoose.model('Note', noteSchema)
