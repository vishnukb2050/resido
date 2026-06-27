# Internal shared secrets — safe for Terraform to generate (not third-party keys).
# Seeded into Secrets Manager on first apply; rotate later via put-secret-value.

resource "random_id" "internal_service_secret" {
  byte_length = 32
}

resource "random_id" "media_worker_secret" {
  byte_length = 32
}

resource "random_id" "jwt_secret" {
  byte_length = 32
}

resource "random_id" "jwt_refresh_secret" {
  byte_length = 32
}

locals {
  terraform_auto_secrets = {
    INTERNAL_SERVICE_SECRET = random_id.internal_service_secret.hex
    MEDIA_WORKER_SECRET     = random_id.media_worker_secret.hex
    JWT_SECRET              = random_id.jwt_secret.hex
    JWT_REFRESH_SECRET      = random_id.jwt_refresh_secret.hex
  }
}
