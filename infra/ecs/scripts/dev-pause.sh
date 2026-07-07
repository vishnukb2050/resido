#!/usr/bin/env bash
# Stop dev spend while keeping infra (VPC, RDS, Redis, ALB, secrets).
# ECS tasks → 0; RDS instance stopped (auto-restarts after ~7 days if forgotten).
#
# Usage:
#   export AWS_REGION=ap-south-1
#   export ECS_CLUSTER=resido-dev-cluster   # or: terraform output -raw ecs_cluster_name
#   bash infra/ecs/scripts/dev-pause.sh

set -euo pipefail

CLUSTER="${ECS_CLUSTER:-resido-dev-cluster}"
REGION="${AWS_REGION:-ap-south-1}"
RDS_ID="${RDS_INSTANCE_ID:-resido-dev-postgres}"

echo "Pausing dev: cluster=${CLUSTER} region=${REGION}"

SERVICES=$(aws ecs list-services --cluster "$CLUSTER" --region "$REGION" \
  --query 'serviceArns[]' --output text)

if [ -z "$SERVICES" ] || [ "$SERVICES" = "None" ]; then
  echo "No ECS services found on ${CLUSTER}."
else
  for ARN in $SERVICES; do
    NAME="${ARN##*/}"
    echo "  ECS desiredCount=0 → ${NAME}"
    aws ecs update-service \
      --cluster "$CLUSTER" \
      --service "$NAME" \
      --desired-count 0 \
      --region "$REGION" \
      --no-cli-pager >/dev/null
  done
fi

if aws rds describe-db-instances --db-instance-identifier "$RDS_ID" --region "$REGION" \
  --query 'DBInstances[0].DBInstanceStatus' --output text 2>/dev/null | grep -q available; then
  echo "  Stopping RDS → ${RDS_ID}"
  aws rds stop-db-instance --db-instance-identifier "$RDS_ID" --region "$REGION" --no-cli-pager >/dev/null
elif aws rds describe-db-instances --db-instance-identifier "$RDS_ID" --region "$REGION" \
  --query 'DBInstances[0].DBInstanceStatus' --output text 2>/dev/null | grep -q stopped; then
  echo "  RDS already stopped."
else
  echo "  RDS ${RDS_ID} not found or not stoppable — skip."
fi

echo ""
echo "Done. Still billing: ALB (~\$20/mo), Redis (~\$12/mo), Secrets (~\$15/mo), RDS storage (~\$3/mo)."
echo "Wake with: bash infra/ecs/scripts/dev-resume.sh"
