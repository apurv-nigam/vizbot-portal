import { useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/api";
import AppShell from "@/components/ProjectShell";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const ASSET_TYPES = [
  { value: "image", emoji: "\u{1F4F7}", label: "Image", color: "var(--color-accent)", bg: "var(--color-accent-light)" },
  { value: "video", emoji: "\u{1F3AC}", label: "Video", color: "#2563EB", bg: "#EFF6FF" },
  { value: "point_cloud", emoji: "\u{1F9CA}", label: "Point Cloud", color: "#0D9488", bg: "#E6F7F5" },
  { value: "geospatial", emoji: "\u{1F30D}", label: "Geospatial", color: "#D97706", bg: "#FFFBEB" },
];

export default function CreateWorkflowPage() {
  const { getAccessTokenSilently } = useAuth0();
  const navigate = useNavigate();
  const { id: projectId } = useParams();
  const basePath = projectId ? `/projects/${projectId}` : "";

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [assetType, setAssetType] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function handleCreate() {
    if (!name.trim() || !assetType) return;
    setSaving(true);
    setError(null);
    try {
      const token = await getAccessTokenSilently();
      const body = { name: name.trim(), description: description.trim() || null, asset_type: assetType };
      if (projectId) body.project_id = projectId;
      const workflow = await apiRequest("/api/v1/workflows", { token, method: "POST", body });
      navigate(`${basePath}/workflows/${workflow.id}/builder`, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell>
      <div className="max-w-[560px] mx-auto">
        <button
          onClick={() => navigate(`${basePath}/workflows`)}
          className="flex items-center gap-1.5 text-[13px] font-medium text-text-muted hover:text-text-secondary transition-colors duration-200 cursor-pointer mb-6"
        >
          <ArrowLeft size={14} />
          Back to Dashboard
        </button>

        <h1 className="text-[24px] font-bold text-text-primary tracking-[-0.3px] mb-1">Create Workflow</h1>
        <p className="text-[14px] text-text-muted mb-6">Set up a new workflow template for your team.</p>

        <Card>
          <CardContent className="p-6 space-y-5">
            <div>
              <label className="block text-[13px] font-semibold text-text-secondary mb-1.5">Workflow name *</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. House Inspection"
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
            </div>

            <div>
              <label className="block text-[13px] font-semibold text-text-secondary mb-1.5">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this workflow for?"
                rows={3}
                className="flex w-full rounded-lg border-[1.5px] border-border bg-white px-3.5 py-2.5 text-[14px] text-text-primary placeholder:text-text-disabled transition-all duration-200 focus:border-accent focus:outline-none focus:shadow-[0_0_0_3px_var(--color-accent-light)] resize-none"
              />
            </div>

            <div>
              <label className="block text-[13px] font-semibold text-text-secondary mb-2">Asset type *</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {ASSET_TYPES.map((t) => {
                  const sel = assetType === t.value;
                  return (
                    <button
                      key={t.value}
                      onClick={() => setAssetType(t.value)}
                      className={`flex flex-col items-center gap-2.5 rounded-xl p-4 cursor-pointer border-2 transition-all duration-200 ${
                        sel
                          ? "border-accent bg-accent-light"
                          : "bg-white border-border hover:border-border-hover"
                      }`}
                    >
                      <span className="text-xl">{t.emoji}</span>
                      <span className={`font-semibold text-[13px] ${sel ? "text-accent" : "text-text-secondary"}`}>
                        {t.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {error && <p className="text-[12px] text-[#DC2626]">{error}</p>}

            <Button
              onClick={handleCreate}
              disabled={saving || !name.trim() || !assetType}
              className="w-full"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : "Create Workflow"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
