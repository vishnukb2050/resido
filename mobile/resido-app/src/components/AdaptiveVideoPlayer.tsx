import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View, Text } from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { resolveMediaUrl } from '../utils/mediaUrl';

export type PlaybackInfo = {
    hlsUrl?: string;
    dashUrl?: string;
    mp4Url?: string;
    duration?: number;
};

type Props = {
    playback?: PlaybackInfo | null;
    posterUrl?: string | null;
    fallbackUrl?: string | null;
    mediaStatus?: string;
    style?: object;
    autoPlay?: boolean;
    isActive?: boolean;
    loop?: boolean;
    muted?: boolean;
    useNativeControls?: boolean;
    onFinish?: () => void;
    onStatusUpdate?: (status: AVPlaybackStatus) => void;
};

export function AdaptiveVideoPlayer({
    playback,
    posterUrl,
    fallbackUrl,
    mediaStatus = 'READY',
    style,
    autoPlay = true,
    isActive = true,
    loop = true,
    muted = false,
    useNativeControls = false,
    onFinish,
    onStatusUpdate,
}: Props) {
    const ref = useRef<Video>(null);
    const [loading, setLoading] = useState(true);

    const processing = mediaStatus === 'PROCESSING' || mediaStatus === 'QUEUED';
    const failed = mediaStatus === 'FAILED';

    const streamUrl = (() => {
        if (processing || failed) return null;
        const hls = playback?.hlsUrl ? resolveMediaUrl(playback.hlsUrl) : undefined;
        const dash = playback?.dashUrl ? resolveMediaUrl(playback.dashUrl) : undefined;
        const mp4 = playback?.mp4Url ? resolveMediaUrl(playback.mp4Url) : undefined;
        const legacy = fallbackUrl ? resolveMediaUrl(fallbackUrl) : undefined;
        if (Platform.OS === 'ios' && hls) return hls;
        if (Platform.OS === 'android' && dash) return dash;
        return mp4 || hls || legacy || undefined;
    })();

    useEffect(() => {
        if (!ref.current || !streamUrl) return;
        if (isActive && autoPlay) {
            ref.current.playAsync().catch(() => undefined);
        } else {
            ref.current.pauseAsync().catch(() => undefined);
        }
    }, [streamUrl, autoPlay, isActive]);

    if (processing) {
        return (
            <View style={[styles.container, style]}>
                {posterUrl ? (
                    <Video
                        style={StyleSheet.absoluteFill}
                        source={{ uri: resolveMediaUrl(posterUrl) || posterUrl }}
                        resizeMode={ResizeMode.COVER}
                        shouldPlay={false}
                    />
                ) : null}
                <View style={styles.overlay}>
                    <ActivityIndicator size="large" color="#fff" />
                    <Text style={styles.label}>Processing video…</Text>
                </View>
            </View>
        );
    }

    if (failed || !streamUrl) {
        return (
            <View style={[styles.container, styles.fallback, style]}>
                <Text style={styles.label}>
                    {failed ? 'Video processing failed' : 'Video unavailable'}
                </Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, style]}>
            <Video
                ref={ref}
                style={StyleSheet.absoluteFill}
                source={{ uri: streamUrl }}
                resizeMode={ResizeMode.COVER}
                shouldPlay={isActive && autoPlay}
                isLooping={loop}
                isMuted={muted}
                useNativeControls={useNativeControls}
                usePoster={!!posterUrl}
                posterSource={posterUrl ? { uri: resolveMediaUrl(posterUrl) || posterUrl } : undefined}
                onPlaybackStatusUpdate={(s: AVPlaybackStatus) => {
                    onStatusUpdate?.(s);
                    if ('isLoaded' in s && s.isLoaded) {
                        setLoading(false);
                        if (s.didJustFinish && !s.isLooping) onFinish?.();
                    }
                }}
            />
            {loading && (
                <View style={styles.overlay}>
                    <ActivityIndicator size="large" color="#fff" />
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        height: '100%',
        backgroundColor: '#000',
        overflow: 'hidden',
    },
    fallback: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.35)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    label: {
        color: '#fff',
        marginTop: 8,
        fontSize: 14,
    },
});
