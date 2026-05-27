import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ImageSourcePropType } from 'react-native';
import { resolveMediaUrl, withCacheBust } from '../utils/mediaUrl';

type WorkspaceBubbleProps = {
    label: string;
    isActive: boolean;
    onPress: () => void;
    imageUri?: string | null;
    fallbackSource?: ImageSourcePropType;
    cacheBust?: number;
    /**
     * Optional initial / abbreviation to display when no image is available
     * (or the image fails to load). Defaults to the first character of `label`.
     */
    initial?: string;
};

export function WorkspaceBubble({
    label,
    isActive,
    onPress,
    imageUri,
    fallbackSource,
    cacheBust,
    initial,
}: WorkspaceBubbleProps) {
    const resolved = imageUri ? resolveMediaUrl(imageUri) : null;
    const uri = resolved ? withCacheBust(resolved, cacheBust) : null;
    const [failed, setFailed] = useState(false);

    // Reset failure state whenever the underlying URL changes so a fresh
    // profile upload gets a chance to load even if a previous one failed.
    useEffect(() => {
        setFailed(false);
    }, [uri]);

    const showImage = !!uri && !failed;
    const fallback: ImageSourcePropType | null = fallbackSource ?? null;
    const initialChar = (initial || label || '?').trim().charAt(0).toUpperCase() || '?';

    return (
        <TouchableOpacity style={[styles.wsBubble, isActive && styles.wsBubbleActive]} onPress={onPress}>
            <View style={[styles.wsBubbleImgBox, isActive && styles.wsBubbleImgBoxActive]}>
                {showImage ? (
                    <Image
                        source={{ uri: uri as string }}
                        style={styles.wsBubbleImg}
                        resizeMode="cover"
                        onError={() => setFailed(true)}
                    />
                ) : fallback ? (
                    <Image source={fallback} style={styles.wsBubbleImg} resizeMode="cover" />
                ) : (
                    <View style={[styles.wsBubbleImg, styles.initialBox, isActive && styles.initialBoxActive]}>
                        <Text style={[styles.initialText, isActive && styles.initialTextActive]}>
                            {initialChar}
                        </Text>
                    </View>
                )}
            </View>
            <Text style={[styles.wsBubbleLabel, isActive && styles.wsBubbleLabelActive]} numberOfLines={1}>
                {label}
            </Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    wsBubble: { alignItems: 'center', width: 85, opacity: 0.5 },
    wsBubbleActive: { opacity: 1 },
    wsBubbleImgBox: {
        width: 45,
        height: 45,
        borderRadius: 22.5,
        padding: 2,
        backgroundColor: '#E8E2F2',
        borderWidth: 1,
        borderColor: '#D4C9E8',
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
    },
    wsBubbleImgBoxActive: {
        width: 75,
        height: 75,
        borderRadius: 37.5,
        borderColor: '#8b5cf6',
        borderWidth: 3,
    },
    wsBubbleImg: { width: '100%', height: '100%', borderRadius: 22.5 },
    initialBox: {
        backgroundColor: '#8b5cf6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    initialBoxActive: { backgroundColor: '#7c3aed' },
    initialText: { color: '#2D2445', fontWeight: '900', fontSize: 18 },
    initialTextActive: { fontSize: 28 },
    wsBubbleLabel: { color: '#7A6B9C', fontSize: 10, fontWeight: '700', marginTop: 8 },
    wsBubbleLabelActive: { color: '#8b5cf6', fontSize: 12, fontWeight: '900' },
});
