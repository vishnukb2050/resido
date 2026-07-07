#!/usr/bin/env bash
# Resume dev after dev-pause.sh (start RDS, scale ECS back to 1 task each).
#
# Usage:
#   export AWS_REGION=ap-south-1
#   export ECS_CLUSTER=resido-dev-cluster
#   bash infra/ecs/scripts/dev-resume.sh

set -euo pipefail

CLUSTER="${ECS_CLUSTER:-resido-dev-cluster}"
REGION="${AWS_REGION:-ap-south-1}"
RDS_ID="${RDS_INSTANCE_ID:-resido-dev-postgres}"
DESIRED="${ECS_DESIRED_COUNT:-1}"

echo "Resuming dev: cluster=${CLUSTER} desiredCount=${DESIRED}"

STATUS=$(aws rds describe-db-instances --db-instance-identifier "$RDS_ID" --region "$REGION" \
  --query 'DBInstances[0].DBInstanceStatus' --output text 2>/dev/null || echo "missing")

if [ "$STATUS" = "stopped" ]; then
  echo "  Starting RDS → ${RDS_ID}"
  aws rds start-db-instance --db-instance-identifier "$RDS_ID" --region "$REGION" --no-cli-pager >/dev/null
  echo "  Waiting for RDS to become available..."
  aws rds wait db-instance-available --db-instance-identifier "$RDS_ID" --region "$REGION"
elif [ "$STATUS" = "available" ]; then
  echo "  RDS already available."
else
  echo "  RDS status: ${STATUS} — continue anyway."
fi

SERVICES=$(aws ecs list-services --cluster "$CLUSTER" --region "$REGION" \
  --query 'serviceArns[]' --output text)

if [ -z "$SERVICES" ] || [ "$SERVICES" = "None" ]; then
  echo "No ECS services found on ${CLUSTER}."
  exit 1
fi

for ARN in $SERVICES; do
  NAME="${ARN##*/}"
  echo "  ECS desiredCount=${DESIRED} → ${NAME}"
  aws ecs update-service \
    --cluster "$CLUSTER" \
    --service "$NAME" \
    --desired-count "$DESIRED" \
    --region "$REGION" \
    --no-cli-pager >/dev/null
done

echo ""
echo "Done. Services are rolling out; check ECS console or: aws ecs list-tasks --cluster ${CLUSTER} --region ${REGION}"
