output "cluster_name" { value = aws_ecs_cluster.this.name }
output "cluster_arn" { value = aws_ecs_cluster.this.arn }
output "task_execution_role_arn" { value = aws_iam_role.task_execution.arn }
output "task_role_arn" { value = aws_iam_role.task.arn }
output "cloud_map_namespace_id" { value = aws_service_discovery_private_dns_namespace.this.id }
output "cloud_map_namespace_name" { value = aws_service_discovery_private_dns_namespace.this.name }

output "service_names" {
  description = "Map of service-name -> ECS service name (handy for the CI deploy script)."
  value       = { for k, s in aws_ecs_service.svc : k => s.name }
}

output "log_group_names" {
  description = "Map of service-name -> CloudWatch log group name."
  value       = { for k, g in aws_cloudwatch_log_group.svc : k => g.name }
}
