import { useEffect } from 'react';
import { getLocalUri, downloadVideo } from '../utils/videoCache';
import * as FileSystem from 'expo-file-system';

export function useVideoPrefetch(flares: any[], activeIndex: number) {
  useEffect(() => {
    if (!flares || flares.length === 0 || activeIndex < 0) return;

    // Look ahead to download the next 2 videos in the feed
    const targets = flares.slice(activeIndex + 1, activeIndex + 3);

    targets.forEach(async (item) => {
      const url = item.mediaUrls?.[0] || (item.itemType === 'FLARE' && item.mediaUrls?.[0]);
      if (!url) return;

      const localUri = getLocalUri(url);
      try {
        const info = await FileSystem.getInfoAsync(localUri);
        if (!info.exists) {
          downloadVideo(url, localUri);
        }
      } catch (err) {
        console.warn('[VideoPrefetch] Failed to check path info', err);
      }
    });
  }, [flares, activeIndex]);
}
