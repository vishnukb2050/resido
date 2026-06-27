provider "aws" {
  region = var.aws_region

  default_tags {
    tags = merge(
      { Project = var.project, Environment = var.environment, ManagedBy = "terraform" },
      var.common_tags,
    )
  }
}

data "aws_caller_identity" "current" {}

locals {
  name = "${var.project}-${var.environment}"

  service_repository_names = [
    "api-gateway",
    "auth-service",
    "resident-service",
    "chat-service",
    "notification-service",
    "visitor-service",
    "flaredthread-service",
    "media-worker",
    "business-service",
  ]

  # We need the task execution role ARN inside the ECR repo policy AND
  # the ECR repo ARN list inside the task execution role's IAM policy.
  # That would be a cycle if either side waited on a module output, so we
  # construct both ARN sets deterministically from naming conventions and
  # pass them in as plain values. Terraform happily resolves the real
  # resources at apply time because the names match what the modules
  # actually create.
  task_execution_role_name = "${local.name}-ecs-task-execution"
  task_execution_role_arn  = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/${local.task_execution_role_name}"

  ecr_repository_arns = [
    for repo in local.service_repository_names :
    "arn:aws:ecr:${var.aws_region}:${data.aws_caller_identity.current.account_id}:repository/${repo}"
  ]

  # ─── Parse .env into a flat map (KEY -> value) ────────────────────────────
  # Each entry becomes one secret in Secrets Manager (name == KEY) and one
  # env var in every ECS container (name == KEY). After first apply, the
  # secrets module sets `lifecycle.ignore_changes = [secret_string]` so the
  # values you edit later via the Console / CLI are preserved.
  #
  # Parser is intentionally minimal:
  #   - lines starting with `#` and blank lines are skipped
  #   - values keep `=` characters that appear after the first `=`
  #   - surrounding single or double quotes are stripped
  #   - `${VAR}` references are NOT expanded (use literal values)
  dotenv_raw = (
    var.dotenv_path == "" ? "" :
    try(file("${path.module}/${var.dotenv_path}"), "")
  )

  dotenv_lines = [
    for line in split("\n", local.dotenv_raw) :
    trimspace(line)
    if length(trimspace(line)) > 0 && !startswith(trimspace(line), "#") && length(regexall("=", line)) > 0
  ]

  dotenv = {
    for line in local.dotenv_lines :
    split("=", line)[0] => trimspace(
      replace(
        replace(
          join("=", slice(split("=", line), 1, length(split("=", line)))),
          "/^\"(.*)\"$/", "$1"
        ),
        "/^'(.*)'$/", "$1"
      )
    )
  }

  # Postgres base URL built from the RDS instance this stack provisions.
  # urlencode() keeps special characters in the generated password safe.
  rds_pg_base = "postgresql://${var.rds_username}:${urlencode(random_password.rds.result)}@${module.rds.endpoint}"

  # Connection strings for every logical database the app uses. `ensure-databases.js`
  # (run by the db-migrate ECS task) creates the DBs that RDS does not bootstrap.
  terraform_db_secrets = var.wire_terraform_infra_secrets ? {
    RDS_WRITE_URL         = "${local.rds_pg_base}/postgres"
    RDS_READ_URL          = "${local.rds_pg_base}/postgres"
    MASTER_WRITE_URL      = "${local.rds_pg_base}/resido_master?schema=public"
    MASTER_READ_URL       = "${local.rds_pg_base}/resido_master?schema=public"
    USER_WRITE_URL        = "${local.rds_pg_base}/resido_users?schema=public"
    USER_READ_URL         = "${local.rds_pg_base}/resido_users?schema=public"
    CORE_WRITE_URL        = "${local.rds_pg_base}/resido_core?schema=public"
    CORE_READ_URL         = "${local.rds_pg_base}/resido_core?schema=public"
    GEO_WRITE_URL         = "${local.rds_pg_base}/resido_geodata?schema=public"
    GEO_READ_URL          = "${local.rds_pg_base}/resido_geodata?schema=public"
    CHAT_WRITE_URL        = "${local.rds_pg_base}/resido_chat?schema=public"
    CHAT_READ_URL         = "${local.rds_pg_base}/resido_chat?schema=public"
    NOTIFICATION_WRITE_URL = "${local.rds_pg_base}/resido_notifications?schema=public"
    AUTH_DATABASE_URL     = "${local.rds_pg_base}/resido_master?schema=public"
    TENANT_DATABASE_URL   = "${local.rds_pg_base}/resido_core?schema=public"
  } : {}

  # ElastiCache from this stack is a single non-TLS node (no AUTH token). Apps
  # read REDIS_HOST/PORT first; REDIS_URL is a convenience for BullMQ/ioredis.
  terraform_redis_secrets = var.wire_terraform_infra_secrets ? {
    REDIS_HOST     = module.redis.primary_endpoint
    REDIS_PORT     = tostring(module.redis.port)
    REDIS_PASSWORD = ""
    REDIS_TLS      = "false"
    REDIS_URL      = module.redis.url
  } : {}

  # Merge order (last wins): placeholders → auto-generated → .env → extra → RDS/Redis.
  secret_seeds = merge(
    local.default_secret_placeholders,
    local.terraform_auto_secrets,
    local.dotenv,
    var.extra_secret_seeds,
    local.terraform_db_secrets,
    local.terraform_redis_secrets,
  )
}

