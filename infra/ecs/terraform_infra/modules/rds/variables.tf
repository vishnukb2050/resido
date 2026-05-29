variable "name" { type = string }
variable "vpc_id" { type = string }
variable "subnet_ids" { type = list(string) }
variable "allowed_security_group_id" {
  description = "ECS service SG that may reach Postgres."
  type        = string
}

variable "allowed_cidrs" {
  description = "Extra IPv4 CIDRs allowed to reach Postgres (ops VPN/bastion)."
  type        = list(string)
  default     = []
}

variable "engine_version" { type = string }
variable "instance_class" { type = string }
variable "allocated_storage_gb" { type = number }
variable "multi_az" { type = bool }

variable "username" { type = string }
variable "password" {
  type      = string
  sensitive = true
}

variable "bootstrap_db_name" {
  description = "Initial DB created by RDS. Use 'resido_master' \u2014 the rest are created later."
  type        = string
  default     = "resido_master"
}

variable "backup_retention_days" {
  type    = number
  default = 7
}

variable "deletion_protection" {
  type    = bool
  default = true
}

variable "tags" {
  type    = map(string)
  default = {}
}
