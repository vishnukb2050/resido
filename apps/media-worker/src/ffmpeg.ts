import { execFile } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execFileAsync = promisify(execFile);

export type RenditionSpec = { height: 480 | 720 | 1080; width: number; bitrate: string };

const LADDER: RenditionSpec[] = [
    { height: 480, width: 854, bitrate: '1000k' },
    { height: 720, width: 1280, bitrate: '2500k' },
    { height: 1080, width: 1920, bitrate: '5000k' },
];

export async function probeDuration(inputPath: string): Promise<number> {
    const { stdout } = await execFileAsync('ffprobe', [
        '-v',
        'error',
        '-show_entries',
        'format=duration',
        '-of',
        'default=noprint_wrappers=1:nokey=1',
        inputPath,
    ]);
    return Math.round(parseFloat(stdout.trim()) || 0);
}

export async function probeDimensions(
    inputPath: string,
): Promise<{ width: number; height: number }> {
    const { stdout } = await execFileAsync('ffprobe', [
        '-v',
        'error',
        '-select_streams',
        'v:0',
        '-show_entries',
        'stream=width,height',
        '-of',
        'csv=p=0:s=x',
        inputPath,
    ]);
    const [w, h] = stdout.trim().split('x').map(Number);
    return { width: w || 0, height: h || 0 };
}

export async function extractPoster(inputPath: string, outPath: string): Promise<void> {
    await execFileAsync('ffmpeg', [
        '-y',
        '-ss',
        '00:00:01',
        '-i',
        inputPath,
        '-frames:v',
        '1',
        '-q:v',
        '2',
        outPath,
    ]);
}

export async function extractThumbnail(inputPath: string, outPath: string): Promise<void> {
    await execFileAsync('ffmpeg', [
        '-y',
        '-ss',
        '00:00:00.5',
        '-i',
        inputPath,
        '-vf',
        'scale=320:-2',
        '-frames:v',
        '1',
        outPath,
    ]);
}

async function transcodeMp4(
    inputPath: string,
    outPath: string,
    spec: RenditionSpec,
): Promise<void> {
    await execFileAsync(
        'ffmpeg',
        [
            '-y',
            '-i',
            inputPath,
            '-vf',
            `scale=-2:${spec.height}`,
            '-c:v',
            'libx264',
            '-preset',
            'veryfast',
            '-profile:v',
            'main',
            '-crf',
            '23',
            '-maxrate',
            spec.bitrate,
            '-bufsize',
            `${parseInt(spec.bitrate, 10) * 2}k`,
            '-c:a',
            'aac',
            '-b:a',
            '128k',
            '-movflags',
            '+faststart',
            outPath,
        ],
        { maxBuffer: 50 * 1024 * 1024 },
    );
}

export async function buildHls(
    inputPath: string,
    outDir: string,
    renditions: Array<{ height: number; mp4Path: string }>,
): Promise<string> {
    fs.mkdirSync(outDir, { recursive: true });
    const masterPath = path.join(outDir, 'master.m3u8');
    const lines: string[] = ['#EXTM3U', '#EXT-X-VERSION:3'];

    for (const r of renditions) {
        const segDir = path.join(outDir, `${r.height}p`);
        fs.mkdirSync(segDir, { recursive: true });
        const playlist = path.join(segDir, 'index.m3u8');
        await execFileAsync('ffmpeg', [
            '-y',
            '-i',
            r.mp4Path,
            '-c',
            'copy',
            '-hls_time',
            '4',
            '-hls_playlist_type',
            'vod',
            '-hls_segment_filename',
            path.join(segDir, 'seg_%03d.ts'),
            playlist,
        ]);
        const bw = r.height === 1080 ? 5000000 : r.height === 720 ? 2500000 : 1000000;
        const w = r.height === 1080 ? 1920 : r.height === 720 ? 1280 : 854;
        lines.push(`#EXT-X-STREAM-INF:BANDWIDTH=${bw},RESOLUTION=${w}x${r.height}`);
        lines.push(`${r.height}p/index.m3u8`);
    }

    fs.writeFileSync(masterPath, lines.join('\n') + '\n');
    return masterPath;
}

/** Simple DASH VOD via ffmpeg mpd muxer from highest rendition MP4. */
export async function buildDash(mp4Path: string, outDir: string): Promise<string> {
    fs.mkdirSync(outDir, { recursive: true });
    const manifest = path.join(outDir, 'manifest.mpd');
    await execFileAsync('ffmpeg', [
        '-y',
        '-i',
        mp4Path,
        '-c',
        'copy',
        '-f',
        'dash',
        '-seg_duration',
        '4',
        '-use_template',
        '1',
        '-use_timeline',
        '1',
        manifest,
    ]);
    return manifest;
}

export async function processVideoLadder(
    inputPath: string,
    workDir: string,
): Promise<{
    renditions: Array<{ height: number; mp4Path: string; mp4Key?: string }>;
    durationSec: number;
    width: number;
    height: number;
}> {
    fs.mkdirSync(workDir, { recursive: true });
    const dims = await probeDimensions(inputPath);
    const durationSec = await probeDuration(inputPath);
    const sourceH = dims.height || 720;

    const renditions: Array<{ height: number; mp4Path: string }> = [];
    for (const spec of LADDER) {
        if (spec.height > sourceH + 50) continue;
        const mp4Path = path.join(workDir, `${spec.height}p.mp4`);
        await transcodeMp4(inputPath, mp4Path, spec);
        renditions.push({ height: spec.height, mp4Path });
    }

    if (!renditions.length) {
        const mp4Path = path.join(workDir, '480p.mp4');
        await transcodeMp4(inputPath, mp4Path, LADDER[0]);
        renditions.push({ height: 480, mp4Path });
    }

    return {
        renditions,
        durationSec,
        width: dims.width,
        height: dims.height,
    };
}
