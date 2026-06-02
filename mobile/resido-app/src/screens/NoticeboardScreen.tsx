import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Modal, TextInput, Alert, Image, Share, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../store/authStore';
import { communityApi } from '../services/api';
import { storageApi } from '../services/storage';
import { resolveMediaUrl } from '../utils/mediaUrl';

/**
 * Renders a notice image at its natural aspect ratio so the full picture
 * is visible (no cropping). Falls back to 16:9 until dimensions load.
 */
function NoticeImage({ uri, style }: { uri: string; style?: any }) {
    const [aspect, setAspect] = useState<number>(16 / 9);

    useEffect(() => {
        if (!uri) return;
        Image.getSize(
            uri,
            (w, h) => {
                if (w > 0 && h > 0) setAspect(w / h);
            },
            () => {},
        );
    }, [uri]);

    return (
        <Image
            source={{ uri }}
            style={[
                {
                    width: '100%',
                    aspectRatio: aspect,
                    borderRadius: 16,
                    backgroundColor: '#ffffff',
                },
                style,
            ]}
            resizeMode="contain"
        />
    );
}

export default function NoticeboardScreen() {
    const router = useRouter();
    const { activeWorkspace, user } = useAuthStore();
    const [notices, setNotices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showAdd, setShowAdd] = useState(false);
    const [posting, setPosting] = useState(false);
    const [photoUri, setPhotoUri] = useState<string | null>(null);

    const isAdmin = activeWorkspace?.role === 'APARTMENT_ADMIN';

    const [newNotice, setNewNotice] = useState({ title: '', body: '' });

    const fetchNotices = useCallback(async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            const { data } = await communityApi.getNotices();
            setNotices(data || []);
        } catch (e) {
            console.error('Fetch notices failed', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            fetchNotices();
        }, [fetchNotices]),
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchNotices(true);
    };

    const handlePickPhoto = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Permission to access gallery is required to upload photos.');
            return;
        }

        // No forced cropping / aspect ratio — attach the full image as-is.
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: false,
            quality: 0.9,
        });

        if (!result.canceled) {
            setPhotoUri(result.assets[0].uri);
        }
    };

    const handleCreate = async () => {
        if (!newNotice.title || !newNotice.body) return;
        if (!isAdmin) {
            Alert.alert('Error', 'Only admins can post notices');
            return;
        }

        setPosting(true);
        try {
            let photoUrl: string | undefined = undefined;
            if (photoUri) {
                const uploadedUrl = await storageApi.uploadFile(
                    photoUri,
                    `notice_${user?.id || 'unknown'}_${Date.now()}.jpg`,
                    'image/jpeg',
                    'notices',
                    activeWorkspace?.tenantId,
                );
                if (uploadedUrl) {
                    photoUrl = uploadedUrl as string;
                }
            }

            await communityApi.createNotice({
                ...newNotice,
                photoUrl,
                postedBy: user?.id
            });

            setShowAdd(false);
            setNewNotice({ title: '', body: '' });
            setPhotoUri(null);
            fetchNotices(true);
            Alert.alert('Success', 'Notice posted successfully!');
        } catch (e) {
            Alert.alert('Error', 'Failed to post notice');
            console.error(e);
        } finally {
            setPosting(false);
        }
    };

    const handleShare = async (item: any) => {
        try {
            const shareMessage = `${item.title}\n\n${item.body}${item.photoUrl ? `\n\nImage: ${item.photoUrl}` : ''}\n\nShared from Resido`;
            await Share.share({
                title: item.title,
                message: shareMessage,
            });
        } catch (error) {
            console.error('Error sharing notice:', error);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#2D2445" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Notice Board</Text>
                {isAdmin ? (
                    <TouchableOpacity style={styles.addBtn} onPress={() => setShowAdd(true)}>
                        <Ionicons name="add" size={24} color="#fff" />
                    </TouchableOpacity>
                ) : <View style={{ width: 44 }} />}
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#8b5cf6" style={{ marginTop: 50 }} />
            ) : (
                <FlatList
                    data={notices}
                    keyExtractor={(item: any) => item.id}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl tintColor="#1d4ed8" refreshing={refreshing} onRefresh={onRefresh} />
                    }
                    renderItem={({ item }: { item: any }) => {
                        const photo = resolveMediaUrl(item.photoUrl);
                        return (
                        <View style={styles.noticeCard}>
                            <View style={styles.cardAccent} />
                            <View style={styles.cardContent}>
                                <Text style={styles.noticeTitle}>{item.title}</Text>
                                <Text style={styles.noticeBody}>{item.body}</Text>

                                {photo ? (
                                    <NoticeImage uri={photo} style={{ marginVertical: 12 }} />
                                ) : null}

                                <View style={styles.cardFooter}>
                                    <Text style={styles.dateText}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                                    <View style={styles.footerActions}>
                                        <TouchableOpacity onPress={() => handleShare(item)} style={styles.shareBtn}>
                                            <Ionicons name="share-social-outline" size={16} color="#94a3b8" />
                                            <Text style={styles.shareText}>Share</Text>
                                        </TouchableOpacity>
                                        <View style={styles.tag}>
                                            <Text style={styles.tagText}>OFFICIAL</Text>
                                        </View>
                                    </View>
                                </View>
                            </View>
                        </View>
                        );
                    }}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Ionicons name="megaphone-outline" size={64} color="rgba(255,255,255,0.05)" />
                            <Text style={styles.emptyTitle}>No Notices Yet</Text>
                            <Text style={styles.emptySub}>Important community updates will appear here.</Text>
                        </View>
                    }
                />
            )}

            <Modal visible={showAdd} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Post New Notice</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Notice Title"
                            placeholderTextColor="#64748b"
                            value={newNotice.title}
                            onChangeText={(t) => setNewNotice({...newNotice, title: t})}
                            editable={!posting}
                        />
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder="Notice Body"
                            placeholderTextColor="#64748b"
                            multiline
                            value={newNotice.body}
                            onChangeText={(t) => setNewNotice({...newNotice, body: t})}
                            editable={!posting}
                        />

                        {photoUri ? (
                            <View style={styles.modalPhotoContainer}>
                                <NoticeImage uri={photoUri} style={styles.modalPhotoPreview} />
                                <TouchableOpacity style={styles.modalRemovePhotoBtn} onPress={() => setPhotoUri(null)} disabled={posting}>
                                    <Ionicons name="trash-outline" size={18} color="#fff" />
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <TouchableOpacity style={styles.modalPhotoPicker} onPress={handlePickPhoto} disabled={posting}>
                                <Ionicons name="image-outline" size={22} color="#8b5cf6" />
                                <Text style={styles.modalPhotoPickerText}>Attach Photo</Text>
                            </TouchableOpacity>
                        )}

                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowAdd(false); setPhotoUri(null); }} disabled={posting}>
                                <Text style={styles.cancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.submitBtn} onPress={handleCreate} disabled={posting}>
                                {posting ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.submitText}>Post Notice</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F5FF' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 40 },
    headerTitle: { fontSize: 20, fontWeight: '900', color: '#2D2445' },
    backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F4EEFC', alignItems: 'center', justifyContent: 'center' },
    addBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#8b5cf6', alignItems: 'center', justifyContent: 'center' },
    listContent: { padding: 20 },
    noticeCard: { backgroundColor: '#ffffff', borderRadius: 24, marginBottom: 16, overflow: 'hidden', flexDirection: 'row', borderWidth: 1, borderColor: '#D4C9E8' },
    cardAccent: { width: 6, backgroundColor: '#8b5cf6' },
    cardContent: { flex: 1, padding: 20 },
    noticeTitle: { fontSize: 18, fontWeight: '800', color: '#2D2445', marginBottom: 8 },
    noticeBody: { fontSize: 14, color: '#9A8EBA', lineHeight: 22, marginBottom: 15 },
    noticeImage: { width: '100%', borderRadius: 16, marginVertical: 12, borderWidth: 1, borderColor: '#D4C9E8' },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#EFE9F8', paddingTop: 12 },
    dateText: { fontSize: 12, color: '#7A6B9C', fontWeight: '600' },
    footerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    shareBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8, backgroundColor: '#ffffff' },
    shareText: { color: '#9A8EBA', fontSize: 11, fontWeight: '700' },
    tag: { backgroundColor: 'rgba(37, 99, 235, 0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    tagText: { color: '#8b5cf6', fontSize: 10, fontWeight: '900' },
    emptyState: { alignItems: 'center', marginTop: 100, paddingHorizontal: 40 },
    emptyTitle: { fontSize: 20, fontWeight: '800', color: '#2D2445', marginTop: 20 },
    emptySub: { fontSize: 14, color: '#7A6B9C', textAlign: 'center', marginTop: 10 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 24 },
    modalContent: { backgroundColor: '#ffffff', borderRadius: 28, padding: 24 },
    modalTitle: { fontSize: 22, fontWeight: '900', color: '#2D2445', marginBottom: 20, textAlign: 'center' },
    input: { backgroundColor: '#ffffff', borderRadius: 16, borderWidth: 1, borderColor: '#C4B5DC', color: '#2D2445', padding: 18, fontSize: 16, fontWeight: '600', marginBottom: 15 },
    textArea: { height: 120, textAlignVertical: 'top', marginBottom: 15 },
    modalPhotoPicker: { height: 50, borderRadius: 16, borderStyle: 'dashed', borderWidth: 1.5, borderColor: 'rgba(29, 78, 216, 0.4)', backgroundColor: 'rgba(255, 255, 255, 0.01)', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, marginBottom: 20 },
    modalPhotoPickerText: { color: '#9A8EBA', fontSize: 14, fontWeight: '700' },
    modalPhotoContainer: { borderRadius: 16, overflow: 'hidden', position: 'relative', borderWidth: 1, borderColor: '#C4B5DC', marginBottom: 20, maxHeight: 280 },
    modalPhotoPreview: { width: '100%' },
    modalRemovePhotoBtn: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(239, 68, 68, 0.85)', width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    modalActions: { flexDirection: 'row', gap: 15 },
    cancelBtn: { flex: 1, padding: 18, alignItems: 'center' },
    cancelText: { color: '#7A6B9C', fontWeight: '700' },
    submitBtn: { flex: 2, backgroundColor: '#8b5cf6', borderRadius: 16, padding: 18, alignItems: 'center' },
    submitText: { color: '#2D2445', fontWeight: '900' }
});
