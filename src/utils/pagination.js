import { ApiError } from './ApiError.js'

function positiveInteger(value, field, fallback, max = Number.MAX_SAFE_INTEGER) {
  if (value === undefined) {
    return fallback
  }

  if (Array.isArray(value) || !/^\d+$/.test(String(value))) {
    throw new ApiError(422, 'The given data was invalid.', {
      [field]: [`The ${field} must be an integer.`],
    })
  }

  const parsed = Number.parseInt(value, 10)

  if (parsed < 1 || parsed > max) {
    throw new ApiError(422, 'The given data was invalid.', {
      [field]: [`The ${field} field must be between 1 and ${max}.`],
    })
  }

  return parsed
}

export function paginationFrom(query = {}) {
  const page = positiveInteger(query.page, 'page', 1)
  const perPage = positiveInteger(query.per_page, 'per_page', 10, 100)

  return {
    page,
    perPage,
    skip: (page - 1) * perPage,
  }
}

function paginationMeta(total, page, perPage) {
  const lastPage = Math.max(1, Math.ceil(total / perPage))

  return {
    current_page: page,
    last_page: lastPage,
    per_page: perPage,
    total,
    from: total === 0 ? null : (page - 1) * perPage + 1,
    to: total === 0 ? null : Math.min(page * perPage, total),
  }
}

function baseUrl(req) {
  const url = new URL(req.originalUrl, `${req.protocol}://${req.get('host')}`)
  url.search = ''
  return url.toString()
}

export function paginatedResponse(req, data, total, page, perPage) {
  const meta = paginationMeta(total, page, perPage)
  const link = (targetPage) => `${baseUrl(req)}?page=${targetPage}&per_page=${perPage}`

  return {
    data,
    links: {
      first: link(1),
      last: link(meta.last_page),
      prev: page > 1 ? link(page - 1) : null,
      next: page < meta.last_page ? link(page + 1) : null,
    },
    meta,
  }
}

/**
 * Aggregation endpoints paginate inside the pipeline, so they return the same
 * data/meta envelope without resource links.
 */
export function aggregateResponse(data, total, page, perPage) {
  return {
    data,
    meta: paginationMeta(total, page, perPage),
  }
}
