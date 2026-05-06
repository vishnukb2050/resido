variable "aws_region" {
  default = "ap-south-1"
}

variable "environment" {
  default = "dev"
}

variable "node_instance_type" {
  default = "t3.medium"
}

variable "db_instance_class" {
  default = "db.t3.medium"
}

variable "redis_node_type" {
  default = "cache.t3.micro"
}

variable "db_username" {
  default = "resido"
}

variable "db_password" {
  sensitive = true
}

variable "common_tags" {
  default = {
    Project     = "Resido"
    ManagedBy   = "Terraform"
  }
}
