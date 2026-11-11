function toIso(value) {
  return value ? new Date(value).toISOString() : null
}

export function userJSON(user) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    interests: user.interests ?? [],
    created_at: toIso(user.created_at),
    updated_at: toIso(user.updated_at),
  }
}

export function noteJSON(note) {
  const data = {
    id: String(note._id),
    title: note.title,
    body: note.body,
    user_id: String(note.user_id),
    created_at: toIso(note.created_at),
    updated_at: toIso(note.updated_at),
  }

  if (note.author) {
    data.author = userJSON(note.author)
  }

  return data
}

export function postJSON(post) {
  const data = {
    id: String(post._id),
    title: post.title,
    body: post.body,
    user_id: String(post.user_id),
    created_at: toIso(post.created_at),
    updated_at: toIso(post.updated_at),
  }

  if (post.author) {
    data.author = {
      id: String(post.author._id),
      name: post.author.name,
    }
  }

  return data
}

export function interestGroupJSON(group) {
  return {
    interest: group.interest,
    count: group.count,
    users: (group.users ?? []).map((user) => ({
      id: String(user.id),
      name: user.name,
      email: user.email,
    })),
  }
}

export function aggregatedPostJSON(post) {
  return {
    id: String(post.id),
    title: post.title,
    body: post.body,
    user_id: String(post.user_id),
    created_at: toIso(post.created_at),
    updated_at: toIso(post.updated_at),
    author: {
      id: String(post.author.id),
      name: post.author.name,
    },
  }
}