# ─── Networking ──────────────────────────────────────────────────────────────

module "vpc" {
  source = "./modules/vpc"

  name                = local.name
  cidr_block          = var.vpc_cidr
  public_subnet_cidrs = var.public_subnet_cidrs
  availability_zones  = var.availability_zones
  tags                = var.common_tags
}

# ─── ECR repos (one per service) ─────────────────────────────────────────────
# The repo policy here grants the ECS task execution role pull access. The
# role ARN is computed deterministically above (locals) so we avoid the
# module-to-module cycle.

module "ecr" {
  source                      = "./modules/ecr"
  repository_names            = local.service_repository_names
  force_delete                = var.environment == "dev"
  allowed_pull_principal_arns = [local.task_execution_role_arn]
  tags                        = var.common_tags
}

# ─── Load balancer ───────────────────────────────────────────────────────────

module "alb" {
  source = "./modules/alb"

  name                = local.name
  vpc_id              = module.vpc.vpc_id
  subnet_ids          = module.vpc.public_subnet_ids
  allowed_cidrs       = var.alb_allowed_cidrs
  acm_certificate_arn = var.acm_certificate_arn
  tags                = var.common_tags
}

# ─── Shared service security group ───────────────────────────────────────────
# Created at the top level so RDS/Redis can authorise inbound traffic from it
# without creating a cycle (the ECS module also depends on RDS/Redis-derived
# secrets, so the SG itself must be cycle-free).

resource "aws_security_group" "service" {
  name        = "${local.name}-service-sg"
  description = "Default SG attached to every ECS Fargate task ENI."
  vpc_id      = module.vpc.vpc_id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.common_tags, { Name = "${local.name}-service-sg" })
}

resource "aws_security_group_rule" "service_self_all" {
  type              = "ingress"
  from_port         = 0
  to_port           = 0
  protocol          = "-1"
  security_group_id = aws_security_group.service.id
  self              = true
  description       = "Allow all intra-cluster traffic between tasks"
}

resource "aws_security_group_rule" "alb_to_api_gateway" {
  type                     = "ingress"
  from_port                = 3000
  to_port                  = 3000
  protocol                 = "tcp"
  security_group_id        = aws_security_group.service.id
  source_security_group_id = module.alb.security_group_id
  description              = "ALB to api-gateway 3000"
}

resource "aws_security_group_rule" "alb_to_chat_service" {
  type                     = "ingress"
  from_port                = 3004
  to_port                  = 3004
  protocol                 = "tcp"
  security_group_id        = aws_security_group.service.id
  source_security_group_id = module.alb.security_group_id
  description              = "ALB to chat-service 3004"
}

resource "aws_security_group_rule" "alb_to_flaredthread_service" {
  type                     = "ingress"
  from_port                = 3008
  to_port                  = 3008
  protocol                 = "tcp"
  security_group_id        = aws_security_group.service.id
  source_security_group_id = module.alb.security_group_id
  description              = "ALB to flaredthread-service 3008 (flares-io WebSockets)"
}

