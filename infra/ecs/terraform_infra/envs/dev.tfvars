# ─── Dev environment ─────────────────────────────────────────────────────────
# Apply with:
#   terraform init -backend-config=envs/dev.backend.hcl
#   terraform apply -var-file=envs/dev.tfvars

environment = "dev"
aws_region  = "ap-south-1"
project     = "resido"

vpc_cidr            = "10.10.0.0/16"
public_subnet_cidrs = ["10.10.1.0/24", "10.10.2.0/24"]
availability_zones  = ["ap-south-1a", "ap-south-1b"]

# Cheap sizing for dev
rds_instance_class       = "db.t4g.micro"
rds_allocated_storage_gb = 20
rds_multi_az             = false
rds_deletion_protection  = false # so `terraform destroy` works during dev iteration

redis_node_type = "cache.t4g.micro"

# Dev: HTTP-only ALB (same as prod when Cloudflare terminates TLS at the edge).
acm_certificate_arn = ""

service_desired_count_default = 1

# Use existing dev image tag (usually `latest`). Override with -var=image_tag=abc1234 if you want to pin.
image_tag = "latest"

# ─── Network egress to AWS APIs ─────────────────────────────────────────────
# Same-region traffic to ECR/RDS/Redis/Secrets/CloudWatch is FREE via the
# IGW path. Interface endpoints would only ADD cost (~$112/mo + per-GB).
# Keep off unless you have a compliance requirement.
enable_vpc_interface_endpoints = false

# S3 gateway endpoint is free and required for ECR pulls to stay on backbone.
enable_s3_gateway_endpoint = true

wire_terraform_infra_secrets = true
enable_ecs_autoscaling       = true
ecs_autoscaling_max_capacity = 4
ecs_autoscaling_cpu_target   = 70

common_tags = {
  Project     = "resido"
  Environment = "dev"
  ManagedBy   = "terraform"
  Stack       = "ecs"
}
