resource "aws_ecr_repository" "this" {
  for_each = toset(var.repository_names)

  name                 = each.key
  image_tag_mutability = "MUTABLE"
  force_delete         = var.force_delete

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }

  tags = merge(var.tags, { Name = each.key })
}

# Repository policy: explicitly allow the ECS task execution role to pull
# images from these repos. This is belt-and-suspenders with the IAM policy
# attached to the execution role itself, but it means a misconfigured IAM
# policy cannot accidentally open the repo to outside principals.
data "aws_iam_policy_document" "ecr_pull" {
  count = length(var.allowed_pull_principal_arns) == 0 ? 0 : 1

  statement {
    sid    = "AllowEcsTaskExecutionRolePull"
    effect = "Allow"

    principals {
      type        = "AWS"
      identifiers = var.allowed_pull_principal_arns
    }

    actions = [
      "ecr:BatchCheckLayerAvailability",
      "ecr:GetDownloadUrlForLayer",
      "ecr:BatchGetImage",
      "ecr:DescribeRepositories",
      "ecr:DescribeImages",
      "ecr:ListImages",
    ]
  }
}

resource "aws_ecr_repository_policy" "this" {
  for_each = length(var.allowed_pull_principal_arns) == 0 ? toset([]) : toset(var.repository_names)

  repository = aws_ecr_repository.this[each.key].name
  policy     = data.aws_iam_policy_document.ecr_pull[0].json
}

# Keep only the 30 most recent tagged images per repo. Anything untagged for
# >7 days is removed (covers failed builds and orphans).
resource "aws_ecr_lifecycle_policy" "this" {
  for_each   = aws_ecr_repository.this
  repository = each.value.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 30 tagged images"
        selection = {
          tagStatus      = "tagged"
          tagPatternList = ["*"]
          countType      = "imageCountMoreThan"
          countNumber    = 30
        }
        action = { type = "expire" }
      },
      {
        rulePriority = 2
        description  = "Expire untagged after 7 days"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 7
        }
        action = { type = "expire" }
      }
    ]
  })
}
