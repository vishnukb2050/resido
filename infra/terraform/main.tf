terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  required_version = ">= 1.5.0"

  backend "s3" {
    bucket = "resido-terraform-state"
    key    = "resido/terraform.tfstate"
    region = "ap-south-1"
  }
}

provider "aws" {
  region = var.aws_region
}

module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "resido-vpc"
  cidr = "10.0.0.0/16"

  azs             = ["${var.aws_region}a", "${var.aws_region}b", "${var.aws_region}c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]

  enable_nat_gateway   = true
  single_nat_gateway   = var.environment == "dev"
  enable_dns_hostnames = true

  tags = var.common_tags
}

module "eks" {
  source = "./modules/eks"

  cluster_name       = "resido-${var.environment}"
  vpc_id             = module.vpc.vpc_id
  subnet_ids         = module.vpc.private_subnets
  node_instance_type = var.node_instance_type
  environment        = var.environment
  common_tags        = var.common_tags
}

module "rds" {
  source = "./modules/rds"

  identifier        = "resido-${var.environment}"
  vpc_id            = module.vpc.vpc_id
  subnet_ids        = module.vpc.private_subnets
  db_username       = var.db_username
  db_password       = var.db_password
  instance_class    = var.db_instance_class
  multi_az          = var.environment == "prod"
  common_tags       = var.common_tags
}

module "elasticache" {
  source = "./modules/elasticache"

  cluster_id   = "resido-${var.environment}"
  vpc_id       = module.vpc.vpc_id
  subnet_ids   = module.vpc.private_subnets
  node_type    = var.redis_node_type
  common_tags  = var.common_tags
}

module "s3" {
  source = "./modules/s3"

  bucket_name = "resido-storage-${var.environment}"
  common_tags = var.common_tags
}

module "ecr" {
  source = "./modules/ecr"

  services = [
    "api-gateway",
    "auth-service",
    "resident-service",
    "chat-service",
    "notification-service",
    "visitor-service",
    "flaredthread-service",
    "business-service",
    "media-worker",
  ]
  common_tags = var.common_tags
}
