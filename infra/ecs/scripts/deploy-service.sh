#!/usr/bin/env bash
#
# Register a new revision of a service's task definition and update the
# matching ECS service to use it. This triggers a rolling deploy that
# respects the target group's connection-draining timeout.
#
# Required env: AWS_ACCOUNT_ID, AWS_REGION, ENV, IMAGE_TAG,
#               TASK_EXECUTION_ROLE, TASK_ROLE, LOG_GROUP, ECS_CLUSTER
#
# Usage:
#   infra/ecs/scripts/deploy-service.sh auth-service
#   infra/ecs/scripts/deploy-service.sh --all

set -euo pipefail

: "${ECS_CLUSTER:?ECS_CLUSTER is required (e.g. resido-prod)}"
: "${AWS_REGION:?AWS_REGION is required}"
: "${ENV:?ENV is required (e.g. prod)}"

REPO_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
TD_DIR="$REPO_ROOT/infra/ecs/task-definitions"
SCRIPTS_DIR="$REPO_ROOT/infra/ecs/scripts"

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
    exit 1
fi

for svc in "${services[@]}"; do
    template="$TD_DIR/$svc.json"
    if [ ! -f "$template" ]; then
        echo "⚠️  $svc skipped — no task definition at $template."
        continue
    fi

    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "▶ Deploying $svc"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    rendered="$(mktemp)"
    LOG_GROUP="${LOG_GROUP_PREFIX:-/resido/$ENV}/$svc" \
        "$SCRIPTS_DIR/render-task-def.sh" "$template" > "$rendered"

    family="$(jq -r '.family' "$rendered")"
    service_name="$family"

    echo "↪ registering new revision of $family ..."
    new_revision="$(aws ecs register-task-definition \
        --region "$AWS_REGION" \
        --cli-input-json "file://$rendered" \
        --query 'taskDefinition.taskDefinitionArn' \
        --output text)"
    echo "  → $new_revision"

    echo "↪ updating ECS service $service_name in cluster $ECS_CLUSTER ..."
    aws ecs update-service \
        --region "$AWS_REGION" \
        --cluster "$ECS_CLUSTER" \
        --service "$service_name" \
        --task-definition "$new_revision" \
        --force-new-deployment >/dev/null

    echo "↪ waiting for service to reach steady state ..."
    aws ecs wait services-stable \
        --region "$AWS_REGION" \
        --cluster "$ECS_CLUSTER" \
        --services "$service_name"

    rm -f "$rendered"
    echo "✅ $svc deployed."
done

echo ""
echo "🎉 Deploy complete."
