variable "name" { type = string }
variable "project" { type = string }
variable "environment" { type = string }
variable "region" { type = string }
variable "account_id" { type = string }

variable "vpc_id" { type = string }
variable "subnet_ids" { type = list(string) }

variable "service_security_group_id" {
  description = "SG attached to every task ENI \u2014 created at the top level."
  type        = string
}

variable "alb_target_group_arns" {
  description = "Map of service-name -> target group ARN for ALB-facing services."
  type        = map(string)
}

variable "cloud_map_namespace_name" {
  description = "Private DNS namespace (e.g. resido.local)."
  type        = string
  default     = "resido.local"
}

variable "secret_arns" {
  description = "Flat map of ENV_NAME -> Secrets Manager ARN. Every entry is injected into every service container as an env var with the same name as the key."
  type        = map(string)
}

variable "ecr_repository_arns" {
  description = "ARNs of the ECR repos this stack owns. The task execution role is scoped to pull only from these."
  type        = list(string)
}

variable "image_tag" {
  description = "Default image tag for the first deployment. CI bumps this via update-service."
  type        = string
  default     = "latest"
}

variable "service_desired_count_default" {
  type    = number
  default = 1
}

variable "service_overrides" {
  type = map(object({
    cpu           = optional(number)
    memory        = optional(number)
    desired_count = optional(number)
  }))
  default = {}
}

variable "log_retention_days" {
  type    = number
  default = 14
}

variable "tags" {
  type    = map(string)
  default = {}
}
