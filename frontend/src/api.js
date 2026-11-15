
const API_BASE_URL = 'http://localhost:8080/api'

export async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem('fixmateToken')

  const headers = new Headers(options.headers || {})

  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  })

  if (response.status === 401) {
    localStorage.removeItem('fixmateToken')
    localStorage.removeItem('fixmateUser')

    window.dispatchEvent(
      new Event('fixmate:auth-expired')
    )
  }

  return response
}
