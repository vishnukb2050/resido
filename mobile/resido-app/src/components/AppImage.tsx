import React from 'react';
import { Image as ExpoImage, ImageProps as ExpoImageProps } from 'expo-image';
import { resolveMediaUrl } from '../utils/mediaUrl';

/**
 * App-wide image primitive. Wraps `expo-image` so every remote image gets:
 *   - memory + disk caching (instant re-renders, no flicker on revisit),
 *   - a low-cost fade-in + neutral placeholder while loading,
 *   - automatic R2/key → public URL resolution via `resolveMediaUrl`.
 *
 * Prefer this over the React Native `Image` for any network image — RN `Image`
 * has no disk cache, so the same avatar/poster is re-downloaded on every mount.
 */

// 1x1 neutral gray placeholder so cells aren't blank/white while loading.
const NEUTRAL_PLACEHOLDER = { uri: 'data:image/gif;base64,R0lGODlhAQABAIAAAOTk5P///yH5BAEAAAEALAAAAAABAAEAAAICTAEAOw==' };

type AppImageProps = Omit<ExpoImageProps, 'source'> & {
    /** Remote URL, R2 key, or local URI. `null`/`undefined` renders placeholder. */
    uri?: string | null;
    /** Escape hatch for an already-built `source` object. */
    source?: ExpoImageProps['source'];
};

function AppImageBase({ uri, source, ...rest }: AppImageProps) {
    const resolved = source ?? (uri ? { uri: resolveMediaUrl(uri) || uri } : undefined);
    return (
        <ExpoImage
            source={resolved}
            placeholder={NEUTRAL_PLACEHOLDER}
            placeholderContentFit="cover"
            cachePolicy="memory-disk"
            contentFit="cover"
            transition={150}
            recyclingKey={typeof uri === 'string' ? uri : undefined}
            {...rest}
        />
    );
}

export const AppImage = React.memo(AppImageBase);
export default AppImage;
