import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, TextInput, SafeAreaView, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import BottomNav from '../components/BottomNav';

const QUICK_ACTIONS = [
    { id: '1', label: 'Upload Document', sub: 'Add new file', icon: 'cloud-upload-outline', color: '#10b981', bg: '#f0fdf4' },
    { id: '2', label: 'New Folder', sub: 'Create folder', icon: 'folder-outline', color: '#6366f1', bg: '#f5f3ff' },
    { id: '3', label: 'Shared with me', sub: 'View shared docs', icon: 'people-outline', color: '#3b82f6', bg: '#eff6ff' },
    { id: '4', label: 'Community Docs', sub: 'Community files', icon: 'business-outline', color: '#f59e0b', bg: '#fff7ed' },
];

const FOLDERS = [
    { id: '1', name: 'Bills & Receipts', files: 12, time: 'Today', icon: 'folder', color: '#f59e0b' },
    { id: '2', name: 'ID Proofs', files: 8, time: 'Yesterday', icon: 'folder', color: '#6366f1' },
    { id: '3', name: 'Maintenance', files: 15, time: 'Jul 14, 2025', icon: 'folder', color: '#10b981' },
    { id: '4', name: 'Lease Documents', files: 6, time: 'Jul 10, 2025', icon: 'folder', color: '#3b82f6' },
];

const RECENT_DOCS = [
    { id: '1', name: 'Electricity Bill - July 2025', folder: 'Bills & Receipts', size: '1.2 MB', time: 'Today, 5:30 PM', type: 'PDF', color: '#ef4444' },
    { id: '2', name: 'Rental Agreement', folder: 'Lease Documents', size: '2.4 MB', time: 'Jul 14, 2025', type: 'DOC', color: '#3b82f6' },
    { id: '3', name: 'Maintenance Charges', folder: 'Maintenance', size: '950 KB', time: 'Jul 12, 2025', type: 'XLS', color: '#10b981' },
];

