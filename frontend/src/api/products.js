import { api, resolveAssetUrl } from './client'

/**
 * @param {{ q?: string, category?: string }} params
 */
export async function fetchProducts(params = {}) {
  const { data } = await api.get('/products', { params })
  return data
}

export async function fetchProduct(id) {
  const { data } = await api.get(`/products/${id}`)
  return {
    ...data,
    model_url: resolveAssetUrl(data.model_url),
    thumbnail_url: resolveAssetUrl(data.thumbnail_url),
  }
}

/**
 * @param {FormData} formData
 */
export async function createProductWithUpload(formData) {
  const { data } = await api.post('/products', formData)
  return {
    ...data,
    model_url: resolveAssetUrl(data.model_url),
    thumbnail_url: resolveAssetUrl(data.thumbnail_url),
  }
}

/**
 * @param {{ color: string, material: string }} body
 */
export async function saveConfiguration(productId, body) {
  const { data } = await api.post(`/products/${productId}/configurations`, body)
  return data
}

export async function listConfigurations(productId) {
  const { data } = await api.get(`/products/${productId}/configurations`)
  return data
}

export async function deleteProduct(productId) {
  await api.delete(`/products/${productId}`)
}

export async function updateProduct(productId, body) {
  const { data } = await api.put(`/products/${productId}`, body)
  return {
    ...data,
    model_url: resolveAssetUrl(data.model_url),
    thumbnail_url: resolveAssetUrl(data.thumbnail_url),
  }
}
