#!/usr/bin/env bash
#
# Substitute environment variables into a task-definition JSON template.
# Reads stdin/file, prints rendered JSON to stdout.
#
# Required env: AWS_ACCOUNT_ID, AWS_REGION, ENV, IMAGE_TAG,
#               TASK_EXECUTION_ROLE, TASK_ROLE, LOG_GROUP
#
# Usage:
#   AWS_ACCOUNT_ID=123 AWS_REGION=ap-south-1 ENV=prod IMAGE_TAG=abc1234 \
#   TASK_EXECUTION_ROLE=arn:... TASK_ROLE=arn:... LOG_GROUP=/resido/prod/auth \
#       infra/ecs/scripts/render-task-def.sh infra/ecs/task-definitions/auth-service.json

set -euo pipefail

required=(AWS_ACCOUNT_ID AWS_REGION ENV IMAGE_TAG TASK_EXECUTION_ROLE TASK_ROLE LOG_GROUP)
for v in "${required[@]}"; do
    if [ -z "${!v:-}" ]; then
        echo "❌ $v is not set in the environment." >&2
        exit 1
    fi
done

input="${1:-/dev/stdin}"
if [ ! -e "$input" ]; then
    echo "❌ template not found: $input" >&2
    exit 1
fi

# envsubst only replaces the listed variables — this stops it eating any
# legitimate `${foo}` strings that happen to appear in the JSON.
envsubst "$(printf '${%s} ' "${required[@]}")" < "$input"
