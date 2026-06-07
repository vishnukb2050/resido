import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, RefreshControl, StatusBar, Image, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import BottomNav from '../components/BottomNav';
import ActionMenu, { ActionMenuItem } from '../components/ActionMenu';
import { mySpaceApi } from '../services/api';
import { resolveMediaUrl } from '../utils/mediaUrl';

// Single folder row, memoized so unrelated rows don't re-render.
const DocFolderRow = React.memo(function DocFolderRow({
    folder,
    onOpen,
    onMenu,
}: {
    folder: any;
    onOpen: (folder: any) => void;
    onMenu: (folder: any) => void;
}) {
    return (
        <TouchableOpacity style={styles.folderCard} onPress={() => onOpen(folder)}>
            <View style={[styles.folderIconBox, { backgroundColor: folder.color || '#8b5cf6' }]}>
                <MaterialCommunityIcons name="folder" size={24} color="#fff" />
            </View>
            <View style={styles.folderInfo}>
                <Text style={styles.folderName} numberOfLines={1}>{folder.name}</Text>
                <Text style={styles.folderSub}>{folder._count?.files || 0} Files</Text>
            </View>
            <View style={styles.folderRight}>
                <Text style={styles.folderDate}>{new Date(folder.updatedAt).toLocaleDateString()}</Text>
                <TouchableOpacity
                    style={styles.dotsBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    onPress={(e) => {
                        e.stopPropagation?.();
                        onMenu(folder);
                    }}
                >
                    <Ionicons name="ellipsis-vertical" size={18} color="#7A6B9C" />
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );
});

// Single "shared with me" row, memoized for the same reason.
const SharedDocRow = React.memo(function SharedDocRow({
    item,
    onOpen,
}: {
    item: any;
    onOpen: (item: any) => void;
}) {
    const photo =
        resolveMediaUrl(item.user?.profilePhoto) ||
        `https://i.pravatar.cc/100?u=${item.user?.id || item.id}`;
    const sharerName = item.user?.name || item.user?.profileName || 'Someone';
    const displayName =
        item.folder?.name ||
        item.file?.title ||
        item.file?.name ||
        'Untitled';
    return (
        <TouchableOpacity style={styles.folderCard} onPress={() => onOpen(item)}>
            <View
                style={[
                    styles.folderIconBox,
                    { backgroundColor: item.folder ? '#a78bfa' : '#60a5fa' },
                ]}
            >
                <MaterialCommunityIcons
                    name={item.folder ? 'folder-account' : 'file-outline'}
                    size={24}
                    color="#fff"
                />
            </View>
            <View style={styles.folderInfo}>
                <Text style={styles.folderName} numberOfLines={1}>{displayName}</Text>
                <View style={styles.sharedByRow}>
                    <Image source={{ uri: photo }} style={styles.sharedByAvatar} />
                    <Text style={styles.sharedByText} numberOfLines={1}>Shared by {sharerName}</Text>
                </View>
            </View>
            <View style={styles.folderRight}>
                <Text style={styles.folderDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                <View style={styles.sharedTypeBadge}>
                    <Text style={styles.sharedTypeBadgeText}>
                        {item.folder ? 'FOLDER' : 'FILE'}
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );
});

export default function DocumentsScreen() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'Folders' | 'Shared'>('Folders');
    const [folders, setFolders] = useState<any[]>([]);
    const [sharedItems, setSharedItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [showFabMenu, setShowFabMenu] = useState(false);
    const [menuFolder, setMenuFolder] = useState<any | null>(null);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const loadData = async () => {
        try {
            setLoading(true);
            const [foldersRes, sharedRes] = await Promise.all([
                mySpaceApi.getDocumentFolders(),
                mySpaceApi.getSharedDocuments(),
            ]);
            setFolders(foldersRes.data || []);
            setSharedItems(sharedRes.data || []);
        } catch (error) {
            console.error('Failed to load documents data', error);
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    }, []);

    // 3-dot chooser on a folder: Share or Delete. Uses the shared
    // bottom-sheet ActionMenu for consistent styling/list format.
    const openFolderMenu = useCallback((folder: any) => {
        setMenuFolder(folder);
    }, []);

    const openFolder = useCallback(
        (folder: any) => {
            router.push({
                pathname: '/folder-view',
                params: {
                    id: folder.id,
                    name: folder.name,
                    count: folder._count?.files || 0,
                },
            });
        },
        [router]
    );

    const openSharedItem = useCallback(
        (item: any) => {
            if (item.folder) {
                router.push({
                    pathname: '/folder-view',
                    params: {
                        id: item.folder.id,
                        name: item.folder.name,
                        isShared: 'true',
                    },
                });
            }
            // For single shared files: nothing to navigate
            // to yet — opening the underlying URL is a future
            // enhancement (file-preview screen).
        },
        [router]
    );

    const buildFolderMenuItems = (folder: any): ActionMenuItem[] => {
        const fileCount = folder._count?.files || 0;
        return [
            {
                key: 'share',
                label: 'Share with people',
                subtitle: 'Choose specific profiles, contacts or groups',
                icon: 'share-social',
                variant: 'primary',
                onPress: () =>
                    router.push({
                        pathname: '/share-doc',
                        params: { folderId: folder.id, name: folder.name, isFolder: 'true' },
                    }),
            },
            {
                key: 'delete',
                label: 'Delete folder',
                subtitle: fileCount > 0 ? `Removes the folder and ${fileCount} document${fileCount === 1 ? '' : 's'}` : 'This action cannot be undone',
                icon: 'trash',
                variant: 'destructive',
                onPress: () => confirmDeleteFolder(folder, fileCount),
            },
        ];
    };

    const confirmDeleteFolder = (folder: any, fileCount: number) => {
        Alert.alert(
            `Delete "${folder.name}"?`,
            fileCount > 0
                ? `This will permanently delete the folder and all ${fileCount} document${fileCount === 1 ? '' : 's'} inside it. This cannot be undone.`
                : 'This folder will be permanently deleted. This cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await mySpaceApi.deleteDocumentFolder(folder.id);
                            setFolders((prev) => prev.filter((f) => f.id !== folder.id));
                        } catch (err: any) {
                            const msg = err?.response?.data?.message || 'Failed to delete folder.';
                            Alert.alert('Error', msg);
                        }
                    },
                },
            ],
        );
    };

    const isFolders = activeTab === 'Folders';
    const data = loading ? [] : isFolders ? folders : sharedItems;

    const renderItem = useCallback(
        ({ item }: { item: any }) =>
            isFolders ? (
                <DocFolderRow folder={item} onOpen={openFolder} onMenu={openFolderMenu} />
            ) : (
                <SharedDocRow item={item} onOpen={openSharedItem} />
            ),
        [isFolders, openFolder, openFolderMenu, openSharedItem]
    );

    const ListHeader = (
        <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{isFolders ? 'My Folders' : 'Shared with Me'}</Text>
            {isFolders && (
                <TouchableOpacity
                    style={styles.sortBtn}
                    onPress={() => router.push({ pathname: '/create-folder', params: { type: 'DOC' } })}
                >
                    <Ionicons name="add-circle" size={20} color="#8b5cf6" />
                    <Text style={[styles.sortText, { color: '#8b5cf6' }]}>New Folder</Text>
                </TouchableOpacity>
            )}
        </View>
    );

    const ListEmpty = loading ? (
        <ActivityIndicator color="#8b5cf6" style={{ marginTop: 30 }} />
    ) : isFolders ? (
        <Text style={styles.emptyText}>No folders yet. Upload a document or create one!</Text>
    ) : (
        <View style={styles.sharedEmptyWrap}>
            <View style={styles.sharedEmptyIcon}>
                <MaterialCommunityIcons name="folder-account-outline" size={40} color="#8b5cf6" />
            </View>
            <Text style={styles.sharedEmptyTitle}>Nothing shared with you yet</Text>
            <Text style={styles.sharedEmptySub}>
                Documents and folders that others share with your profile will appear here.
            </Text>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />

            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <View style={styles.headerTitleRow}>
                        <View style={styles.logoBox}>
                            <Ionicons name="documents" size={24} color="#8b5cf6" />
                        </View>
                        <View style={{ marginLeft: 12 }}>
                            <Text style={styles.headerTitle}>Documents</Text>
                            <Text style={styles.headerSub}>Manage your files securely</Text>
                        </View>
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
                        style={[styles.tab, activeTab === 'Shared' && styles.activeTab]}
                        onPress={() => setActiveTab('Shared')}
                    >
                        <Text style={[styles.tabText, activeTab === 'Shared' && styles.activeTabText]}>
                            Shared with Me{sharedItems.length > 0 ? ` (${sharedItems.length})` : ''}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            <FlatList
                data={data}
                keyExtractor={(item) => String(item.id)}
                renderItem={renderItem}
                ListHeaderComponent={ListHeader}
                ListEmptyComponent={ListEmpty}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
                keyboardShouldPersistTaps="handled"
                removeClippedSubviews
                initialNumToRender={10}
                maxToRenderPerBatch={10}
                windowSize={11}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8b5cf6" />}
            />

            {/* FAB cluster — only on Folders tab */}
            {activeTab === 'Folders' && (
                <>
                    {showFabMenu && (
                        <View style={styles.fabMenu}>
                            <TouchableOpacity
                                style={styles.fabMenuItem}
                                onPress={() => {
                                    setShowFabMenu(false);
                                    router.push({ pathname: '/upload-document' });
                                }}
                            >
                                <View style={[styles.fabMenuIcon, { backgroundColor: '#8b5cf6' }]}>
                                    <Ionicons name="cloud-upload-outline" size={20} color="#fff" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.fabMenuTitle}>Upload Document</Text>
                                    <Text style={styles.fabMenuSub}>Save to General folder by default</Text>
                                </View>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.fabMenuItem}
                                onPress={() => {
                                    setShowFabMenu(false);
                                    router.push({ pathname: '/create-folder', params: { type: 'DOC' } });
                                }}
                            >
                                <View style={[styles.fabMenuIcon, { backgroundColor: '#60a5fa' }]}>
                                    <MaterialCommunityIcons name="folder-plus-outline" size={20} color="#fff" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.fabMenuTitle}>New Folder</Text>
                                    <Text style={styles.fabMenuSub}>Organise documents by category</Text>
                                </View>
                            </TouchableOpacity>
                        </View>
                    )}
                    <TouchableOpacity
                        style={[styles.fab, showFabMenu && { backgroundColor: '#6d28d9' }]}
                        onPress={() => setShowFabMenu((v) => !v)}
                    >
                        <Ionicons name={showFabMenu ? 'close' : 'add'} size={32} color="#fff" />
                    </TouchableOpacity>
                </>
            )}

            <ActionMenu
                visible={!!menuFolder}
                title={menuFolder?.name || 'Folder'}
                subtitle={`${menuFolder?._count?.files || 0} document${(menuFolder?._count?.files || 0) === 1 ? '' : 's'}`}
                items={menuFolder ? buildFolderMenuItems(menuFolder) : []}
                onClose={() => setMenuFolder(null)}
            />

            <BottomNav activeTab="Home" />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F5FF' },
    header: { padding: 20, paddingTop: 12, backgroundColor: '#F8F5FF' },
    headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 25 },
    headerTitleRow: { flexDirection: 'row', alignItems: 'center' },
    logoBox: {
        width: 44, height: 44, borderRadius: 12,
        backgroundColor: '#F4EEFC', alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: '#C4B5DC',
    },
    headerTitle: { fontSize: 22, fontWeight: '900', color: '#2D2445' },
    headerSub: { fontSize: 12, color: '#9A8EBA', marginTop: 2 },

    tabContainer: { flexDirection: 'row', backgroundColor: '#F4EEFC', borderRadius: 14, padding: 4 },
    tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
    activeTab: { backgroundColor: '#8b5cf6' },
    tabText: { fontSize: 14, fontWeight: '700', color: '#9A8EBA' },
    activeTabText: { color: '#ffffff' },

    listContent: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 140 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    sectionTitle: { fontSize: 16, fontWeight: '800', color: '#8b5cf6' },
    sortBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    sortText: { fontSize: 13, color: '#7A6B9C', fontWeight: '600' },

    folderCard: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#ffffff', padding: 14, borderRadius: 20,
        marginBottom: 12, borderWidth: 1, borderColor: '#D4C9E8',
    },
    folderIconBox: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    folderInfo: { flex: 1, marginLeft: 16 },
    folderName: { fontSize: 16, fontWeight: '800', color: '#2D2445' },
    folderSub: { fontSize: 12, color: '#9A8EBA', marginTop: 4 },
    folderRight: { alignItems: 'flex-end', gap: 8 },
    folderDate: { fontSize: 11, color: '#7A6B9C' },
    dotsBtn: {
        width: 28, height: 28, borderRadius: 14,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#F4EEFC',
    },

    // Shared with Me
    sharedByRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
    sharedByAvatar: { width: 18, height: 18, borderRadius: 9, marginRight: 6 },
    sharedByText: { fontSize: 12, color: '#8b5cf6', fontWeight: '700', flex: 1 },
    sharedTypeBadge: {
        backgroundColor: 'rgba(139, 92, 246, 0.12)',
        borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
        marginTop: 4,
    },
    sharedTypeBadgeText: { fontSize: 9, color: '#8b5cf6', fontWeight: '900', letterSpacing: 0.5 },
    sharedEmptyWrap: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24, gap: 12 },
    sharedEmptyIcon: {
        width: 80, height: 80, borderRadius: 24,
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        alignItems: 'center', justifyContent: 'center',
    },
    sharedEmptyTitle: { fontSize: 16, fontWeight: '800', color: '#2D2445', marginTop: 4 },
    sharedEmptySub: { fontSize: 13, color: '#7A6B9C', textAlign: 'center', lineHeight: 20, fontWeight: '500' },

    // FAB cluster
    fab: {
        position: 'absolute', bottom: 100, right: 20,
        width: 60, height: 60, borderRadius: 30,
        backgroundColor: '#8b5cf6',
        alignItems: 'center', justifyContent: 'center',
        shadowColor: '#1d4ed8', shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3, shadowRadius: 16, elevation: 8,
    },
    fabMenu: {
        position: 'absolute', bottom: 170, right: 20, left: 20,
        backgroundColor: '#ffffff', borderRadius: 18,
        padding: 8, borderWidth: 1, borderColor: '#D4C9E8',
        shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12, shadowRadius: 16, elevation: 10,
        gap: 4,
    },
    fabMenuItem: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12,
        gap: 12,
    },
    fabMenuIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    fabMenuTitle: { fontSize: 14, fontWeight: '800', color: '#2D2445' },
    fabMenuSub: { fontSize: 11, color: '#7A6B9C', marginTop: 2 },

    emptyText: { textAlign: 'center', color: '#9A8EBA', marginTop: 40, fontSize: 15, fontWeight: '600' },
});