# ─── RDS Postgres ────────────────────────────────────────────────────────────
# Terraform provisions the instance. Connection URLs are written into Secrets
# Manager automatically when wire_terraform_infra_secrets = true (see locals
# terraform_db_secrets). After apply, rotate the password only via Secrets
# Manager + RDS — not by re-applying with a new random_password.

resource "random_password" "rds" {
  length           = 32
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

module "rds" {
  source = "./modules/rds"

  name                      = local.name
  vpc_id                    = module.vpc.vpc_id
  subnet_ids                = module.vpc.public_subnet_ids
  allowed_security_group_id = aws_security_group.service.id

  engine_version       = var.rds_engine_version
  instance_class       = var.rds_instance_class
  allocated_storage_gb = var.rds_allocated_storage_gb
  multi_az             = var.rds_multi_az

  username = var.rds_username
  password = random_password.rds.result

  deletion_protection = var.rds_deletion_protection
  tags                = var.common_tags
}

# ─── ElastiCache Redis ───────────────────────────────────────────────────────

module "redis" {
  source = "./modules/redis"

  name                      = local.name
  vpc_id                    = module.vpc.vpc_id
  subnet_ids                = module.vpc.public_subnet_ids
  allowed_security_group_id = aws_security_group.service.id

  node_type      = var.redis_node_type
  engine_version = var.redis_engine_version

  tags = var.common_tags
}

# ─── Secrets Manager ─────────────────────────────────────────────────────────
# One secret per .env key — name and value mirror the .env file. After first
# apply, the secrets carry `lifecycle.ignore_changes = [secret_string]`, so
# the operator's manual edits via Console / CLI are preserved on every
# subsequent `terraform apply`.

module "secrets" {
  source = "./modules/secrets"

  project                 = var.project
  environment             = var.environment
  seed_values             = local.secret_seeds
  recovery_window_in_days = var.environment == "prod" ? 7 : 0

  tags = var.common_tags
}

# ─── ECS cluster, IAM, task defs, services ──────────────────────────────────

module "ecs" {
  source = "./modules/ecs"

  name        = local.name
  project     = var.project
  environment = var.environment
  region      = var.aws_region
  account_id  = data.aws_caller_identity.current.account_id

  vpc_id                    = module.vpc.vpc_id
  subnet_ids                = module.vpc.public_subnet_ids
  service_security_group_id = aws_security_group.service.id

  alb_target_group_arns = module.alb.target_group_arns

  # The ECS module receives a flat map of ENV_NAME -> Secrets Manager ARN.
  # Every entry is injected into every service container as an env var with
  # the same name as the .env key — same shape the apps already expect.
  secret_arns = module.secrets.secret_arns

  # Explicit ECR pull permission scoped to just these repo ARNs.
  ecr_repository_arns = local.ecr_repository_arns

  image_tag                     = var.image_tag
  service_desired_count_default = var.service_desired_count_default
  service_overrides             = var.service_overrides

  enable_autoscaling     = var.enable_ecs_autoscaling
  autoscaling_max_capacity = var.ecs_autoscaling_max_capacity
  autoscaling_cpu_target   = var.ecs_autoscaling_cpu_target

  tags = var.common_tags
}

# ─── VPC endpoints (ECR, Secrets Manager, CloudWatch, SSM, S3 gateway) ───────
# Gives ECS tasks a private path to AWS APIs. The S3 gateway endpoint is
# REQUIRED for ECR pulls (image layers live in S3). Without it, tasks would
# still fall back to the public ECR endpoint via the IGW, but with public
# DNS / rate-limit risks.

module "vpc_endpoints" {
  source = "./modules/vpc_endpoints"

  name       = local.name
  region     = var.aws_region
  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.public_subnet_ids

  route_table_ids               = module.vpc.public_route_table_ids
  ecs_service_security_group_id = aws_security_group.service.id

  enable_interface_endpoints = var.enable_vpc_interface_endpoints
  enable_s3_gateway_endpoint = var.enable_s3_gateway_endpoint

  tags = var.common_tags
}
