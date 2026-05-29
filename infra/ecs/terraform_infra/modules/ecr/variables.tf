variable "repository_names" {
  description = "List of ECR repo names to create (one per service)."
  type        = list(string)
}

variable "force_delete" {
  description = "If true, allows `terraform destroy` to remove repos that still contain images."
  type        = bool
  default     = false
}

variable "allowed_pull_principal_arns" {
  description = "List of IAM principal ARNs (typically the ECS task execution role) granted pull access via the repo policy. Empty list = no repo policy is attached."
  type        = list(string)
  default     = []
}

variable "tags" {
  type    = map(string)
  default = {}
}
