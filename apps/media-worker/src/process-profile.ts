import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import sharp from 'sharp';
import { config } from './config';
import { downloadToFile, uploadBuffer } from './r2';

export type ProfileMediaJob = {
    jobType: 'PROFILE';
    userId: string;
    tenantId: string;
    sourceKey: string;
};

async function patchProfileComplete(
    userId: string,
    body: Record<string, unknown>,
): Promise<void> {
    const url = `${config.authServiceUrl}/internal/profile-media/${userId}/complete`;
    const res = await fetch(url, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'x-media-worker-secret': config.mediaWorkerSecret,
        },
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`profile complete callback failed ${res.status}: ${text}`);
    }
}

function profileProcessedPrefix(tenantId: string, userId: string): string {
    return `resido/${tenantId}/profiles/${userId}/processed`;
}

export async function processProfileJob(job: ProfileMediaJob): Promise<void> {
    const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'resido-profile-'));
    try {
        const inputPath = path.join(workDir, 'original');
        await downloadToFile(job.sourceKey, inputPath);

        const prefix = profileProcessedPrefix(job.tenantId, job.userId);
        const thumbBuf = await sharp(inputPath)
            .resize(128, 128, { fit: 'cover' })
            .jpeg({ quality: 82 })
            .toBuffer();
        const posterBuf = await sharp(inputPath)
            .resize(512, 512, { fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 88 })
            .toBuffer();

        const thumbnailKey = `${prefix}/thumb_128.jpg`;
        const posterKey = `${prefix}/poster_512.jpg`;
        await uploadBuffer(thumbnailKey, thumbBuf, 'image/jpeg');
        await uploadBuffer(posterKey, posterBuf, 'image/jpeg');

        await patchProfileComplete(job.userId, {
            status: 'READY',
            thumbnailKey,
            posterKey,
        });
    } catch (err: any) {
        await patchProfileComplete(job.userId, {
            status: 'FAILED',
            errorMessage: err?.message || String(err),
        }).catch(() => undefined);
        throw err;
    } finally {
        fs.rmSync(workDir, { recursive: true, force: true });
    }
}
