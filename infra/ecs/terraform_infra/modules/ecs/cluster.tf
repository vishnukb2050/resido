resource "aws_ecs_cluster" "this" {
  name = "${var.name}-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = merge(var.tags, { Name = "${var.name}-cluster" })
}

resource "aws_ecs_cluster_capacity_providers" "this" {
  cluster_name       = aws_ecs_cluster.this.name
  capacity_providers = ["FARGATE", "FARGATE_SPOT"]

  default_capacity_provider_strategy {
    capacity_provider = "FARGATE"
    weight            = 1
    base              = 1
  }
}

resource "aws_service_discovery_private_dns_namespace" "this" {
  name        = var.cloud_map_namespace_name
  description = "Private DNS namespace for ${var.name} inter-service discovery."
  vpc         = var.vpc_id
  tags        = var.tags
}

resource "aws_service_discovery_service" "svc" {
  for_each = {
    for name, cfg in local.services : name => cfg
    if !try(cfg.worker, false)
  }

  name = each.key

  dns_config {
    namespace_id = aws_service_discovery_private_dns_namespace.this.id

    dns_records {
      type = "A"
      ttl  = 10
    }

    routing_policy = "MULTIVALUE"
  }

  health_check_custom_config {
    failure_threshold = 1
  }

  tags = merge(var.tags, { Name = each.key })
}
