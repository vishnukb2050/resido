output "vpc_id" {
  value = aws_vpc.this.id
}

output "vpc_cidr_block" {
  value = aws_vpc.this.cidr_block
}

output "public_subnet_ids" {
  value = aws_subnet.public[*].id
}

output "public_route_table_ids" {
  description = "Route tables that S3 gateway endpoints need to attach to."
  value       = [aws_route_table.public.id]
}

output "availability_zones" {
  value = var.availability_zones
}
