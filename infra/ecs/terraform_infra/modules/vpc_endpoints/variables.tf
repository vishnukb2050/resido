variable "name" { type = string }
variable "region" { type = string }
variable "vpc_id" { type = string }

variable "subnet_ids" {
  description = "Subnets where interface endpoint ENIs are created. Use the same subnets ECS runs in for shortest hop."
  type        = list(string)
}

variable "route_table_ids" {
  description = "Route tables to associate the S3 gateway endpoint with."
  type        = list(string)
}

variable "ecs_service_security_group_id" {
  description = "ECS service SG \u2014 authorised to talk HTTPS to the interface endpoints."
  type        = string
}

variable "enable_interface_endpoints" {
  description = "If true, create interface endpoints for ECR (api+dkr), Secrets Manager, CloudWatch Logs, SSM. Costs ~$7/month per endpoint per AZ."
  type        = bool
  default     = true
}

variable "enable_s3_gateway_endpoint" {
  description = "If true, create the S3 gateway endpoint (free). Required by ECR pulls."
  type        = bool
  default     = true
}

variable "tags" {
  type    = map(string)
  default = {}
}
