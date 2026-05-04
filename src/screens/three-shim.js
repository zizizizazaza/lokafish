// Pre-import shim for three. Anything that relies on `window.THREE` (notably
// the UMD build of three-render-objects bundled inside 3d-force-graph) needs
// the global to be populated *before* the dependent module is evaluated.
// This file's only job is that side effect — keep it imported first.
import * as THREE from 'three';
// Overwrite unconditionally: index.html loads an ancient three r128 CDN copy
// for the landing globe, which lacks `Timer` and breaks 3d-force-graph init.
// Modern three keeps the basic Scene/Camera/Geometry/Points API used by the
// landing globe, so swapping in r184 is safe for both consumers.
if (typeof window !== 'undefined') {
  window.THREE = THREE;
}
