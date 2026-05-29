output "repository_urls" {
  description = "Map of service name -> ECR repo URL."
  value       = { for k, r in aws_ecr_repository.this : k => r.repository_url }
}

output "repository_arns" {
  description = "Map of service name -> ECR repo ARN."
  value       = { for k, r in aws_ecr_repository.this : k => r.arn }
}
