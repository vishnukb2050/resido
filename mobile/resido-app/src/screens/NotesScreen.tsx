import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, SafeAreaView, StatusBar, Dimensions, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import BottomNav from '../components/BottomNav';

const { width } = Dimensions.get('window');

const QUICK_ACTIONS = [
    { id: '1', label: 'New Folder', sub: 'Organize notes', icon: 'folder-outline', color: '#6366f1', bg: '#f5f3ff' },
    { id: '2', label: 'New Note', sub: 'Quick note', icon: 'document-text-outline', color: '#f59e0b', bg: '#fff7ed' },
    { id: '3', label: 'New Page', sub: 'Inside folder', icon: 'newspaper-outline', color: '#10b981', bg: '#f0fdf4' },
    { id: '4', label: 'Shared with me', sub: 'View notes', icon: 'people-outline', color: '#3b82f6', bg: '#eff6ff' },
];

const COMMUNITIES = [
    { id: '1', name: 'Team Workspace', notes: 28, folders: 4, time: 'Updated 2h ago', icon: 'people', color: '#6366f1', unread: 12 },
    { id: '2', name: 'Project Phoenix', notes: 15, folders: 3, time: 'Updated 1h ago', icon: 'briefcase', color: '#10b981', unread: 5 },
    { id: '3', name: 'Study Circle', notes: 8, folders: 2, time: 'Updated Yesterday', icon: 'school', color: '#8b5cf6', unread: 3 },
    { id: '4', name: 'Marketing Hub', notes: 20, folders: 5, time: 'Updated Yesterday', icon: 'megaphone', color: '#ef4444', unread: 7 },
    { id: '5', name: 'Family Group', notes: 6, folders: 1, time: 'Updated 3d ago', icon: 'home', color: '#f59e0b', unread: 2 },
];

