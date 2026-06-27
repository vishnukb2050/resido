output "aws_account_id" {
  value = data.aws_caller_identity.current.account_id
}

output "aws_region" {
  value = var.aws_region
}

output "environment" {
  value = var.environment
}

# ─── Network ─────────────────────────────────────────────────────────────────

output "vpc_id" {
  value = module.vpc.vpc_id
}

output "public_subnet_ids" {
  value = module.vpc.public_subnet_ids
}

# ─── ECR ─────────────────────────────────────────────────────────────────────

output "ecr_repository_urls" {
  description = "service-name -> ECR repository URL"
  value       = module.ecr.repository_urls
}

# ─── ALB ─────────────────────────────────────────────────────────────────────

output "alb_dns_name" {
  description = "Public DNS name for the ALB \u2014 point Route 53 here."
  value       = module.alb.alb_dns_name
}

output "alb_zone_id" {
  value = module.alb.alb_zone_id
}

output "alb_target_group_arns" {
  value = module.alb.target_group_arns
}

# ─── ECS ─────────────────────────────────────────────────────────────────────

output "ecs_cluster_name" {
  value = module.ecs.cluster_name
}

output "ecs_service_names" {
  value = module.ecs.service_names
}

output "ecs_service_security_group_id" {
  value = aws_security_group.service.id
}

output "cloud_map_namespace" {
  value = module.ecs.cloud_map_namespace_name
}

# ─── VPC endpoints (private paths to AWS APIs) ──────────────────────────────

output "vpc_interface_endpoint_ids" {
  description = "Map of AWS service short-name -> VPC interface endpoint ID (empty when disabled)."
  value       = module.vpc_endpoints.interface_endpoint_ids
}

output "vpc_s3_gateway_endpoint_id" {
  value = module.vpc_endpoints.s3_gateway_endpoint_id
}

output "task_execution_role_arn" {
  value = module.ecs.task_execution_role_arn
}

output "task_role_arn" {
  value = module.ecs.task_role_arn
}

# ─── DB / cache endpoints ────────────────────────────────────────────────────

output "rds_endpoint" {
  value = module.rds.endpoint
}

output "redis_endpoint" {
  value = module.redis.url
}

# ─── Secrets (ARNs only; values stay in Secrets Manager) ────────────────────

output "secret_arns" {
  description = "Map of ENV_NAME -> Secrets Manager ARN. Mirrors every .env key. ECS task definitions inject each entry as an env var with the same name."
  value       = module.secrets.secret_arns
}

output "secret_names" {
  description = "Map of ENV_NAME -> full Secrets Manager secret name (e.g. resido/prod/JWT_SECRET)."
  value       = module.secrets.secret_names
}

output "all_secret_arns" {
  description = "Flat list of every Secrets Manager ARN this stack created."
  value       = module.secrets.all_secret_arns
}

output "dotenv_keys_loaded" {
  description = "Keys parsed from optional .env (empty when dotenv_path is unset)."
  value       = sort(keys(local.dotenv))
}

output "secrets_requiring_manual_update" {
  description = "Secrets Manager names still using REPLACE_ME placeholders — fill these before prod traffic."
  value = [
    for key in local.operator_secret_keys :
    "${var.project}/${var.environment}/${lower(replace(key, "_", "-"))}"
  ]
}

output "terraform_auto_generated_secret_names" {
  description = "Secrets Manager names auto-filled with random values on first apply."
  value = [
    for key in keys(local.terraform_auto_secrets) :
    "${var.project}/${var.environment}/${lower(replace(key, "_", "-"))}"
  ]
}

# ─── Convenient env-var blob for CI/CD ───────────────────────────────────────

output "ci_env_exports" {
  description = "Paste this into your CI runner to drive the deploy scripts."
  value = join("\n", [
    "export AWS_ACCOUNT_ID=${data.aws_caller_identity.current.account_id}",
    "export AWS_REGION=${var.aws_region}",
    "export ENV=${var.environment}",
    "export ECS_CLUSTER=${module.ecs.cluster_name}",
    "export ECS_SUBNETS=${join(",", module.vpc.public_subnet_ids)}",
    "export ECS_SECURITY_GROUPS=${aws_security_group.service.id}",
    "export TASK_EXECUTION_ROLE=${module.ecs.task_execution_role_arn}",
    "export TASK_ROLE=${module.ecs.task_role_arn}",
    "export LOG_GROUP_PREFIX=/${var.project}/${var.environment}",
  ])
}
