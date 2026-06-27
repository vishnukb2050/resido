# Shared S3 backend settings (bucket is NOT here — pass per environment).
#
# CI (GitHub Actions):
#   terraform init \
#     -backend-config=envs/backend.partial.hcl \
#     -backend-config="bucket=$TF_STATE_BUCKET"
#
# Local:
#   terraform init \
#     -backend-config=envs/backend.partial.hcl \
#     -backend-config="bucket=resido-tfstate-dev"    # or -prod

key    = "ecs/terraform.tfstate"
region = "ap-south-1"
