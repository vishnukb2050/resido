variable "project" {
  type    = string
  default = "resido"
}

variable "environment" {
  type = string
}

variable "seed_values" {
  description = <<EOT
Flat map of ENV_NAME -> initial value. One secret is created per entry,
named "<project>/<env>/<ENV_NAME>". Subsequent value changes through the
AWS console / CLI are preserved (lifecycle.ignore_changes).
EOT
  type        = map(string)
  sensitive   = true
}

variable "recovery_window_in_days" {
  description = "How long Secrets Manager keeps a deleted secret recoverable. 0 = delete immediately (use for dev)."
  type        = number
  default     = 7
}

variable "tags" {
  type    = map(string)
  default = {}
}
