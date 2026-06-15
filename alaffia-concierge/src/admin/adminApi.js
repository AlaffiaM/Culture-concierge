import { auth } from '../firebase'

const API_BASE = import.meta.env.VITE_API_URL || ''

export async function adminFetch(url, options = {}) {
  if (!auth.currentUser) {
    throw new Error('Not signed in. Please log in again.')
  }
  const token = await auth.currentUser.getIdToken(false)
  const res = await fetch(API_BASE + url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.message || `Admin API error: ${res.status}`)
  }
  return res.json()
}
