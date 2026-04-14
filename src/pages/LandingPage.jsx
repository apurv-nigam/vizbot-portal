import { useAuth0 } from "@auth0/auth0-react";
import { ArrowRight } from "lucide-react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";

const ASSET_TYPES = [
  { emoji: "\u{1F4F7}", title: "Image", desc: "Bounding boxes, polygons, segmentation masks, and keypoint annotations.", color: "var(--color-accent)", bg: "var(--color-accent-light)" },
  { emoji: "\u{1F3AC}", title: "Video", desc: "Frame-by-frame and temporal annotation with object tracking.", color: "#2563EB", bg: "#EFF6FF" },
  { emoji: "\u{1F9CA}", title: "Point Cloud", desc: "3D cuboid annotations for LiDAR and depth sensor data.", color: "#0D9488", bg: "#E6F7F5" },
];

export default function LandingPage() {
  const { loginWithRedirect } = useAuth0();

  const handleSignup = () =>
    loginWithRedirect({ authorizationParams: { screen_hint: "signup" } });

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      <Header />

      <section className="max-w-[720px] mx-auto px-6 pt-[164px] pb-20 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent-light mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-accent" />
          <span className="text-md font-semibold text-accent">
            Now supporting image, video & point cloud
          </span>
        </div>

        <h1 className="text-[52px] font-extrabold text-text-primary tracking-[-1.5px] leading-[1.12]">
          Annotate data to
          <br />
          <span className="text-accent">train better models</span>
        </h1>

        <p className="text-2xl text-text-secondary mt-6 max-w-[520px] mx-auto leading-[1.6]">
          Label images, videos, and point clouds collaboratively.
          Built for production ML workflows.
        </p>

        <div className="flex items-center justify-center gap-3 mt-10">
          <Button size="lg" onClick={handleSignup} className="gap-2 group">
            Start Annotating — Free
            <ArrowRight size={15} className="transition-transform duration-200 group-hover:translate-x-0.5" />
          </Button>
          <Button variant="secondary" size="lg" asChild>
            <a href="#features">Watch Demo</a>
          </Button>
        </div>
      </section>

      {/* Asset type cards */}
      <section id="features" className="max-w-[720px] mx-auto px-6 pb-28">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {ASSET_TYPES.map((t) => (
            <div
              key={t.title}
              className="bg-white rounded-xl border border-border p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)] hover:shadow-[0_10px_32px_rgba(0,0,0,0.07),0_2px_8px_rgba(0,0,0,0.03)] hover:-translate-y-[2px] transition-all duration-[250ms] ease-[cubic-bezier(0.25,0.1,0.25,1)] cursor-pointer"
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                style={{ background: t.bg }}
              >
                <span className="text-2xl">{t.emoji}</span>
              </div>
              <h3 className="text-xl font-[620] text-text-primary mb-1.5 tracking-[-0.15px]">{t.title}</h3>
              <p className="text-md text-text-muted leading-relaxed">{t.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
