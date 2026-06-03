resource "aws_db_subnet_group" "this" {
  name        = "${var.name}-rds-subnet-group"
  description = "Subnet group for ${var.name} RDS."
  subnet_ids  = var.subnet_ids
  tags        = merge(var.tags, { Name = "${var.name}-rds-subnet-group" })
}

resource "aws_security_group" "rds" {
  name        = "${var.name}-rds-sg"
  description = "Allow Postgres from ECS service SG only."
  vpc_id      = var.vpc_id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, { Name = "${var.name}-rds-sg" })
}

# Authorise the ECS service SG to reach the DB on 5432.
resource "aws_security_group_rule" "rds_from_ecs" {
  type                     = "ingress"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  security_group_id        = aws_security_group.rds.id
  source_security_group_id = var.allowed_security_group_id
  description              = "Postgres from ECS service SG"
}

# Optional: allow extra CIDRs (e.g. ops VPN, bastion). Empty list = nothing extra.
resource "aws_security_group_rule" "rds_from_cidrs" {
  count             = length(var.allowed_cidrs) > 0 ? 1 : 0
  type              = "ingress"
  from_port         = 5432
  to_port           = 5432
  protocol          = "tcp"
  security_group_id = aws_security_group.rds.id
  cidr_blocks       = var.allowed_cidrs
  description       = "Postgres from explicit operator CIDRs"
}

resource "aws_db_instance" "this" {
  identifier        = "${var.name}-postgres"
  engine            = "postgres"
  engine_version    = var.engine_version
  instance_class    = var.instance_class
  allocated_storage = var.allocated_storage_gb
  storage_type      = "gp3"
  storage_encrypted = true

  db_name  = var.bootstrap_db_name
  username = var.username
  password = var.password
  port     = 5432

  multi_az               = var.multi_az
  publicly_accessible    = false
  db_subnet_group_name   = aws_db_subnet_group.this.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  backup_retention_period    = var.backup_retention_days
  backup_window              = "01:00-02:00"
  maintenance_window         = "sun:02:30-sun:03:30"
  skip_final_snapshot        = !var.deletion_protection
  final_snapshot_identifier  = var.deletion_protection ? "${var.name}-final-${formatdate("YYYYMMDDhhmm", timestamp())}" : null
  deletion_protection        = var.deletion_protection
  apply_immediately          = false
  auto_minor_version_upgrade = true

  performance_insights_enabled    = false
  enabled_cloudwatch_logs_exports = ["postgresql"]

  tags = merge(var.tags, { Name = "${var.name}-postgres" })

  lifecycle {
    ignore_changes = [
      final_snapshot_identifier, # rotates with timestamp every plan
      password,                  # rotate via Secrets Manager, not Terraform
    ]
  }
}

# ─── Additional logical databases ────────────────────────────────────────────
# `aws_db_instance.db_name` (above) creates ONLY `resido_master`. Postgres
# requires CREATE DATABASE for each of the others, and Terraform can't reach a
# `publicly_accessible = false` RDS from the operator/CI machine (the SG only
# trusts the ECS service SG).
#
# Instead, the databases are created INSIDE the VPC by the one-off `db-migrate`
# ECS task, which runs `node ensure-databases.js` before `prisma migrate deploy`
# (see apps/auth-service/ensure-databases.js + prisma-deploy.sh). That task runs
# on every `release.yml` with run_migrate=true, is idempotent, and creates:
#
#   resido_users, resido_core, resido_geodata, resido_notifications, resido_chat
#
# So the full chain — RDS instance, all logical DBs, and all tables — is
# provisioned automatically by `terraform apply` + the migrate pipeline, with
# no manual `psql`. `resido_master` itself is created by RDS via db_name above.
