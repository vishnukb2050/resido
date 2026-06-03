output "alb_arn" { value = aws_lb.this.arn }
output "alb_dns_name" { value = aws_lb.this.dns_name }
output "alb_zone_id" { value = aws_lb.this.zone_id }
output "security_group_id" { value = aws_security_group.alb.id }

output "target_group_arns" {
  description = "Map of service name -> target group ARN (only services that face the ALB)."
  value = {
    "api-gateway"          = aws_lb_target_group.api_gateway.arn
    "chat-service"         = aws_lb_target_group.chat.arn
    "flaredthread-service" = aws_lb_target_group.flaredthread.arn
  }
}
