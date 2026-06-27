# ─── ECS Application Auto Scaling ────────────────────────────────────────────
# Target-tracking on average CPU per service. `desired_count` on the ECS
# service resource is lifecycle-ignored so autoscaling can own task count after
# the first apply.

resource "aws_appautoscaling_target" "svc" {
  for_each = var.enable_autoscaling ? local.services : {}

  max_capacity       = var.autoscaling_max_capacity
  min_capacity       = each.value.desired_count
  resource_id        = "service/${aws_ecs_cluster.this.name}/${aws_ecs_service.svc[each.key].name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "cpu" {
  for_each = var.enable_autoscaling ? local.services : {}

  name               = "${var.name}-${each.key}-cpu"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.svc[each.key].resource_id
  scalable_dimension = aws_appautoscaling_target.svc[each.key].scalable_dimension
  service_namespace  = aws_appautoscaling_target.svc[each.key].service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value       = var.autoscaling_cpu_target
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}
