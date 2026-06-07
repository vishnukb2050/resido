import * as FileSystem from 'expo-file-system';

const CACHE_FOLDER = `${FileSystem.cacheDirectory}video-cache/`;

// Ensure cache directory exists
export async function initVideoCache() {
  try {
    const info = await FileSystem.getInfoAsync(CACHE_FOLDER);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(CACHE_FOLDER, { intermediates: true });
    }
  } catch (err) {
    console.warn('[VideoCache] Failed to initialize folder', err);
  }
}

// Convert a remote URL to a unique local filename inside cache
export function getLocalUri(remoteUrl: string): string {
  const filename = encodeURIComponent(remoteUrl.split('/').pop() || 'video.mp4');
  return `${CACHE_FOLDER}${filename}`;
}

// Check if video is cached, return local URI if ready, download in background otherwise
export async function getOrCacheVideo(remoteUrl: string): Promise<string> {
  if (!remoteUrl) return '';
  
  await initVideoCache();
  const localUri = getLocalUri(remoteUrl);
  
  try {
    const info = await FileSystem.getInfoAsync(localUri);
    if (info.exists) {
      return localUri;
    }
    // Download in background and return remote URL to keep playback working instantly
    downloadVideo(remoteUrl, localUri);
  } catch (err) {
    console.warn('[VideoCache] Failed to verify file path', err);
  }
  
  return remoteUrl;
}

// Perform background download
export async function downloadVideo(remoteUrl: string, localUri: string): Promise<string | null> {
  try {
    const downloadRes = await FileSystem.downloadAsync(remoteUrl, localUri);
    return downloadRes.uri;
  } catch (err) {
    console.warn(`[VideoCache] Download failed: ${remoteUrl}`, err);
    return null;
  }
}
