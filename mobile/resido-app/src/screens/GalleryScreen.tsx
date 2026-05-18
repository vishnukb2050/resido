import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Image, Dimensions, TouchableOpacity, Alert, Modal, TextInput, SafeAreaView } from 'react-native';
import { api, communityApi } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import BottomNav from '../components/BottomNav';

const { width } = Dimensions.get('window');

export default function GalleryScreen() {
    const { activeWorkspace } = useAuthStore();
    const router = useRouter();
    const [folders, setFolders] = useState<any[]>([]);
    const [selectedFolder, setSelectedFolder] = useState<any>(null);
    const [photos, setPhotos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    
    const [folderModal, setFolderModal] = useState(false);
    const [folderName, setFolderName] = useState('');

    useEffect(() => {
        fetchFolders();
    }, [activeWorkspace]);

    const fetchFolders = async () => {
        try {
            const r = await api.get('/community/gallery/folders');
            setFolders(r.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const fetchGallery = async (folderId: string) => {
        setLoading(true);
        try {
            const r = await api.get(`/community/gallery?folderId=${folderId}`);
            setPhotos(r.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateFolder = async () => {
        if (!folderName) return;
        try {
            await api.post('/community/gallery/folders', { name: folderName });
            setFolderModal(false);
            setFolderName('');
            fetchFolders();
        } catch (error) {
            Alert.alert('Error', 'Failed to create folder');
        }
    };

    const handleUpload = async () => {
        if (!selectedFolder) return Alert.alert('Error', 'Please select a folder first');

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.All,
            allowsEditing: true,
            quality: 0.8,
        });

        if (!result.canceled) {
            setUploading(true);
            try {
                const asset = result.assets[0];
                await api.post('/community/gallery', {
                    title: 'New Upload',
                    mediaUrls: [asset.uri],
                    folderId: selectedFolder.id,
                    type: asset.type === 'video' ? 'VIDEO' : 'IMAGE',
                    category: 'Community'
                });
                fetchGallery(selectedFolder.id);
            } catch (error) {
                Alert.alert('Error', 'Failed to upload media');
            } finally {
                setUploading(false);
            }
        }
    };

    const openFolder = (folder: any) => {
        setSelectedFolder(folder);
        fetchGallery(folder.id);
    };

    const goBack = () => {
        if (selectedFolder) {
            setSelectedFolder(null);
            setPhotos([]);
        } else {
            router.back();
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TouchableOpacity onPress={goBack} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color="#1e293b" />
                    </TouchableOpacity>
                    <View style={{ marginLeft: 12 }}>
                        <Text style={styles.headerTitle}>{selectedFolder ? selectedFolder.name : 'Gallery'}</Text>
                        <Text style={styles.subTitle}>{activeWorkspace?.tenantName || 'My Community'}</Text>
                    </View>
                </View>
                <View style={{ flexDirection: 'row' }}>
                    {!selectedFolder ? (
                        <TouchableOpacity style={styles.actionBtn} onPress={() => setFolderModal(true)}>
                            <Ionicons name="add" size={24} color="#fff" />
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity style={styles.actionBtn} onPress={handleUpload} disabled={uploading}>
                            {uploading ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="cloud-upload-outline" size={24} color="#fff" />}
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {loading && folders.length === 0 ? (
                <View style={{ flex: 1, justifyContent: 'center' }}>
                    <ActivityIndicator size="large" color="#0d9488" />
                </View>
            ) : !selectedFolder ? (
                <FlatList
                    data={folders}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.list}
                    numColumns={2}
                    renderItem={({ item }) => (
                        <TouchableOpacity style={styles.folderCard} onPress={() => openFolder(item)}>
                            <View style={styles.folderThumb}>
                                <Ionicons name="folder" size={60} color="#0d9488" />
                                <View style={styles.itemBadge}>
                                    <Text style={styles.itemCount}>{item._count?.items || 0}</Text>
                                </View>
                            </View>
                            <Text style={styles.folderTitle}>{item.name}</Text>
                        </TouchableOpacity>
                    )}
                    ListEmptyComponent={<Text style={styles.empty}>Create a folder to start uploading</Text>}
                />
            ) : (
                <FlatList
                    data={photos}
                    keyExtractor={(item) => item.id}
                    numColumns={2}
                    contentContainerStyle={styles.list}
                    renderItem={({ item }) => (
                        <View style={styles.photoCard}>
                            <Image source={{ uri: item.mediaUrls[0] }} style={styles.image} />
                            {item.type === 'VIDEO' && (
                                <View style={styles.videoOverlay}>
                                    <Ionicons name="play-circle" size={44} color="#fff" />
                                </View>
                            )}
                        </View>
                    )}
                    ListEmptyComponent={loading ? <ActivityIndicator color="#0d9488" /> : <Text style={styles.empty}>No media in this folder</Text>}
                />
            )}

            <Modal visible={folderModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalLabel}>New Folder</Text>
                        <TextInput 
                            style={styles.input} 
                            value={folderName} 
                            onChangeText={setFolderName} 
                            placeholder="e.g. Summer Event 2024" 
                            placeholderTextColor="#94a3b8"
                        />
                        <View style={styles.modalBtns}>
                            <TouchableOpacity onPress={() => setFolderModal(false)} style={styles.cancelBtn}>
                                <Text style={styles.cancelBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleCreateFolder} style={styles.confirmBtn}>
                                <Text style={styles.confirmBtnText}>Create</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
            <BottomNav />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#fcfcfd' },
    header: { padding: 20, paddingTop: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    backBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#f1f5f9' },
    headerTitle: { fontSize: 20, fontWeight: '900', color: '#1e293b' },
    subTitle: { fontSize: 12, color: '#0d9488', fontWeight: '800', marginTop: 2 },
    actionBtn: { backgroundColor: '#0d9488', width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', shadowColor: '#0d9488', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
    list: { padding: 15, paddingBottom: 110 },
    folderCard: { width: (width - 45) / 2, margin: 7.5, marginBottom: 20 },
    folderThumb: { width: '100%', height: 160, backgroundColor: '#fff', borderRadius: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.02, shadowRadius: 10, elevation: 2 },
    itemBadge: { position: 'absolute', bottom: 15, right: 15, backgroundColor: '#f5f3ff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    itemCount: { fontSize: 12, fontWeight: '900', color: '#0d9488' },
    folderTitle: { marginTop: 12, fontSize: 15, fontWeight: '800', color: '#1e293b', textAlign: 'center' },
    photoCard: { width: (width - 45) / 2, margin: 7.5, backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#f1f5f9' },
    image: { width: '100%', height: 160 },
    videoOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center' },
    empty: { textAlign: 'center', color: '#94a3b8', marginTop: 100, fontSize: 15, fontWeight: '600' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    modalContent: { backgroundColor: '#fff', borderRadius: 30, padding: 25, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
    modalLabel: { fontSize: 18, fontWeight: '900', color: '#1e293b', marginBottom: 20 },
    input: { backgroundColor: '#f8fafc', borderRadius: 16, padding: 18, fontSize: 16, color: '#1e293b', borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 25 },
    modalBtns: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 15 },
    cancelBtnText: { color: '#64748b', fontWeight: '800', fontSize: 15 },
    confirmBtn: { backgroundColor: '#0d9488', paddingHorizontal: 25, paddingVertical: 12, borderRadius: 14 },
    confirmBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
