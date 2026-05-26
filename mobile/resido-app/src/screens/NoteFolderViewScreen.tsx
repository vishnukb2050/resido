import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    TextInput, SafeAreaView, StatusBar, Dimensions, FlatList,
    ActivityIndicator
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import BottomNav from '../components/BottomNav';
import { mySpaceApi } from '../services/api';

const { width } = Dimensions.get('window');
const columnWidth = (width - 50) / 2;

export default function NoteFolderViewScreen() {
    const router = useRouter();
    const { id, name } = useLocalSearchParams();
    const [pages, setPages] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useFocusEffect(
        useCallback(() => {
            if (id) loadPages();
        }, [id])
    );

    const loadPages = async () => {
        try {
            setLoading(true);
            const { data } = await mySpaceApi.getNoteFolder(id as string);
            setPages(data.pages || []);
        } catch (error) {
            console.error('Failed to load note pages', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />
            
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    <View style={{ flex: 1, marginLeft: 16 }}>
                        <Text style={styles.headerTitle}>{name || 'Folder'}</Text>
                        <Text style={styles.headerSub}>{pages.length} Notes</Text>
                    </View>
                    <View style={styles.headerActions}>
                        <TouchableOpacity style={styles.iconBtn}><Ionicons name="search" size={22} color="#fff" /></TouchableOpacity>
                        <TouchableOpacity style={styles.iconBtn} onPress={() => router.push({ pathname: '/share-note', params: { folderId: id, name } })}>
                            <Ionicons name="share-social" size={22} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Search Bar */}
                <View style={styles.searchSection}>
                    <View style={styles.searchBar}>
                        <Ionicons name="search" size={20} color="#64748b" />
                        <TextInput 
                            placeholder={`Search notes in ${name || 'Folder'}`} 
                            style={styles.searchInput}
                            placeholderTextColor="#94a3b8"
                        />
                        <TouchableOpacity><Ionicons name="options-outline" size={20} color="#64748b" /></TouchableOpacity>
                    </View>
                </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
                {loading ? (
                    <ActivityIndicator color="#8b5cf6" style={{ marginTop: 40 }} />
                ) : pages.length === 0 ? (
                    <Text style={styles.emptyText}>No notes here yet. Create one!</Text>
                ) : (
                    <View style={styles.gridContainer}>
                        {pages.map((note) => (
                            <TouchableOpacity 
                                key={note.id} 
                                style={[styles.noteCard, { backgroundColor: note.color || '#fff' }]}
                                onPress={() => router.push({ pathname: '/create-note', params: { id: note.id, folderId: id, title: note.title, body: note.content } })}
                            >
                                <View style={styles.cardHeader}>
                                    <Text style={[styles.noteTitle, note.color === '#1d4ed8' && { color: '#2D2445' }]}>{note.title}</Text>
                                </View>
                                <Text 
                                    style={[styles.noteBody, note.color === '#1d4ed8' && { color: '#5B4B8A' }]} 
                                    numberOfLines={5}
                                >
                                    {note.content}
                                </Text>
                                <Text style={[styles.noteDate, note.color === '#1d4ed8' && { color: '#7A6B9C' }]}>{new Date(note.updatedAt).toLocaleDateString()}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </ScrollView>

            {/* FAB */}
            <TouchableOpacity style={styles.fab} onPress={() => router.push({ pathname: '/create-note', params: { folderId: id } })}>
                <Ionicons name="add" size={32} color="#fff" />
            </TouchableOpacity>

            <BottomNav activeTab="Home" />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F5FF' },
    header: { padding: 20, paddingTop: 20, backgroundColor: '#F8F5FF' },
    headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F4EEFC', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#2D2445' },
    headerSub: { fontSize: 13, color: '#9A8EBA', marginTop: 2 },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F4EEFC', alignItems: 'center', justifyContent: 'center' },
    
    searchSection: { marginTop: 8 },
    searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F4EEFC', borderRadius: 16, paddingHorizontal: 16, height: 50, borderWidth: 1, borderColor: '#C4B5DC' },
    searchInput: { flex: 1, marginLeft: 10, color: '#2D2445', fontSize: 15 },

    gridContainer: { flexDirection: 'row', flexWrap: 'wrap', padding: 15, gap: 15 },
    noteCard: { width: columnWidth, padding: 16, borderRadius: 20, minHeight: 180, justifyContent: 'space-between' },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
    noteTitle: { fontSize: 16, fontWeight: '800', color: '#2D2445', flex: 1, marginRight: 8 },
    noteBody: { fontSize: 13, color: '#5B4B8A', lineHeight: 18 },
    noteDate: { fontSize: 11, color: '#7A6B9C', marginTop: 12, fontWeight: '600' },

    emptyText: { textAlign: 'center', color: '#9A8EBA', marginTop: 40, fontSize: 15, fontWeight: '600' },
    fab: { position: 'absolute', bottom: 100, right: 20, width: 60, height: 60, borderRadius: 30, backgroundColor: '#8b5cf6', alignItems: 'center', justifyContent: 'center', shadowColor: '#1d4ed8', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8 },
});
