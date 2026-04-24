import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { createProductWithUpload } from '../api/products.js'

/**
 * Multipart upload to POST /products — the API writes into ./uploads and returns a resolvable model URL.
 */
export function Upload() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [category, setCategory] = useState('General')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState(null)
  const [thumbnailFile, setThumbnailFile] = useState(null)
  const [thumbnailPreview, setThumbnailPreview] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [ok, setOk] = useState('')

  useEffect(() => {
    return () => {
      if (thumbnailPreview) {
        URL.revokeObjectURL(thumbnailPreview)
      }
    }
  }, [thumbnailPreview])

  const onSubmit = async (e) => {
    e.preventDefault()
    setErr('')
    setOk('')
    if (!file) {
      setErr('Select a .glb or .gltf file.')
      return
    }
    if (!name.trim() || !category.trim()) {
      setErr('Name and category are required.')
      return
    }
    const fd = new FormData()
    fd.append('name', name.trim())
    fd.append('category', category.trim())
    fd.append('description', description.trim())
    fd.append('file', file)
    if (thumbnailFile) {
      fd.append('thumbnail', thumbnailFile)
    }
    setBusy(true)
    try {
      const created = await createProductWithUpload(fd)
      setOk('Upload complete. Opening the 3D viewer…')
      navigate(`/product/${created.id}`)
    } catch (e) {
      setErr(
        e?.response?.data?.detail || e?.message || 'Upload failed. Is the API running on :8000?'
      )
    } finally {
      setBusy(false)
    }
  }

  const clearThumbnail = () => {
    if (thumbnailPreview) {
      URL.revokeObjectURL(thumbnailPreview)
    }
    setThumbnailFile(null)
    setThumbnailPreview('')
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Upload a product</h1>
        <p className="mt-1 text-sm text-slate-400">
          Store metadata in SQLite and the model file in the backend <code>uploads</code> folder.
        </p>
      </div>
      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/50 p-6"
      >
        <div>
          <label className="text-xs text-slate-500">Name</label>
          <input
            required
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs text-slate-500">Category</label>
          <input
            required
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs text-slate-500">Description</label>
          <textarea
            rows={3}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs text-slate-500">Model file</label>
          <input
            type="file"
            accept=".glb,.gltf"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="mt-1 block w-full text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-slate-500">Thumbnail image (optional)</label>
          <input
            type="file"
            accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
            onChange={(e) => {
              const next = e.target.files?.[0] || null
              setThumbnailFile(next)
              if (thumbnailPreview) {
                URL.revokeObjectURL(thumbnailPreview)
              }
              if (next) {
                setThumbnailPreview(URL.createObjectURL(next))
              } else {
                setThumbnailPreview('')
              }
            }}
            className="mt-1 block w-full text-sm"
          />
          {thumbnailFile && (
            <div className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2">
              <p className="truncate text-xs text-slate-400">{thumbnailFile.name}</p>
              <button
                type="button"
                onClick={clearThumbnail}
                className="rounded-md border border-rose-700 px-2 py-1 text-xs text-rose-200 hover:bg-rose-950/40"
              >
                Remove image
              </button>
            </div>
          )}
          {thumbnailPreview && (
            <div className="mt-3 overflow-hidden rounded-xl border border-slate-700 bg-slate-950">
              <p className="px-3 py-2 text-xs text-slate-400">Preview</p>
              <img
                src={thumbnailPreview}
                alt="Thumbnail preview"
                className="h-40 w-full object-cover"
              />
            </div>
          )}
        </div>
        {err && (
          <p className="text-sm text-rose-200">{String(err)}</p>
        )}
        {ok && <p className="text-sm text-emerald-200">{ok}</p>}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy ? 'Uploading…' : 'Save product'}
          </button>
          <Link
            to="/"
            className="inline-flex items-center rounded-lg border border-slate-600 px-4 py-2 text-sm"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
