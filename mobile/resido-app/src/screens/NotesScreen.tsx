import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Modal, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../services/api';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../store/authStore';

export default function NotesScreen() {
    const { activeWorkspace } = useAuthStore();
    const [folders, setFolders] = useState<any[]>([]);
    const [selectedFolder, setSelectedFolder] = useState<any>(null);
    const [pages, setPages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Modals
    const [folderModal, setFolderModal] = useState(false);
    const [pageModal, setPageModal] = useState(false);
    const [shareModal, setShareModal] = useState(false);
    
    // Form States
    const [folderName, setFolderName] = useState('');
    const [pageTitle, setPageTitle] = useState('');
    const [pageContent, setPageContent] = useState('');
    const [currentPage, setCurrentPage] = useState<any>(null);
    const [shareTarget, setShareTarget] = useState<'COMMUNITY' | 'GROUP' | 'CONTACT'>('COMMUNITY');
    
    const router = useRouter();

    useEffect(() => {
        fetchFolders();
    }, []);

    const fetchFolders = async () => {
        try {
            const { data } = await api.get('/notes/folders');
            setFolders(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchPages = async (folderId: string) => {
        try {
            const { data } = await api.get(`/notes/folders/${folderId}/pages`);
            setPages(data);
        } catch (error) {
            console.error(error);
        }
    };

    const handleCreateFolder = async () => {
        if (!folderName) return;
        try {
            await api.post('/notes/folders', { name: folderName });
            setFolderModal(false);
            setFolderName('');
            fetchFolders();
        } catch (error) {
            Alert.alert('Error', 'Failed to create folder');
        }
    };

    const handleCreatePage = async () => {
        if (!pageTitle || !pageContent) return;
        try {
            if (currentPage) {
                await api.put(`/notes/pages/${currentPage.id}`, { title: pageTitle, content: pageContent });
            } else {
                await api.post(`/notes/folders/${selectedFolder.id}/pages`, { title: pageTitle, content: pageContent });
            }
            setPageModal(false);
            setPageTitle('');
            setPageContent('');
            setCurrentPage(null);
            fetchPages(selectedFolder.id);
        } catch (error) {
            Alert.alert('Error', 'Failed to save page');
        }
    };

    const handleShare = async () => {
        if (!activeWorkspace?.tenantId) return Alert.alert('Error', 'No active workspace selected');
        try {
            await api.post('/notes/share', {
                folderId: !currentPage ? selectedFolder.id : undefined,
                pageId: currentPage ? currentPage.id : undefined,
                targetType: shareTarget,
                targetId: activeWorkspace.tenantId
            });
            Alert.alert('Success', 'Shared successfully!');
            setShareModal(false);
        } catch (error) {
            Alert.alert('Error', 'Failed to share');
        }
    };

    const openFolder = (folder: any) => {
        setSelectedFolder(folder);
        fetchPages(folder.id);
    };

    const goBack = () => {
        if (selectedFolder) {
            setSelectedFolder(null);
            setPages([]);
        } else {
            router.back();
        }
    };

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#6366f1" /></View>;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={goBack}>
                    <Ionicons name="arrow-back" size={24} color="#1e293b" />
                </TouchableOpacity>
                <Text style={styles.title}>{selectedFolder ? selectedFolder.name : 'My Notes'}</Text>
                <TouchableOpacity 
                    style={styles.addBtn} 
                    onPress={() => selectedFolder ? setPageModal(true) : setFolderModal(true)}
                >
                    <Ionicons name="add" size={24} color="#fff" />
                </TouchableOpacity>
            </View>

            {!selectedFolder ? (
                <FlatList
                    data={folders}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.list}
                    renderItem={({ item }) => (
                        <TouchableOpacity style={styles.folderCard} onPress={() => openFolder(item)}>
                            <View style={styles.folderIcon}>
                                <Ionicons name="folder" size={32} color="#6366f1" />
                            </View>
                            <View style={styles.folderInfo}>
                                <Text style={styles.folderName}>{item.name}</Text>
                                <Text style={styles.folderCount}>{item.pages?.length || 0} pages</Text>
                            </View>
                            <TouchableOpacity onPress={() => { setSelectedFolder(item); setShareModal(true); }}>
                                <Ionicons name="share-social-outline" size={20} color="#64748b" />
                            </TouchableOpacity>
                        </TouchableOpacity>
                    )}
                    ListEmptyComponent={<Text style={styles.empty}>Create a folder to get started</Text>}
                />
            ) : (
                <FlatList
                    data={pages}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.list}
                    renderItem={({ item }) => (
                        <TouchableOpacity 
                            style={styles.pageCard} 
                            onPress={() => { setCurrentPage(item); setPageTitle(item.title); setPageContent(item.content); setPageModal(true); }}
                        >
                            <View style={styles.pageHeader}>
                                <Text style={styles.pageTitle}>{item.title}</Text>
                                <TouchableOpacity onPress={() => { setCurrentPage(item); setShareModal(true); }}>
                                    <Ionicons name="share-social-outline" size={18} color="#6366f1" />
                                </TouchableOpacity>
                            </View>
                            <Text style={styles.pageContent} numberOfLines={2}>{item.content}</Text>
                        </TouchableOpacity>
                    )}
                    ListEmptyComponent={<Text style={styles.empty}>This folder is empty. Add a page!</Text>}
                />
            )}

            {/* Folder Modal */}
            <Modal visible={folderModal} animationType="fade" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.smallModal}>
                        <Text style={styles.modalLabel}>Folder Name</Text>
                        <TextInput 
                            style={styles.input} 
                            value={folderName} 
                            onChangeText={setFolderName} 
                            placeholder="e.g. Personal" 
                        />
                        <View style={styles.modalBtns}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setFolderModal(false)}>
                                <Text>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.confirmBtn} onPress={handleCreateFolder}>
                                <Text style={styles.whiteText}>Create</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Page Modal */}
            <Modal visible={pageModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.fullModal}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{currentPage ? 'Edit Page' : 'New Page'}</Text>
                            <TouchableOpacity onPress={() => { setPageModal(false); setCurrentPage(null); }}>
                                <Ionicons name="close" size={24} color="#64748b" />
                            </TouchableOpacity>
                        </View>
                        <TextInput 
                            style={styles.titleInput} 
                            placeholder="Page Title" 
                            value={pageTitle} 
                            onChangeText={setPageTitle}
                        />
                        <TextInput 
                            style={styles.contentInput} 
                            placeholder="Write something..." 
                            value={pageContent} 
                            onChangeText={setPageContent}
                            multiline
                        />
                        <TouchableOpacity style={styles.saveBtn} onPress={handleCreatePage}>
                            <Text style={styles.whiteText}>Save Page</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Share Modal */}
            <Modal visible={shareModal} animationType="fade" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.smallModal}>
                        <Text style={styles.modalLabel}>Share to:</Text>
                        <View style={styles.shareOptions}>
                            {['COMMUNITY', 'GROUP', 'CONTACT'].map(t => (
                                <TouchableOpacity 
                                    key={t} 
                                    style={[styles.shareOpt, shareTarget === t && styles.shareOptActive]}
                                    onPress={() => setShareTarget(t as any)}
                                >
                                    <Text style={[styles.shareText, shareTarget === t && styles.whiteText]}>{t}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <TouchableOpacity style={styles.confirmBtn} onPress={handleShare}>
                            <Text style={styles.whiteText}>Confirm Share</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.cancelBtn} onPress={() => setShareModal(false)}>
                            <Text>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20, backgroundColor: '#fff' },
    title: { fontSize: 20, fontWeight: '800', color: '#1e293b' },
    addBtn: { backgroundColor: '#6366f1', width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    list: { padding: 16 },
    folderCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#f1f5f9' },
    folderIcon: { width: 50, height: 50, borderRadius: 12, backgroundColor: '#f5f3ff', alignItems: 'center', justifyContent: 'center' },
    folderInfo: { flex: 1, marginLeft: 15 },
    folderName: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
    folderCount: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
    pageCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#f1f5f9' },
    pageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    pageTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
    pageContent: { fontSize: 14, color: '#64748b', lineHeight: 20 },
    empty: { textAlign: 'center', color: '#94a3b8', marginTop: 100 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    smallModal: { backgroundColor: '#fff', borderRadius: 24, padding: 24 },
    fullModal: { backgroundColor: '#fff', borderRadius: 24, padding: 24, height: '80%' },
    modalLabel: { fontSize: 16, fontWeight: '800', color: '#1e293b', marginBottom: 15 },
    input: { backgroundColor: '#f1f5f9', borderRadius: 12, padding: 12, marginBottom: 20 },
    modalBtns: { flexDirection: 'row', justifyContent: 'flex-end' },
    cancelBtn: { padding: 12, marginRight: 10 },
    confirmBtn: { backgroundColor: '#6366f1', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
    whiteText: { color: '#fff', fontWeight: '700' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
    titleInput: { fontSize: 20, fontWeight: '700', color: '#1e293b', marginBottom: 15 },
    contentInput: { flex: 1, fontSize: 16, color: '#475569', textAlignVertical: 'top' },
    saveBtn: { backgroundColor: '#6366f1', padding: 16, borderRadius: 16, alignItems: 'center' },
    shareOptions: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 20 },
    shareOpt: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f1f5f9', marginRight: 8, marginBottom: 8 },
    shareOptActive: { backgroundColor: '#6366f1' },
    shareText: { fontSize: 12, fontWeight: '700', color: '#64748b' },
});
