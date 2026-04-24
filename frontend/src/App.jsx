import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout.jsx'
import { Gallery } from './pages/Gallery.jsx'
import { ProductDetail } from './pages/ProductDetail.jsx'
import { Upload } from './pages/Upload.jsx'
import { About } from './pages/About.jsx'

/**
 * Top-level routing and shared layout (nav + footer).
 */
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Gallery />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/about" element={<About />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
