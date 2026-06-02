# Media pipeline and feed performance

## Architecture

| Component | Role |
|-----------|------|
| **Mobile** | PUT original to R2 via presigned URL; create flare/thread with `mediaAssets: [{ sourceKey, kind }]` |
| **flaredthread-service** | API, feeds (cursor pagination), enqueue BullMQ jobs, internal worker callback |
| **Redis** | Queue `media.process` |
| **media-worker** | ffmpeg ladder (480p / 720p / 1080p), HLS + DASH, thumbnails; no public port |

## Local docker-compose

```bash
cd infra
# Ensure .env has AWS/R2 keys, CLOUDFLARE_R2_PUBLIC_URL, MEDIA_WORKER_SECRET, and ElastiCache:
#   REDIS_HOST, REDIS_PORT, REDIS_PASSWORD, REDIS_TLS=true
docker compose up -d flaredthread-service media-worker
```

Env vars:

- `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD` / `REDIS_TLS` (AWS ElastiCache — same as auth OTP cache)
- Optional override: `REDIS_URL=rediss://:password@host:6379`
- `MEDIA_WORKER_SECRET` (same on flaredthread + media-worker)
- `FLAREDTHREAD_URL=http://flaredthread-service:3008` (worker only)

Apply schema:

```bash
docker compose exec flaredthread-service npx prisma db push
```

## Upload flow

1. `POST /blogs/upload-url` → `{ uploadUrl, fileUrl, key }` under `.../original/{year}/{month}/{uuid}.ext`
2. Client PUTs file to `uploadUrl`
3. `POST /flares` or `/threads` with `mediaAssets: [{ sourceKey: key, kind: 'VIDEO' | 'IMAGE' }]`
4. Service creates `MediaAsset` rows, sets blog `mediaStatus: PROCESSING`, enqueues job
5. Worker transcodes to `.../processed/{assetId}/`, then `PATCH /internal/media/:id/complete` with manifest keys
6. Feed items expose `thumbnailUrl`, `previewUrl`, `mediaStatus`, `playback: { hlsUrl, dashUrl, mp4Url }`

## Feed pagination

`GET /flares` and `/threads` accept `limit` (default 15, max 20) and `cursor` (base64 keyset). Response:

```json
{ "items": [...], "nextCursor": "...", "hasMore": true }
```

## Mobile playback

`AdaptiveVideoPlayer` uses **HLS on iOS**, **DASH on Android** when ready, with MP4 fallback. Shows a processing overlay when `mediaStatus` is `PROCESSING`.

## ECS (phase 5)

- ECR repository `media-worker` is defined in Terraform.
- Add a Fargate service (no ALB, 2 vCPU / 4 GB) wired to ElastiCache `REDIS_URL` after compose validation.
- Set `FLAREDTHREAD_URL` to the Cloud Map URL for `flaredthread-service`.

## Profile photos

1. Presigned upload → `resido/{tenant}/profiles/{userId}/original/...`
2. `PUT /profile/user` with `profilePhotoKey` (or legacy `profilePhoto` URL) enqueues `jobType: PROFILE` on `media.process`
3. Worker writes `thumb_128.jpg` + `poster_512.jpg` under `.../processed/`
4. Auth stores `profilePhotoThumb` + updates `profilePhoto` to poster key
5. Batch: `GET /profile/users/avatars/batch?ids=` — feeds use this for `authorAvatarThumb`
