/**
 * Short narrative for interview / portfolio context.
 */
export function About() {
  return (
    <div className="prose prose-invert max-w-none space-y-4">
      <h1 className="text-2xl font-bold text-white">About this project</h1>
      <p className="text-slate-300">
        <strong>Interactive 3D Product Platform</strong> is a local full-stack sample that
        combines a Vite + React + Tailwind single-page app with a FastAPI + SQLite service. The
        goal is a realistic catalog workflow: list products, stream glTF/GLB assets in the
        browser, adjust PBR color and material presets, and persist those choices as first-class
        configuration records.
      </p>
      <h2 className="text-lg font-semibold text-white">Why it exists</h2>
      <p className="text-slate-300">
        It is meant to demonstrate how product metadata, large binary assets, and user-driven
        customization can work together in a small but interview-ready system — without
        overbuilding authentication.
      </p>
      <h2 className="text-lg font-semibold text-white">Stack in one line</h2>
      <p className="text-slate-300">
        React, React Three Fiber, Drei, Three.js on the client; FastAPI, SQLAlchemy, and SQLite on
        the server; file-backed storage for user uploads; JSON + multipart over HTTP; CORS enabled
        for the Vite dev host.
      </p>
    </div>
  )
}
