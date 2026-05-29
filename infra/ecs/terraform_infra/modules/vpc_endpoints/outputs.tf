output "interface_endpoint_ids" {
  description = "Map of service name -> VPC endpoint ID (only for interface endpoints)."
  value       = { for k, e in aws_vpc_endpoint.interface : k => e.id }
}

output "s3_gateway_endpoint_id" {
  value = try(aws_vpc_endpoint.s3[0].id, null)
}

output "endpoints_security_group_id" {
  value = try(aws_security_group.endpoints[0].id, null)
}
