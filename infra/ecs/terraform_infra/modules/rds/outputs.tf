output "address" { value = aws_db_instance.this.address }
output "port" { value = aws_db_instance.this.port }
output "endpoint" {
  description = "host:port \u2014 ready to slot into a Postgres URL."
  value       = "${aws_db_instance.this.address}:${aws_db_instance.this.port}"
}
output "security_group_id" { value = aws_security_group.rds.id }
output "identifier" { value = aws_db_instance.this.id }
