#!/bin/bash
set -euo pipefail

BUCKET="portal.vizbot.co"
DISTRIBUTION_ID="E2ZFV4CW9Y78CR"
AWS_PROFILE="personal"

# Ensure we're in the repo root
cd "$(dirname "$0")"

# Check for uncommitted changes
if git rev-parse --git-dir > /dev/null 2>&1; then
  if ! git diff-index --quiet HEAD -- 2>/dev/null; then
    echo "WARNING: You have uncommitted changes."
    read -p "Deploy anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      echo "Aborted."
      exit 1
    fi
  fi

  GIT_COMMIT=$(git rev-parse HEAD)
  GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
  GIT_SHORT=$(git rev-parse --short HEAD)
else
  GIT_COMMIT="no-git"
  GIT_BRANCH="no-git"
  GIT_SHORT="no-git"
fi

DEPLOY_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

echo "=== Deploying portal.vizbot.co ==="
echo "  Branch: $GIT_BRANCH"
echo "  Commit: $GIT_SHORT ($GIT_COMMIT)"
echo "  Time:   $DEPLOY_TIME"
echo ""

# Build
echo "Building..."
npm run build

# Write version.json into dist
cat > dist/version.json <<EOF
{
  "commit": "$GIT_COMMIT",
  "short": "$GIT_SHORT",
  "branch": "$GIT_BRANCH",
  "deployed_at": "$DEPLOY_TIME",
  "deployed_by": "$(whoami)"
}
EOF

echo "Wrote dist/version.json"

# Delete old assets from S3 first
echo "Cleaning old assets..."
aws s3 rm "s3://$BUCKET/assets/" --recursive --profile "$AWS_PROFILE" 2>/dev/null || true

# Upload all assets with immutable cache (S3 auto-detects content-types)
echo "Uploading assets..."
aws s3 cp ./dist/assets/ "s3://$BUCKET/assets/" --recursive \
  --cache-control "public, max-age=31536000, immutable" \
  --profile "$AWS_PROFILE"

# Upload index.html with no-cache
echo "Uploading index.html..."
aws s3 cp ./dist/index.html "s3://$BUCKET/index.html" \
  --content-type "text/html" \
  --cache-control "no-cache, no-store, must-revalidate" \
  --profile "$AWS_PROFILE"

# Upload version.json with no-cache
aws s3 cp ./dist/version.json "s3://$BUCKET/version.json" \
  --content-type "application/json" \
  --cache-control "no-cache, no-store, must-revalidate" \
  --profile "$AWS_PROFILE"

# Sync remaining static files
echo "Syncing static files..."
aws s3 sync ./dist "s3://$BUCKET/" --size-only --delete \
  --exclude "assets/*" --exclude "index.html" --exclude "version.json" \
  --profile "$AWS_PROFILE"

# Invalidate only non-hashed files (assets are cache-busted by filename)
echo "Invalidating CloudFront cache..."
aws cloudfront create-invalidation \
  --distribution-id "$DISTRIBUTION_ID" \
  --paths "/index.html" "/version.json" \
  --profile "$AWS_PROFILE" \
  --output text

# Tag and push the deploy (if in a git repo)
if git rev-parse --git-dir > /dev/null 2>&1; then
  TAG="deploy-$(date +%Y%m%d-%H%M%S)"
  git tag "$TAG" "$GIT_COMMIT"
  git push origin "$TAG" 2>/dev/null || echo "Warning: Could not push tag to remote"
  echo "Tagged $GIT_COMMIT as $TAG"
fi

echo ""
echo "=== Deploy complete ==="
echo "Check: https://portal.vizbot.co/version.json"
