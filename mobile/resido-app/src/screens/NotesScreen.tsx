import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    TextInput, SafeAreaView, StatusBar, Dimensions, Image,
    ActivityIndicator
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import BottomNav from '../components/BottomNav';
import { mySpaceApi } from '../services/api';

const { width } = Dimensions.get('window');

export default function NotesScreen() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('Folders');
    const [folders, setFolders] = useState<any[]>([]);
    const [sharedItems, setSharedItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const loadData = async () => {
        try {
            setLoading(true);
            const [foldersRes, sharedRes] = await Promise.all([
                mySpaceApi.getNoteFolders(),
                mySpaceApi.getSharedNotes()
            ]);
            setFolders(foldersRes.data);
            setSharedItems(sharedRes.data);
        } catch (error) {
            console.error('Failed to load notes data', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />
            
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <View style={styles.headerTitleRow}>
                        <View style={styles.logoBox}>
                            <MaterialCommunityIcons name="note-text-outline" size={24} color="#fff" />
                        </View>
                        <View style={{ marginLeft: 12 }}>
                            <Text style={styles.headerTitle}>Notes</Text>
                            <Text style={styles.headerSub}>All your notes in one place</Text>
                        </View>
                    </View>
                    <View style={styles.headerActions}>
                        <TouchableOpacity style={styles.iconBtn}><Ionicons name="search" size={22} color="#fff" /></TouchableOpacity>
                        <TouchableOpacity style={styles.iconBtn}><Ionicons name="ellipsis-vertical" size={22} color="#fff" /></TouchableOpacity>
                    </View>
                </View>

                {/* Tabs */}
                <View style={styles.tabContainer}>
                    <TouchableOpacity 
                        style={[styles.tab, activeTab === 'Folders' && styles.activeTab]} 
                        onPress={() => setActiveTab('Folders')}
                    >
                        <Text style={[styles.tabText, activeTab === 'Folders' && styles.activeTabText]}>Folders</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.tab, activeTab === 'Notes' && styles.activeTab]} 
                        onPress={() => setActiveTab('Notes')}
                    >
                        <Text style={[styles.tabText, activeTab === 'Notes' && styles.activeTabText]}>Notes</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                {loading ? (
                    <ActivityIndicator color="#1d4ed8" style={{ marginTop: 20 }} />
                ) : (
                    <>
                        {/* My Folders Section */}
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionTitle}>My Folders</Text>
                                <TouchableOpacity style={styles.sortBtn} onPress={() => router.push({ pathname: '/create-folder', params: { type: 'NOTE' } })}>
                                    <Ionicons name="add-circle" size={20} color="#1d4ed8" />
                                    <Text style={[styles.sortText, { color: '#1d4ed8' }]}>New Folder</Text>
                                </TouchableOpacity>
                            </View>

                            {folders.length === 0 ? (
                                <Text style={styles.emptyText}>No folders yet. Create one!</Text>
                            ) : (
                                folders.map((folder) => (
                                    <TouchableOpacity 
                                        key={folder.id} 
                                        style={styles.folderCard}
                                        onPress={() => router.push({ pathname: '/note-folder-view', params: { id: folder.id, name: folder.name, count: folder._count?.pages || 0 } })}
                                    >
                                        <View style={[styles.folderIconBox, { backgroundColor: folder.color || '#1d4ed8' }]}>
                                            <MaterialCommunityIcons name="folder" size={24} color="#fff" />
                                        </View>
                                        <View style={styles.folderInfo}>
                                            <Text style={styles.folderName}>{folder.name}</Text>
                                            <Text style={styles.folderSub}>{folder._count?.pages || 0} Notes</Text>
                                        </View>
                                        <View style={styles.folderRight}>
                                            <Text style={styles.folderDate}>{new Date(folder.updatedAt).toLocaleDateString()}</Text>
                                            <TouchableOpacity><Ionicons name="ellipsis-vertical" size={18} color="#64748b" /></TouchableOpacity>
                                        </View>
                                    </TouchableOpacity>
                                ))
                            )}
                        </View>

                        {/* Shared with Me Section */}
                        {sharedItems.length > 0 && (
                            <View style={[styles.section, { marginTop: 32 }]}>
                                <View style={styles.sectionHeader}>
                                    <Text style={styles.sectionTitle}>Shared with Me</Text>
                                </View>
                                {sharedItems.map((item) => (
                                    <TouchableOpacity 
                                        key={item.id} 
                                        style={styles.folderCard}
                                        onPress={() => {
                                            if (item.folder) {
                                                router.push({ pathname: '/note-folder-view', params: { id: item.folder.id, name: item.folder.name, isShared: 'true' } });
                                            } else if (item.page) {
                                                router.push({ pathname: '/create-note', params: { id: item.page.id, title: item.page.title, body: item.page.content, isShared: 'true' } });
                                            }
                                        }}
                                    >
                                        <View style={[styles.folderIconBox, { backgroundColor: '#94a3b8' }]}>
                                            <MaterialCommunityIcons name={item.folder ? "folder-account" : "file-document-outline"} size={24} color="#fff" />
                                        </View>
                                        <View style={styles.folderInfo}>
                                            <Text style={styles.folderName}>{item.folder?.name || item.page?.title}</Text>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                                                <Image source={{ uri: item.user?.profilePhoto || 'https://i.pravatar.cc/100?u=' + item.user?.id }} style={{ width: 16, height: 16, borderRadius: 8 }} />
                                                <Text style={[styles.folderSub, { marginLeft: 6 }]}>Shared by {item.user?.name || item.user?.profileName}</Text>
                                            </View>
                                        </View>
                                        <View style={styles.folderRight}>
                                            <Text style={styles.folderDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </>
                )}
            </ScrollView>

            {/* FAB */}
            <TouchableOpacity style={styles.fab} onPress={() => router.push('/create-note')}>
                <Ionicons name="add" size={32} color="#fff" />
            </TouchableOpacity>

            <BottomNav activeTab="Home" />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000000' },
    header: { padding: 20, paddingTop: 60, backgroundColor: '#000000' },
    headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 25 },
    headerTitleRow: { flexDirection: 'row', alignItems: 'center' },
    logoBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    headerTitle: { fontSize: 22, fontWeight: '900', color: '#fff' },
    headerSub: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
    
    tabContainer: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14, padding: 4 },
    tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
    activeTab: { backgroundColor: '#1d4ed8' },
    tabText: { fontSize: 14, fontWeight: '700', color: '#94a3b8' },
    activeTabText: { color: '#fff' },

    section: { paddingHorizontal: 20, marginTop: 24 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    sectionTitle: { fontSize: 16, fontWeight: '800', color: '#1d4ed8' },
    sortBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    sortText: { fontSize: 13, color: '#64748b', fontWeight: '600' },

    folderCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', padding: 14, borderRadius: 20, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    folderIconBox: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    folderInfo: { flex: 1, marginLeft: 16 },
    folderName: { fontSize: 16, fontWeight: '800', color: '#fff' },
    folderSub: { fontSize: 12, color: '#94a3b8', marginTop: 4 },
    sharedBy: { fontSize: 11, color: '#1d4ed8', marginTop: 2, fontWeight: '700' },
    folderRight: { alignItems: 'flex-end', gap: 8 },
    folderDate: { fontSize: 11, color: '#64748b' },

    fab: { position: 'absolute', bottom: 100, right: 20, width: 60, height: 60, borderRadius: 30, backgroundColor: '#1d4ed8', alignItems: 'center', justifyContent: 'center', shadowColor: '#1d4ed8', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8 },
    emptyText: { textAlign: 'center', color: '#94a3b8', marginTop: 40, fontSize: 15, fontWeight: '600' },
});
