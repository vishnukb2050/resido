resource "aws_cloudwatch_log_group" "svc" {
  for_each          = local.services
  name              = "/${var.project}/${var.environment}/${each.key}"
  retention_in_days = var.log_retention_days
  tags              = merge(var.tags, { Service = each.key })
}

# ─── Task definitions ────────────────────────────────────────────────────────
# One revision per service. CI/CD registers fresh revisions on every deploy;
# `lifecycle.ignore_changes = [container_definitions]` prevents Terraform
# from clobbering those rolling updates.

resource "aws_ecs_task_definition" "svc" {
  for_each = local.services

  family                   = "${var.name}-${each.key}"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = tostring(each.value.cpu)
  memory                   = tostring(each.value.memory)
  execution_role_arn       = aws_iam_role.task_execution.arn
  task_role_arn            = aws_iam_role.task.arn

  runtime_platform {
    operating_system_family = "LINUX"
    cpu_architecture        = "X86_64"
  }

  container_definitions = jsonencode([
    merge(
      {
        name      = each.key
        image     = "${var.account_id}.dkr.ecr.${var.region}.amazonaws.com/${each.key}:${var.image_tag}"
        essential = true

        environment = concat(
          [
            { name = "NODE_ENV", value = "production" },
            { name = "RUN_PRISMA_PUSH", value = "false" },
          ],
          try(each.value.worker, false) ? [] : [
            { name = "PORT", value = tostring(each.value.port) },
          ],
          [for k, v in local.service_urls : { name = "${k}_URL", value = v }],
          try(each.value.worker, false) ? [
            { name = "FLAREDTHREAD_URL", value = local.flaredthread_internal_url },
          ] : [],
        )

        secrets = [
          for env_name, arn in var.secret_arns :
          {
            name      = env_name
            valueFrom = arn
          }
        ]

        logConfiguration = {
          logDriver = "awslogs"
          options = {
            "awslogs-group"         = aws_cloudwatch_log_group.svc[each.key].name
            "awslogs-region"        = var.region
            "awslogs-stream-prefix" = each.key
          }
        }
      },
      try(each.value.worker, false) ? {
        healthCheck = {
          command     = ["CMD-SHELL", "pgrep -f 'node dist/worker' >/dev/null || exit 1"]
          interval    = 30
          timeout     = 5
          retries     = 3
          startPeriod = 120
        }
        } : {
        portMappings = [
          {
            containerPort = each.value.port
            protocol      = "tcp"
            name          = "http"
            appProtocol   = "http"
          },
        ]
        healthCheck = {
          command     = ["CMD-SHELL", "wget -q --spider http://localhost:${each.value.port}/health || exit 1"]
          interval    = 30
          timeout     = 5
          retries     = 3
          startPeriod = 60
        }
      },
    ),
  ])

  tags = merge(var.tags, { Service = each.key })

  lifecycle {
    # CI/CD ships new container images by registering new revisions of
    # this task definition. Terraform should NOT roll those changes back
    # on the next apply.
    ignore_changes = [container_definitions]
  }
}

# ─── ECS Services ────────────────────────────────────────────────────────────

resource "aws_ecs_service" "svc" {
  for_each = local.services

  name             = "${var.name}-${each.key}"
  cluster          = aws_ecs_cluster.this.id
  task_definition  = aws_ecs_task_definition.svc[each.key].arn
  desired_count    = each.value.desired_count
  launch_type      = "FARGATE"
  platform_version = "LATEST"

  enable_execute_command = true
  propagate_tags         = "SERVICE"

  deployment_minimum_healthy_percent = 50
  deployment_maximum_percent         = 200

  network_configuration {
    subnets         = var.subnet_ids
    security_groups = [var.service_security_group_id]
    # No NAT in this VPC; Fargate needs a public IP to pull from ECR /
    # Secrets Manager / CloudWatch over the IGW.
    assign_public_ip = true
  }

  dynamic "service_registries" {
    for_each = try(each.value.worker, false) ? [] : [each.key]
    content {
      registry_arn   = aws_service_discovery_service.svc[service_registries.key].arn
      container_name = each.key
      container_port = each.value.port
    }
  }

  # Attach to the ALB target group only for services that are public-facing.
  dynamic "load_balancer" {
    for_each = each.value.attach_alb == null ? [] : [each.value.attach_alb]
    content {
      target_group_arn = var.alb_target_group_arns[load_balancer.value]
      container_name   = each.key
      container_port   = each.value.port
    }
  }

  lifecycle {
    # CI/CD updates `task_definition` directly via aws-cli; let it.
    # `desired_count` is also managed by autoscaling if we add it later.
    ignore_changes = [task_definition, desired_count]
  }

  depends_on = [
    aws_iam_role_policy_attachment.task_execution_managed,
    aws_iam_role_policy_attachment.task_execution_secrets,
  ]

  tags = merge(var.tags, { Service = each.key })
}
