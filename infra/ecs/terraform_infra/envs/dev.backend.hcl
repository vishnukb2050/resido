# Dev state backend — bucket name comes from GitHub Environment variable
# `TF_STATE_BUCKET` in CI, or pass manually for local runs.
#
#   terraform init \
#     -backend-config=envs/backend.partial.hcl \
#     -backend-config="bucket=YOUR_DEV_STATE_BUCKET"

key    = "ecs/terraform.tfstate"
region = "ap-south-1"
