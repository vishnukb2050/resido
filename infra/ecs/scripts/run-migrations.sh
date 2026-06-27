#!/usr/bin/env bash
#
# Run schema migrations as one-off ECS Fargate tasks and BLOCK until each
# task exits successfully. Call this from CI/CD before deploying any
# service that depends on the new schema.
#
# Required env:
#   AWS_ACCOUNT_ID, AWS_REGION, ENV, IMAGE_TAG,
#   TASK_EXECUTION_ROLE, TASK_ROLE, LOG_GROUP,
#   ECS_CLUSTER, ECS_SUBNETS (comma-separated), ECS_SECURITY_GROUPS (comma-sep)
#
# Usage:
#   infra/ecs/scripts/run-migrations.sh

set -euo pipefail

: "${ECS_CLUSTER:?ECS_CLUSTER is required (e.g. resido-prod)}"
: "${ECS_SUBNETS:?ECS_SUBNETS is required (comma-separated subnet IDs)}"
: "${ECS_SECURITY_GROUPS:?ECS_SECURITY_GROUPS is required (comma-separated SG IDs)}"
: "${AWS_REGION:?AWS_REGION is required}"

REPO_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
TD_DIR="$REPO_ROOT/infra/ecs/task-definitions"
SCRIPTS_DIR="$REPO_ROOT/infra/ecs/scripts"

# Migrations run in two ECS tasks (one per image):
#   1. db-migrate              — auth-service image: ensure DBs + master/user/core/geo
#   2. db-migrate-notification — notification-service image
#   3. db-migrate-chat         — chat-service image (resido_chat)
TEMPLATES=(
    "db-migrate.json"
    "db-migrate-notification.json"
    "db-migrate-chat.json"
)

# Convert comma-separated CLI args into the JSON arrays that
# `aws ecs run-task` expects in the network configuration.
to_json_array() {
    printf '[%s]' "$(printf '"%s",' $(echo "$1" | tr ',' ' ') | sed 's/,$//')"
}

SUBNETS_JSON="$(to_json_array "$ECS_SUBNETS")"
SG_JSON="$(to_json_array "$ECS_SECURITY_GROUPS")"

for template in "${TEMPLATES[@]}"; do
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "▶ Running $template"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    rendered="$(mktemp)"
    "$SCRIPTS_DIR/render-task-def.sh" "$TD_DIR/$template" > "$rendered"

    echo "↪ registering task definition revision..."
    family="$(jq -r '.family' "$rendered")"
    aws ecs register-task-definition \
        --region "$AWS_REGION" \
        --cli-input-json "file://$rendered" >/dev/null

    echo "↪ running one-off task for $family ..."
    task_arn="$(aws ecs run-task \
        --region "$AWS_REGION" \
        --cluster "$ECS_CLUSTER" \
        --task-definition "$family" \
        --launch-type FARGATE \
        --network-configuration "awsvpcConfiguration={subnets=$SUBNETS_JSON,securityGroups=$SG_JSON,assignPublicIp=ENABLED}" \
        --query 'tasks[0].taskArn' \
        --output text)"

    echo "↪ waiting for task $task_arn to exit (this can take a minute or two)..."
    aws ecs wait tasks-stopped \
        --region "$AWS_REGION" \
        --cluster "$ECS_CLUSTER" \
        --tasks "$task_arn"

    exit_code="$(aws ecs describe-tasks \
        --region "$AWS_REGION" \
        --cluster "$ECS_CLUSTER" \
        --tasks "$task_arn" \
        --query 'tasks[0].containers[0].exitCode' \
        --output text)"

    rm -f "$rendered"

    if [ "$exit_code" != "0" ]; then
        echo "❌ migration task $family exited with code $exit_code"
        echo "   inspect logs:  aws logs tail $LOG_GROUP --since 10m"
        exit 1
    fi
    echo "✅ $family completed successfully."
done

echo ""
echo "🎉 All schema migrations applied. Safe to roll services forward."
