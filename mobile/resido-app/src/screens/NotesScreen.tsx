import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    TextInput, SafeAreaView, StatusBar, Dimensions, Image
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import BottomNav from '../components/BottomNav';

const { width } = Dimensions.get('window');

const FOLDERS = [
    { id: '1', name: 'Personal', count: 12, date: 'Today, 10:30 AM', color: '#f59e0b', icon: 'folder-outline' },
    { id: '2', name: 'Work', count: 24, date: 'Yesterday, 4:20 PM', color: '#10b981', icon: 'folder-outline' },
    { id: '3', name: 'Ideas', count: 8, date: 'May 12, 2025', color: '#6366f1', icon: 'folder-outline' },
    { id: '4', name: 'Shopping', count: 6, date: 'May 10, 2025', color: '#f97316', icon: 'folder-outline' },
    { id: '5', name: 'Travel', count: 5, date: 'May 8, 2025', color: '#3b82f6', icon: 'folder-outline' },
];

const SHARED = [
    { id: 's1', name: 'Family Plan', count: 3, sharedBy: 'Priya', color: '#ec4899' },
    { id: 's2', name: 'Project Alpha', count: 6, sharedBy: 'Aman', color: '#6366f1' },
];

export default function NotesScreen() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('Folders');

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
                {/* My Folders Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>My Folders</Text>
                        <TouchableOpacity style={styles.sortBtn}>
                            <Text style={styles.sortText}>Name</Text>
                            <MaterialCommunityIcons name="menu" size={16} color="#64748b" />
                        </TouchableOpacity>
                    </View>

                    {FOLDERS.map((folder) => (
                        <TouchableOpacity 
                            key={folder.id} 
                            style={styles.folderCard}
                            onPress={() => router.push({ pathname: '/note-folder-view', params: { name: folder.name, count: folder.count } })}
                        >
                            <View style={[styles.folderIconBox, { backgroundColor: folder.color }]}>
                                <MaterialCommunityIcons name="folder" size={24} color="#fff" />
                            </View>
                            <View style={styles.folderInfo}>
                                <Text style={styles.folderName}>{folder.name}</Text>
                                <Text style={styles.folderSub}>{folder.count} Notes</Text>
                            </View>
                            <View style={styles.folderRight}>
                                <Text style={styles.folderDate}>{folder.date}</Text>
                                <TouchableOpacity><Ionicons name="ellipsis-vertical" size={18} color="#64748b" /></TouchableOpacity>
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Shared with Me Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Shared with Me</Text>
                    {SHARED.map((item) => (
                        <TouchableOpacity key={item.id} style={styles.folderCard}>
                            <View style={[styles.folderIconBox, { backgroundColor: item.color }]}>
                                <MaterialCommunityIcons name="account-group" size={24} color="#fff" />
                            </View>
                            <View style={styles.folderInfo}>
                                <Text style={styles.folderName}>{item.name}</Text>
                                <Text style={styles.folderSub}>{item.count} Notes</Text>
                                <Text style={styles.sharedBy}>Shared by {item.sharedBy}</Text>
                            </View>
                            <TouchableOpacity><Ionicons name="ellipsis-vertical" size={18} color="#64748b" /></TouchableOpacity>
                        </TouchableOpacity>
                    ))}
                </View>
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
    container: { flex: 1, backgroundColor: '#0f172a' },
    header: { padding: 20, paddingTop: 30, backgroundColor: '#0f172a' },
    headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 25 },
    headerTitleRow: { flexDirection: 'row', alignItems: 'center' },
    logoBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    headerTitle: { fontSize: 22, fontWeight: '900', color: '#fff' },
    headerSub: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
    
    tabContainer: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14, padding: 4 },
    tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
    activeTab: { backgroundColor: '#6366f1' },
    tabText: { fontSize: 14, fontWeight: '700', color: '#94a3b8' },
    activeTabText: { color: '#fff' },

    section: { paddingHorizontal: 20, marginTop: 24 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    sectionTitle: { fontSize: 16, fontWeight: '800', color: '#6366f1' },
    sortBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    sortText: { fontSize: 13, color: '#64748b', fontWeight: '600' },

    folderCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', padding: 14, borderRadius: 20, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    folderIconBox: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    folderInfo: { flex: 1, marginLeft: 16 },
    folderName: { fontSize: 16, fontWeight: '800', color: '#fff' },
    folderSub: { fontSize: 12, color: '#94a3b8', marginTop: 4 },
    sharedBy: { fontSize: 11, color: '#6366f1', marginTop: 2, fontWeight: '700' },
    folderRight: { alignItems: 'flex-end', gap: 8 },
    folderDate: { fontSize: 11, color: '#64748b' },

    fab: { position: 'absolute', bottom: 100, right: 20, width: 60, height: 60, borderRadius: 30, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center', shadowColor: '#6366f1', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8 },
});
