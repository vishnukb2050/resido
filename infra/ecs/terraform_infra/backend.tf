# Remote state in S3. The bucket and key are passed at init time so the
# same configuration works for both dev and prod accounts:
#
#   terraform init \
#       -backend-config="bucket=resido-tfstate-<dev|prod>" \
#       -backend-config="key=ecs/terraform.tfstate" \
#       -backend-config="region=ap-south-1"

terraform {
  backend "s3" {}
}
