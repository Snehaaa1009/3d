import axios from 'axios'

// Point the SPA at the FastAPI process (override with Vite env in production)
const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'
const AUTH_TOKEN_KEY = 'ipp_auth_token'
const AUTH_USER_KEY = 'ipp_auth_user'

// Do not set a global Content-Type so FormData posts get the correct multipart boundary.
export const api = axios.create({
  baseURL,
  timeout: 60_000,
})

api.interceptors.request.use((config) => {
  const token = window.localStorage.getItem(AUTH_TOKEN_KEY)
  if (token) {
    config.headers = config.headers || {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export function saveAuthSession(accessToken, username) {
  window.localStorage.setItem(AUTH_TOKEN_KEY, accessToken)
  window.localStorage.setItem(AUTH_USER_KEY, username)
}

export function clearAuthSession() {
  window.localStorage.removeItem(AUTH_TOKEN_KEY)
  window.localStorage.removeItem(AUTH_USER_KEY)
}

export function getAuthUser() {
  return window.localStorage.getItem(AUTH_USER_KEY) || ''
}

/**
 * Turns a model_url from the API into something Three.js can fetch.
 * Relative /uploads/... paths are joined with the API origin.
 */
export function resolveAssetUrl(url) {
  if (!url) return url
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }
  if (url.startsWith('/')) {
    return `${baseURL}${url}`
  }
  return `${baseURL}/${url}`
}
