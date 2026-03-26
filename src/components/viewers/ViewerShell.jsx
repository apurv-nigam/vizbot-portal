import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Map, Box } from "lucide-react";
import ORIViewer from "./ORIViewer";
import PotreeViewer from "./PotreeViewer";

/**
 * ViewerShell — Full-screen viewer with 2D/3D toggle for geospatial projects.
 *
 * @param {string} workflowName
 * @param {string} workflowId
 * @param {string} [oriUrl]       - Base URL to ORI tile data
 * @param {string} [pointCloudUrl] - URL to Potree point cloud metadata
 * @param {object} [s3Config]     - S3 tile config for ORI
 */
export default function ViewerShell({ workflowName, workflowId, oriUrl, pointCloudUrl, s3Config }) {
  const navigate = useNavigate();
  const has2D = !!oriUrl;
  const has3D = !!pointCloudUrl;
  const [activeView, setActiveView] = useState(has2D ? "2d" : "3d");

  // Track which views have been mounted (lazy-load but keep alive)
  const [mounted, setMounted] = useState({ "2d": has2D, "3d": !has2D && has3D });

  function switchView(view) {
    setActiveView(view);
    setMounted((prev) => ({ ...prev, [view]: true }));
    // Trigger resize for Leaflet/Cesium
    requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
  }

  return (
    <div className="h-screen flex flex-col bg-[#1A1A1A]">
      {/* Top bar */}
      <header className="shrink-0 h-12 bg-white border-b border-border flex items-center px-4 gap-3 z-30">
        <button
          onClick={() => navigate(`/workflows/${workflowId}`)}
          className="flex items-center gap-1.5 text-[13px] font-medium text-text-muted hover:text-text-secondary transition-colors duration-200 cursor-pointer"
        >
          <ArrowLeft size={14} />
          <span className="hidden sm:inline">{workflowName || "Workflow"}</span>
        </button>

        <div className="flex-1" />

        {/* View toggle — only show if both views available */}
        {has2D && has3D && (
          <div className="flex items-center bg-canvas rounded-lg p-0.5">
            <button
              onClick={() => switchView("2d")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-semibold transition-all duration-200 cursor-pointer ${
                activeView === "2d"
                  ? "bg-white text-accent shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
                  : "text-text-muted hover:text-text-secondary"
              }`}
            >
              <Map size={13} /> 2D
            </button>
            <button
              onClick={() => switchView("3d")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-semibold transition-all duration-200 cursor-pointer ${
                activeView === "3d"
                  ? "bg-white text-accent shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
                  : "text-text-muted hover:text-text-secondary"
              }`}
            >
              <Box size={13} /> 3D
            </button>
          </div>
        )}
      </header>

      {/* Viewer area */}
      <div className="flex-1 relative overflow-hidden">
        {/* 2D ORI Layer */}
        {has2D && mounted["2d"] && (
          <div
            className="absolute inset-0 transition-opacity duration-200"
            style={{
              opacity: activeView === "2d" ? 1 : 0,
              pointerEvents: activeView === "2d" ? "auto" : "none",
              zIndex: activeView === "2d" ? 2 : 1,
            }}
          >
            <ORIViewer dataUrl={oriUrl} s3Config={s3Config} />
          </div>
        )}

        {/* 3D Point Cloud Layer */}
        {has3D && mounted["3d"] && (
          <div
            className="absolute inset-0 transition-opacity duration-200"
            style={{
              opacity: activeView === "3d" ? 1 : 0,
              pointerEvents: activeView === "3d" ? "auto" : "none",
              zIndex: activeView === "3d" ? 2 : 1,
            }}
          >
            <PotreeViewer pointCloudUrl={pointCloudUrl} />
          </div>
        )}
      </div>
    </div>
  );
}
