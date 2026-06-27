variable "aws_region" {
  description = "AWS region for every resource in this stack."
  type        = string
  default     = "ap-south-1"
}

variable "environment" {
  description = "Environment name: dev | prod."
  type        = string

  validation {
    condition     = contains(["dev", "prod"], var.environment)
    error_message = "environment must be one of: dev, prod."
  }
}

variable "project" {
  description = "Project / app prefix used in resource names and tags."
  type        = string
  default     = "resido"
}

variable "vpc_cidr" {
  description = "CIDR for the VPC. Two public subnets are carved out of it."
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "Two public-subnet CIDRs (one per AZ)."
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "availability_zones" {
  description = "Two AZs the public subnets live in."
  type        = list(string)
  default     = ["ap-south-1a", "ap-south-1b"]
}

variable "image_tag" {
  description = "Image tag pushed to ECR. The first apply uses 'latest'; CI rolls subsequent revisions via the deploy script."
  type        = string
  default     = "latest"
}

# ─── RDS ─────────────────────────────────────────────────────────────────────

variable "rds_instance_class" {
  description = "RDS instance class. db.t4g.micro is the cheapest viable for prod-lite."
  type        = string
  default     = "db.t4g.micro"
}

variable "rds_allocated_storage_gb" {
  description = "GBs of gp3 storage for RDS."
  type        = number
  default     = 20
}

variable "rds_engine_version" {
  description = "Postgres engine version."
  type        = string
  default     = "16.3"
}

variable "rds_multi_az" {
  description = "Enable Multi-AZ failover. Doubles cost \u2014 use only in prod."
  type        = bool
  default     = false
}

variable "rds_username" {
  description = "Master username for RDS."
  type        = string
  default     = "resido_admin"
}

variable "rds_deletion_protection" {
  description = "Block accidental `terraform destroy` of the DB."
  type        = bool
  default     = true
}

# ─── Redis ───────────────────────────────────────────────────────────────────

variable "redis_node_type" {
  description = "ElastiCache node type."
  type        = string
  default     = "cache.t4g.micro"
}

variable "redis_engine_version" {
  description = "Redis engine version."
  type        = string
  default     = "7.1"
}

# ─── ALB / TLS ───────────────────────────────────────────────────────────────

variable "acm_certificate_arn" {
  description = <<EOT
Optional ACM cert for HTTPS on the ALB (:443 listener). Leave empty when TLS
terminates at Cloudflare (recommended): ALB serves HTTP :80 only and Cloudflare
proxies https://residoapp.com to the ALB origin. Only set this if you terminate
TLS on the ALB instead of (or in addition to) Cloudflare.
EOT
  type        = string
  default     = ""
}

variable "alb_allowed_cidrs" {
  description = "CIDRs allowed to reach the public ALB (default: world)."
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

# ─── VPC endpoints (private path from ECS to AWS APIs) ───────────────────────

variable "enable_vpc_interface_endpoints" {
  description = <<EOT
Create interface VPC endpoints for ECR (api+dkr), Secrets Manager,
CloudWatch Logs, and SSM. WARNING: this is a SECURITY / COMPLIANCE feature,
NOT a cost optimisation. Same-region traffic from ECS to those services is
already $0/GB through the IGW path. Interface endpoints add ~$9.36/mo per
endpoint per AZ (~$112/mo across 2 AZs for the 6 services we create) plus
$0.01/GB of data processing. Leave `false` unless you need to keep traffic
off the public AWS endpoints (PCI/HIPAA/SOC2) or you plan to move ECS tasks
to private subnets later.
EOT
  type        = bool
  default     = false
}

variable "enable_s3_gateway_endpoint" {
  description = "Create the S3 gateway endpoint. FREE, no data processing fee. REQUIRED for ECR image-layer pulls to stay on the AWS backbone. Always leave true."
  type        = bool
  default     = true
}

# ─── Service sizing ──────────────────────────────────────────────────────────

variable "service_desired_count_default" {
  description = "Default number of tasks per service. Overridable per-service via service_overrides."
  type        = number
  default     = 1
}

variable "service_overrides" {
  description = <<EOT
Per-service overrides for cpu / memory / desired_count. Any service not listed
falls back to the defaults in modules/ecs/locals.tf. Example:

    service_overrides = {
        api-gateway  = { desired_count = 2 }
        auth-service = { cpu = 1024, memory = 2048, desired_count = 2 }
    }
EOT
  type = map(object({
    cpu           = optional(number)
    memory        = optional(number)
    desired_count = optional(number)
  }))
  default = {}
}

# ─── .env-based secret seeding ───────────────────────────────────────────────
# On the first apply, Terraform reads this file and pre-populates every
# matching secret in Secrets Manager. After the first apply, secrets carry
# `lifecycle.ignore_changes = [secret_string]`, so subsequent edits via
# `aws secretsmanager put-secret-value` are preserved across applies.

variable "dotenv_path" {
  description = <<EOT
Path to a .env file whose values are used to seed Secrets Manager on the
first apply. Resolved relative to this terraform_infra/ folder. Set to an
empty string to skip seeding entirely.

For every KEY=value line in this file, Terraform creates ONE secret in
Secrets Manager called  "<project>/<env>/<KEY>"  with `value` as its
initial contents, then attaches `lifecycle.ignore_changes = [secret_string]`
so subsequent operator edits via the AWS console / CLI are preserved on
every future `terraform apply`.

Caveats:
  - $${VAR} references in .env are NOT expanded. Write literal values.
  - Lines starting with `#` and blank lines are skipped.
  - Wrapping single/double quotes are stripped from values.
EOT
  type        = string
  default     = ""
}

variable "extra_secret_seeds" {
  description = "Extra plaintext values to seed into Secrets Manager (merged on top of .env). Map of secret-name (e.g. 'jwt-secret') -> value."
  type        = map(string)
  default     = {}
  sensitive   = true
}

variable "common_tags" {
  description = "Tags merged into every taggable resource."
  type        = map(string)
  default     = {}
}

# ─── Terraform-managed connection strings ────────────────────────────────────
# When true (default), RDS and Redis URLs in Secrets Manager are derived from
# the RDS/ElastiCache resources THIS stack creates — not from .env. Set false
# only if you keep an external RDS/Redis and manage those secrets manually.

variable "wire_terraform_infra_secrets" {
  description = "Overlay Terraform-managed RDS/Redis connection env vars on top of .env seeds."
  type        = bool
  default     = true
}

# ─── ECS autoscaling ─────────────────────────────────────────────────────────

variable "enable_ecs_autoscaling" {
  description = "Attach target-tracking CPU autoscaling policies to every ECS service."
  type        = bool
  default     = true
}

variable "ecs_autoscaling_max_capacity" {
  description = "Maximum task count per service when autoscaling is enabled."
  type        = number
  default     = 10
}

variable "ecs_autoscaling_cpu_target" {
  description = "Target average CPU % for ECS service autoscaling."
  type        = number
  default     = 70
}
