import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import sharp from 'sharp';
import { config } from './config';
import {
    downloadToFile,
    processedPrefix,
    uploadFile,
    uploadBuffer,
} from './r2';
import {
    buildDash,
    buildHls,
    extractPoster,
    extractThumbnail,
    processVideoLadder,
} from './ffmpeg';

export type MediaJob = {
    mediaAssetId: string;
    tenantId: string;
    ownerUserId: string;
    sourceKey: string;
    kind: 'VIDEO' | 'IMAGE';
    blogId?: string;
    blogType?: 'THREAD' | 'FLARE';
};

async function patchComplete(
    mediaAssetId: string,
    tenantId: string,
    body: Record<string, unknown>,
): Promise<void> {
    const url = `${config.flaredthreadUrl}/internal/media/${mediaAssetId}/complete`;
    const res = await fetch(url, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'x-media-worker-secret': config.mediaWorkerSecret,
        },
        body: JSON.stringify({ tenantId, ...body }),
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`complete callback failed ${res.status}: ${text}`);
    }
}

async function uploadDirRecursive(
    localDir: string,
    remotePrefix: string,
): Promise<void> {
    const entries = fs.readdirSync(localDir, { withFileTypes: true });
    for (const ent of entries) {
        const localPath = path.join(localDir, ent.name);
        const remoteKey = `${remotePrefix}/${ent.name}`;
        if (ent.isDirectory()) {
            await uploadDirRecursive(localPath, remoteKey);
        } else {
            const ext = path.extname(ent.name).toLowerCase();
            const ct =
                ext === '.m3u8'
                    ? 'application/vnd.apple.mpegurl'
                    : ext === '.mpd'
                      ? 'application/dash+xml'
                      : ext === '.ts'
                        ? 'video/mp2t'
                        : ext === '.m4s'
                          ? 'video/iso.segment'
                          : ext === '.jpg' || ext === '.jpeg'
                            ? 'image/jpeg'
                            : ext === '.mp4'
                              ? 'video/mp4'
                              : 'application/octet-stream';
            await uploadFile(remoteKey, localPath, ct);
        }
    }
}

export async function processMediaJob(job: MediaJob): Promise<void> {
    const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'resido-media-'));
    try {
        const prefix = processedPrefix(job.sourceKey, job.mediaAssetId);
        const inputPath = path.join(workDir, 'original');

        if (job.kind === 'IMAGE') {
            await downloadToFile(job.sourceKey, inputPath);
            const thumbBuf = await sharp(inputPath)
                .resize(320, 320, { fit: 'inside', withoutEnlargement: true })
                .jpeg({ quality: 82 })
                .toBuffer();
            const posterBuf = await sharp(inputPath)
                .resize(1280, 1280, { fit: 'inside', withoutEnlargement: true })
                .jpeg({ quality: 85 })
                .toBuffer();
            const meta = await sharp(inputPath).metadata();

            const thumbnailKey = `${prefix}/thumb.jpg`;
            const posterKey = `${prefix}/poster.jpg`;
            await uploadBuffer(thumbnailKey, thumbBuf, 'image/jpeg');
            await uploadBuffer(posterKey, posterBuf, 'image/jpeg');

            await patchComplete(job.mediaAssetId, job.tenantId, {
                status: 'READY',
                width: meta.width,
                height: meta.height,
                thumbnailKey,
                posterKey,
                renditions: [{ kind: 'image', sourceKey: job.sourceKey }],
            });
            return;
        }

        const ext = path.extname(job.sourceKey) || '.mp4';
        const inputVideo = path.join(workDir, `source${ext}`);
        await downloadToFile(job.sourceKey, inputVideo);

        const thumbPath = path.join(workDir, 'thumb.jpg');
        const posterPath = path.join(workDir, 'poster.jpg');
        await extractThumbnail(inputVideo, thumbPath);
        await extractPoster(inputVideo, posterPath);

        const ladderDir = path.join(workDir, 'ladder');
        const { renditions, durationSec, width, height } = await processVideoLadder(
            inputVideo,
            ladderDir,
        );

        const renditionMeta: Array<{ height: number; mp4Key: string; bitrate?: string }> = [];
        for (const r of renditions) {
            const mp4Key = `${prefix}/${r.height}p.mp4`;
            await uploadFile(mp4Key, r.mp4Path, 'video/mp4');
            renditionMeta.push({ height: r.height, mp4Key });
        }

        const thumbnailKey = `${prefix}/thumb.jpg`;
        const posterKey = `${prefix}/poster.jpg`;
        await uploadFile(thumbnailKey, thumbPath, 'image/jpeg');
        await uploadFile(posterKey, posterPath, 'image/jpeg');

        const hlsDir = path.join(workDir, 'hls');
        await buildHls(
            inputVideo,
            hlsDir,
            renditions.map((r) => ({ height: r.height, mp4Path: r.mp4Path })),
        );
        const hlsPrefix = `${prefix}/hls`;
        await uploadDirRecursive(hlsDir, hlsPrefix);
        const hlsManifestKey = `${hlsPrefix}/master.m3u8`;

        const dashDir = path.join(workDir, 'dash');
        const best = renditions[renditions.length - 1];
        await buildDash(best.mp4Path, dashDir);
        const dashPrefix = `${prefix}/dash`;
        await uploadDirRecursive(dashDir, dashPrefix);
        const dashManifestKey = `${dashPrefix}/manifest.mpd`;

        await patchComplete(job.mediaAssetId, job.tenantId, {
            status: 'READY',
            durationSec,
            width,
            height,
            thumbnailKey,
            posterKey,
            hlsManifestKey,
            dashManifestKey,
            renditions: renditionMeta,
        });
    } catch (err: any) {
        await patchComplete(job.mediaAssetId, job.tenantId, {
            status: 'FAILED',
            errorMessage: err?.message || String(err),
        }).catch(() => undefined);
        throw err;
    } finally {
        fs.rmSync(workDir, { recursive: true, force: true });
    }
}
