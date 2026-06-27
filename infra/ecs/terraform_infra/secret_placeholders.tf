# Default Secrets Manager values on first `terraform apply`.
#
# Every key below becomes `resido/<env>/<kebab-case-name>` in AWS. Values
# starting with REPLACE_ME_ are operator-owned — update via Console or:
#
#   aws secretsmanager put-secret-value \
#     --secret-id resido/prod/jwt-secret \
#     --secret-string "<real-value>"
#
# RDS / Redis entries are overwritten with real connection strings when
# wire_terraform_infra_secrets = true (see main.tf locals).

locals {
  # Env var names the operator must replace before production traffic.
  operator_secret_keys = [
    "CORS_ORIGINS",
    "MSG91_AUTH_KEY",
    "MSG91_TEMPLATE_ID",
    "MSG91_API_KEY",
    "AWS_ACCESS_KEY_ID",
    "AWS_SECRET_ACCESS_KEY",
    "AWS_S3_ACCESS_KEY",
    "AWS_S3_SECRET_KEY",
    "AWS_S3_ENDPOINT",
    "AWS_S3_BUCKET_NAME",
    "CLOUDFLARE_R2_PUBLIC_URL",
    "FIREBASE_SERVICE_ACCOUNT_JSON",
  ]

  default_secret_placeholders = {
    # ─── Auth / gateway (operator) ───────────────────────────────────────────
    CORS_ORIGINS   = "REPLACE_ME_CORS_ORIGINS"
    THROTTLE_LIMIT = "120"
    THROTTLE_TTL   = "60000"

    # ─── MSG91 OTP (operator) ────────────────────────────────────────────────
    MSG91_AUTH_KEY    = "REPLACE_ME_MSG91_AUTH_KEY"
    MSG91_TEMPLATE_ID = "REPLACE_ME_MSG91_TEMPLATE_ID"
    MSG91_API_KEY     = "REPLACE_ME_MSG91_API_KEY"

    # ─── Cloudflare R2 / object storage (operator) ───────────────────────────
    AWS_ACCESS_KEY_ID        = "REPLACE_ME_AWS_ACCESS_KEY_ID"
    AWS_SECRET_ACCESS_KEY    = "REPLACE_ME_AWS_SECRET_ACCESS_KEY"
    AWS_S3_ACCESS_KEY        = "REPLACE_ME_AWS_S3_ACCESS_KEY"
    AWS_S3_SECRET_KEY        = "REPLACE_ME_AWS_S3_SECRET_KEY"
    AWS_S3_ENDPOINT          = "REPLACE_ME_AWS_S3_ENDPOINT"
    AWS_S3_BUCKET_NAME       = "REPLACE_ME_AWS_S3_BUCKET_NAME"
    CLOUDFLARE_R2_PUBLIC_URL = "REPLACE_ME_CLOUDFLARE_R2_PUBLIC_URL"

    # ─── Firebase push (operator) ────────────────────────────────────────────
    FIREBASE_SERVICE_ACCOUNT_JSON = "REPLACE_ME_FIREBASE_SERVICE_ACCOUNT_JSON"

    # ─── Postgres (dummy until wire_terraform_infra_secrets overlays RDS) ────
    RDS_WRITE_URL          = "REPLACE_ME_RDS_WRITE_URL"
    RDS_READ_URL           = "REPLACE_ME_RDS_READ_URL"
    MASTER_WRITE_URL       = "REPLACE_ME_MASTER_WRITE_URL"
    MASTER_READ_URL        = "REPLACE_ME_MASTER_READ_URL"
    USER_WRITE_URL         = "REPLACE_ME_USER_WRITE_URL"
    USER_READ_URL          = "REPLACE_ME_USER_READ_URL"
    CORE_WRITE_URL         = "REPLACE_ME_CORE_WRITE_URL"
    CORE_READ_URL          = "REPLACE_ME_CORE_READ_URL"
    GEO_WRITE_URL          = "REPLACE_ME_GEO_WRITE_URL"
    GEO_READ_URL           = "REPLACE_ME_GEO_READ_URL"
    CHAT_WRITE_URL         = "REPLACE_ME_CHAT_WRITE_URL"
    CHAT_READ_URL          = "REPLACE_ME_CHAT_READ_URL"
    NOTIFICATION_WRITE_URL = "REPLACE_ME_NOTIFICATION_WRITE_URL"
    AUTH_DATABASE_URL      = "REPLACE_ME_AUTH_DATABASE_URL"
    TENANT_DATABASE_URL    = "REPLACE_ME_TENANT_DATABASE_URL"

    # ─── Redis (dummy until wire_terraform_infra_secrets overlays ElastiCache) ─
    REDIS_HOST     = "REPLACE_ME_REDIS_HOST"
    REDIS_PORT     = "6379"
    REDIS_PASSWORD = "REPLACE_ME_REDIS_PASSWORD"
    REDIS_TLS      = "false"
    REDIS_URL      = "REPLACE_ME_REDIS_URL"
  }
}
