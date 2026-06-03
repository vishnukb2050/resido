#!/usr/bin/env bash
#
# Build a Resido service Docker image and push it to ECR.
#
# Usage:
#   AWS_ACCOUNT_ID=123 AWS_REGION=ap-south-1 IMAGE_TAG=$(git rev-parse --short HEAD) \
#       infra/ecs/scripts/build-and-push.sh auth-service
#
#   # or build everything (default tag = git short SHA):
#   infra/ecs/scripts/build-and-push.sh --all
#
# Assumes one ECR repository per service (already provisioned by
# infra/terraform/modules/ecr) and that the AWS CLI is logged in.

set -euo pipefail

: "${AWS_ACCOUNT_ID:?AWS_ACCOUNT_ID is required}"
: "${AWS_REGION:?AWS_REGION is required}"
IMAGE_TAG="${IMAGE_TAG:-$(git rev-parse --short HEAD 2>/dev/null || echo latest)}"

REPO_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
APPS_DIR="$REPO_ROOT/apps"
REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

ALL_SERVICES=(
    api-gateway
    auth-service
    resident-service
    chat-service
    notification-service
    visitor-service
    flaredthread-service
    business-service
    media-worker
)

if [ "${1:-}" = "--all" ]; then
    services=("${ALL_SERVICES[@]}")
elif [ -n "${1:-}" ]; then
    services=("$1")
else
    echo "Usage: $0 <service> | --all" >&2
    echo "Available services: ${ALL_SERVICES[*]}" >&2
    exit 1
fi

echo "🔐 Logging in to ECR (${REGISTRY})..."
aws ecr get-login-password --region "$AWS_REGION" \
    | docker login --username AWS --password-stdin "$REGISTRY"

for svc in "${services[@]}"; do
    if [ ! -d "$APPS_DIR/$svc" ]; then
        echo "⚠️  $svc skipped — $APPS_DIR/$svc does not exist."
        continue
    fi
    echo "🏗  Building $svc:$IMAGE_TAG..."
    docker buildx build \
        --platform=linux/amd64 \
        -t "$REGISTRY/$svc:$IMAGE_TAG" \
        -t "$REGISTRY/$svc:latest" \
        -f "$APPS_DIR/$svc/Dockerfile" \
        "$APPS_DIR/$svc"

    echo "📤 Pushing $svc:$IMAGE_TAG..."
    docker push "$REGISTRY/$svc:$IMAGE_TAG"
    docker push "$REGISTRY/$svc:latest"
done

echo "✅ Done. Tag: $IMAGE_TAG"
