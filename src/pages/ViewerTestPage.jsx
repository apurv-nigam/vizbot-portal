import ViewerShell from "@/components/viewers/ViewerShell";

/**
 * Temporary test page to verify viewers work with local data.
 * Access at /viewer-test
 * Remove this page once viewer_config is wired up via the API.
 */
export default function ViewerTestPage() {
  return (
    <ViewerShell
      workflowName="Test Workflow"
      workflowId="test"
      oriUrl="/projects/1/ori"
      pointCloudUrl="/projects/1/potree/metadata.json"
    />
  );
}
