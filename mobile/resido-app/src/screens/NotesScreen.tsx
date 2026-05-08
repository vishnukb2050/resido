import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, TextInput, SafeAreaView, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import BottomNav from '../components/BottomNav';

const QUICK_ACTIONS = [
    { id: '1', label: 'New Folder', sub: 'Organize notes', icon: 'folder-outline', color: '#8b5cf6', bg: '#f5f3ff' },
    { id: '2', label: 'New Note', sub: 'Quick note', icon: 'document-text-outline', color: '#f59e0b', bg: '#fff7ed' },
    { id: '3', label: 'New Page', sub: 'Inside folder', icon: 'document-outline', color: '#10b981', bg: '#f0fdf4' },
    { id: '4', label: 'Shared with me', sub: 'View notes', icon: 'people-outline', color: '#3b82f6', bg: '#eff6ff' },
];

const SHARED_WORKSPACES = [
    { id: '1', name: 'Team Workspace', count: 12, notes: 28, folders: 4, time: '2h ago', icon: 'people', color: '#6366f1' },
    { id: '2', name: 'Project Phoenix', count: 5, notes: 15, folders: 3, time: '1h ago', icon: 'briefcase', color: '#10b981' },
    { id: '3', name: 'Study Circle', count: 3, notes: 8, folders: 2, time: 'Yesterday', icon: 'school', color: '#8b5cf6' },
    { id: '4', name: 'Marketing Hub', count: 7, notes: 20, folders: 5, time: '2d ago', icon: 'megaphone', color: '#ef4444' },
    { id: '5', name: 'Family Group', count: 2, notes: 6, folders: 1, time: '3d ago', icon: 'people', color: '#f59e0b' },
];

