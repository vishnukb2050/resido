import React from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    SafeAreaView, StatusBar,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export default function ShareDocScreen() {
    const router = useRouter();
    const { id, folderId, name, isFolder, size } = useLocalSearchParams();

    // Sharing a folder → use folderId. Sharing a single file → use id.
    const isFolderShare = isFolder === 'true' || (!id && !!folderId);
    const itemId = (isFolderShare ? folderId : id) as string | undefined;

    const handleSharePress = (targetType: 'CONTACT' | 'GROUP' | 'PROFILE') => {
        if (!itemId) return;
        const pathname =
            targetType === 'PROFILE'
                ? '/select-profiles'
                : targetType === 'CONTACT'
                ? '/select-contacts'
                : '/select-groups';
        router.push({
            pathname,
            params: {
                shareType: 'DOC',
                itemId,
                isFolder: isFolderShare ? 'true' : 'false',
            },
        });
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#2D2445" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{isFolderShare ? 'Share Folder' : 'Share Document'}</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {/* File Preview Card */}
                <View style={styles.fileCard}>
                    <View style={styles.fileIconBox}>
                        <MaterialCommunityIcons
                            name={isFolderShare ? 'folder' : 'file-document'}
                            size={28}
                            color="#fff"
                        />
                    </View>
                    <View style={styles.fileInfo}>
                        <Text style={styles.fileName} numberOfLines={1}>{name || (isFolderShare ? 'Folder' : 'Document')}</Text>
                        <Text style={styles.fileSub}>{isFolderShare ? 'Folder' : (size || 'File')}</Text>
                    </View>
                </View>

                {/* Share Options */}
                <Text style={styles.sectionTitle}>Share with</Text>
                <ShareOption
                    icon="person-circle-outline"
                    title="Profile names"
                    desc="Search users by their profile name"
                    accent="#8b5cf6"
                    onPress={() => handleSharePress('PROFILE')}
                />
                <ShareOption
                    icon="person-outline"
                    title="Contacts"
                    desc="Share with people you follow"
                    accent="#60a5fa"
                    onPress={() => handleSharePress('CONTACT')}
                />
                <ShareOption
                    icon="people-outline"
                    title="Groups"
                    desc="Share with one of your groups"
                    accent="#34d399"
                    onPress={() => handleSharePress('GROUP')}
                />
            </ScrollView>
        </SafeAreaView>
    );
}

const ShareOption = ({ icon, title, desc, accent, onPress }: any) => (
    <TouchableOpacity style={styles.shareOption} onPress={onPress}>
        <View style={[styles.shareIconBox, { backgroundColor: accent || '#8b5cf6' }]}>
            <Ionicons name={icon} size={22} color="#fff" />
        </View>
        <View style={styles.shareContent}>
            <Text style={styles.shareTitle}>{title}</Text>
            <Text style={styles.shareSub}>{desc}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#7A6B9C" />
    </TouchableOpacity>
);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F5FF' },
    header: {
        padding: 20, paddingTop: 20,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    },
    backBtn: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: '#F4EEFC', alignItems: 'center', justifyContent: 'center',
    },
    headerTitle: { fontSize: 18, fontWeight: '800', color: '#2D2445' },

    scrollContent: { padding: 20 },
    fileCard: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#F4EEFC', padding: 20, borderRadius: 24,
        marginBottom: 32, borderWidth: 1, borderColor: '#C4B5DC',
    },
    fileIconBox: {
        width: 56, height: 56, borderRadius: 16,
        backgroundColor: '#8b5cf6',
        alignItems: 'center', justifyContent: 'center',
    },
    fileInfo: { flex: 1, marginLeft: 16 },
    fileName: { fontSize: 17, fontWeight: '800', color: '#2D2445' },
    fileSub: { fontSize: 13, color: '#9A8EBA', marginTop: 4 },

    sectionTitle: { fontSize: 16, fontWeight: '800', color: '#2D2445', marginBottom: 16 },
    shareOption: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#ffffff', padding: 16, borderRadius: 20,
        marginBottom: 12, borderWidth: 1, borderColor: '#D4C9E8',
    },
    shareIconBox: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    shareContent: { flex: 1, marginLeft: 16 },
    shareTitle: { fontSize: 16, fontWeight: '700', color: '#2D2445' },
    shareSub: { fontSize: 12, color: '#7A6B9C', marginTop: 2 },
});
