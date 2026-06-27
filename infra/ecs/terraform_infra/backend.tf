# Remote state in S3. Bucket name is supplied at init time (not in this file):
#
#   GitHub Actions:  TF_STATE_BUCKET environment variable per dev/prod
#   Local CLI:       -backend-config="bucket=resido-tfstate-dev"
#
#   terraform init \
#       -backend-config=envs/backend.partial.hcl \
#       -backend-config="bucket=<your-state-bucket>" \
#       -reconfigure

terraform {
  backend "s3" {}
}
