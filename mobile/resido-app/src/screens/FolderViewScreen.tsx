import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    TextInput, SafeAreaView, StatusBar, Dimensions, Image,
    ActivityIndicator, Alert, Modal
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import BottomNav from '../components/BottomNav';
import { mySpaceApi, authApi } from '../services/api';
import axios from 'axios';

const { width, height } = Dimensions.get('window');

export default function FolderViewScreen() {
    const router = useRouter();
    const { id, name } = useLocalSearchParams();
    const [files, setFiles] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    useFocusEffect(
        useCallback(() => {
            if (id) loadFiles();
        }, [id])
    );

    const loadFiles = async () => {
        try {
            setLoading(true);
            const { data } = await mySpaceApi.getDocumentFolder(id as string);
            setFiles(data.files || []);
        } catch (error) {
            console.error('Failed to load files', error);
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (type: 'IMAGE' | 'FILE') => {
        try {
            let result: any;
            if (type === 'IMAGE') {
                result = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ImagePicker.MediaTypeOptions.Images,
                    quality: 0.8,
                });
            } else {
                result = await DocumentPicker.getDocumentAsync({
                    type: '*/*',
                    copyToCacheDirectory: true
                });
            }

            if (result.canceled) return;

            const asset = type === 'IMAGE' ? result.assets[0] : result.assets[0];
            const fileName = asset.name || `file_${Date.now()}`;
            const mimeType = asset.mimeType || 'application/octet-stream';

            setUploading(true);
            setUploadProgress(0.1);

            // 1. Get presigned URL
            const { data: { uploadUrl, fileUrl } } = await authApi.getPresignedUrl(fileName, mimeType, 'DOCUMENTS');

            // 2. Upload to R2
            const response = await fetch(asset.uri);
            const blob = await response.blob();

            await axios.put(uploadUrl, blob, {
                headers: { 'Content-Type': mimeType },
                onUploadProgress: (progressEvent) => {
                    const progress = progressEvent.loaded / (progressEvent.total || 1);
                    setUploadProgress(0.2 + progress * 0.7);
                }
            });

            // 3. Save to backend
            await mySpaceApi.addDocumentFile({
                folderId: id as string,
                name: fileName,
                url: fileUrl,
                type: type,
                size: asset.size
            });

            setUploadProgress(1);
            setTimeout(() => {
                setUploading(false);
                loadFiles();
            }, 500);

        } catch (error: any) {
            console.error('Upload failed:', error);
            const errorMsg = error.response?.data?.message || 'Upload failed. Please try again.';
            Alert.alert('Error', errorMsg);
            setUploading(false);
        }
    };

    const getFileColor = (type: string) => {
        if (type === 'IMAGE') return '#3b82f6';
        if (type.includes('pdf')) return '#ef4444';
        return '#0d9488';
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />
            
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    <View style={{ flex: 1, marginLeft: 16 }}>
                        <Text style={styles.headerTitle}>{name || 'Folder'}</Text>
                        <Text style={styles.headerSub}>{files.length} Documents</Text>
                    </View>
                    <View style={styles.headerActions}>
                        <TouchableOpacity style={styles.iconBtn}><Ionicons name="search" size={22} color="#fff" /></TouchableOpacity>
                        <TouchableOpacity style={styles.iconBtn} onPress={() => router.push({ pathname: '/share-doc', params: { folderId: id, name } })}>
                            <Ionicons name="share-social" size={22} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Search Bar */}
                <View style={styles.searchSection}>
                    <View style={styles.searchBar}>
                        <Ionicons name="search" size={20} color="#64748b" />
                        <TextInput 
                            placeholder={`Search documents in ${name || 'Folder'}`} 
                            style={styles.searchInput}
                            placeholderTextColor="#94a3b8"
                        />
                        <TouchableOpacity><Ionicons name="options-outline" size={20} color="#64748b" /></TouchableOpacity>
                    </View>
                </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
                {loading ? (
                    <ActivityIndicator color="#0d9488" style={{ marginTop: 40 }} />
                ) : files.length === 0 ? (
                    <Text style={styles.emptyText}>No documents here yet. Upload one!</Text>
                ) : (
                    <View style={styles.listContainer}>
                        {files.map((doc) => (
                            <TouchableOpacity 
                                key={doc.id} 
                                style={styles.docCard}
                                onPress={() => router.push({ pathname: '/share-doc', params: { id: doc.id, name: doc.name, url: doc.url } })}
                            >
                                <View style={[styles.typeIconBox, { backgroundColor: getFileColor(doc.type) }]}>
                                    <Text style={styles.typeText}>{doc.type === 'IMAGE' ? 'IMG' : 'DOC'}</Text>
                                </View>
                                <View style={styles.docInfo}>
                                    <Text style={styles.docName}>{doc.name}</Text>
                                    <Text style={styles.docSub}>{doc.size ? (doc.size / 1024 / 1024).toFixed(2) + ' MB' : 'Unknown size'} • {new Date(doc.updatedAt).toLocaleDateString()}</Text>
                                </View>
                                <TouchableOpacity><Ionicons name="ellipsis-vertical" size={18} color="#64748b" /></TouchableOpacity>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </ScrollView>

            {/* FAB Options */}
            <View style={styles.fabContainer}>
                <TouchableOpacity style={[styles.fabMini, { bottom: 170 }]} onPress={() => handleFileUpload('FILE')}>
                    <Ionicons name="document-text" size={24} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.fabMini, { bottom: 100 }]} onPress={() => handleFileUpload('IMAGE')}>
                    <Ionicons name="image" size={24} color="#fff" />
                </TouchableOpacity>
            </View>

            {/* Uploading Overlay */}
            <Modal transparent visible={uploading}>
                <View style={styles.overlay}>
                    <View style={styles.progressBox}>
                        <ActivityIndicator size="large" color="#0d9488" />
                        <Text style={styles.progressText}>Uploading... {Math.round(uploadProgress * 100)}%</Text>
                        <View style={styles.progressBarBg}>
                            <View style={[styles.progressBar, { width: `${uploadProgress * 100}%` }]} />
                        </View>
                    </View>
                </View>
            </Modal>

            <BottomNav activeTab="Home" />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    header: { padding: 20, paddingTop: 60, backgroundColor: '#0f172a' },
    headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
    headerSub: { fontSize: 13, color: '#94a3b8', marginTop: 2 },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
    
    searchSection: { marginTop: 8 },
    searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, paddingHorizontal: 16, height: 50, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    searchInput: { flex: 1, marginLeft: 10, color: '#fff', fontSize: 15 },

    listContainer: { paddingHorizontal: 20, marginTop: 12 },
    docCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', padding: 14, borderRadius: 20, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    typeIconBox: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    typeText: { color: '#fff', fontSize: 11, fontWeight: '900' },
    docInfo: { flex: 1, marginLeft: 16 },
    docName: { fontSize: 15, fontWeight: '800', color: '#fff' },
    docSub: { fontSize: 12, color: '#64748b', marginTop: 4 },

    emptyText: { textAlign: 'center', color: '#94a3b8', marginTop: 40, fontSize: 15, fontWeight: '600' },
    fabContainer: { position: 'absolute', bottom: 0, right: 20 },
    fabMini: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#0d9488', alignItems: 'center', justifyContent: 'center', shadowColor: '#0d9488', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },

    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center' },
    progressBox: { backgroundColor: '#1e293b', padding: 30, borderRadius: 24, alignItems: 'center', width: width * 0.8 },
    progressText: { color: '#fff', fontSize: 16, fontWeight: '700', marginTop: 20, marginBottom: 15 },
    progressBarBg: { width: '100%', height: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' },
    progressBar: { height: '100%', backgroundColor: '#0d9488' }
});
