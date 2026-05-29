# `terraform init -backend-config=envs/prod.backend.hcl`
bucket = "resido-tfstate-prod"
key    = "ecs/terraform.tfstate"
region = "ap-south-1"