export default function NotesScreen() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('Communities');

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />
            
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#1e293b" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Notes</Text>
                <View style={styles.headerIcons}>
                    <TouchableOpacity><Ionicons name="search-outline" size={24} color="#1e293b" /></TouchableOpacity>
                    <TouchableOpacity><Ionicons name="ellipsis-vertical" size={24} color="#1e293b" /></TouchableOpacity>
                </View>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* My Notes Header Card */}
                <View style={styles.heroCard}>
                    <View style={styles.heroInfo}>
                        <View style={styles.heroIconBox}>
                            <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/1024/1024824.png' }} style={styles.heroIcon} />
                        </View>
                        <View style={{ flex: 1, marginLeft: 16 }}>
                            <Text style={styles.heroTitle}>My Notes</Text>
                            <Text style={styles.heroSub}>Create notes, folders and pages. Keep things organized.</Text>
                        </View>
                        <TouchableOpacity style={styles.newNoteBtn}>
                            <Ionicons name="add" size={20} color="#fff" />
                            <Text style={styles.newNoteBtnText}>New Note</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Quick Actions */}
                <Text style={styles.sectionTitle}>Quick Actions</Text>
                <View style={styles.quickGrid}>
                    {QUICK_ACTIONS.map(action => (
                        <TouchableOpacity key={action.id} style={styles.quickItem}>
                            <View style={[styles.quickIconBox, { backgroundColor: action.bg }]}>
                                <Ionicons name={action.icon as any} size={24} color={action.color} />
                                <View style={[styles.miniAdd, { backgroundColor: action.color }]}>
                                    <Ionicons name="add" size={10} color="#fff" />
                                </View>
                            </View>
                            <Text style={styles.quickLabel}>{action.label}</Text>
                            <Text style={styles.quickSub}>{action.sub}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Shared & Community */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Shared & Community</Text>
                    <TouchableOpacity><Text style={styles.manageText}>Manage</Text></TouchableOpacity>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.communityScroll} contentContainerStyle={{ paddingRight: 20 }}>
                    {COMMUNITIES.map(comm => (
                        <TouchableOpacity key={comm.id} style={styles.communityCard}>
                            <View style={[styles.commIconBox, { backgroundColor: `${comm.color}10` }]}>
                                <Ionicons name={comm.icon as any} size={24} color={comm.color} />
                            </View>
                            <Text style={styles.commName}>{comm.name}</Text>
                            <View style={styles.unreadBadgeMini}>
                                <Text style={styles.unreadBadgeTextMini}>{comm.unread} new</Text>
                            </View>
                            <Text style={styles.commStats}>{comm.notes} notes • {comm.folders} folders</Text>
                            <Text style={styles.commTime}>{comm.time}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Tabs */}
                <View style={styles.tabBar}>
                    {['My Notes', 'Shared', 'Communities'].map(tab => (
                        <TouchableOpacity 
                            key={tab} 
                            style={[styles.tab, activeTab === tab && styles.tabActive]}
                            onPress={() => setActiveTab(tab)}
                        >
                            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Search and Filters */}
                <View style={styles.filterRow}>
                    <TouchableOpacity style={styles.communityFilter}>
                        <Text style={styles.filterText}>All Communities</Text>
                        <Ionicons name="chevron-down" size={16} color="#64748b" />
                    </TouchableOpacity>
                    <View style={styles.searchContainer}>
                        <Ionicons name="search-outline" size={18} color="#94a3b8" />
                        <TextInput placeholder="Search in communities" style={styles.searchInput} placeholderTextColor="#94a3b8" />
                    </View>
                    <TouchableOpacity style={styles.optionsBtn}><Ionicons name="options-outline" size={20} color="#1e293b" /></TouchableOpacity>
                </View>

                {/* Community List */}
                <View style={styles.commList}>
                    {COMMUNITIES.slice(0, 3).map(comm => (
                        <TouchableOpacity key={comm.id} style={styles.commListItem}>
                            <View style={[styles.commListIcon, { backgroundColor: `${comm.color}10` }]}>
                                <Ionicons name={comm.icon as any} size={24} color={comm.color} />
                            </View>
                            <View style={{ flex: 1, marginLeft: 12 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Text style={styles.commListTitle}>{comm.name}</Text>
                                    <View style={styles.unreadBadgeRow}>
                                        <Text style={styles.unreadBadgeTextRow}>{comm.unread} new</Text>
                                    </View>
                                </View>
                                <Text style={styles.commListSub}>{comm.notes} notes • {comm.folders} folders</Text>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                                <Text style={styles.commListTime}>{comm.time}</Text>
                                <TouchableOpacity><Ionicons name="ellipsis-vertical" size={18} color="#94a3b8" /></TouchableOpacity>
                            </View>
                        </TouchableOpacity>
                    ))}
                    <TouchableOpacity style={styles.viewAllRow}>
                        <Text style={styles.viewAllText}>View all communities</Text>
                        <Ionicons name="chevron-forward" size={16} color="#6366f1" />
                    </TouchableOpacity>
                </View>

                {/* Recent Notes */}
                <Text style={styles.sectionTitle}>Recent Notes</Text>
                <TouchableOpacity style={styles.recentNoteItem}>
                    <View style={[styles.recentNoteIcon, { backgroundColor: '#fffbeb' }]}>
                        <Ionicons name="document-text" size={24} color="#f59e0b" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Text style={styles.recentNoteTitle}>Grocery List</Text>
                            <Ionicons name="star-outline" size={16} color="#cbd5e1" />
                        </View>
                        <Text style={styles.recentNoteSub}>Milk, Eggs, Bread, Fruits...</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', marginLeft: 10 }}>
                        <Text style={styles.recentNoteTime}>Today, 5:30 PM</Text>
                        <TouchableOpacity><Ionicons name="ellipsis-vertical" size={18} color="#94a3b8" /></TouchableOpacity>
                    </View>
                </TouchableOpacity>

                <View style={{ height: 120 }} />
            </ScrollView>

            {/* FAB */}
            <TouchableOpacity style={styles.fab}>
                <Ionicons name="add" size={32} color="#fff" />
            </TouchableOpacity>

            <BottomNav activeTab="Thread" />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15, paddingTop: 65, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    headerTitle: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
    headerIcons: { flexDirection: 'row', gap: 15 },
    content: { flex: 1, backgroundColor: '#fcfcfd' },
    
    heroCard: { backgroundColor: '#fff', borderRadius: 24, padding: 20, marginHorizontal: 20, marginTop: 20, marginBottom: 25, borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.02, shadowRadius: 10, elevation: 2 },
    heroInfo: { flexDirection: 'row', alignItems: 'center' },
    heroIconBox: { width: 56, height: 56, borderRadius: 16, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#f1f5f9' },
    heroIcon: { width: 36, height: 36 },
    heroTitle: { fontSize: 16, fontWeight: '800', color: '#1e293b' },
    heroSub: { fontSize: 11, color: '#64748b', marginTop: 4, lineHeight: 16 },
    newNoteBtn: { backgroundColor: '#6366f1', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 4 },
    newNoteBtnText: { color: '#fff', fontSize: 12, fontWeight: '800' },

    sectionTitle: { fontSize: 15, fontWeight: '900', color: '#1e293b', marginHorizontal: 20, marginBottom: 15 },
    quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginHorizontal: 20, marginBottom: 30 },
    quickItem: { width: '22.5%', backgroundColor: '#fff', padding: 12, borderRadius: 16, borderWidth: 1, borderColor: '#f1f5f9', alignItems: 'center' },
    quickIconBox: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
    miniAdd: { position: 'absolute', bottom: -2, right: -2, width: 14, height: 14, borderRadius: 7, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
    quickLabel: { fontSize: 11, fontWeight: '800', color: '#1e293b', textAlign: 'center' },
    quickSub: { fontSize: 8, color: '#94a3b8', marginTop: 2, fontWeight: '600' },

    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 15 },
    manageText: { fontSize: 12, fontWeight: '700', color: '#6366f1' },
    communityScroll: { paddingLeft: 20, marginBottom: 30 },
    communityCard: { width: 140, backgroundColor: '#fff', borderRadius: 20, padding: 16, marginRight: 12, borderWidth: 1, borderColor: '#f1f5f9' },
    commIconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    commName: { fontSize: 13, fontWeight: '800', color: '#1e293b', marginBottom: 4 },
    unreadBadgeMini: { backgroundColor: '#f5f3ff', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, alignSelf: 'flex-start', marginBottom: 8 },
    unreadBadgeTextMini: { fontSize: 9, color: '#6366f1', fontWeight: '800' },
    commStats: { fontSize: 10, color: '#64748b', fontWeight: '600' },
    commTime: { fontSize: 9, color: '#94a3b8', marginTop: 4 },

    tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', marginHorizontal: 20, marginBottom: 20 },
    tab: { paddingVertical: 12, marginRight: 25, borderBottomWidth: 2, borderBottomColor: 'transparent' },
    tabActive: { borderBottomColor: '#6366f1' },
    tabText: { fontSize: 13, fontWeight: '700', color: '#94a3b8' },
    tabTextActive: { color: '#6366f1' },

    filterRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 20, marginBottom: 20 },
    communityFilter: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#f1f5f9' },
    filterText: { fontSize: 12, fontWeight: '700', color: '#475569', marginRight: 4 },
    searchContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: '#f1f5f9' },
    searchInput: { flex: 1, marginLeft: 8, fontSize: 12, color: '#1e293b', height: 36 },
    optionsBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#f1f5f9' },

    commList: { marginHorizontal: 20, gap: 12, marginBottom: 30 },
    commListItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 14, borderRadius: 20, borderWidth: 1, borderColor: '#f1f5f9' },
    commListIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    commListTitle: { fontSize: 14, fontWeight: '800', color: '#1e293b' },
    unreadBadgeRow: { backgroundColor: '#f5f3ff', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginLeft: 8 },
    unreadBadgeTextRow: { fontSize: 9, color: '#6366f1', fontWeight: '800' },
    commListSub: { fontSize: 11, color: '#64748b', marginTop: 4 },
    commListTime: { fontSize: 10, color: '#94a3b8', fontWeight: '600', marginBottom: 4 },
    viewAllRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 10 },
    viewAllText: { fontSize: 13, fontWeight: '700', color: '#6366f1' },

    recentNoteItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 24, marginHorizontal: 20, borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 8, elevation: 1 },
    recentNoteIcon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    recentNoteTitle: { fontSize: 14, fontWeight: '800', color: '#1e293b' },
    recentNoteSub: { fontSize: 11, color: '#64748b', marginTop: 4 },
    recentNoteTime: { fontSize: 10, color: '#94a3b8', fontWeight: '600', marginBottom: 4 },

    fab: { position: 'absolute', bottom: 100, right: 20, width: 64, height: 64, borderRadius: 32, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center', shadowColor: '#6366f1', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 15, elevation: 10 },
});