export default function NotesScreen() {
    const [activeTab, setActiveTab] = useState('Communities');
    const router = useRouter();

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fcfcfd' }}>
            {/* Custom Header Bar */}
            <View style={styles.topBar}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#1e293b" />
                </TouchableOpacity>
                <Text style={styles.topBarTitle}>Notes</Text>
                <View style={styles.topBarIcons}>
                    <TouchableOpacity><Ionicons name="search-outline" size={24} color="#1e293b" /></TouchableOpacity>
                    <TouchableOpacity><Ionicons name="ellipsis-vertical" size={24} color="#1e293b" /></TouchableOpacity>
                </View>
            </View>

            <ScrollView style={styles.container} contentContainerStyle={styles.content}>
                {/* My Notes Header Card */}
                <View style={styles.myNotesCard}>
                    <View style={styles.cardInfo}>
                        <View style={styles.cardIconBox}>
                            <Image source={require('../../../assets/images/icon.png')} style={styles.cardIcon} />
                        </View>
                        <View style={{ flex: 1, marginLeft: 16 }}>
                            <Text style={styles.cardTitle}>My Notes</Text>
                            <Text style={styles.cardSub}>Create notes, folders and pages. Keep things organized.</Text>
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
                            </View>
                            <Text style={styles.quickLabel}>{action.label}</Text>
                            <Text style={styles.quickSub}>{action.sub}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Shared & Community */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Shared & Community</Text>
                    <TouchableOpacity><Text style={styles.manageLink}>Manage</Text></TouchableOpacity>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sharedScroll}>
                    {SHARED_WORKSPACES.map(ws => (
                        <TouchableOpacity key={ws.id} style={styles.wsCard}>
                            <View style={[styles.wsIconBox, { backgroundColor: `${ws.color}10` }]}>
                                <Ionicons name={ws.icon as any} size={24} color={ws.color} />
                            </View>
                            <Text style={styles.wsName}>{ws.name}</Text>
                            <View style={styles.newBadge}><Text style={styles.newBadgeText}>{ws.count} new</Text></View>
                            <Text style={styles.wsStats}>{ws.notes} notes • {ws.folders} folders</Text>
                            <Text style={styles.wsTime}>Updated {ws.time}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Tabs */}
                <View style={styles.tabContainer}>
                    <TouchableOpacity onPress={() => setActiveTab('My Notes')} style={[styles.tab, activeTab === 'My Notes' && styles.tabActive]}>
                        <Text style={[styles.tabText, activeTab === 'My Notes' && styles.tabTextActive]}>My Notes</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setActiveTab('Shared')} style={[styles.tab, activeTab === 'Shared' && styles.tabActive]}>
                        <Text style={[styles.tabText, activeTab === 'Shared' && styles.tabTextActive]}>Shared</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setActiveTab('Communities')} style={[styles.tab, activeTab === 'Communities' && styles.tabActive]}>
                        <Text style={[styles.tabText, activeTab === 'Communities' && styles.tabTextActive]}>Communities</Text>
                    </TouchableOpacity>
                </View>

                {/* Community Search & Filter */}
                <View style={styles.searchRow}>
                    <TouchableOpacity style={styles.communitySelector}>
                        <Text style={styles.selectorText}>All Communities</Text>
                        <Ionicons name="chevron-down" size={18} color="#1e293b" />
                    </TouchableOpacity>
                    <View style={styles.searchBox}>
                        <Ionicons name="search-outline" size={18} color="#94a3b8" />
                        <TextInput placeholder="Search in communities" style={styles.searchInput} />
                    </View>
                    <TouchableOpacity style={styles.filterBtn}>
                        <Ionicons name="options-outline" size={20} color="#1e293b" />
                    </TouchableOpacity>
                </View>

                {/* Community List */}
                <View style={styles.communityList}>
                    {SHARED_WORKSPACES.slice(0, 3).map(ws => (
                        <TouchableOpacity key={ws.id} style={styles.listItem}>
                            <View style={[styles.listIconBox, { backgroundColor: `${ws.color}10` }]}>
                                <Ionicons name={ws.icon as any} size={22} color={ws.color} />
                            </View>
                            <View style={{ flex: 1, marginLeft: 12 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <Text style={styles.listName}>{ws.name}</Text>
                                    <View style={styles.miniBadge}><Text style={styles.miniBadgeText}>{ws.count} new</Text></View>
                                </View>
                                <Text style={styles.listStats}>{ws.notes} notes • {ws.folders} folders</Text>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                                <Text style={styles.listTime}>Updated {ws.time}</Text>
                                <TouchableOpacity><Ionicons name="ellipsis-vertical" size={18} color="#94a3b8" /></TouchableOpacity>
                            </View>
                        </TouchableOpacity>
                    ))}
                    <TouchableOpacity style={styles.viewAllBtn}>
                        <Text style={styles.viewAllBtnText}>View all communities</Text>
                        <Ionicons name="chevron-forward" size={16} color="#6366f1" />
                    </TouchableOpacity>
                </View>

                {/* Recent Notes */}
                <Text style={styles.sectionTitle}>Recent Notes</Text>
                <TouchableOpacity style={styles.recentNoteItem}>
                    <View style={styles.noteIconBox}>
                        <Ionicons name="document-text" size={22} color="#f59e0b" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.noteTitle}>Grocery List</Text>
                        <Text style={styles.noteSub}>Milk, Eggs, Bread, Fruits...</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.noteTime}>Today, 5:30 PM</Text>
                        <TouchableOpacity><Ionicons name="ellipsis-vertical" size={18} color="#94a3b8" /></TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </ScrollView>

            <TouchableOpacity style={styles.fab}>
                <Ionicons name="add" size={32} color="#fff" />
            </TouchableOpacity>

            <BottomNav />
        </SafeAreaView>
    );
}

