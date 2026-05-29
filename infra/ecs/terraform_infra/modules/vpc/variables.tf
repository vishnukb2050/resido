variable "name" {
  description = "Name prefix for VPC resources, e.g. resido-prod."
  type        = string
}

variable "cidr_block" {
  description = "Top-level VPC CIDR."
  type        = string
}

variable "public_subnet_cidrs" {
  description = "List of /24-ish CIDRs (one per AZ)."
  type        = list(string)
}

variable "availability_zones" {
  description = "List of AZs (same length as public_subnet_cidrs)."
  type        = list(string)
}

variable "tags" {
  description = "Tags to attach to every taggable resource."
  type        = map(string)
  default     = {}
}
