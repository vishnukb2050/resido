import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Image, Dimensions, TouchableOpacity, Alert, Modal, TextInput } from 'react-native';
import { api, communityApi } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

const { width } = Dimensions.get('window');

export default function GalleryScreen() {
    const { activeWorkspace } = useAuthStore();
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
            mediaTypes: ImagePicker.MediaTypeOptions.All, // Support Videos too
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
            // navigation logic
        }
    };

    if (loading && folders.length === 0) return <ActivityIndicator style={{ flex: 1 }} color="#6366f1" />;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {selectedFolder && (
                        <TouchableOpacity onPress={goBack} style={{ marginRight: 10 }}>
                            <Ionicons name="arrow-back" size={24} color="#1e293b" />
                        </TouchableOpacity>
                    )}
                    <View>
                        <Text style={styles.title}>{selectedFolder ? selectedFolder.name : 'Gallery'}</Text>
                        <Text style={styles.subTitle}>{activeWorkspace?.tenantName}</Text>
                    </View>
                </View>
                <View style={{ flexDirection: 'row' }}>
                    {!selectedFolder && (
                        <TouchableOpacity style={[styles.actionBtn, { marginRight: 8 }]} onPress={() => setFolderModal(true)}>
                            <Ionicons name="add" size={24} color="#fff" />
                        </TouchableOpacity>
                    )}
                    {selectedFolder && (
                        <TouchableOpacity style={styles.actionBtn} onPress={handleUpload} disabled={uploading}>
                            {uploading ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="cloud-upload-outline" size={24} color="#fff" />}
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {!selectedFolder ? (
                <FlatList
                    data={folders}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.list}
                    numColumns={2}
                    renderItem={({ item }) => (
                        <TouchableOpacity style={styles.folderCard} onPress={() => openFolder(item)}>
                            <View style={styles.folderThumb}>
                                <Ionicons name="folder" size={60} color="#6366f1" />
                                <Text style={styles.itemCount}>{item._count?.items || 0}</Text>
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
                        <View style={styles.card}>
                            <Image source={{ uri: item.mediaUrls[0] }} style={styles.image} />
                            {item.type === 'VIDEO' && (
                                <View style={styles.videoOverlay}>
                                    <Ionicons name="play-circle" size={40} color="#fff" />
                                </View>
                            )}
                        </View>
                    )}
                    ListEmptyComponent={loading ? <ActivityIndicator color="#6366f1" /> : <Text style={styles.empty}>No media in this folder</Text>}
                />
            )}

            <Modal visible={folderModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalLabel}>New Folder Name</Text>
                        <TextInput 
                            style={styles.input} 
                            value={folderName} 
                            onChangeText={setFolderName} 
                            placeholder="e.g. Summer Event 2024" 
                        />
                        <View style={styles.modalBtns}>
                            <TouchableOpacity onPress={() => setFolderModal(false)} style={styles.cancelBtn}>
                                <Text>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleCreateFolder} style={styles.confirmBtn}>
                                <Text style={{ color: '#fff', fontWeight: '700' }}>Create</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: { padding: 20, paddingTop: 60, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    actionBtn: { backgroundColor: '#6366f1', width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    title: { fontSize: 24, fontWeight: '800', color: '#1e293b' },
    subTitle: { fontSize: 13, color: '#6366f1', fontWeight: '600', marginTop: 2 },
    list: { padding: 10 },
    folderCard: { width: (width - 40) / 2, margin: 5, marginBottom: 20 },
    folderThumb: { width: '100%', height: 150, backgroundColor: '#fff', borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#f1f5f9', position: 'relative' },
    itemCount: { position: 'absolute', bottom: 10, right: 15, fontSize: 14, fontWeight: '800', color: '#6366f1' },
    folderTitle: { marginTop: 10, fontSize: 16, fontWeight: '700', color: '#1e293b', textAlign: 'center' },
    card: { width: (width - 40) / 2, margin: 5, backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', elevation: 2, position: 'relative' },
    image: { width: '100%', height: 150 },
    videoOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center' },
    empty: { textAlign: 'center', color: '#94a3b8', marginTop: 100, width: '100%' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    modalContent: { backgroundColor: '#fff', borderRadius: 24, padding: 24 },
    modalLabel: { fontSize: 16, fontWeight: '800', color: '#1e293b', marginBottom: 15 },
    input: { backgroundColor: '#f1f5f9', borderRadius: 12, padding: 12, marginBottom: 20 },
    modalBtns: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' },
    cancelBtn: { marginRight: 20 },
    confirmBtn: { backgroundColor: '#6366f1', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
});