function NavItem({ icon, label, active }: any) {
    return (
        <TouchableOpacity style={styles.navItem}>
            <Ionicons name={icon} size={24} color={active ? '#6366f1' : '#94a3b8'} />
            <Text style={[styles.navLabel, active && styles.navLabelActive]}>{label}</Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { padding: 20, paddingBottom: 110 },
    topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    topBarTitle: { fontSize: 18, fontWeight: '900', color: '#1e293b' },
    topBarIcons: { flexDirection: 'row', gap: 15 },
    myNotesCard: { backgroundColor: '#fff', borderRadius: 24, padding: 20, marginBottom: 25, borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.02, shadowRadius: 10, elevation: 2 },
    cardInfo: { flexDirection: 'row', alignItems: 'center' },
    cardIconBox: { width: 56, height: 56, borderRadius: 16, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#f1f5f9' },
    cardIcon: { width: 36, height: 36 },
    cardTitle: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
    cardSub: { fontSize: 12, color: '#64748b', marginTop: 4, lineHeight: 16 },
    newNoteBtn: { backgroundColor: '#6366f1', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 6 },
    newNoteBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },
    sectionTitle: { fontSize: 16, fontWeight: '900', color: '#1e293b', marginBottom: 15 },
    quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 25 },
    quickItem: { width: '48.5%', backgroundColor: '#fff', padding: 16, borderRadius: 20, borderWidth: 1, borderColor: '#f1f5f9', alignItems: 'center' },
    quickIconBox: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    quickLabel: { fontSize: 14, fontWeight: '800', color: '#1e293b' },
    quickSub: { fontSize: 10, color: '#94a3b8', marginTop: 2, fontWeight: '600' },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    manageLink: { fontSize: 12, color: '#6366f1', fontWeight: '800' },
    sharedScroll: { marginBottom: 30 },
    wsCard: { width: 140, backgroundColor: '#fff', padding: 16, borderRadius: 24, borderWidth: 1, borderColor: '#f1f5f9', marginRight: 12, alignItems: 'center' },
    wsIconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    wsName: { fontSize: 14, fontWeight: '800', color: '#1e293b', textAlign: 'center' },
    newBadge: { backgroundColor: '#f5f3ff', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginVertical: 8 },
    newBadgeText: { fontSize: 9, color: '#6366f1', fontWeight: '900' },
    wsStats: { fontSize: 10, color: '#64748b', fontWeight: '600' },
    wsTime: { fontSize: 9, color: '#94a3b8', marginTop: 4, fontWeight: '500' },
    tabContainer: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', marginBottom: 20 },
    tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
    tabActive: { borderBottomWidth: 2, borderBottomColor: '#6366f1' },
    tabText: { fontSize: 14, fontWeight: '700', color: '#94a3b8' },
    tabTextActive: { color: '#6366f1' },
    searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
    communitySelector: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f8fafc', paddingHorizontal: 12, height: 44, borderRadius: 12, borderWidth: 1, borderColor: '#f1f5f9' },
    selectorText: { fontSize: 13, fontWeight: '700', color: '#1e293b' },
    searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', paddingHorizontal: 12, height: 44, borderRadius: 12, borderWidth: 1, borderColor: '#f1f5f9' },
    searchInput: { flex: 1, marginLeft: 8, fontSize: 13, color: '#1e293b', fontWeight: '500' },
    filterBtn: { width: 44, height: 44, backgroundColor: '#f8fafc', borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#f1f5f9' },
    communityList: { gap: 12, marginBottom: 30 },
    listItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 14, borderRadius: 20, borderWidth: 1, borderColor: '#f1f5f9' },
    listIconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    listName: { fontSize: 15, fontWeight: '800', color: '#1e293b' },
    miniBadge: { backgroundColor: '#f5f3ff', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    miniBadgeText: { fontSize: 8, color: '#6366f1', fontWeight: '900' },
    listStats: { fontSize: 12, color: '#64748b', marginTop: 4 },
    listTime: { fontSize: 10, color: '#94a3b8', fontWeight: '600', marginBottom: 4 },
    viewAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
    viewAllBtnText: { fontSize: 13, fontWeight: '700', color: '#6366f1' },
    recentNoteItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 14, borderRadius: 20, borderWidth: 1, borderColor: '#f1f5f9' },
    noteIconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#fff7ed', alignItems: 'center', justifyContent: 'center' },
    noteTitle: { fontSize: 15, fontWeight: '800', color: '#1e293b' },
    noteSub: { fontSize: 12, color: '#64748b', marginTop: 2 },
    noteTime: { fontSize: 10, color: '#94a3b8', fontWeight: '600', marginBottom: 4 },
    fab: { position: 'absolute', bottom: 100, right: 20, width: 64, height: 64, borderRadius: 32, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center', shadowColor: '#6366f1', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 15, elevation: 10 },
    bottomNav: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 85, backgroundColor: '#fff', flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingBottom: 20, borderTopWidth: 1, borderTopColor: '#f1f5f9', borderTopLeftRadius: 30, borderTopRightRadius: 30, shadowColor: '#000', shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.04, shadowRadius: 15, elevation: 20 },
    navItem: { alignItems: 'center', justifyContent: 'center' },
    navLabel: { fontSize: 10, color: '#94a3b8', marginTop: 4, fontWeight: '700' },
    navLabelActive: { color: '#6366f1' },
});