export default function DocumentsScreen() {
    const [activeTab, setActiveTab] = useState('My Documents');
    const router = useRouter();

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fcfcfd' }}>
            {/* Custom Header Bar */}
            <View style={styles.topBar}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#1e293b" />
                </TouchableOpacity>
                <Text style={styles.topBarTitle}>Documents</Text>
                <View style={styles.topBarIcons}>
                    <TouchableOpacity><Ionicons name="search-outline" size={24} color="#1e293b" /></TouchableOpacity>
                    <TouchableOpacity><Ionicons name="ellipsis-vertical" size={24} color="#1e293b" /></TouchableOpacity>
                </View>
            </View>

            <ScrollView style={styles.container} contentContainerStyle={styles.content}>
                {/* Header Card */}
                <View style={styles.headerCard}>
                    <View style={styles.cardInfo}>
                        <View style={styles.cardIconBox}>
                            <Image source={require('../../assets/icon.png')} style={styles.cardIcon} />
                        </View>
                        <View style={{ flex: 1, marginLeft: 16 }}>
                            <Text style={styles.cardTitle}>All your important documents</Text>
                            <Text style={styles.cardSub}>Organize, access and share documents easily and securely.</Text>
                        </View>
                        <TouchableOpacity style={styles.uploadBtn}>
                            <Ionicons name="add" size={20} color="#fff" />
                            <Text style={styles.uploadBtnText}>Upload</Text>
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

                {/* Tabs */}
                <View style={styles.tabContainer}>
                    {['My Documents', 'Shared with me', 'Community Documents'].map(tab => (
                        <TouchableOpacity 
                            key={tab} 
                            onPress={() => setActiveTab(tab)} 
                            style={[styles.tab, activeTab === tab && styles.tabActive]}
                        >
                            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Folders Section */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Folders</Text>
                </View>
                <View style={styles.folderList}>
                    {FOLDERS.map(folder => (
                        <TouchableOpacity key={folder.id} style={styles.folderItem}>
                            <View style={[styles.folderIconBox, { backgroundColor: `${folder.color}10` }]}>
                                <Ionicons name={folder.icon as any} size={24} color={folder.color} />
                            </View>
                            <View style={{ flex: 1, marginLeft: 12 }}>
                                <Text style={styles.folderName}>{folder.name}</Text>
                                <Text style={styles.folderStats}>{folder.files} files • Updated {folder.time}</Text>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                                <Text style={styles.listTime}>{folder.time}</Text>
                                <TouchableOpacity><Ionicons name="ellipsis-vertical" size={18} color="#94a3b8" /></TouchableOpacity>
                            </View>
                        </TouchableOpacity>
                    ))}
                    <TouchableOpacity style={styles.viewAllBtn}>
                        <Text style={styles.viewAllBtnText}>View all folders</Text>
                        <Ionicons name="chevron-forward" size={16} color="#6366f1" />
                    </TouchableOpacity>
                </View>

                {/* Recent Documents */}
                <Text style={styles.sectionTitle}>Recent Documents</Text>
                {RECENT_DOCS.map(doc => (
                    <TouchableOpacity key={doc.id} style={styles.recentDocItem}>
                        <View style={[styles.docTypeBadge, { backgroundColor: `${doc.color}10` }]}>
                            <Text style={[styles.docTypeText, { color: doc.color }]}>{doc.type}</Text>
                        </View>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={styles.docName}>{doc.name}</Text>
                            <Text style={styles.docSub}>{doc.folder} • {doc.size}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={styles.docTime}>{doc.time}</Text>
                            <TouchableOpacity><Ionicons name="ellipsis-vertical" size={18} color="#94a3b8" /></TouchableOpacity>
                        </View>
                    </TouchableOpacity>
                ))}
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
    topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 10, paddingTop: 65, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    topBarTitle: { fontSize: 18, fontWeight: '900', color: '#1e293b' },
    topBarIcons: { flexDirection: 'row', gap: 15 },
    headerCard: { backgroundColor: '#fff', borderRadius: 24, padding: 20, marginBottom: 25, borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.02, shadowRadius: 10, elevation: 2 },
    cardInfo: { flexDirection: 'row', alignItems: 'center' },
    cardIconBox: { width: 56, height: 56, borderRadius: 16, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#f1f5f9' },
    cardIcon: { width: 36, height: 36 },
    cardTitle: { fontSize: 16, fontWeight: '800', color: '#1e293b' },
    cardSub: { fontSize: 11, color: '#64748b', marginTop: 4, lineHeight: 16 },
    uploadBtn: { backgroundColor: '#6366f1', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 6 },
    uploadBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },
    sectionTitle: { fontSize: 15, fontWeight: '900', color: '#1e293b', marginBottom: 15 },
    quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 25 },
    quickItem: { width: '48.5%', backgroundColor: '#fff', padding: 16, borderRadius: 20, borderWidth: 1, borderColor: '#f1f5f9', alignItems: 'center' },
    quickIconBox: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    quickLabel: { fontSize: 13, fontWeight: '800', color: '#1e293b' },
    quickSub: { fontSize: 10, color: '#94a3b8', marginTop: 2, fontWeight: '600' },
    tabContainer: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', marginBottom: 25 },
    tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
    tabActive: { borderBottomWidth: 2, borderBottomColor: '#6366f1' },
    tabText: { fontSize: 12, fontWeight: '700', color: '#94a3b8' },
    tabTextActive: { color: '#6366f1' },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    folderList: { gap: 12, marginBottom: 30 },
    folderItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 14, borderRadius: 20, borderWidth: 1, borderColor: '#f1f5f9' },
    folderIconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    folderName: { fontSize: 14, fontWeight: '800', color: '#1e293b' },
    folderStats: { fontSize: 11, color: '#64748b', marginTop: 4 },
    listTime: { fontSize: 10, color: '#94a3b8', fontWeight: '600', marginBottom: 4 },
    viewAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
    viewAllBtnText: { fontSize: 13, fontWeight: '700', color: '#6366f1' },
    recentDocItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 14, borderRadius: 20, borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 12 },
    docTypeBadge: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    docTypeText: { fontSize: 10, fontWeight: '900' },
    docName: { fontSize: 14, fontWeight: '800', color: '#1e293b' },
    docSub: { fontSize: 11, color: '#64748b', marginTop: 2 },
    docTime: { fontSize: 10, color: '#94a3b8', fontWeight: '600', marginBottom: 4 },
    fab: { position: 'absolute', bottom: 100, right: 20, width: 64, height: 64, borderRadius: 32, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center', shadowColor: '#6366f1', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 15, elevation: 10 },
    bottomNav: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 85, backgroundColor: '#fff', flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingBottom: 20, borderTopWidth: 1, borderTopColor: '#f1f5f9', borderTopLeftRadius: 30, borderTopRightRadius: 30, shadowColor: '#000', shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.04, shadowRadius: 15, elevation: 20 },
    navItem: { alignItems: 'center', justifyContent: 'center' },
    navLabel: { fontSize: 10, color: '#94a3b8', marginTop: 4, fontWeight: '700' },
    navLabelActive: { color: '#6366f1' },
});
