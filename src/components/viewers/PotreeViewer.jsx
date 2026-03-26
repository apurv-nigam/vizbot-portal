import { useEffect, useRef, useState } from "react";
import { Loader2, AlertCircle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Dynamically load a script tag if not already loaded.
 * Returns a promise that resolves when the script is ready.
 */
function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

function loadCSS(href) {
  if (document.querySelector(`link[href="${href}"]`)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
}

/**
 * Load Potree and its dependencies dynamically.
 * Expects the Potree build and libs to be in /public/potree/
 */
const POTREE_BASE = "/potree";

async function loadPotreeDeps() {
  if (window.Potree) return; // Already loaded

  // CSS
  loadCSS(`${POTREE_BASE}/build/potree/potree.css`);
  loadCSS(`${POTREE_BASE}/libs/jquery-ui/jquery-ui.min.css`);
  loadCSS(`${POTREE_BASE}/libs/spectrum/spectrum.css`);
  loadCSS(`${POTREE_BASE}/libs/jstree/themes/mixed/style.css`);
  loadCSS(`${POTREE_BASE}/libs/Cesium/Widgets/CesiumWidget/CesiumWidget.css`);
  loadCSS(`${POTREE_BASE}/libs/openlayers3/ol.css`);

  // Scripts — order matters
  await loadScript(`${POTREE_BASE}/libs/jquery/jquery-3.1.1.min.js`);
  await loadScript(`${POTREE_BASE}/libs/spectrum/spectrum.js`);
  await loadScript(`${POTREE_BASE}/libs/jquery-ui/jquery-ui.min.js`);

  await Promise.all([
    loadScript(`${POTREE_BASE}/libs/other/BinaryHeap.js`),
    loadScript(`${POTREE_BASE}/libs/tween/tween.min.js`),
    loadScript(`${POTREE_BASE}/libs/d3/d3.js`),
    loadScript(`${POTREE_BASE}/libs/proj4/proj4.js`),
    loadScript(`${POTREE_BASE}/libs/i18next/i18next.js`),
    loadScript(`${POTREE_BASE}/libs/jstree/jstree.js`),
    loadScript(`${POTREE_BASE}/libs/openlayers3/ol.js`),
  ]);

  // THREE must load before Potree
  await loadScript(`${POTREE_BASE}/libs/three.js/build/three.min.js`);
  window.THREE = window.THREE || THREE;

  await loadScript(`${POTREE_BASE}/build/potree/potree.js`);

  await Promise.all([
    loadScript(`${POTREE_BASE}/libs/plasio/js/laslaz.js`),
    loadScript(`${POTREE_BASE}/libs/Cesium/Cesium.js`),
  ]);
}

/**
 * PotreeViewer — 3D point cloud viewer using Potree + Cesium.
 * Dynamically loads all dependencies on first render.
 *
 * @param {string} pointCloudUrl - URL to the Potree point cloud metadata
 * @param {string} [className]
 */
export default function PotreeViewer({ pointCloudUrl, className }) {
  const containerRef = useRef(null);
  const viewerRef = useRef(null);
  const cesiumRef = useRef(null);
  const rafRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!containerRef.current || !pointCloudUrl) {
      if (!pointCloudUrl) {
        setError("No point cloud URL provided.");
        setLoading(false);
      }
      return;
    }

    let cancelled = false;

    async function init() {
      try {
        // Load Potree dependencies dynamically
        await loadPotreeDeps();

        if (cancelled || !containerRef.current) return;

        if (!window.Potree) {
          throw new Error("Potree library failed to initialize.");
        }

        // Build Potree DOM structure
        containerRef.current.innerHTML = `
          <div id="potree_render_area" style="position:absolute;width:100%;height:100%;">
            <div id="cesiumContainer" style="position:absolute;inset:0;pointer-events:none;z-index:0;"></div>
          </div>
          <div id="potree_sidebar_container"></div>
        `;

        // Initialize Cesium
        const cesiumEl = containerRef.current.querySelector("#cesiumContainer");
        if (window.Cesium) {
          cesiumRef.current = new Cesium.Viewer(cesiumEl, {
            useDefaultRenderLoop: false,
            animation: false,
            baseLayerPicker: false,
            fullscreenButton: false,
            geocoder: false,
            homeButton: false,
            infoBox: false,
            sceneModePicker: false,
            selectionIndicator: false,
            timeline: false,
            navigationHelpButton: false,
            imageryProvider: Cesium.createOpenStreetMapImageryProvider({
              url: "https://a.tile.openstreetmap.org/",
            }),
            terrainShadows: Cesium.ShadowMode.DISABLED,
          });
        }

        // Initialize Potree
        const renderArea = containerRef.current.querySelector("#potree_render_area");
        const viewer = new window.Potree.Viewer(renderArea, {
          useDefaultRenderLoop: false,
        });
        viewerRef.current = viewer;

        viewer.setEDLEnabled(true);
        viewer.setFOV(60);
        viewer.setPointBudget(1_000_000);
        viewer.setClipTask(window.Potree.ClipTask.SHOW_INSIDE);

        viewer.loadGUI().then(() => {
          viewer.setLanguage("en");
          viewer.toggleSidebar();
        });

        // Load point cloud
        const result = await window.Potree.loadPointCloud(pointCloudUrl);
        if (cancelled) return;

        const pc = result.pointcloud;
        viewer.scene.addPointCloud(pc);
        pc.material.size = 1;
        pc.material.pointSizeType = Potree.PointSizeType.ADAPTIVE;
        viewer.fitToScreen();
        setLoading(false);

        // Unified render loop
        const loop = (timestamp) => {
          rafRef.current = requestAnimationFrame(loop);
          viewer.update(viewer.clock.getDelta(), timestamp);
          viewer.render();
          cesiumRef.current?.render();
        };
        rafRef.current = requestAnimationFrame(loop);
      } catch (err) {
        if (!cancelled) {
          setError(`Failed to load point cloud viewer: ${err.message || err}`);
          setLoading(false);
        }
      }
    }

    init();

    return () => {
      cancelled = true;

      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }

      try { viewerRef.current?.dispose?.(); } catch {}
      viewerRef.current = null;

      try { cesiumRef.current?.destroy(); } catch {}
      cesiumRef.current = null;

      if (containerRef.current) containerRef.current.innerHTML = "";
    };
  }, [pointCloudUrl]);

  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center h-full bg-[#1A1A1A] ${className || ""}`}>
        <div className="h-10 w-10 rounded-full bg-[#FEF2F2] flex items-center justify-center mb-3">
          <AlertCircle size={18} className="text-[#DC2626]" />
        </div>
        <p className="text-[14px] text-text-muted mb-4 text-center max-w-xs">{error}</p>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => { setError(null); setLoading(true); }}
          className="gap-1.5"
        >
          <RotateCw size={13} /> Retry
        </Button>
      </div>
    );
  }

  return (
    <div className={`relative w-full h-full ${className || ""}`}>
      <div
        ref={containerRef}
        className="potree_container absolute inset-0"
        style={{ backgroundColor: "#1a1a2e" }}
      />
      {loading && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/70">
          <Loader2 size={20} className="animate-spin text-white mb-2" />
          <p className="text-[13px] font-medium text-text-muted">Loading point cloud...</p>
        </div>
      )}
    </div>
  );
}
