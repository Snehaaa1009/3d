import { useEffect, useMemo, useState } from 'react'
import { ProductCard } from '../components/ProductCard.jsx'
import { fetchProducts } from '../api/products.js'

/**
 * Home: searchable grid of products backed by the FastAPI catalog.
 */
export function Gallery() {
  const [q, setQ] = useState('')
  const [category, setCategory] = useState('')
  const [sortBy, setSortBy] = useState('created_at')
  const [sortOrder, setSortOrder] = useState('desc')
  const [owner, setOwner] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 9
  const [items, setItems] = useState([])
  const [allItems, setAllItems] = useState([])
  const [total, setTotal] = useState(0)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  // Load once for the category dropdown so options stay complete even when searching.
  useEffect(() => {
    let cancelled = false
    fetchProducts({ limit: 100, offset: 0 })
      .then((data) => {
        if (!cancelled) setAllItems(data.items || [])
      })
      .catch(() => {
        /* ignore: main list will surface errors */
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const data = await fetchProducts({
          q: q || undefined,
          category: category || undefined,
          owner: owner || undefined,
          sort_by: sortBy,
          sort_order: sortOrder,
          limit: pageSize,
          offset: (page - 1) * pageSize,
        })
        if (!cancelled) {
          setItems(data.items || [])
          setTotal(data.total || 0)
        }
      } catch (e) {
        if (!cancelled) {
          setError(
            e?.response?.data?.detail ||
              e?.message ||
              'Failed to load products. Is the API running?'
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [q, category, owner, sortBy, sortOrder, page])

  const categories = useMemo(() => {
    const set = new Set()
    for (const p of allItems) {
      if (p.category) set.add(p.category)
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [allItems])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Product gallery</h1>
        <p className="mt-1 text-sm text-slate-400">
          Explore demo glTF products. Open any card to try the 3D viewer and material presets.
        </p>
      </div>
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/40 p-4 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="text-xs font-medium uppercase text-slate-500">Search</label>
          <input
            value={q}
            onChange={(e) => {
              setPage(1)
              setQ(e.target.value)
            }}
            placeholder="Name, description, or category"
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600"
          />
        </div>
        <div className="w-full sm:w-56">
          <label className="text-xs font-medium uppercase text-slate-500">Category</label>
          <select
            value={category}
            onChange={(e) => {
              setPage(1)
              setCategory(e.target.value)
            }}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="w-full sm:w-56">
          <label className="text-xs font-medium uppercase text-slate-500">Owner</label>
          <input
            value={owner}
            onChange={(e) => {
              setPage(1)
              setOwner(e.target.value)
            }}
            placeholder="filter by owner"
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          />
        </div>
        <div className="w-full sm:w-56">
          <label className="text-xs font-medium uppercase text-slate-500">Sort</label>
          <select
            value={`${sortBy}:${sortOrder}`}
            onChange={(e) => {
              const [nextBy, nextOrder] = e.target.value.split(':')
              setPage(1)
              setSortBy(nextBy)
              setSortOrder(nextOrder)
            }}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          >
            <option value="created_at:desc">Newest</option>
            <option value="created_at:asc">Oldest</option>
            <option value="name:asc">Name (A-Z)</option>
            <option value="name:desc">Name (Z-A)</option>
          </select>
        </div>
      </div>
      {error && (
        <p className="rounded-lg border border-rose-900/50 bg-rose-950/40 px-3 py-2 text-sm text-rose-200">
          {String(error)}
        </p>
      )}
      {loading && <p className="text-sm text-slate-400">Loading products…</p>}
      {!loading && !error && items.length === 0 && (
        <p className="text-sm text-slate-400">No products match your filters yet.</p>
      )}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
      <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3 text-sm text-slate-300">
        <span>
          Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} of {total}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded border border-slate-700 px-3 py-1 disabled:opacity-40"
          >
            Prev
          </button>
          <button
            type="button"
            onClick={() => setPage((p) => (p * pageSize < total ? p + 1 : p))}
            disabled={page * pageSize >= total}
            className="rounded border border-slate-700 px-3 py-1 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}
