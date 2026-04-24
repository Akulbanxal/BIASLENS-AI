const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
}

async function parseResponse(response) {
  const contentType = response.headers.get('content-type') || ''
  const isJson = contentType.includes('application/json')
  const payload = isJson ? await response.json() : await response.text()

  if (!response.ok) {
    const message = isJson
      ? payload?.details || payload?.error || `Request failed (${response.status})`
      : `Request failed (${response.status})`

    const error = new Error(message)
    error.status = response.status
    error.payload = payload
    throw error
  }

  return payload
}

export async function apiGet(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...DEFAULT_HEADERS,
      ...(options.headers || {}),
    },
  })

  return parseResponse(response)
}

export async function apiPost(url, body, options = {}) {
  const response = await fetch(url, {
    method: 'POST',
    ...options,
    headers: {
      ...DEFAULT_HEADERS,
      ...(options.headers || {}),
    },
    body: JSON.stringify(body),
  })

  return parseResponse(response)
}

export async function apiUpload(url, formData, options = {}) {
  const response = await fetch(url, {
    method: 'POST',
    ...options,
    body: formData,
  })

  return parseResponse(response)
}
