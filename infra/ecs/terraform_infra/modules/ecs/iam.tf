# ─── IAM roles ───────────────────────────────────────────────────────────────
# NOTE: the service security group is created at the top level (main.tf) and
# passed in as `var.service_security_group_id` so the RDS / Redis modules can
# reference it without creating a cycle (ECS module also depends on
# secrets/rds/redis).

data "aws_iam_policy_document" "task_assume" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

# Execution role: used by the ECS agent to pull from ECR, write CloudWatch
# logs, and read secrets from Secrets Manager. NOT used by app code.
resource "aws_iam_role" "task_execution" {
  name               = "${var.name}-ecs-task-execution"
  assume_role_policy = data.aws_iam_policy_document.task_assume.json
  tags               = var.tags
}

resource "aws_iam_role_policy_attachment" "task_execution_managed" {
  role       = aws_iam_role.task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# ─── Explicit ECR pull policy ────────────────────────────────────────────────
# The AWS-managed AmazonECSTaskExecutionRolePolicy above already grants
# ecr:GetAuthorizationToken / BatchGetImage / etc., but it does so with
# Resource = "*". We add a second policy SCOPED to the project ECR repos so
# the connection is explicit in code and a compromised task can only pull
# images that belong to this stack.

data "aws_iam_policy_document" "ecr_pull" {
  # The auth-token call is account-wide and cannot be scoped to a resource.
  statement {
    sid       = "EcrAuthToken"
    effect    = "Allow"
    actions   = ["ecr:GetAuthorizationToken"]
    resources = ["*"]
  }

  # Actual image pulls are restricted to the resido repos this stack owns.
  statement {
    sid    = "EcrPullResidoRepos"
    effect = "Allow"
    actions = [
      "ecr:BatchCheckLayerAvailability",
      "ecr:GetDownloadUrlForLayer",
      "ecr:BatchGetImage",
      "ecr:DescribeRepositories",
      "ecr:DescribeImages",
      "ecr:ListImages",
    ]
    resources = var.ecr_repository_arns
  }
}

resource "aws_iam_policy" "ecr_pull" {
  name   = "${var.name}-ecs-ecr-pull"
  policy = data.aws_iam_policy_document.ecr_pull.json
  tags   = var.tags
}

resource "aws_iam_role_policy_attachment" "task_execution_ecr" {
  role       = aws_iam_role.task_execution.name
  policy_arn = aws_iam_policy.ecr_pull.arn
}

# ─── Explicit Secrets Manager read policy ────────────────────────────────────
# Same shape as the ECR one: scoped to only the secret ARNs this stack
# created. Used by the ECS agent to inject `secrets[].valueFrom` values
# into the container environment before the app starts.

data "aws_iam_policy_document" "secrets_read" {
  statement {
    sid    = "ReadResidoSecrets"
    effect = "Allow"
    actions = [
      "secretsmanager:GetSecretValue",
      "secretsmanager:DescribeSecret",
    ]
    resources = values(var.secret_arns)
  }
}

resource "aws_iam_policy" "secrets_read" {
  name   = "${var.name}-ecs-secrets-read"
  policy = data.aws_iam_policy_document.secrets_read.json
  tags   = var.tags
}

resource "aws_iam_role_policy_attachment" "task_execution_secrets" {
  role       = aws_iam_role.task_execution.name
  policy_arn = aws_iam_policy.secrets_read.arn
}

# Task role: assumed by the application itself. Currently only grants S3
# access to the uploads bucket plus the ability to publish CloudWatch
# metrics. Tighten as needed.
resource "aws_iam_role" "task" {
  name               = "${var.name}-ecs-task"
  assume_role_policy = data.aws_iam_policy_document.task_assume.json
  tags               = var.tags
}

data "aws_iam_policy_document" "task_app" {
  statement {
    effect = "Allow"
    actions = [
      "cloudwatch:PutMetricData",
    ]
    resources = ["*"]
  }
}

resource "aws_iam_policy" "task_app" {
  name   = "${var.name}-ecs-task-app"
  policy = data.aws_iam_policy_document.task_app.json
  tags   = var.tags
}

resource "aws_iam_role_policy_attachment" "task_app" {
  role       = aws_iam_role.task.name
  policy_arn = aws_iam_policy.task_app.arn
}
