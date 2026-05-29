# `terraform init -backend-config=envs/dev.backend.hcl`
bucket = "resido-tfstate-dev"
key    = "ecs/terraform.tfstate"
region = "ap-south-1"
