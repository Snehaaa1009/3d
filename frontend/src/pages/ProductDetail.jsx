import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ProductModelScene } from '../components/ProductModelScene.jsx'
import {
  deleteProduct,
  fetchProduct,
  listConfigurations,
  saveConfiguration,
  updateProduct,
} from '../api/products.js'

const MATERIALS = [
  { id: 'matte', label: 'Matte' },
  { id: 'glossy', label: 'Glossy' },
  { id: 'metallic', label: 'Metallic' },
]
const DEFAULT_CAMERA_POS = [2.2, 1.6, 2.2]
const ENV_PRESETS = ['city', 'studio', 'warehouse', 'sunset', 'night']

/**
 * 3D viewer + customization. Color/material live in React state; optional persist to the API.
 */
export function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const controlsRef = useRef(null)
  const [product, setProduct] = useState(null)
  const [err, setErr] = useState('')
  const [loadModel, setLoadModel] = useState(true)
  const [color, setColor] = useState('#6d5dfc')
  const [material, setMaterial] = useState('matte')
  const [showGrid, setShowGrid] = useState(false)
  const [envPreset, setEnvPreset] = useState('city')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [editingMeta, setEditingMeta] = useState(false)
  const [metaSaving, setMetaSaving] = useState(false)
  const [configMsg, setConfigMsg] = useState('')
  const [metaForm, setMetaForm] = useState({ name: '', category: '', description: '' })

  useEffect(() => {
    if (!id) return
    let cancelled = false
    const load = async () => {
      setProduct(null)
      setErr('')
      setLoadModel(true)
      try {
        const p = await fetchProduct(id)
        if (!cancelled) {
          setProduct(p)
          setLoadModel(true)
          setMetaForm({
            name: p.name || '',
            category: p.category || '',
            description: p.description || '',
          })
        }
      } catch (e) {
        if (!cancelled) {
          setErr(
            e?.response?.data?.detail ||
              e?.message ||
              'Could not load this product. Check that the API is running.'
          )
        }
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [id])

  const handleSave = async () => {
    if (!product) return
    setSaving(true)
    setConfigMsg('')
    try {
      await saveConfiguration(product.id, { color, material })
      const history = await listConfigurations(product.id)
      setConfigMsg(
        `Saved. ${history.length} configuration${history.length === 1 ? '' : 's'} on file.`
      )
    } catch (e) {
      setConfigMsg(
        e?.response?.data?.detail || e?.message || 'Could not save configuration.'
      )
    } finally {
      setSaving(false)
    }
  }

  const handleResetView = () => {
    const controls = controlsRef.current
    if (!controls?.object) return

    // Hard reset for all models: camera position + look target + zoom.
    controls.target.set(0, 0, 0)
    controls.object.position.set(...DEFAULT_CAMERA_POS)
    if (typeof controls.object.zoom === 'number') {
      controls.object.zoom = 1
      controls.object.updateProjectionMatrix?.()
    }
    controls.update()
  }

  const handleDelete = async () => {
    if (!product || deleting) return
    const ok = window.confirm(
      `Delete "${product.name}"? This removes the product and saved configurations.`
    )
    if (!ok) return
    setDeleting(true)
    setConfigMsg('')
    try {
      await deleteProduct(product.id)
      navigate('/')
    } catch (e) {
      setConfigMsg(e?.response?.data?.detail || e?.message || 'Could not delete product.')
    } finally {
      setDeleting(false)
    }
  }

  const handleSaveMeta = async () => {
    if (!product) return
    setMetaSaving(true)
    setConfigMsg('')
    try {
      const updated = await updateProduct(product.id, {
        name: metaForm.name.trim(),
        category: metaForm.category.trim(),
        description: metaForm.description.trim(),
      })
      setProduct(updated)
      setEditingMeta(false)
      setConfigMsg('Product details updated')
    } catch (e) {
      setConfigMsg(e?.response?.data?.detail || e?.message || 'Could not update product details.')
    } finally {
      setMetaSaving(false)
    }
  }

  if (err) {
    return (
      <div>
        <p className="text-rose-200">{err}</p>
        <Link to="/" className="mt-4 inline-block text-sm text-indigo-300">
          ← Back to gallery
        </Link>
      </div>
    )
  }

  if (!product) {
    return <p className="text-slate-400">Loading product…</p>
  }

  return (
    <div className="space-y-6">
      <div>
        <Link to="/" className="text-sm text-indigo-300 hover:underline">
          ← Gallery
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">{product.name}</h1>
        <p className="text-sm text-slate-500">
          {product.category} · owner: {product.owner}
        </p>
        <p className="mt-2 text-sm text-slate-300">{product.description}</p>
        <button
          type="button"
          onClick={() => setEditingMeta((v) => !v)}
          className="mt-3 rounded-lg border border-slate-600 px-3 py-1 text-xs text-slate-200 hover:bg-slate-800"
        >
          {editingMeta ? 'Cancel edit' : 'Edit details'}
        </button>
        {editingMeta && (
          <div className="mt-3 grid gap-2 rounded-xl border border-slate-800 bg-slate-900/50 p-3">
            <input
              value={metaForm.name}
              onChange={(e) => setMetaForm((m) => ({ ...m, name: e.target.value }))}
              className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm"
              placeholder="Name"
            />
            <input
              value={metaForm.category}
              onChange={(e) => setMetaForm((m) => ({ ...m, category: e.target.value }))}
              className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm"
              placeholder="Category"
            />
            <textarea
              rows={3}
              value={metaForm.description}
              onChange={(e) => setMetaForm((m) => ({ ...m, description: e.target.value }))}
              className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm"
              placeholder="Description"
            />
            <div>
              <button
                type="button"
                onClick={handleSaveMeta}
                disabled={metaSaving}
                className="rounded-lg bg-indigo-600 px-3 py-1 text-xs text-white disabled:opacity-50"
              >
                {metaSaving ? 'Saving…' : 'Save details'}
              </button>
            </div>
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr,0.9fr]">
        <ProductModelScene
          key={product.model_url}
          modelUrl={product.model_url}
          color={color}
          material={material}
          loading={loadModel}
          setLoading={setLoadModel}
          controlsRef={controlsRef}
          showGrid={showGrid}
          envPreset={envPreset}
        />
        <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
          <h2 className="text-sm font-semibold text-white">Customize</h2>
          <div>
            <label className="text-xs text-slate-500">Color</label>
            <div className="mt-1 flex items-center gap-3">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-10 w-14 cursor-pointer rounded border border-slate-700 bg-slate-950"
              />
              <code className="text-xs text-slate-300">{color}</code>
            </div>
          </div>
          <div>
            <p className="text-xs text-slate-500">Material</p>
            <div className="mt-1 flex flex-wrap gap-2">
              {MATERIALS.map((m) => (
                <button
                  type="button"
                  key={m.id}
                  onClick={() => setMaterial(m.id)}
                  className={[
                    'rounded-lg px-3 py-1.5 text-xs font-medium',
                    material === m.id
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-800 text-slate-200 hover:bg-slate-700',
                  ].join(' ')}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-slate-500">Scene options</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <label className="inline-flex items-center gap-2 text-xs text-slate-200">
                <input
                  type="checkbox"
                  checked={showGrid}
                  onChange={(e) => setShowGrid(e.target.checked)}
                />
                Grid
              </label>
              <select
                value={envPreset}
                onChange={(e) => setEnvPreset(e.target.value)}
                className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
              >
                {ENV_PRESETS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save configuration'}
            </button>
            <button
              type="button"
              onClick={handleResetView}
              className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-100 hover:bg-slate-800"
            >
              Reset camera
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-lg border border-rose-700 px-4 py-2 text-sm text-rose-200 hover:bg-rose-950/40 disabled:opacity-50"
            >
              {deleting ? 'Deleting…' : 'Delete product'}
            </button>
          </div>
          {configMsg && <p className="text-xs text-slate-400">{configMsg}</p>}
          <p className="text-xs text-slate-500">
            Customization is applied in real time. Saving writes a new row in SQLite and keeps the
            session state you see here in React.
          </p>
        </div>
      </div>
    </div>
  )
}
