# VPC endpoints used by ECS Fargate tasks to reach AWS APIs without going
# through the IGW. With our public-subnet design this is technically
# optional — tasks have public IPs and can hit the public endpoints — but
# adding the endpoints means:
#
#   * ECR image pulls don't depend on the public ECR DNS / rate limits.
#   * Secrets Manager + CloudWatch Logs traffic stays on the AWS backbone.
#   * We can move tasks to private subnets later by flipping
#     `assign_public_ip = false`, with zero further work.
#
# We also create the S3 gateway endpoint unconditionally because it is FREE
# and ECR stores image layers in S3 — the interface endpoints for ECR cannot
# actually serve image data without it.

# ─── Security group for interface endpoints ──────────────────────────────────

resource "aws_security_group" "endpoints" {
  count = var.enable_interface_endpoints ? 1 : 0

  name        = "${var.name}-endpoints-sg"
  description = "Allow HTTPS from ECS service SG to interface VPC endpoints."
  vpc_id      = var.vpc_id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, { Name = "${var.name}-endpoints-sg" })
}

resource "aws_security_group_rule" "endpoints_from_ecs" {
  count = var.enable_interface_endpoints ? 1 : 0

  type                     = "ingress"
  from_port                = 443
  to_port                  = 443
  protocol                 = "tcp"
  security_group_id        = aws_security_group.endpoints[0].id
  source_security_group_id = var.ecs_service_security_group_id
  description              = "HTTPS from ECS tasks to interface endpoints"
}

# ─── Interface endpoints (one per service) ───────────────────────────────────

locals {
  interface_endpoint_services = var.enable_interface_endpoints ? toset([
    "ecr.api",        # AuthorizeToken, BatchGetImage metadata
    "ecr.dkr",        # Image layer pulls
    "secretsmanager", # GetSecretValue (used by ECS agent for `secrets[]`)
    "logs",           # CloudWatch Logs PutLogEvents
    "ssm",            # ECS Exec / Session Manager
    "ssmmessages",    # ECS Exec session channel
  ]) : toset([])
}

resource "aws_vpc_endpoint" "interface" {
  for_each = local.interface_endpoint_services

  vpc_id              = var.vpc_id
  service_name        = "com.amazonaws.${var.region}.${each.key}"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = var.subnet_ids
  security_group_ids  = [aws_security_group.endpoints[0].id]
  private_dns_enabled = true

  tags = merge(var.tags, { Name = "${var.name}-${each.key}-endpoint" })
}

# ─── S3 gateway endpoint (always on, free) ───────────────────────────────────
# Required for ECR pulls — actual image layers live in S3. Also used by any
# app code that writes to S3 directly.

resource "aws_vpc_endpoint" "s3" {
  count = var.enable_s3_gateway_endpoint ? 1 : 0

  vpc_id            = var.vpc_id
  service_name      = "com.amazonaws.${var.region}.s3"
  vpc_endpoint_type = "Gateway"
  route_table_ids   = var.route_table_ids

  tags = merge(var.tags, { Name = "${var.name}-s3-endpoint" })
}
