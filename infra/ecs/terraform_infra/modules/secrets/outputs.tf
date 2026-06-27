output "secret_arns" {
  description = "Map of ENV_NAME -> Secrets Manager ARN. ECS task definitions use this directly to inject every entry as an env var with the same name."
  value       = { for k, s in aws_secretsmanager_secret.this : k => s.arn }
}

output "secret_names" {
  description = "Map of ENV_NAME -> full Secrets Manager secret name (e.g. resido/prod/jwt-secret)."
  value       = { for k, s in aws_secretsmanager_secret.this : k => s.name }
}

output "all_secret_arns" {
  description = "Flat list of every Secrets Manager ARN \u2014 used to scope the ECS task execution role IAM policy."
  value       = [for s in aws_secretsmanager_secret.this : s.arn]
}
