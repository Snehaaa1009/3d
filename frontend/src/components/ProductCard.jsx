import { useState } from 'react'
import { Link } from 'react-router-dom'
import { resolveAssetUrl } from '../api/client.js'

// Bundled in Vite `public/` — works even if the API is down and third-party CDNs are blocked
const localFallback = '/placeholder-3d.svg'

/**
 * Gallery tile: thumbnail, category pill, and short blurb. Links into the 3D viewer page.
 * Remote placeholder hosts (e.g. placehold.co) are often blocked by ad blockers, so we prefer
 * API-served or local static assets, with onError to the local SVG.
 */
export function ProductCard({ product }) {
  const [imgFailed, setImgFailed] = useState(false)
  const fromApi = product.thumbnail_url && !imgFailed
  const thumb = fromApi ? resolveAssetUrl(product.thumbnail_url) : localFallback
  return (
    <Link
      to={`/product/${product.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 shadow transition hover:-translate-y-0.5 hover:border-slate-700"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-800">
        <img
          src={thumb}
          alt=""
          onError={() => setImgFailed(true)}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
          loading="lazy"
        />
        <span className="absolute right-2 top-2 rounded-full bg-slate-950/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-200">
          {product.category}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="text-base font-semibold text-white group-hover:text-indigo-200">
          {product.name}
        </h3>
        <p className="line-clamp-2 text-sm text-slate-400">{product.description}</p>
      </div>
    </Link>
  )
}
