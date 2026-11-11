import mongoose from 'mongoose'

const postSchema = new mongoose.Schema(
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

// Scenario 2: posts for one user, newest first.
postSchema.index({ user_id: 1, created_at: -1 }, { name: 'posts_user_id_created_at_desc' })

// Public posts feed, newest first.
postSchema.index({ created_at: -1 }, { name: 'posts_created_at_desc' })

postSchema.virtual('author', {
  ref: 'User',
  localField: 'user_id',
  foreignField: '_id',
  justOne: true,
})

export const Post = mongoose.model('Post', postSchema)
