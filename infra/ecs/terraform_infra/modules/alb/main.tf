resource "aws_security_group" "alb" {
  name        = "${var.name}-alb-sg"
  description = "Public ALB \u2014 ingress 80/443 from the world."
  vpc_id      = var.vpc_id

  dynamic "ingress" {
    for_each = var.acm_certificate_arn == "" ? [80] : [80, 443]
    content {
      from_port   = ingress.value
      to_port     = ingress.value
      protocol    = "tcp"
      cidr_blocks = var.allowed_cidrs
      description = "HTTP(S) from ${join(",", var.allowed_cidrs)}"
    }
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, { Name = "${var.name}-alb-sg" })
}

resource "aws_lb" "this" {
  name               = "${var.name}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = var.subnet_ids
  idle_timeout       = 120

  tags = merge(var.tags, { Name = "${var.name}-alb" })
}

# ─── Target groups (one per ALB-facing service) ──────────────────────────────

resource "aws_lb_target_group" "api_gateway" {
  name                 = "${var.name}-api-gateway-tg"
  port                 = var.api_gateway_port
  protocol             = "HTTP"
  target_type          = "ip"
  vpc_id               = var.vpc_id
  deregistration_delay = 30

  health_check {
    path                = "/health"
    matcher             = "200-399"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
    protocol            = "HTTP"
  }

  tags = merge(var.tags, { Name = "${var.name}-api-gateway-tg" })
}

resource "aws_lb_target_group" "chat" {
  name                 = "${var.name}-chat-tg"
  port                 = var.chat_port
  protocol             = "HTTP"
  target_type          = "ip"
  vpc_id               = var.vpc_id
  deregistration_delay = 30

  health_check {
    path                = "/health"
    matcher             = "200-399"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
    protocol            = "HTTP"
  }

  stickiness {
    type            = "lb_cookie"
    cookie_duration = 86400
    enabled         = true
  }

  tags = merge(var.tags, { Name = "${var.name}-chat-tg" })
}

resource "aws_lb_target_group" "flaredthread" {
  name                 = "${var.name}-flaredthread-tg"
  port                 = var.flaredthread_port
  protocol             = "HTTP"
  target_type          = "ip"
  vpc_id               = var.vpc_id
  deregistration_delay = 30

  health_check {
    path                = "/health"
    matcher             = "200-399"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
    protocol            = "HTTP"
  }

  stickiness {
    type            = "lb_cookie"
    cookie_duration = 86400
    enabled         = true
  }

  tags = merge(var.tags, { Name = "${var.name}-flaredthread-tg" })
}

# ─── Listeners ───────────────────────────────────────────────────────────────
# Default: HTTP :80 only (Cloudflare terminates TLS at the edge).
# If acm_certificate_arn is set, :80 redirects to :443 and HTTPS serves traffic.

# Always-on :80. Forwards directly when no ACM cert (Cloudflare SSL mode).
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.this.arn
  port              = 80
  protocol          = "HTTP"

  dynamic "default_action" {
    for_each = var.acm_certificate_arn == "" ? [1] : []
    content {
      type             = "forward"
      target_group_arn = aws_lb_target_group.api_gateway.arn
    }
  }

  dynamic "default_action" {
    for_each = var.acm_certificate_arn == "" ? [] : [1]
    content {
      type = "redirect"
      redirect {
        port        = "443"
        protocol    = "HTTPS"
        status_code = "HTTP_301"
      }
    }
  }
}

resource "aws_lb_listener" "https" {
  count             = var.acm_certificate_arn == "" ? 0 : 1
  load_balancer_arn = aws_lb.this.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = var.acm_certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api_gateway.arn
  }
}

# ─── Listener rules ──────────────────────────────────────────────────────────
# /socket.io/* routes to the chat target group on whichever listener exists.

resource "aws_lb_listener_rule" "socketio_http" {
  count        = var.acm_certificate_arn == "" ? 1 : 0
  listener_arn = aws_lb_listener.http.arn
  priority     = 10

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.chat.arn
  }

  condition {
    path_pattern {
      values = ["/socket.io/*"]
    }
  }
}

resource "aws_lb_listener_rule" "socketio_https" {
  count        = var.acm_certificate_arn == "" ? 0 : 1
  listener_arn = aws_lb_listener.https[0].arn
  priority     = 10

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.chat.arn
  }

  condition {
    path_pattern {
      values = ["/socket.io/*"]
    }
  }
}

# /flares-io/* → flaredthread (Socket.IO path distinct from chat's /socket.io/*)
resource "aws_lb_listener_rule" "flares_io_http" {
  count        = var.acm_certificate_arn == "" ? 1 : 0
  listener_arn = aws_lb_listener.http.arn
  priority     = 11

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.flaredthread.arn
  }

  condition {
    path_pattern {
      values = ["/flares-io/*"]
    }
  }
}

resource "aws_lb_listener_rule" "flares_io_https" {
  count        = var.acm_certificate_arn == "" ? 0 : 1
  listener_arn = aws_lb_listener.https[0].arn
  priority     = 11

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.flaredthread.arn
  }

  condition {
    path_pattern {
      values = ["/flares-io/*"]
    }
  }
}
