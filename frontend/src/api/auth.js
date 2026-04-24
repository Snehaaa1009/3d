import { api, saveAuthSession } from './client'

export async function loginAs(username) {
  const { data } = await api.post('/auth/login', { username })
  saveAuthSession(data.access_token, data.username)
  return data
}
