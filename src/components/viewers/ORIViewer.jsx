import { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "@geoman-io/leaflet-geoman-free";
import "@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css";
import { Loader2, AlertCircle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

const FALLBACK_TILE =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

/**
 * ORIViewer — Leaflet-based orthographic imagery viewer with annotation tools.
 *
 * @param {string} dataUrl    - Base URL to the ORI tile directory (contains metadata.json, tiles/, lowres.png)
 * @param {object} [s3Config] - Optional S3 tile config { url, tileFormat, tms }
 * @param {string} [className]
 */
export default function ORIViewer({ dataUrl, s3Config, className }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const destroyMap = useCallback(() => {
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!dataUrl || !containerRef.current) {
      setError("Missing data URL for ORI viewer");
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function init() {
      try {
        // Fetch metadata
        const res = await fetch(`${dataUrl}/metadata.json`);
        if (!res.ok) throw new Error(`Failed to load metadata (${res.status})`);
        const meta = await res.json();

        if (cancelled) return;
        if (!meta.center) throw new Error("Metadata missing center coordinates");

        // Clean up previous instance
        destroyMap();

        const map = L.map(containerRef.current, {
          center: meta.center,
          zoom: meta.defaultZoom || 14,
          maxZoom: meta.maxZoom || 22,
          minZoom: meta.minZoom || 10,
          zoomControl: true,
        });

        // OSM base layer
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "&copy; OpenStreetMap contributors",
        }).addTo(map);

        // ORI tile layer
        const tileOpts = {
          maxZoom: meta.maxZoom || 22,
          minZoom: meta.minZoom || 10,
          tileSize: 256,
        };

        if (s3Config?.url) {
          // S3 tiles with TMS Y-flip
          const S3Layer = L.TileLayer.extend({
            createTile(coords, done) {
              const tile = document.createElement("img");
              tile.crossOrigin = "anonymous";
              const y = Math.pow(2, coords.z) - coords.y - 1;
              const url = `${s3Config.url}${(s3Config.tileFormat || "/{z}/{x}/{y}.png")
                .replace("{z}", coords.z)
                .replace("{x}", coords.x)
                .replace("{y}", y)}`;
              tile.onerror = () => { tile.src = FALLBACK_TILE; done(null, tile); };
              tile.onload = () => done(null, tile);
              tile.src = url;
              return tile;
            },
          });
          new S3Layer("", { ...tileOpts, crossOrigin: "anonymous" }).addTo(map);
        } else {
          L.tileLayer(`${dataUrl}/tiles/{z}/{x}/{y}.png`, {
            ...tileOpts,
            tms: true,
            errorTileUrl: FALLBACK_TILE,
          }).addTo(map);
        }

        // Low-res overlay at low zoom levels
        const bounds = meta.bounds;
        if (bounds?.length === 2) {
          const lowResUrl = s3Config?.url ? `${s3Config.url}/lowres.png` : `${dataUrl}/lowres.png`;
          const overlay = L.imageOverlay(lowResUrl, bounds, {
            opacity: 0.7,
            interactive: false,
            crossOrigin: "anonymous",
          });

          const minZoom = meta.minZoom || 10;
          map.on("zoomend", () => {
            if (map.getZoom() < minZoom) {
              if (!map.hasLayer(overlay)) overlay.addTo(map);
            } else {
              if (map.hasLayer(overlay)) map.removeLayer(overlay);
            }
          });
          if (map.getZoom() < minZoom) overlay.addTo(map);
        }

        // Annotation tools
        const drawnItems = new L.FeatureGroup();
        map.addLayer(drawnItems);
        map.pm.addControls({
          position: "topright",
          drawMarker: true,
          drawCircleMarker: false,
          drawPolyline: true,
          drawRectangle: true,
          drawPolygon: true,
          drawCircle: false,
          editMode: true,
          dragMode: true,
          cutPolygon: false,
          removalMode: true,
        });

        mapRef.current = map;

        // Ensure proper sizing after DOM settles
        requestAnimationFrame(() => map.invalidateSize(true));

        if (!cancelled) setLoading(false);
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      }
    }

    init();

    // Resize handler
    const onResize = () => mapRef.current?.invalidateSize(true);
    window.addEventListener("resize", onResize);

    return () => {
      cancelled = true;
      window.removeEventListener("resize", onResize);
      destroyMap();
    };
  }, [dataUrl, s3Config?.url]);

  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center h-full bg-canvas ${className || ""}`}>
        <div className="h-10 w-10 rounded-full bg-[#FEF2F2] flex items-center justify-center mb-3">
          <AlertCircle size={18} className="text-[#DC2626]" />
        </div>
        <p className="text-lg text-text-secondary mb-4 text-center max-w-xs">{error}</p>
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
      <div ref={containerRef} className="absolute inset-0 z-0" />
      {loading && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/80">
          <Loader2 size={20} className="animate-spin text-accent mb-2" />
          <p className="text-md font-medium text-text-muted">Loading map...</p>
        </div>
      )}
    </div>
  );
}
