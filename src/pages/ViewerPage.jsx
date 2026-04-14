import { useState, useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/api";
import { Button } from "@/components/ui/button";
import ViewerShell from "@/components/viewers/ViewerShell";

export default function ViewerPage() {
  const { getAccessTokenSilently } = useAuth0();
  const navigate = useNavigate();
  const { id } = useParams();

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const token = await getAccessTokenSilently();
        const data = await apiRequest(`/api/v1/workflows/${id}`, { token });
        if (!cancelled) setProject(data);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <Loader2 size={16} className="animate-spin text-text-muted" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-[#DC2626] mb-4">{error || "Workflow not found"}</p>
          <Button variant="secondary" onClick={() => navigate(`/workflows/${id}`)}>Back to Workflow</Button>
        </div>
      </div>
    );
  }

  // Extract viewer URLs from project's viewer_config or similar field
  const viewerConfig = project.viewer_config || {};
  const oriUrl = viewerConfig.ori_url || null;
  const pointCloudUrl = viewerConfig.point_cloud_url || null;
  const s3Config = viewerConfig.s3 || null;

  if (!oriUrl && !pointCloudUrl) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-text-secondary mb-4">No viewer data configured for this workflow.</p>
          <Button variant="secondary" onClick={() => navigate(`/workflows/${id}`)}>Back to Workflow</Button>
        </div>
      </div>
    );
  }

  return (
    <ViewerShell
      workflowName={project.name}
      workflowId={id}
      oriUrl={oriUrl}
      pointCloudUrl={pointCloudUrl}
      s3Config={s3Config}
    />
  );
}
