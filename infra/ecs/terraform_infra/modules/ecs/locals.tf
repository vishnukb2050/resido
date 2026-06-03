locals {
  # Canonical service catalogue. Add a new service here and Terraform
  # creates its CloudWatch log group, Cloud Map record, task definition,
  # and ECS service automatically.
  #
  # All services receive every secret from Secrets Manager as env vars
  # (mirrors the shared .env behaviour of docker-compose). If you ever want
  # to scope down which secrets a given service receives, add an
  # `allowed_secret_names` field here and filter in services.tf.
  services_default = {
    "api-gateway" = {
      port          = 3000
      cpu           = 512
      memory        = 1024
      desired_count = 1
      attach_alb    = "api-gateway" # key in alb_target_group_arns
      worker        = false
    }
    "auth-service" = {
      port          = 3001
      cpu           = 512
      memory        = 1024
      desired_count = 1
      attach_alb    = null
      worker        = false
    }
    "resident-service" = {
      port          = 3002
      cpu           = 512
      memory        = 1024
      desired_count = 1
      attach_alb    = null
      worker        = false
    }
    "chat-service" = {
      port          = 3004
      cpu           = 512
      memory        = 1024
      desired_count = 1
      attach_alb    = "chat-service"
      worker        = false
    }
    "notification-service" = {
      port          = 3005
      cpu           = 512
      memory        = 1024
      desired_count = 1
      attach_alb    = null
      worker        = false
    }
    "visitor-service" = {
      port          = 3006
      cpu           = 512
      memory        = 1024
      desired_count = 1
      attach_alb    = null
      worker        = false
    }
    "flaredthread-service" = {
      port          = 3008
      cpu           = 512
      memory        = 1024
      desired_count = 1
      attach_alb    = "flaredthread-service"
      worker        = false
    }
    "business-service" = {
      port          = 3009
      cpu           = 512
      memory        = 1024
      desired_count = 1
      attach_alb    = null
      worker        = false
    }
    # Background worker: no HTTP port, no ALB, no Cloud Map registration.
    "media-worker" = {
      worker        = true
      port          = 0
      cpu           = 1024
      memory        = 4096
      desired_count = 1
      attach_alb    = null
    }
  }

  # Merge per-service overrides on top of the defaults.
  services = {
    for name, defaults in local.services_default :
    name => merge(
      defaults,
      {
        cpu           = try(var.service_overrides[name].cpu, defaults.cpu)
        memory        = try(var.service_overrides[name].memory, defaults.memory)
        desired_count = try(var.service_overrides[name].desired_count, var.service_desired_count_default)
      },
    )
  }

  # Service Discovery DNS used to inject sibling URLs (HTTP services only).
  service_urls = {
    for name, cfg in local.services :
    upper(replace(name, "-", "_")) => "http://${name}.${var.cloud_map_namespace_name}:${cfg.port}"
    if !try(cfg.worker, false)
  }

  flaredthread_internal_url = "http://flaredthread-service.${var.cloud_map_namespace_name}:3008"
}
