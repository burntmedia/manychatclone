// Lightweight API client. Point VITE_API_URL to your Express backend (e.g.
// http://localhost:3000) and the helpers below will use that base URL.
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://bot.burnt.media'

function toQuery(params = {}) {
  const query = new URLSearchParams(params)
  const qs = query.toString()
  return qs ? `?${qs}` : ''
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || 'Request failed')
  }

  // Some endpoints might return empty responses
  const text = await response.text()
  try {
    return text ? JSON.parse(text) : null
  } catch (error) {
    console.warn('Unable to parse JSON response', error)
    return null
  }
}

export const api = {
  fetchPosts: (params, options) => request(`/posts${toQuery(params)}`, options),
  fetchAutomations: (options) => request('/automations', options),
  fetchKeywords: (options) => request('/keywords', options),
  fetchLogs: (options) => request('/logs', options),
  fetchHealth: (options) => request('/health', options),
  createAutomation: (payload) =>
    request('/automations', { method: 'POST', body: JSON.stringify(payload) }),
  addKeyword: (payload) =>
    request('/keywords', { method: 'POST', body: JSON.stringify(payload) }),
  removeKeyword: (keyword) => request(`/keywords/${keyword}`, { method: 'DELETE' }),
  saveSettings: (payload) => request('/settings', { method: 'POST', body: JSON.stringify(payload) }),
}
