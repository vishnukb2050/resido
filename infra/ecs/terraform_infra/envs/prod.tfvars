# ─── Prod environment ────────────────────────────────────────────────────────
# Apply with:
#   terraform init -backend-config=envs/prod.backend.hcl
#   terraform apply -var-file=envs/prod.tfvars

environment = "prod"
aws_region  = "ap-south-1"
project     = "resido"

vpc_cidr            = "10.20.0.0/16"
public_subnet_cidrs = ["10.20.1.0/24", "10.20.2.0/24"]
availability_zones  = ["ap-south-1a", "ap-south-1b"]

rds_instance_class       = "db.t4g.small"
rds_allocated_storage_gb = 100
rds_multi_az             = true
rds_deletion_protection  = true

redis_node_type = "cache.t4g.small"

# TLS terminates at Cloudflare (edge). The ALB listens on HTTP :80 only —
# leave acm_certificate_arn empty. In Cloudflare DNS, proxy the API host
# (orange cloud) to this ALB; set SSL mode to Flexible or Full (strict only
# if you add an origin cert on the ALB, which is not required here).
acm_certificate_arn = ""

service_desired_count_default = 2

# Pin to an immutable image tag in prod. CI fills this with the git SHA on each deploy.
image_tag = "latest"

# ─── Network egress to AWS APIs ─────────────────────────────────────────────
# Same-region traffic from ECS to ECR / RDS / Redis / Secrets Manager /
# CloudWatch Logs is FREE regardless of path. Interface endpoints actually
# COST money (~$112/mo across 2 AZs + $0.01/GB data processing), so we leave
# them off by default — flip to `true` only if you need compliance (PCI/SOC2)
# or want to move tasks to private subnets later.
enable_vpc_interface_endpoints = false

# S3 gateway endpoint is FREE and required for ECR layer downloads to stay
# on the AWS backbone. No reason to ever turn this off.
enable_s3_gateway_endpoint = true

service_overrides = {
  api-gateway      = { desired_count = 2 }
  auth-service     = { cpu = 1024, memory = 2048, desired_count = 2 }
  resident-service = { cpu = 1024, memory = 2048, desired_count = 2 }
  chat-service     = { cpu = 1024, memory = 2048, desired_count = 2 }
}

# Terraform-managed RDS/Redis URLs override .env on first apply (set false if
# you keep an external database and manage secrets manually).
wire_terraform_infra_secrets = true

# CPU autoscaling: min = desired_count from overrides above, max = 10 per service.
enable_ecs_autoscaling       = true
ecs_autoscaling_max_capacity = 10
ecs_autoscaling_cpu_target   = 70

common_tags = {
  Project     = "resido"
  Environment = "prod"
  ManagedBy   = "terraform"
  Stack       = "ecs"
}
