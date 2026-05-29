# Secrets Manager mirror of the project .env file.
#
# For every entry in var.seed_values we create:
#   - aws_secretsmanager_secret           name = "<project>/<env>/<KEY>"
#   - aws_secretsmanager_secret_version   value = seed value from .env
#
# The KEY is the original .env name (e.g. JWT_SECRET, MASTER_WRITE_URL).
# ECS task definitions reference these secret ARNs and expose them inside
# the container with the same name as the .env key — apps read them via
# `process.env.JWT_SECRET` exactly like they do in docker-compose today.
#
# After first apply the secret_string carries a lifecycle.ignore_changes
# rule. That means the operator can rotate any value via:
#
#     aws secretsmanager put-secret-value \
#         --secret-id resido/prod/JWT_SECRET \
#         --secret-string "<new-value>"
#
# and the next `terraform apply` will NOT roll it back. Terraform still
# owns the existence of the secret, just not its current value.

locals {
  name_prefix = "${var.project}/${var.environment}"

  # Terraform forbids sensitive values in for_each. The KEYS (.env names)
  # are not secret — they describe which env vars exist — so we explicitly
  # unwrap them with nonsensitive() to drive the iteration. The actual
  # secret VALUES stay sensitive at the secret_version layer.
  secret_keys = toset(nonsensitive(keys(var.seed_values)))
}

resource "aws_secretsmanager_secret" "this" {
  for_each = local.secret_keys

  name                    = "${local.name_prefix}/${each.key}"
  description             = "Mirrors .env key ${each.key}. Edit via Secrets Manager; Terraform will not overwrite."
  recovery_window_in_days = var.recovery_window_in_days
  tags                    = merge(var.tags, { EnvKey = each.key })
}

resource "aws_secretsmanager_secret_version" "this" {
  for_each = local.secret_keys

  secret_id     = aws_secretsmanager_secret.this[each.key].id
  secret_string = var.seed_values[each.key]

  lifecycle {
    # Operator edits via put-secret-value win over Terraform on subsequent
    # applies. Terraform still creates the secret and seeds it on the very
    # first apply — that's what populates production from .env in one shot.
    ignore_changes = [secret_string, version_stages]
  }
}
