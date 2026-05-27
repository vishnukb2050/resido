import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    TextInput, SafeAreaView, StatusBar, Dimensions,
    ActivityIndicator, Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import BottomNav from '../components/BottomNav';
import { mySpaceApi } from '../services/api';

const { width } = Dimensions.get('window');

export default function FolderViewScreen() {
    const router = useRouter();
    const { id, name, isShared } = useLocalSearchParams();
    const readOnly = isShared === 'true';
    const [files, setFiles] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

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

    // 3-dot menu on a single file: Share or Delete.
    const openFileMenu = (file: any) => {
        const options: any[] = [{ text: 'Cancel', style: 'cancel' }];
        options.push({
            text: 'Share',
            onPress: () =>
                router.push({
                    pathname: '/share-doc',
                    params: {
                        id: file.id,
                        folderId: id,
                        name: file.title || file.name,
                        isFolder: 'false',
                        size: file.size
                            ? `${(file.size / 1024 / 1024).toFixed(2)} MB`
                            : '',
                    },
                }),
        });
        if (!readOnly) {
            options.push({
                text: 'Delete',
                style: 'destructive',
                onPress: () => confirmDeleteFile(file),
            });
        }
        Alert.alert(file.title || file.name || 'Document', 'What would you like to do?', options);
    };

    const confirmDeleteFile = (file: any) => {
        Alert.alert(
            `Delete "${file.title || file.name}"?`,
            'This document will be permanently deleted. This cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await mySpaceApi.deleteDocumentFile(file.id);
                            setFiles((prev) => prev.filter((f) => f.id !== file.id));
                        } catch (err: any) {
                            const msg = err?.response?.data?.message || 'Failed to delete document.';
                            Alert.alert('Error', msg);
                        }
                    },
                },
            ],
        );
    };

    const getFileColor = (type: string) => {
        if (type === 'IMAGE') return '#3b82f6';
        if (type?.toLowerCase().includes('pdf')) return '#ef4444';
        return '#8b5cf6';
    };

    const getTypeBadge = (type: string) => {
        if (type === 'IMAGE') return 'IMG';
        if (type?.toLowerCase().includes('pdf')) return 'PDF';
        return 'DOC';
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />
            
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color="#2D2445" />
                    </TouchableOpacity>
                    <View style={{ flex: 1, marginLeft: 16 }}>
                        <Text style={styles.headerTitle} numberOfLines={1}>{name || 'Folder'}</Text>
                        <Text style={styles.headerSub}>{files.length} Documents{readOnly ? ' · Shared' : ''}</Text>
                    </View>
                    {!readOnly && (
                        <TouchableOpacity
                            style={styles.iconBtn}
                            onPress={() =>
                                router.push({
                                    pathname: '/share-doc',
                                    params: { folderId: id, name, isFolder: 'true' },
                                })
                            }
                        >
                            <Ionicons name="share-social" size={22} color="#8b5cf6" />
                        </TouchableOpacity>
                    )}
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
                    </View>
                </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }}>
                {loading ? (
                    <ActivityIndicator color="#8b5cf6" style={{ marginTop: 40 }} />
                ) : files.length === 0 ? (
                    <Text style={styles.emptyText}>
                        {readOnly ? 'This folder is empty.' : 'No documents here yet. Tap the + button to upload one!'}
                    </Text>
                ) : (
                    <View style={styles.listContainer}>
                        {files.map((doc) => (
                            <TouchableOpacity
                                key={doc.id}
                                style={styles.docCard}
                                onPress={() => openFileMenu(doc)}
                            >
                                <View style={[styles.typeIconBox, { backgroundColor: getFileColor(doc.type) }]}>
                                    <Text style={styles.typeText}>{getTypeBadge(doc.type)}</Text>
                                </View>
                                <View style={styles.docInfo}>
                                    <Text style={styles.docName} numberOfLines={1}>
                                        {doc.title || doc.name}
                                    </Text>
                                    {doc.description ? (
                                        <Text style={styles.docDesc} numberOfLines={2}>{doc.description}</Text>
                                    ) : null}
                                    <Text style={styles.docSub}>
                                        {doc.size ? (doc.size / 1024 / 1024).toFixed(2) + ' MB' : 'Unknown size'} · {new Date(doc.updatedAt).toLocaleDateString()}
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    style={styles.dotsBtn}
                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                    onPress={(e) => {
                                        e.stopPropagation?.();
                                        openFileMenu(doc);
                                    }}
                                >
                                    <Ionicons name="ellipsis-vertical" size={18} color="#7A6B9C" />
                                </TouchableOpacity>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </ScrollView>

            {/* Upload FAB → opens upload screen prefilled with this folder */}
            {!readOnly && (
                <TouchableOpacity
                    style={styles.fab}
                    onPress={() =>
                        router.push({
                            pathname: '/upload-document',
                            params: { folderId: id, folderName: name },
                        })
                    }
                >
                    <Ionicons name="cloud-upload" size={26} color="#fff" />
                </TouchableOpacity>
            )}

            <BottomNav activeTab="Home" />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F5FF' },
    header: { padding: 20, paddingTop: 60, backgroundColor: '#F8F5FF' },
    headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F4EEFC', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#2D2445' },
    headerSub: { fontSize: 13, color: '#9A8EBA', marginTop: 2 },
    iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F4EEFC', alignItems: 'center', justifyContent: 'center' },

    searchSection: { marginTop: 8 },
    searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F4EEFC', borderRadius: 16, paddingHorizontal: 16, height: 50, borderWidth: 1, borderColor: '#C4B5DC' },
    searchInput: { flex: 1, marginLeft: 10, color: '#2D2445', fontSize: 15 },

    listContainer: { paddingHorizontal: 20, marginTop: 12 },
    docCard: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#ffffff', padding: 14, borderRadius: 20, marginBottom: 12, borderWidth: 1, borderColor: '#D4C9E8' },
    typeIconBox: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    typeText: { color: '#ffffff', fontSize: 11, fontWeight: '900' },
    docInfo: { flex: 1, marginLeft: 14 },
    docName: { fontSize: 15, fontWeight: '800', color: '#2D2445' },
    docDesc: { fontSize: 12, color: '#5B4B8A', marginTop: 4, lineHeight: 17 },
    docSub: { fontSize: 11, color: '#7A6B9C', marginTop: 6, fontWeight: '600' },
    dotsBtn: {
        width: 28, height: 28, borderRadius: 14,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#F4EEFC', marginTop: 4,
    },

    emptyText: { textAlign: 'center', color: '#9A8EBA', marginTop: 40, fontSize: 15, fontWeight: '600' },

    fab: {
        position: 'absolute', bottom: 100, right: 20,
        width: 60, height: 60, borderRadius: 30,
        backgroundColor: '#8b5cf6',
        alignItems: 'center', justifyContent: 'center',
        shadowColor: '#1d4ed8', shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3, shadowRadius: 16, elevation: 8,
    },
});
