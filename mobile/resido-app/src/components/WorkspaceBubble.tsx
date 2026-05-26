import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ImageSourcePropType } from 'react-native';
import { resolveMediaUrl, withCacheBust } from '../utils/mediaUrl';

type WorkspaceBubbleProps = {
    label: string;
    isActive: boolean;
    onPress: () => void;
    imageUri?: string | null;
    fallbackSource?: ImageSourcePropType;
    cacheBust?: number;
};

export function WorkspaceBubble({
    label,
    isActive,
    onPress,
    imageUri,
    fallbackSource,
    cacheBust,
}: WorkspaceBubbleProps) {
    const resolved = imageUri ? resolveMediaUrl(imageUri) : null;
    const uri = resolved ? withCacheBust(resolved, cacheBust) : null;
    const source: ImageSourcePropType = uri
        ? { uri }
        : fallbackSource || require('../../assets/icon.png');

    return (
        <TouchableOpacity style={[styles.wsBubble, isActive && styles.wsBubbleActive]} onPress={onPress}>
            <View style={[styles.wsBubbleImgBox, isActive && styles.wsBubbleImgBoxActive]}>
                <Image source={source} style={styles.wsBubbleImg} resizeMode="cover" />
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
        backgroundColor: '#1e293b',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
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
    wsBubbleImg: { width: '100%', height: '100%' },
    wsBubbleLabel: { color: '#94a3b8', fontSize: 10, fontWeight: '700', marginTop: 8 },
    wsBubbleLabelActive: { color: '#8b5cf6', fontSize: 12, fontWeight: '900' },
});
