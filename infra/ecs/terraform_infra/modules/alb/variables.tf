variable "name" { type = string }
variable "vpc_id" { type = string }
variable "subnet_ids" { type = list(string) }
variable "allowed_cidrs" { type = list(string) }
variable "acm_certificate_arn" { type = string }

variable "api_gateway_port" {
  type    = number
  default = 3000
}

variable "chat_port" {
  type    = number
  default = 3004
}

variable "tags" {
  type    = map(string)
  default = {}
}
