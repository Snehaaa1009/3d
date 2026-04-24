import { Suspense, useLayoutEffect, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Center, Environment, OrbitControls, useGLTF } from '@react-three/drei'
import * as THREE from 'three'

import { ViewerErrorBoundary } from './ViewerErrorBoundary.jsx'

const MATERIAL_PRESETS = {
  matte: { roughness: 1, metalness: 0.04 },
  glossy: { roughness: 0.14, metalness: 0.2 },
  metallic: { roughness: 0.32, metalness: 0.9 },
}

function LoadedModel({ url, color, material, onFirstFrame, controlsRef }) {
  const { scene } = useGLTF(url)
  const { camera } = useThree()
  const reported = useRef(false)

  useLayoutEffect(() => {
    const tint = new THREE.Color(color)
    const preset = MATERIAL_PRESETS[material] || MATERIAL_PRESETS.matte
    scene.traverse((obj) => {
      if (!obj.isMesh) return
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
      for (const mat of mats) {
        if (mat && (mat.isMeshStandardMaterial || mat.isMeshPhysicalMaterial)) {
          mat.color.copy(tint)
          mat.roughness = preset.roughness
          mat.metalness = preset.metalness
          mat.needsUpdate = true
        }
      }
    })
  }, [scene, color, material])

  useLayoutEffect(() => {
    const box = new THREE.Box3().setFromObject(scene)
    if (box.isEmpty()) return
    const center = box.getCenter(new THREE.Vector3())
    const size = box.getSize(new THREE.Vector3())
    const radius = Math.max(size.x, size.y, size.z) * 0.5
    const distance = Math.max(2.2, radius * 2.4)
    camera.position.set(center.x + distance, center.y + distance * 0.65, center.z + distance)
    camera.lookAt(center)
    camera.updateProjectionMatrix()
    if (controlsRef.current) {
      controlsRef.current.target.copy(center)
      controlsRef.current.update()
    }
  }, [camera, scene, url, controlsRef])

  useFrame(() => {
    if (!reported.current) {
      reported.current = true
      onFirstFrame?.()
    }
  })

  return (
    <Center>
      <primitive object={scene} />
    </Center>
  )
}

/**
 * WebGL + glTF view: PBR environment, orbit controls, and real-time color/material updates.
 * Loading overlay is owned by the parent; we clear it after the first rendered frame of the model.
 */
export function ProductModelScene({
  modelUrl,
  color,
  material,
  loading,
  setLoading,
  controlsRef,
  showGrid,
  envPreset,
}) {
  return (
    <ViewerErrorBoundary
      onError={() => {
        setLoading(false)
      }}
    >
      <div className="relative h-full min-h-[360px] w-full overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/80">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/60 text-sm text-slate-200">
            Loading 3D model…
          </div>
        )}
        <Canvas
          camera={{ position: [2.2, 1.6, 2.2], fov: 45 }}
          gl={{ antialias: true, alpha: false }}
          dpr={[1, 2]}
        >
          <color attach="background" args={['#0a0f1a']} />
          <ambientLight intensity={0.45} />
          <directionalLight position={[3, 4, 2]} intensity={1.1} />
          <Suspense fallback={null}>
            <LoadedModel
              url={modelUrl}
              color={color}
              material={material}
              onFirstFrame={() => setLoading(false)}
              controlsRef={controlsRef}
            />
          </Suspense>
          {showGrid && <gridHelper args={[10, 10, '#334155', '#1e293b']} />}
          <Environment preset={envPreset || 'city'} />
          <OrbitControls
            ref={controlsRef}
            makeDefault
            minDistance={0.4}
            maxDistance={20}
            enableDamping
            dampingFactor={0.08}
          />
        </Canvas>
      </div>
    </ViewerErrorBoundary>
  )
}
