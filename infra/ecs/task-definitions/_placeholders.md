# Task Definition Placeholders

Every `*.json` in this folder uses the following placeholders. Substitute
them with `infra/ecs/scripts/render-task-def.sh` (which is a thin wrapper
around `envsubst`) before registering with `aws ecs register-task-definition`.

| Placeholder              | Example value                                                                                  | Where it comes from              |
| ------------------------ | ---------------------------------------------------------------------------------------------- | -------------------------------- |
| `${AWS_ACCOUNT_ID}`      | `123456789012`                                                                                 | `aws sts get-caller-identity`    |
| `${AWS_REGION}`          | `ap-south-1`                                                                                   | env / `terraform.tfvars`         |
| `${ENV}`                 | `prod` or `dev`                                                                                | deploy pipeline                  |
| `${IMAGE_TAG}`           | git short SHA, e.g. `7c4f2a1`                                                                  | CI build                         |
| `${TASK_EXECUTION_ROLE}` | `arn:aws:iam::${AWS_ACCOUNT_ID}:role/resido-${ENV}-ecs-task-execution`                         | terraform IAM module             |
| `${TASK_ROLE}`           | `arn:aws:iam::${AWS_ACCOUNT_ID}:role/resido-${ENV}-ecs-task`                                   | terraform IAM module             |
| `${LOG_GROUP}`           | `/resido/${ENV}/<service>`                                                                     | created by `awslogs-create-group`|

All sensitive env vars (DB URLs, JWT secret, MSG91 API key, AWS keys for
user-side SDKs, etc.) are pulled from **AWS Secrets Manager** via the
`secrets` array in each container definition. The `valueFrom` ARN
pattern is:

```
arn:aws:secretsmanager:${AWS_REGION}:${AWS_ACCOUNT_ID}:secret:resido/${ENV}/<secret-name>-XXXXXX
```

Create the secrets once:

```bash
aws secretsmanager create-secret \
    --name resido/prod/core-write-url \
    --secret-string 'postgresql://USER:PASS@resido-prod.cluster-xxx.ap-south-1.rds.amazonaws.com:5432/resido_core?schema=public'
```

The minimal set of secrets every Resido deployment needs:

- `resido/${ENV}/master-write-url`
- `resido/${ENV}/master-read-url`
- `resido/${ENV}/user-write-url`
- `resido/${ENV}/user-read-url`
- `resido/${ENV}/core-write-url`
- `resido/${ENV}/core-read-url`
- `resido/${ENV}/geo-write-url`
- `resido/${ENV}/notification-write-url`
- `resido/${ENV}/jwt-secret`
- `resido/${ENV}/msg91-api-key`
- `resido/${ENV}/aws-s3-access-key`
- `resido/${ENV}/aws-s3-secret-key`
- `resido/${ENV}/redis-host`
- `resido/${ENV}/redis-port`
- `resido/${ENV}/redis-password`
- `resido/${ENV}/redis-tls` (value: `true` for AWS ElastiCache in-transit encryption)
- `resido/${ENV}/redis-url` (optional; use `rediss://:PASSWORD@HOST:6379` if you prefer a single URL for BullMQ / ioredis)
